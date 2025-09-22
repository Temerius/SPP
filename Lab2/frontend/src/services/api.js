import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.message || 'Invalid request');
          break;
        case 401:
          console.error('Unauthorized:', 'Please log in again');
          // Redirect to login if needed
          break;
        case 403:
          console.error('Forbidden:', 'You do not have permission to perform this action');
          break;
        case 404:
          console.error('Not Found:', 'Resource not found');
          break;
        case 422:
          console.error('Validation Error:', data.message || 'Please check your input');
          break;
        case 500:
          console.error('Server Error:', 'Something went wrong on our end');
          break;
        default:
          console.error('API Error:', data.message || 'An unexpected error occurred');
      }
    } else if (error.request) {
      // Network error
      console.error('Network Error:', 'Please check your internet connection');
    } else {
      // Other error
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Employees API
export const employeesAPI = {
  getAll: (params = {}) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  uploadAvatar: (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post(`/employees/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  assignEmployee: (projectId, employeeId) => 
    api.post(`/projects/${projectId}/employees`, { employee_id: employeeId }),
  removeEmployee: (projectId, employeeId) => 
    api.delete(`/projects/${projectId}/employees/${employeeId}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getDepartmentStats: () => api.get('/dashboard/departments'),
};

export default api;

