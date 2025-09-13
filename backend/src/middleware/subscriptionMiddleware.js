const pool = require('../config/db');

const checkSubscriptionAccess = (requiredFeature = null) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
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
        const expiresAt = new Date(subscription.expires_at);
        if (now <= expiresAt) {
          return next();
        } else {
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