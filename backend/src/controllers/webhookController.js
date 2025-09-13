const { Pool } = require('pg');

class WebhookController {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async handleAsaasWebhook(req, res) {
    try {
      const { event, payment } = req.body;
      
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔔 Webhook Asaas:`, { event, paymentId: payment?.id, value: payment?.value });

      // Salvar evento no banco
      await this.saveWebhookEvent(event, payment);

      // Processar diferentes tipos de eventos
      switch (event) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          await this.handlePaymentReceived(payment);
          break;
        case 'PAYMENT_OVERDUE':
          await this.handlePaymentOverdue(payment);
          break;
        case 'PAYMENT_CREATED':
          console.log('📄 Pagamento criado:', payment.id);
          break;
        default:
          console.log('Evento não processado:', event);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro no webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async saveWebhookEvent(event, payment) {
    const query = `
      INSERT INTO asaas_webhook_events (event_type, payment_id, payment_data, created_at)
      VALUES ($1, $2, $3, NOW())
    `;
    
    try {
      await this.pool.query(query, [event, payment?.id, JSON.stringify(payment)]);
    } catch (error) {
      // Se a tabela não existir, criar
      if (error.code === '42P01') {
        await this.createWebhookTable();
        await this.pool.query(query, [event, payment?.id, JSON.stringify(payment)]);
      } else {
        throw error;
      }
    }
  }

  async createWebhookTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS asaas_webhook_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        payment_id VARCHAR(100),
        payment_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await this.pool.query(createTableQuery);
  }

  async handlePaymentReceived(payment) {
    console.log('💰 Pagamento recebido:', payment.id, 'Valor:', payment.value);
    
    try {
      // Atualizar status no banco de dados
      await this.updatePaymentStatus(payment.id, 'RECEIVED');
      
      // Se for pagamento de assinatura premium
      if (payment.description?.includes('Assinatura Premium')) {
        await this.activateSubscription(payment.externalReference, payment.value);
      }
      
      console.log('✅ Pagamento processado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
    }
  }

  async handlePaymentOverdue(payment) {
    console.log('⚠️ Pagamento vencido:', payment.id);
    
    try {
      await this.updatePaymentStatus(payment.id, 'OVERDUE');
      
      // Suspender licença se necessário
      if (payment.description?.includes('Licença')) {
        await this.suspendLicense(payment.customer);
      }
      
      console.log('🚨 Licença suspensa por falta de pagamento');
    } catch (error) {
      console.error('❌ Erro ao processar vencimento:', error);
    }
  }

  async handlePaymentConfirmed(payment) {
    console.log('✅ Pagamento confirmado:', payment.id);
    
    try {
      await this.updatePaymentStatus(payment.id, 'CONFIRMED');
      console.log('🎉 Pagamento confirmado e processado');
    } catch (error) {
      console.error('❌ Erro ao confirmar pagamento:', error);
    }
  }

  async updatePaymentStatus(paymentId, status) {
    const query = `
      UPDATE asaas_payments 
      SET status = $1, updated_at = NOW() 
      WHERE payment_id = $2
    `;
    
    try {
      await this.pool.query(query, [status, paymentId]);
    } catch (error) {
      console.log('Tabela de pagamentos não existe, criando...');
      await this.createPaymentsTable();
    }
  }

  async createPaymentsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS asaas_payments (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(100) UNIQUE NOT NULL,
        customer_id VARCHAR(100),
        status VARCHAR(50),
        value DECIMAL(10,2),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await this.pool.query(createTableQuery);
  }

  async activateSubscription(userId, value) {
    try {
      // Ativar assinatura premium para o usuário
      const query = `
        UPDATE subscriptions 
        SET plan = 'premium', status = 'active', updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1
      `;
      
      await this.pool.query(query, [userId]);
      console.log(`🎆 Assinatura premium ativada para usuário ${userId}`);
    } catch (error) {
      console.error('Erro ao ativar assinatura:', error);
    }
  }

  async suspendLicense(customerId) {
    console.log(`🚫 Suspendendo licença do cliente ${customerId}`);
  }
}

module.exports = new WebhookController();