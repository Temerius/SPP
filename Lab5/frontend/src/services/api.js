import axios from 'axios';

const GRAPHQL_URL = process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql';

const client = axios.create({
  baseURL: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

async function graphqlRequest(query, variables = {}) {
  const resp = await client.post('', { query, variables });
  if (resp.data.errors && resp.data.errors.length) {
    const message = resp.data.errors.map(e => e.message).join('; ');
    throw new Error(message);
  }
  return resp.data.data;
}

export const employeesAPI = {
  getAll: ({ page = 1, per_page = 10, search = '', department = '' } = {}) => {
    const query = `
      query Employees($page: Int, $per_page: Int, $search: String, $department: String) {
        employees(page: $page, per_page: $per_page, search: $search, department: $department) {
          employees { id first_name last_name email position department hire_date salary avatar skills performance_score projects_count }
          total pages current_page
        }
      }
    `;
    return graphqlRequest(query, { page, per_page, search, department }).then(d => ({ data: d.employees }));
  },
  getById: (id) => {
    const query = `
      query Employee($id: ID!) {
        employee(id: $id) {
          id first_name last_name email position department hire_date salary avatar skills performance_score
          projects { id name status progress }
        }
      }
    `;
    return graphqlRequest(query, { id }).then(d => ({ data: d.employee }));
  },
  create: (data) => {
    const mutation = `
      mutation CreateEmployee($first_name: String!, $last_name: String!, $email: String!, $position: String!, $department: String!, $hire_date: String!, $salary: Float!, $skills: [String!], $performance_score: Float) {
        createEmployee(
          first_name: $first_name, last_name: $last_name, email: $email, position: $position,
          department: $department, hire_date: $hire_date, salary: $salary, skills: $skills,
          performance_score: $performance_score
        ) { message }
      }
    `;
    return graphqlRequest(mutation, data).then(d => ({ data: d.createEmployee }));
  },
  update: (id, data) => {
    const mutation = `
      mutation UpdateEmployee($id: ID!, $first_name: String, $last_name: String, $email: String, $position: String, $department: String, $hire_date: String, $salary: Float, $skills: [String!], $performance_score: Float) {
        updateEmployee(
          id: $id,
          first_name: $first_name, last_name: $last_name, email: $email, position: $position,
          department: $department, hire_date: $hire_date, salary: $salary, skills: $skills,
          performance_score: $performance_score
        ) { message }
      }
    `;
    return graphqlRequest(mutation, { id, ...data }).then(d => ({ data: d.updateEmployee }));
  },
  delete: (id) => {
    const mutation = `
      mutation DeleteEmployee($id: ID!) { deleteEmployee(id: $id) { message } }
    `;
    return graphqlRequest(mutation, { id }).then(d => ({ data: d.deleteEmployee }));
  },
  uploadAvatar: (id, file) => {
    
    const formData = new FormData();
    formData.append('avatar', file);
    return axios.post((process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + `/employees/${id}/avatar`, formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(response => {
      
      const mutation = `
        mutation UploadAvatar($employeeId: ID!, $filename: String!) {
          uploadAvatar(employeeId: $employeeId, filename: $filename) { message }
        }
      `;
      return graphqlRequest(mutation, { employeeId: id, filename: response.data.filename });
    });
  },
};

export const projectsAPI = {
  getAll: () => {
    const query = `
      query { projects { id name description status start_date end_date budget priority progress employees_count employees { id first_name last_name position } } }
    `;
    return graphqlRequest(query).then(d => ({ data: d.projects }));
  },
  getById: (id) => {
    const query = `
      query Project($id: ID!) { project(id: $id) { id name description status start_date end_date budget priority progress employees_count employees { id first_name last_name position } } }
    `;
    return graphqlRequest(query, { id }).then(d => ({ data: d.project }));
  },
  create: (data) => {
    const mutation = `
      mutation CreateProject($name: String!, $description: String, $status: String, $priority: String, $budget: Float, $progress: Float) { 
        createProject(name: $name, description: $description, status: $status, priority: $priority, budget: $budget, progress: $progress) { message } 
      }
    `;
    return graphqlRequest(mutation, data).then(d => ({ data: d.createProject }));
  },
  update: (id, data) => {
    const mutation = `
      mutation UpdateProject($id: ID!, $name: String, $description: String, $status: String, $priority: String, $budget: Float, $progress: Float, $start_date: String, $end_date: String) { 
        updateProject(id: $id, name: $name, description: $description, status: $status, priority: $priority, budget: $budget, progress: $progress, start_date: $start_date, end_date: $end_date) { message } 
      }
    `;
    return graphqlRequest(mutation, { id, ...data }).then(d => ({ data: d.updateProject }));
  },
  delete: (id) => {

    throw new Error('deleteProject not implemented in GraphQL schema');
  },
  assignEmployee: (projectId, employeeId) => {
    const mutation = `
      mutation Assign($projectId: ID!, $employeeId: ID!) { assignEmployee(projectId: $projectId, employeeId: $employeeId) { message } }
    `;
    return graphqlRequest(mutation, { projectId, employeeId }).then(d => ({ data: d.assignEmployee }));
  },
  removeEmployee: (projectId, employeeId) => {
    const mutation = `
      mutation Remove($projectId: ID!, $employeeId: ID!) { removeEmployee(projectId: $projectId, employeeId: $employeeId) { message } }
    `;
    return graphqlRequest(mutation, { projectId, employeeId }).then(d => ({ data: d.removeEmployee }));
  },
};

export const dashboardAPI = {
  getStats: () => {
    const query = `
      query { dashboardStats { total_employees total_projects active_projects avg_performance } }
    `;
    return graphqlRequest(query).then(d => ({ data: d.dashboardStats }));
  },
  getDepartmentStats: () => {
    const query = `
      query { departmentStats { department employee_count avg_salary } }
    `;
    return graphqlRequest(query).then(d => ({ data: d.departmentStats }));
  },
};

export const authAPI = {
  login: (email, password) => {
    const mutation = `
      mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { message user { id email role } } }
    `;
    return graphqlRequest(mutation, { email, password }).then(d => ({ data: d.login }));
  },
  register: (email, password, role = 'user') => {
    const mutation = `
      mutation Register($email: String!, $password: String!, $role: String) { register(email: $email, password: $password, role: $role) { message } }
    `;
    return graphqlRequest(mutation, { email, password, role }).then(d => ({ data: d.register }));
  },
  logout: () => {
    const mutation = `
      mutation { logout { message } }
    `;
    return graphqlRequest(mutation).then(d => ({ data: d.logout }));
  },
  refreshToken: () => {
    const mutation = `
      mutation { refreshToken { message } }
    `;
    return graphqlRequest(mutation).then(d => ({ data: d.refreshToken }));
  },
  getCurrentUser: () => {
    const query = `
      query { me { id email role } }
    `;
    return graphqlRequest(query).then(d => ({ data: { user: d.me } }));
  },
  changePassword: (currentPassword, newPassword) => {
    const mutation = `
      mutation ChangePassword($current: String!, $next: String!) { changePassword(current_password: $current, new_password: $next) { message } }
    `;
    return graphqlRequest(mutation, { current: currentPassword, next: newPassword }).then(d => ({ data: d.changePassword }));
  },
};

export default { graphqlRequest };

