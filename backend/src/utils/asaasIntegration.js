const axios = require('axios');
const { Pool } = require('pg');

class AsaasIntegration {
  constructor() {
    this.baseURL = 'https://sandbox.asaas.com/api/v3';
    this.apiKey = process.env.ASAAS_API_KEY;
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // Sincronizar cliente do sistema com Asaas
  async syncClientToAsaas(clientId) {
    try {
      // Buscar cliente no sistema
      const clientQuery = 'SELECT * FROM clients WHERE id = $1';
      const clientResult = await this.pool.query(clientQuery, [clientId]);
      
      if (clientResult.rows.length === 0) {
        throw new Error('Cliente não encontrado');
      }

      const client = clientResult.rows[0];
      
      // Criar cliente no Asaas
      const asaasCustomer = {
        name: client.nome,
        email: client.email,
        phone: client.telefone,
        cpfCnpj: client.cpf_cnpj,
        externalReference: client.id.toString()
      };

      const response = await axios.post(`${this.baseURL}/customers`, asaasCustomer, {
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Salvar ID do Asaas no cliente
      await this.pool.query(
        'UPDATE clients SET asaas_customer_id = $1 WHERE id = $2',
        [response.data.id, clientId]
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar cliente:', error);
      throw error;
    }
  }

  // Criar cobrança para pedido
  async createPaymentForOrder(orderId) {
    try {
      // Buscar pedido e cliente
      const orderQuery = `
        SELECT p.*, c.nome, c.email, c.telefone, c.asaas_customer_id 
        FROM pedidos p 
        JOIN clients c ON p.client_id = c.id 
        WHERE p.id = $1
      `;
      const orderResult = await this.pool.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Pedido não encontrado');
      }

      const order = orderResult.rows[0];
      
      // Se cliente não tem ID do Asaas, sincronizar
      let customerId = order.asaas_customer_id;
      if (!customerId) {
        const customer = await this.syncClientToAsaas(order.client_id);
        customerId = customer.id;
      }

      // Criar cobrança
      const paymentData = {
        customer: customerId,
        billingType: 'BOLETO', // ou 'PIX'
        value: parseFloat(order.total),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
        description: `Pedido #${orderId}`,
        externalReference: orderId.toString()
      };

      const response = await axios.post(`${this.baseURL}/payments`, paymentData, {
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Salvar ID da cobrança no pedido
      await this.pool.query(
        'UPDATE pedidos SET asaas_payment_id = $1, payment_status = $2 WHERE id = $3',
        [response.data.id, 'PENDING', orderId]
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      throw error;
    }
  }

  // Atualizar status do pagamento
  async updatePaymentStatus(paymentId, status) {
    try {
      await this.pool.query(
        'UPDATE pedidos SET payment_status = $1 WHERE asaas_payment_id = $2',
        [status, paymentId]
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }
}

module.exports = new AsaasIntegration();