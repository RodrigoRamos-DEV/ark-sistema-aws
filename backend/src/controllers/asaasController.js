const axios = require('axios');

class AsaasController {
  constructor() {
    const environment = process.env.ASAAS_ENVIRONMENT || 'sandbox';
    this.baseURL = environment === 'production' 
      ? 'https://www.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3';
    this.apiKey = process.env.ASAAS_API_KEY;
    
    console.log(`Asaas configurado para: ${environment}`);
    console.log(`URL base: ${this.baseURL}`);
  }

  async request(endpoint, options = {}) {
    try {
      const response = await axios({
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json'
        },
        ...options
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.errors?.[0]?.description || error.message);
    }
  }

  // Criar cliente
  async createCustomer(req, res) {
    try {
      const { name, email, phone, cpfCnpj, address } = req.body;
      
      const customerData = {
        name,
        email,
        phone,
        cpfCnpj,
        postalCode: address?.postalCode,
        address: address?.street,
        addressNumber: address?.number,
        complement: address?.complement,
        province: address?.district,
        city: address?.city,
        state: address?.state
      };

      const result = await this.request('/customers', {
        method: 'POST',
        data: customerData
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Criar cobrança
  async createPayment(req, res) {
    try {
      const { customer, billingType, value, dueDate, description, externalReference } = req.body;
      
      const paymentData = {
        customer,
        billingType,
        value,
        dueDate,
        description,
        externalReference
      };

      const result = await this.request('/payments', {
        method: 'POST',
        data: paymentData
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Listar cobranças
  async getPayments(req, res) {
    try {
      const result = await this.request('/payments', {
        method: 'GET',
        params: req.query
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Buscar cobrança
  async getPayment(req, res) {
    try {
      const { id } = req.params;
      const result = await this.request(`/payments/${id}`, {
        method: 'GET'
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Webhook
  async webhook(req, res) {
    try {
      const { event, payment } = req.body;
      
      // Aqui você pode processar os eventos de pagamento
      console.log('Webhook recebido:', event, payment);
      
      // Atualizar status no seu banco de dados
      // await updatePaymentStatus(payment.id, payment.status);
      
      res.status(200).send('OK');
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Testar conexão
  async testConnection(req, res) {
    try {
      const result = await this.request('/myAccount', {
        method: 'GET'
      });
      res.json({ success: true, account: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new AsaasController();