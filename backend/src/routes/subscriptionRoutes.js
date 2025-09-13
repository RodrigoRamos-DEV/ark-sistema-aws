const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const axios = require('axios');

// Simular webhook do Asaas manualmente (para teste em desenvolvimento)
router.post('/simulate-webhook', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }
    
    // Buscar usuário pelo email
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Atualizar assinatura para premium
    await pool.query(
      'UPDATE subscriptions SET plan = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
      ['premium', 'active', userId]
    );
    
    console.log(`Webhook simulado: Usuário ${email} (${userId}) atualizado para premium`);
    res.json({ success: true, message: `Usuário ${email} atualizado para premium!` });
  } catch (error) {
    console.error('Erro ao simular webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar tabela de assinaturas (executar uma vez)
router.post('/setup', authMiddleware, async (req, res) => {
  try {
    console.log('Tentando criar tabela subscriptions...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        plan VARCHAR(20) DEFAULT 'free',
        status VARCHAR(20) DEFAULT 'active',
        trial_ends_at TIMESTAMP,
        expires_at TIMESTAMP,
        asaas_subscription_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Query SQL:', query);
    await pool.query(query);
    
    console.log('Tabela criada com sucesso!');
    res.json({ message: 'Tabela de assinaturas criada com sucesso' });
  } catch (error) {
    console.error('Erro detalhado ao criar tabela:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Obter plano atual do usuário
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      // Criar assinatura gratuita para novos usuários
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3);
      
      await pool.query(
        'INSERT INTO subscriptions (user_id, plan, trial_ends_at) VALUES ($1, $2, $3)',
        [req.user.id, 'free', trialEnd]
      );
      
      return res.json({
        plan: 'free',
        status: 'trial',
        trial_ends_at: trialEnd,
        days_left: 3
      });
    }
    
    const subscription = result.rows[0];
    const now = new Date();
    
    // Se status é expired, sempre retornar como expired (mesmo durante trial)
    if (subscription.status === 'expired') {
      return res.json({
        ...subscription,
        status: 'expired',
        days_left: 0
      });
    }
    
    // Verificar se ainda está no trial
    if (subscription.plan === 'free' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        return res.json({
          ...subscription,
          status: 'trial',
          days_left: daysLeft
        });
      } else {
        return res.json({
          ...subscription,
          status: 'expired_trial',
          days_left: 0
        });
      }
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Erro ao obter assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar checkout para assinatura premium
router.post('/create-checkout', authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (plan !== 'premium') {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Buscar dados do usuário e cliente
    const userResult = await pool.query(`
      SELECT u.email, u.cpf, c.company_name as name 
      FROM users u 
      LEFT JOIN clients c ON u.client_id = c.id 
      WHERE u.id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = userResult.rows[0];
    
    // Se não tem nome da empresa, usar email
    if (!user.name) {
      user.name = user.email.split('@')[0];
    }
    
    // Validar se tem CPF
    if (!user.cpf || user.cpf.trim() === '') {
      return res.status(400).json({ 
        error: 'CPF obrigatório',
        message: 'Para assinar o plano premium, é necessário ter CPF cadastrado no perfil.'
      });
    }

    const asaasApiKey = process.env.ASAAS_API_KEY;
    
    if (!asaasApiKey) {
      return res.status(500).json({ error: 'Configuração do Asaas não encontrada' });
    }

    const environment = process.env.ASAAS_ENVIRONMENT || 'sandbox';
    const asaasUrl = environment === 'production' 
      ? 'https://www.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3';
    
    console.log(`Criando checkout no ambiente: ${environment}`);
    console.log(`URL Asaas: ${asaasUrl}`);

    // 1. Criar cliente no Asaas com dados reais
    const customerData = {
      name: user.name,
      email: user.email,
      cpfCnpj: user.cpf.replace(/\D/g, ''), // Remove caracteres não numéricos
      externalReference: req.user.id
    };

    let customerId;
    try {
      const customerResponse = await axios.post(`${asaasUrl}/customers`, customerData, {
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json'
        }
      });
      customerId = customerResponse.data.id;
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.errors?.[0]?.description?.includes('já existe')) {
        // Cliente já existe, buscar por email
        const searchResponse = await axios.get(`${asaasUrl}/customers?email=${user.email}`, {
          headers: { 'access_token': asaasApiKey }
        });
        customerId = searchResponse.data.data[0]?.id;
        
        if (!customerId) {
          throw new Error('Não foi possível encontrar ou criar cliente');
        }
      } else {
        throw error;
      }
    }

    // 2. Criar cobrança
    const paymentData = {
      customer: customerId,
      billingType: 'BOLETO',
      value: 39.90,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Assinatura Premium - Sistema ARK',
      externalReference: req.user.id
    };

    const paymentResponse = await axios.post(`${asaasUrl}/payments`, paymentData, {
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      }
    });

    const payment = paymentResponse.data;
    
    res.json({
      checkoutUrl: payment.invoiceUrl || payment.bankSlipUrl,
      paymentId: payment.id
    });
    
  } catch (error) {
    console.error('Erro ao criar checkout:', error.response?.data || error.message);
    
    if (error.response?.data?.errors?.[0]?.description?.includes('CPF/CNPJ')) {
      return res.status(400).json({ 
        error: 'CPF inválido',
        message: 'O CPF informado no seu perfil é inválido. Por favor, atualize seu CPF no perfil.'
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao processar pagamento',
      details: error.response?.data || error.message
    });
  }
});

// Verificar acesso a funcionalidade
router.get('/check-access/:feature', authMiddleware, async (req, res) => {
  try {
    const { feature } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ hasAccess: feature === 'feira' });
    }
    
    const subscription = result.rows[0];
    const now = new Date();
    
    // Se status é expired, sem acesso (exceto feira, perfil, planos)
    if (subscription.status === 'expired') {
      return res.json({ hasAccess: ['vitrine', 'profile', 'planos'].includes(feature) });
    }
    
    // Verificar trial
    if (subscription.plan === 'free' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      if (now <= trialEnd) {
        return res.json({ hasAccess: true }); // Trial tem acesso a tudo
      } else {
        return res.json({ hasAccess: feature === 'feira' }); // Após trial, só feira
      }
    }
    
    // Plano premium
    if (subscription.plan === 'premium' && subscription.status === 'active') {
      return res.json({ hasAccess: true });
    }
    
    // Default: só feira
    res.json({ hasAccess: feature === 'feira' });
  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Testar webhook
router.post('/test-webhook', async (req, res) => {
  try {
    console.log('🔔 Teste de webhook recebido:', req.body);
    res.status(200).json({ 
      success: true, 
      message: 'Webhook funcionando!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no teste de webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router; confirmação de pagamento (para teste)
router.post('/confirm-payment', authMiddleware, async (req, res) => {
  try {
    // Atualizar assinatura do usuário para premium
    await pool.query(
      'UPDATE subscriptions SET plan = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
      ['premium', 'active', req.user.id]
    );
    
    console.log(`Usuário ${req.user.id} atualizado para premium`);
    res.json({ success: true, message: 'Plano atualizado para premium!' });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Webhook do Asaas para receber notificações de pagamento
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    console.log('Webhook recebido:', event);

    if (event.event === 'PAYMENT_RECEIVED') {
      const paymentId = event.payment.id;
      const externalReference = event.payment.externalReference;
      
      if (externalReference) {
        // Atualizar assinatura do usuário para premium
        await pool.query(
          'UPDATE subscriptions SET plan = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
          ['premium', 'active', externalReference]
        );
        
        console.log(`Usuário ${externalReference} atualizado para premium`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Endpoints admin para gerenciar assinaturas
router.get('/admin/subscriptions', authMiddleware, async (req, res) => {
  try {
    // Verificar se é admin
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query(`
      SELECT s.*, u.email, c.company_name 
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN clients c ON u.client_id = c.id
      ORDER BY s.updated_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Atualizar assinatura manualmente (admin)
router.put('/admin/subscriptions/:userId', authMiddleware, async (req, res) => {
  try {
    // Verificar se é admin
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { userId } = req.params;
    const { plan, status, expires_at } = req.body;
    
    await pool.query(
      'UPDATE subscriptions SET plan = $1, status = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
      [plan, status, expires_at, userId]
    );
    
    res.json({ success: true, message: 'Assinatura atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;