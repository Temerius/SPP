from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import os
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import json
import time
import psycopg2
from psycopg2 import OperationalError

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://hr_user:hr_password@localhost:5432/hr_management')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

db = SQLAlchemy(app)
migrate = Migrate(app, db)
CORS(app)

# Models
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
    skills = db.Column(db.JSON)  # Store skills as JSON array
    performance_score = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
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
    progress = db.Column(db.Float, default=0.0)  # 0-100
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    employees = db.relationship('Employee', secondary='employee_project', back_populates='projects')

# Association table for many-to-many relationship
employee_project = db.Table('employee_project',
    db.Column('employee_id', db.Integer, db.ForeignKey('employee.id'), primary_key=True),
    db.Column('project_id', db.Integer, db.ForeignKey('project.id'), primary_key=True)
)

# API Routes

@app.route('/api/employees', methods=['GET'])
def get_employees():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    department = request.args.get('department', '')
    
    query = Employee.query.filter(Employee.is_active == True)
    
    if search:
        query = query.filter(
            (Employee.first_name.ilike(f'%{search}%')) |
            (Employee.last_name.ilike(f'%{search}%')) |
            (Employee.email.ilike(f'%{search}%'))
        )
    
    if department:
        query = query.filter(Employee.department == department)
    
    employees = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'employees': [{
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
            'projects_count': len(emp.projects)
        } for emp in employees.items],
        'total': employees.total,
        'pages': employees.pages,
        'current_page': page
    })

@app.route('/api/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    return jsonify({
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
    })

@app.route('/api/employees', methods=['POST'])
def create_employee():
    data = request.get_json()
    
    # Ensure skills is a proper list
    skills = data.get('skills', [])
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except json.JSONDecodeError:
            skills = []
    
    employee = Employee(
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data['email'],
        position=data['position'],
        department=data['department'],
        hire_date=datetime.strptime(data['hire_date'], '%Y-%m-%d').date(),
        salary=data['salary'],
        skills=skills,
        performance_score=data.get('performance_score', 0.0)
    )
    
    db.session.add(employee)
    db.session.commit()
    
    return jsonify({'id': employee.id, 'message': 'Employee created successfully'}), 201

@app.route('/api/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    data = request.get_json()
    
    employee.first_name = data.get('first_name', employee.first_name)
    employee.last_name = data.get('last_name', employee.last_name)
    employee.email = data.get('email', employee.email)
    employee.position = data.get('position', employee.position)
    employee.department = data.get('department', employee.department)
    employee.salary = data.get('salary', employee.salary)
    employee.performance_score = data.get('performance_score', employee.performance_score)
    
    # Handle skills properly
    if 'skills' in data:
        skills = data['skills']
        if isinstance(skills, str):
            try:
                skills = json.loads(skills)
            except json.JSONDecodeError:
                skills = []
        employee.skills = skills
    
    if 'hire_date' in data:
        employee.hire_date = datetime.strptime(data['hire_date'], '%Y-%m-%d').date()
    
    db.session.commit()
    
    return jsonify({'message': 'Employee updated successfully'})

@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    employee.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Employee deactivated successfully'})

@app.route('/api/employees/<int:employee_id>/avatar', methods=['POST'])
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
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Resize image if it's an image
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image = Image.open(file)
            image.thumbnail((300, 300), Image.Resampling.LANCZOS)
            image.save(filepath)
        else:
            file.save(filepath)
        
        # Delete old avatar if exists
        if employee.avatar:
            old_avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], 'avatars', employee.avatar)
            if os.path.exists(old_avatar_path):
                os.remove(old_avatar_path)
        
        employee.avatar = filename
        db.session.commit()
        
        return jsonify({'message': 'Avatar uploaded successfully', 'filename': filename})
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([{
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
    } for proj in projects])

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    
    project = Project(
        name=data['name'],
        description=data.get('description', ''),
        status=data.get('status', 'Planning'),
        priority=data.get('priority', 'Medium'),
        budget=data.get('budget'),
        progress=data.get('progress', 0.0)
    )
    
    if 'start_date' in data:
        project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    
    if 'end_date' in data:
        project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify({'id': project.id, 'message': 'Project created successfully'}), 201

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify({
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
    })

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    
    project.name = data.get('name', project.name)
    project.description = data.get('description', project.description)
    project.status = data.get('status', project.status)
    project.priority = data.get('priority', project.priority)
    project.budget = data.get('budget', project.budget)
    project.progress = data.get('progress', project.progress)
    
    if 'start_date' in data:
        project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if 'end_date' in data:
        project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    
    db.session.commit()
    
    return jsonify({'message': 'Project updated successfully'})

@app.route('/api/projects/<int:project_id>/employees', methods=['POST'])
def assign_employee_to_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    employee_id = data['employee_id']
    
    employee = Employee.query.get_or_404(employee_id)
    project.employees.append(employee)
    db.session.commit()
    
    return jsonify({'message': 'Employee assigned to project successfully'})

@app.route('/api/projects/<int:project_id>/employees/<int:employee_id>', methods=['DELETE'])
def remove_employee_from_project(project_id, employee_id):
    project = Project.query.get_or_404(project_id)
    employee = Employee.query.get_or_404(employee_id)
    
    project.employees.remove(employee)
    db.session.commit()
    
    return jsonify({'message': 'Employee removed from project successfully'})

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    total_employees = Employee.query.filter(Employee.is_active == True).count()
    total_projects = Project.query.count()
    active_projects = Project.query.filter(Project.status.in_(['Planning', 'In Progress'])).count()
    avg_performance = db.session.query(db.func.avg(Employee.performance_score)).filter(Employee.is_active == True).scalar() or 0
    
    return jsonify({
        'total_employees': total_employees,
        'total_projects': total_projects,
        'active_projects': active_projects,
        'avg_performance': round(avg_performance, 2)
    })

@app.route('/api/dashboard/departments', methods=['GET'])
def get_department_stats():
    stats = db.session.query(
        Employee.department,
        db.func.count(Employee.id).label('count'),
        db.func.avg(Employee.salary).label('avg_salary')
    ).filter(Employee.is_active == True).group_by(Employee.department).all()
    
    return jsonify([{
        'department': stat.department,
        'employee_count': stat.count,
        'avg_salary': round(stat.avg_salary, 2)
    } for stat in stats])

@app.route('/uploads/avatars/<filename>')
def uploaded_avatar(filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], 'avatars'), filename)

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'pdf', 'doc', 'docx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def wait_for_db():
    """Wait for database to be ready"""
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Parse DATABASE_URL
            db_url = os.environ.get('DATABASE_URL', 'postgresql://hr_user:hr_password@localhost:5432/hr_management')
            # Extract connection parameters from URL
            if '://' in db_url:
                db_url = db_url.split('://', 1)[1]  # Remove 'postgresql://'
            
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
    # Wait for database to be ready
    if wait_for_db():
        with app.app_context():
            try:
                db.create_all()
                print("Database tables created successfully!")
            except Exception as e:
                print(f"Error creating database tables: {e}")
        
        app.run(debug=True, host='0.0.0.0')
    else:
        print("Cannot start application without database connection")
        exit(1)
