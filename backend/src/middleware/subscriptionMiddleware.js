const pool = require('../config/db');

// Sincronizar subscription com dados do client (reutilizar função)
const syncSubscriptionWithClient = async (userId, pool) => {
  try {
    const clientResult = await pool.query(
      `SELECT c.license_expires_at, c.license_status 
       FROM users u 
       JOIN clients c ON u.client_id = c.id 
       WHERE u.id = $1`,
      [userId]
    );
    
    if (clientResult.rows.length === 0) return;
    
    const client = clientResult.rows[0];
    const today = new Date();
    const expiresAt = client.license_expires_at ? new Date(client.license_expires_at) : null;
    
    let plan = 'free';
    let status = 'active';
    
    if (expiresAt && expiresAt > today) {
      plan = 'premium';
      status = 'active';
    } else if (expiresAt && expiresAt <= today) {
      plan = 'free';
      status = 'expired';
    }
    
    const subResult = await pool.query(
      'SELECT id FROM subscriptions WHERE user_id = $1',
      [userId]
    );
    
    if (subResult.rows.length === 0) {
      await pool.query(
        'INSERT INTO subscriptions (user_id, plan, status, expires_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [userId, plan, status, expiresAt]
      );
    } else {
      await pool.query(
        'UPDATE subscriptions SET plan = $1, status = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4',
        [plan, status, expiresAt, userId]
      );
    }
  } catch (error) {
    console.error('Erro ao sincronizar subscription no middleware:', error);
  }
};

const checkSubscriptionAccess = (requiredFeature = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Sincronizar antes de verificar acesso
      await syncSubscriptionWithClient(userId, pool);
      
      const result = await pool.query(
        'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      
      // Se não tem assinatura, criar trial gratuito
      if (result.rows.length === 0) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 3);
        
        await pool.query(
          'INSERT INTO subscriptions (user_id, plan, trial_ends_at) VALUES ($1, $2, $3)',
          [userId, 'free', trialEnd]
        );
        
        // Durante trial, tem acesso a tudo
        return next();
      }
      
      const subscription = result.rows[0];
      const now = new Date();
      
      // Verificar trial
      if (subscription.plan === 'free' && subscription.trial_ends_at) {
        const trialEnd = new Date(subscription.trial_ends_at);
        
        if (now <= trialEnd) {
          // Ainda no trial - acesso liberado
          return next();
        } else {
          // Trial expirado - só feira
          if (requiredFeature && requiredFeature !== 'feira') {
            return res.status(403).json({ 
              error: 'Acesso negado', 
              message: 'Seu período de teste expirou. Assine o plano Premium para continuar.',
              needsUpgrade: true 
            });
          }
        }
      }
      
      // Plano premium ativo
      if (subscription.plan === 'premium' && subscription.status === 'active') {
        if (subscription.expires_at) {
          const expiresAt = new Date(subscription.expires_at);
          const today = new Date();
          
          // Resetar horas para comparar apenas datas
          today.setHours(0, 0, 0, 0);
          expiresAt.setHours(0, 0, 0, 0);
          
          if (today <= expiresAt) {
            return next();
          } else {
            // Atualizar status para expirado
            await pool.query(
              'UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
              ['expired', userId]
            );
            
            return res.status(403).json({ 
              error: 'Assinatura expirada', 
              message: 'Sua assinatura expirou. Renove para continuar.',
              needsUpgrade: true 
            });
          }
        } else {
          // Se não tem data de expiração, considerar ativo
          return next();
        }
      }
      
      // Se status é expired, verificar acesso
      if (subscription.status === 'expired') {
        if (requiredFeature && requiredFeature !== 'feira') {
          return res.status(403).json({ 
            error: 'Assinatura expirada', 
            message: 'Sua assinatura expirou. Renove para continuar.',
            needsUpgrade: true 
          });
        }
      }
      
      // Default: só feira para plano free
      if (requiredFeature && requiredFeature !== 'feira') {
        return res.status(403).json({ 
          error: 'Acesso negado', 
          message: 'Esta funcionalidade requer o plano Premium.',
          needsUpgrade: true 
        });
      }
      
      next();
    } catch (error) {
      console.error('Erro no middleware de assinatura:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

module.exports = { checkSubscriptionAccess };