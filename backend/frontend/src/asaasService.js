import API_URL from './apiConfig.js';

class AsaasService {
  constructor() {
    this.baseURL = `${API_URL}/api/asaas`;
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Testar conexão
  async testConnection() {
    return this.request('/test');
  }

  // Criar cliente
  async createCustomer(customerData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }

  // Criar cobrança
  async createPayment(paymentData) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  // Listar cobranças
  async getPayments(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/payments?${params}`);
  }

  // Buscar cobrança por ID
  async getPayment(paymentId) {
    return this.request(`/payments/${paymentId}`);
  }
}

export default new AsaasService();