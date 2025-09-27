import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Включаем отправку cookies
});


api.interceptors.request.use(
  (config) => {
    // Токены теперь передаются через HttpOnly cookies, поэтому не нужно добавлять их в заголовки
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {

    if (error.response) {
      
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.message || 'Invalid request');
          break;
        case 401:
          console.error('Unauthorized:', 'Please log in again');
          // При 401 ошибке перенаправляем на страницу логина только если это не запрос /auth/me
          if (!error.config?.url?.includes('/auth/me')) {
            // Попробуем обновить токен перед перенаправлением
            try {
              const refreshResponse = await api.post('/auth/refresh');
              if (refreshResponse.status === 200) {
                // Токен обновлен, повторяем оригинальный запрос
                return api.request(error.config);
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Forbidden:', 'You do not have permission to perform this action');
          // Для 403 ошибки НЕ перенаправляем, показываем уведомление
          // Перенаправление будет обработано в компонентах
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
      
      console.error('Network Error:', 'Please check your internet connection');
    } else {
      
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

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

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getDepartmentStats: () => api.get('/dashboard/departments'),
};

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, role = 'user') => api.post('/auth/register', { email, password, role }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

export default api;

