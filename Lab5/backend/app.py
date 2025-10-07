from flask import Flask, request, jsonify, send_from_directory, make_response, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import os
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import json
import time
import psycopg2
from psycopg2 import OperationalError
import threading
from auth_service import AuthService
from auth_middleware import token_required, admin_required, manager_required, optional_auth
import jwt
from graphql import GraphQLError
from ariadne import QueryType, MutationType, make_executable_schema, gql
from ariadne import graphql_sync

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://hr_user:hr_password@localhost:5432/hr_management')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  
db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app, 
     supports_credentials=True, 
     origins=['http://localhost:3000'], 
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])


socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", logger=True, engineio_logger=True)


auth_service = AuthService()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='user')  # user, manager, admin
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    position = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    hire_date = db.Column(db.Date, nullable=False)
    salary = db.Column(db.Float, nullable=False)
    avatar = db.Column(db.String(255))
    skills = db.Column(db.JSON)
    performance_score = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    projects = db.relationship('Project', secondary='employee_project', back_populates='employees')

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default='Planning')  # Planning, In Progress, Completed, On Hold
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    budget = db.Column(db.Float)
    priority = db.Column(db.String(20), default='Medium')  # Low, Medium, High
    progress = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employees = db.relationship('Employee', secondary='employee_project', back_populates='projects')

employee_project = db.Table('employee_project',
    db.Column('employee_id', db.Integer, db.ForeignKey('employee.id'), primary_key=True),
    db.Column('project_id', db.Integer, db.ForeignKey('project.id'), primary_key=True)
)


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response


@app.route('/uploads/avatars/<filename>')
def uploaded_avatar(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'avatars'), filename)

@app.route('/api/employees/<int:employee_id>/avatar', methods=['POST'])
@token_required
def upload_avatar(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'avatars', filename)
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image = Image.open(file)
            image.thumbnail((300, 300), Image.Resampling.LANCZOS)
            image.save(filepath)
        else:
            file.save(filepath)
        
        if employee.avatar:
            old_avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], 'avatars', employee.avatar)
            if os.path.exists(old_avatar_path):
                os.remove(old_avatar_path)
        
        return jsonify({'message': 'Avatar uploaded successfully', 'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'pdf', 'doc', 'docx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


active_users = {}

STATUS_ACTIVE = 'active'
STATUS_IDLE = 'idle' 
STATUS_OFFLINE = 'offline'


IDLE_THRESHOLD = 30
OFFLINE_THRESHOLD = 300

type_defs = gql("""
    scalar Date

    type User {
        id: ID!
        email: String!
        role: String!
        last_login: String
    }

    type Employee {
        id: ID!
        first_name: String!
        last_name: String!
        email: String!
        position: String!
        department: String!
        hire_date: String
        salary: Float!
        avatar: String
        skills: [String!]
        performance_score: Float!
        projects: [Project!]!
        projects_count: Int!
    }

    type Project {
        id: ID!
        name: String!
        description: String
        status: String!
        start_date: String
        end_date: String
        budget: Float
        priority: String!
        progress: Float!
        employees: [Employee!]!
        employees_count: Int!
    }

    type EmployeesPage {
        employees: [Employee!]!
        total: Int!
        pages: Int!
        current_page: Int!
    }

    type DashboardStats {
        total_employees: Int!
        total_projects: Int!
        active_projects: Int!
        avg_performance: Float!
    }

    type DepartmentStat {
        department: String!
        employee_count: Int!
        avg_salary: Float!
    }

    type AuthPayload {
        message: String!
        user: User
    }

    type MutationMessage {
        message: String!
    }

    type Query {
        me: User
        employees(page: Int = 1, per_page: Int = 10, search: String, department: String): EmployeesPage!
        employee(id: ID!): Employee!
        projects: [Project!]!
        project(id: ID!): Project!
        dashboardStats: DashboardStats!
        departmentStats: [DepartmentStat!]!
    }

    type Mutation {
        register(email: String!, password: String!, role: String = "user"): MutationMessage!
        login(email: String!, password: String!): AuthPayload!
        refreshToken: MutationMessage!
        logout: MutationMessage!

        changePassword(current_password: String!, new_password: String!): MutationMessage!

        createEmployee(
            first_name: String!, last_name: String!, email: String!, position: String!,
            department: String!, hire_date: String!, salary: Float!, skills: [String!],
            performance_score: Float
        ): MutationMessage!

        updateEmployee(
            id: ID!, first_name: String, last_name: String, email: String, position: String,
            department: String, hire_date: String, salary: Float, skills: [String!],
            performance_score: Float
        ): MutationMessage!

        deleteEmployee(id: ID!): MutationMessage!

        createProject(
            name: String!, description: String, status: String, priority: String, budget: Float, progress: Float
        ): MutationMessage!

        updateProject(
            id: ID!, name: String, description: String, status: String, priority: String, budget: Float, progress: Float,
            start_date: String, end_date: String
        ): MutationMessage!

        assignEmployee(projectId: ID!, employeeId: ID!): MutationMessage!
        removeEmployee(projectId: ID!, employeeId: ID!): MutationMessage!
        
        uploadAvatar(employeeId: ID!, filename: String!): MutationMessage!
    }
""")

query = QueryType()
mutation = MutationType()


def get_current_user_from_context(context):
    token = context["request"].cookies.get('access_token')
    if not token:
        raise GraphQLError('Access token is missing')
    if auth_service.is_token_blacklisted(token):
        raise GraphQLError('Token has been revoked')
    data = auth_service.verify_token(token, 'access')
    return {
        'id': data['user_id'],
        'email': data['email'],
        'role': data.get('role', 'user')
    }


def ensure_role(user_role, required):
    role_hierarchy = {'user': 1, 'manager': 2, 'admin': 3}
    if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required, 0):
        raise GraphQLError('Insufficient permissions')


@query.field("me")
def resolve_me(_, info):
    try:
        user = get_current_user_from_context(info.context)
        return {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'last_login': None
        }
    except Exception:
        return None


@query.field("employees")
def resolve_employees(_, info, page=1, per_page=10, search=None, department=None):
    user = get_current_user_from_context(info.context)
    query_q = Employee.query.filter(Employee.is_active == True)
    if search:
        query_q = query_q.filter(
            (Employee.first_name.ilike(f'%{search}%')) |
            (Employee.last_name.ilike(f'%{search}%')) |
            (Employee.email.ilike(f'%{search}%'))
        )
    if department:
        query_q = query_q.filter(Employee.department == department)
    employees_page = query_q.paginate(page=page, per_page=per_page, error_out=False)
    def map_emp(emp):
        return {
            'id': emp.id,
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'email': emp.email,
            'position': emp.position,
            'department': emp.department,
            'hire_date': emp.hire_date.isoformat() if emp.hire_date else None,
            'salary': emp.salary,
            'avatar': emp.avatar,
            'skills': emp.skills or [],
            'performance_score': emp.performance_score,
            'projects_count': len(emp.projects),
            'projects': [
                {
                    'id': proj.id,
                    'name': proj.name,
                    'status': proj.status,
                    'progress': proj.progress
                } for proj in emp.projects
            ]
        }
    return {
        'employees': [map_emp(emp) for emp in employees_page.items],
        'total': employees_page.total,
        'pages': employees_page.pages,
        'current_page': page
    }


@query.field("employee")
def resolve_employee(_, info, id):
    user = get_current_user_from_context(info.context)
    employee = Employee.query.get_or_404(int(id))
    return {
        'id': employee.id,
        'first_name': employee.first_name,
        'last_name': employee.last_name,
        'email': employee.email,
        'position': employee.position,
        'department': employee.department,
        'hire_date': employee.hire_date.isoformat() if employee.hire_date else None,
        'salary': employee.salary,
        'avatar': employee.avatar,
        'skills': employee.skills or [],
        'performance_score': employee.performance_score,
        'projects': [{
            'id': proj.id,
            'name': proj.name,
            'status': proj.status,
            'progress': proj.progress
        } for proj in employee.projects]
    }


@query.field("projects")
def resolve_projects(_, info):
    user = get_current_user_from_context(info.context)
    projects = Project.query.all()
    return [{
        'id': proj.id,
        'name': proj.name,
        'description': proj.description,
        'status': proj.status,
        'start_date': proj.start_date.isoformat() if proj.start_date else None,
        'end_date': proj.end_date.isoformat() if proj.end_date else None,
        'budget': proj.budget,
        'priority': proj.priority,
        'progress': proj.progress,
        'employees': [{
            'id': emp.id,
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'position': emp.position
        } for emp in proj.employees],
        'employees_count': len(proj.employees)
    } for proj in projects]


@query.field("project")
def resolve_project(_, info, id):
    user = get_current_user_from_context(info.context)
    project = Project.query.get_or_404(int(id))
    return {
        'id': project.id,
        'name': project.name,
        'description': project.description,
        'status': project.status,
        'start_date': project.start_date.isoformat() if project.start_date else None,
        'end_date': project.end_date.isoformat() if project.end_date else None,
        'budget': project.budget,
        'priority': project.priority,
        'progress': project.progress,
        'employees': [{
            'id': emp.id,
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'position': emp.position
        } for emp in project.employees],
        'employees_count': len(project.employees)
    }


@query.field("dashboardStats")
def resolve_dashboard_stats(_, info):
    user = get_current_user_from_context(info.context)
    total_employees = Employee.query.filter(Employee.is_active == True).count()
    total_projects = Project.query.count()
    active_projects = Project.query.filter(Project.status.in_(['Planning', 'In Progress'])).count()
    avg_performance = db.session.query(db.func.avg(Employee.performance_score)).filter(Employee.is_active == True).scalar() or 0
    return {
        'total_employees': total_employees,
        'total_projects': total_projects,
        'active_projects': active_projects,
        'avg_performance': round(avg_performance, 2)
    }


@query.field("departmentStats")
def resolve_department_stats(_, info):
    user = get_current_user_from_context(info.context)
    stats = db.session.query(
        Employee.department,
        db.func.count(Employee.id).label('count'),
        db.func.avg(Employee.salary).label('avg_salary')
    ).filter(Employee.is_active == True).group_by(Employee.department).all()
    return [{
        'department': stat.department,
        'employee_count': stat.count,
        'avg_salary': round(stat.avg_salary, 2)
    } for stat in stats]


@mutation.field("register")
def resolve_register(_, info, email, password, role="user"):
    if User.query.filter_by(email=email).first():
        raise GraphQLError('User already exists')
    password_hash = auth_service.hash_password(password)
    user = User(email=email, password_hash=password_hash, role=role)
    db.session.add(user)
    db.session.commit()
    return { 'message': 'User created successfully' }


@mutation.field("login")
def resolve_login(_, info, email, password):
    user = User.query.filter_by(email=email, is_active=True).first()
    if not user or not auth_service.verify_password(password, user.password_hash):
        raise GraphQLError('Invalid credentials')

    access_token = auth_service.create_access_token(user.id, user.email, user.role)
    refresh_token = auth_service.create_refresh_token(user.id, user.email)

    resp = getattr(g, 'response', None)
    if resp is not None:
        resp.set_cookie('access_token', access_token, httponly=True, secure=False, samesite='Lax', max_age=60 * 60)
        resp.set_cookie('refresh_token', refresh_token, httponly=True, secure=False, samesite='Lax', max_age=7 * 24 * 60 * 60)

    user.last_login = datetime.utcnow()
    db.session.commit()

    return {
        'message': 'Login successful',
        'user': { 'id': user.id, 'email': user.email, 'role': user.role }
    }


@mutation.field("refreshToken")
def resolve_refresh_token(_, info):
    refresh_token = info.context["request"].cookies.get('refresh_token')
    if not refresh_token:
        raise GraphQLError('Refresh token is missing')
    new_tokens = auth_service.refresh_access_token(refresh_token)
    resp = getattr(g, 'response', None)
    if resp is not None:
        resp.set_cookie('access_token', new_tokens['access_token'], httponly=True, secure=False, samesite='Lax', max_age=60 * 60)
    return { 'message': 'Token refreshed successfully' }


@mutation.field("logout")
def resolve_logout(_, info):
    refresh_token = info.context["request"].cookies.get('refresh_token')
    access_token = info.context["request"].cookies.get('access_token')
    if refresh_token:
        auth_service.logout(refresh_token)
    resp = getattr(g, 'response', None)
    if resp is not None:
        resp.set_cookie('access_token', '', expires=0)
        resp.set_cookie('refresh_token', '', expires=0)
    return { 'message': 'Logged out successfully' }


@mutation.field("changePassword")
def resolve_change_password(_, info, current_password, new_password):
    user = get_current_user_from_context(info.context)
    user_model = User.query.get(user['id'])
    if not auth_service.verify_password(current_password, user_model.password_hash):
        raise GraphQLError('Current password is incorrect')
    user_model.password_hash = auth_service.hash_password(new_password)
    db.session.commit()
    return { 'message': 'Password changed successfully' }


@mutation.field("createEmployee")
def resolve_create_employee(_, info, first_name, last_name, email, position, department, hire_date, salary, skills=None, performance_score=0.0):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'manager')
    emp = Employee(
        first_name=first_name,
        last_name=last_name,
        email=email,
        position=position,
        department=department,
        hire_date=datetime.strptime(hire_date, '%Y-%m-%d').date(),
        salary=salary,
        skills=skills or [],
        performance_score=performance_score or 0.0
    )
    db.session.add(emp)
    db.session.commit()
    return { 'message': 'Employee created successfully' }


@mutation.field("updateEmployee")
def resolve_update_employee(_, info, id, **kwargs):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'manager')
    employee = Employee.query.get_or_404(int(id))
    if 'first_name' in kwargs and kwargs['first_name'] is not None:
        employee.first_name = kwargs['first_name']
    if 'last_name' in kwargs and kwargs['last_name'] is not None:
        employee.last_name = kwargs['last_name']
    if 'email' in kwargs and kwargs['email'] is not None:
        employee.email = kwargs['email']
    if 'position' in kwargs and kwargs['position'] is not None:
        employee.position = kwargs['position']
    if 'department' in kwargs and kwargs['department'] is not None:
        employee.department = kwargs['department']
    if 'salary' in kwargs and kwargs['salary'] is not None:
        employee.salary = kwargs['salary']
    if 'performance_score' in kwargs and kwargs['performance_score'] is not None:
        employee.performance_score = kwargs['performance_score']
    if 'skills' in kwargs and kwargs['skills'] is not None:
        employee.skills = kwargs['skills']
    if 'hire_date' in kwargs and kwargs['hire_date'] is not None:
        employee.hire_date = datetime.strptime(kwargs['hire_date'], '%Y-%m-%d').date()
    db.session.commit()
    return { 'message': 'Employee updated successfully' }


@mutation.field("deleteEmployee")
def resolve_delete_employee(_, info, id):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'admin')
    employee = Employee.query.get_or_404(int(id))
    employee.is_active = False
    db.session.commit()
    return { 'message': 'Employee deactivated successfully' }


@mutation.field("createProject")
def resolve_create_project(_, info, name, description=None, status='Planning', priority='Medium', budget=None, progress=0.0):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'manager')
    project = Project(name=name, description=description or '', status=status or 'Planning', priority=priority or 'Medium', budget=budget, progress=progress or 0.0)
    db.session.add(project)
    db.session.commit()
    return { 'message': 'Project created successfully' }


@mutation.field("updateProject")
def resolve_update_project(_, info, id, **kwargs):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'manager')
    project = Project.query.get_or_404(int(id))
    if 'name' in kwargs and kwargs['name'] is not None:
        project.name = kwargs['name']
    if 'description' in kwargs and kwargs['description'] is not None:
        project.description = kwargs['description']
    if 'status' in kwargs and kwargs['status'] is not None:
        project.status = kwargs['status']
    if 'priority' in kwargs and kwargs['priority'] is not None:
        project.priority = kwargs['priority']
    if 'budget' in kwargs and kwargs['budget'] is not None:
        project.budget = kwargs['budget']
    if 'progress' in kwargs and kwargs['progress'] is not None:
        project.progress = kwargs['progress']
    if 'start_date' in kwargs and kwargs['start_date'] is not None:
        project.start_date = datetime.strptime(kwargs['start_date'], '%Y-%m-%d').date()
    if 'end_date' in kwargs and kwargs['end_date'] is not None:
        project.end_date = datetime.strptime(kwargs['end_date'], '%Y-%m-%d').date()
    db.session.commit()
    return { 'message': 'Project updated successfully' }


@mutation.field("assignEmployee")
def resolve_assign_employee(_, info, projectId, employeeId):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'manager')
    project = Project.query.get_or_404(int(projectId))
    employee = Employee.query.get_or_404(int(employeeId))
    project.employees.append(employee)
    db.session.commit()
    return { 'message': 'Employee assigned to project successfully' }


@mutation.field("removeEmployee")
def resolve_remove_employee(_, info, projectId, employeeId):
    user = get_current_user_from_context(info.context)
    ensure_role(user['role'], 'manager')
    project = Project.query.get_or_404(int(projectId))
    employee = Employee.query.get_or_404(int(employeeId))
    project.employees.remove(employee)
    db.session.commit()
    return { 'message': 'Employee removed from project successfully' }


@mutation.field("uploadAvatar")
def resolve_upload_avatar(_, info, employeeId, filename):
    user = get_current_user_from_context(info.context)
    employee = Employee.query.get_or_404(int(employeeId))
    
    # Update employee avatar field
    employee.avatar = filename
    db.session.commit()
    
    return { 'message': 'Avatar uploaded successfully' }


schema = make_executable_schema(type_defs, [query, mutation])


@app.route('/graphql', methods=['GET', 'POST'])
def graphql_server():
    if request.method == 'GET':
        return make_response('GraphQL endpoint is up', 200)
    data = request.get_json()
    g.response = make_response()
    success, result = graphql_sync(
        schema,
        data,
        context_value={"request": request},
        debug=True
    )
    g.response.data = json.dumps(result)
    g.response.mimetype = 'application/json'
    return g.response, (200 if success else 400)


@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

    for user_id, user_data in list(active_users.items()):
        if user_data.get('sid') == request.sid:
            del active_users[user_id]
            # Отправляем обновленный словарь всем
            emit('users_status_update', active_users, broadcast=True)
            break

@socketio.on('user_online')
def handle_user_online(data):
    """Пользователь зашел в систему"""
    user_id = data.get('user_id')
    user_email = data.get('user_email')
    user_role = data.get('user_role')
    
    if user_id:
        active_users[user_id] = {
            'user_id': user_id,
            'sid': request.sid,
            'email': user_email,
            'role': user_role,
            'last_seen': datetime.utcnow().isoformat(),
            'status': STATUS_ACTIVE
        }
        
        # Отправляем обновленный словарь всем
        emit('users_status_update', active_users, broadcast=True)

@socketio.on('user_activity')
def handle_user_activity(data):
    """Обновление активности пользователя"""
    user_id = data.get('user_id')
    
    if user_id and user_id in active_users:
        active_users[user_id]['last_seen'] = datetime.utcnow().isoformat()
        # Отправляем обновленный словарь всем
        emit('users_status_update', active_users, broadcast=True)

@socketio.on('user_status_update')
def handle_user_status_update(data):
    """Обновление статуса пользователя"""
    user_id = data.get('user_id')
    status = data.get('status')
    
    if user_id and user_id in active_users and status:
        active_users[user_id]['status'] = status
        active_users[user_id]['last_seen'] = datetime.utcnow().isoformat()
        # Отправляем обновленный словарь всем
        emit('users_status_update', active_users, broadcast=True)

@socketio.on('join_room')
def handle_join_room(data):
    """Пользователь присоединяется к комнате (например, к проекту)"""
    room = data.get('room')
    user_id = data.get('user_id')
    
    if room and user_id:
        join_room(room)
        emit('user_joined_room', {
            'user_id': user_id,
            'room': room
        }, room=room, include_self=False)

@socketio.on('leave_room')
def handle_leave_room(data):
    """Пользователь покидает комнату"""
    room = data.get('room')
    user_id = data.get('user_id')
    
    if room and user_id:
        leave_room(room)
        emit('user_left_room', {
            'user_id': user_id,
            'room': room
        }, room=room, include_self=False)

def create_default_admin():
    """Создает администратора по умолчанию"""
    admin_email = 'admin@hr.com'
    admin_password = 'admin123'
    
    
    if not User.query.filter_by(email=admin_email).first():
        admin = User(
            email=admin_email,
            password_hash=auth_service.hash_password(admin_password),
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
        print(f"Default admin created: {admin_email} / {admin_password}")

def wait_for_db():
    """Wait for database to be ready"""
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            
            db_url = os.environ.get('DATABASE_URL', 'postgresql://hr_user:hr_password@localhost:5432/hr_management')
            if '://' in db_url:
                db_url = db_url.split('://', 1)[1]
            
            parts = db_url.split('@')
            if len(parts) == 2:
                auth_part = parts[0]
                host_part = parts[1]
                user, password = auth_part.split(':')
                host, port_db = host_part.split(':')
                port, database = port_db.split('/')
                
                conn = psycopg2.connect(
                    host=host,
                    port=int(port),
                    database=database,
                    user=user,
                    password=password
                )
                conn.close()
                print("Database is ready!")
                return True
        except (OperationalError, Exception) as e:
            retry_count += 1
            print(f"Database not ready, waiting... (attempt {retry_count}/{max_retries})")
            time.sleep(2)
    
    print("Failed to connect to database after maximum retries")
    return False

if __name__ == '__main__':
    if wait_for_db():
        with app.app_context():
            try:
                db.create_all()
                print("Database tables created successfully!")
                
                
                create_default_admin()
                
            except Exception as e:
                print(f"Error creating database tables: {e}")
        
        # Мониторинг активности теперь на фронтенде
        print("Backend started - activity monitoring on frontend")
       
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    else:
        print("Cannot start application without database connection")
        exit(1)
