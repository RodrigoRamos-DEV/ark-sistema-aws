import axios from 'axios';
import API_URL from '../apiConfig';
import { showToast } from '../components/Toast';

// Configuração base do axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          showToast('Sessão expirada. Faça login novamente.', 'error');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          break;
        case 403:
          showToast('Acesso negado.', 'error');
          break;
        case 404:
          showToast('Recurso não encontrado.', 'error');
          break;
        case 422:
          showToast(data.error || 'Dados inválidos.', 'error');
          break;
        case 500:
          showToast('Erro interno do servidor.', 'error');
          break;
        default:
          showToast(data.error || 'Erro inesperado.', 'error');
      }
    } else if (error.request) {
      showToast('Erro de conexão. Verifique sua internet.', 'error');
    } else {
      showToast('Erro inesperado.', 'error');
    }
    
    return Promise.reject(error);
  }
);

// Funções de API organizadas por módulo
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/api/auth/reset-password/${token}`, { password })
};

export const userAPI = {
  getProfile: () => api.get('/api/data/profile'),
  updateProfile: (formData) => api.put('/api/data/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const employeeAPI = {
  getAll: () => api.get('/api/data/employees'),
  create: (data) => api.post('/api/data/employees', data),
  update: (id, data) => api.put(`/api/data/employees/${id}`, data),
  delete: (id) => api.delete(`/api/data/employees/${id}`)
};

export const itemAPI = {
  getAll: () => api.get('/api/data/items'),
  create: (data) => api.post('/api/data/items', data),
  update: (id, data) => api.put(`/api/data/items/${id}`, data),
  delete: (id) => api.delete(`/api/data/items/${id}`)
};

export const productAPI = {
  getAll: () => api.get('/api/data/produtos'),
  create: (data) => api.post('/api/data/produtos', data),
  update: (id, data) => api.put(`/api/data/produtos/${id}`, data),
  delete: (id) => api.delete(`/api/data/produtos/${id}`)
};

export const transactionAPI = {
  getAll: (params) => api.get('/api/data/transactions', { params }),
  create: (data) => api.post('/api/data/transactions', data),
  update: (id, data) => api.put(`/api/data/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/data/transactions/${id}`),
  batchDelete: (ids) => api.post('/api/data/transactions/batch-delete', { ids }),
  addAttachment: (id, formData) => api.post(`/api/data/transactions/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAttachment: (attachmentId) => api.delete(`/api/data/attachments/${attachmentId}`)
};

export const orderAPI = {
  getAll: () => api.get('/api/data/pedidos'),
  create: (data) => api.post('/api/data/pedidos', data),
  getDetails: (id) => api.get(`/api/data/pedidos/${id}`)
};

export const invoiceAPI = {
  getAll: (params) => api.get('/api/data/notas-fiscais', { params }),
  create: (data) => api.post('/api/data/notas-fiscais', data),
  update: (id, data) => api.put(`/api/data/notas-fiscais/${id}`, data),
  delete: (id) => api.delete(`/api/data/notas-fiscais/${id}`),
  getDetails: (id) => api.get(`/api/data/notas-fiscais/${id}`),
  generatePDF: (id) => api.get(`/api/data/notas-fiscais/${id}/pdf`),
  createTest: () => api.post('/api/data/notas-fiscais/teste')
};

export const reportAPI = {
  generate: (data) => api.post('/api/data/generate-report', data)
};

export const dashboardAPI = {
  getData: (params) => api.get('/api/data/dashboard', { params })
};

export const searchAPI = {
  global: (query) => api.get('/api/data/search', { params: { q: query } })
};

// Função helper para download de arquivos
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    showToast('Erro ao baixar arquivo.', 'error');
  }
};

export default api;