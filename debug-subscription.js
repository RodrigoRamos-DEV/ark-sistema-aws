const { Pool } = require('pg');
require('dotenv').config();

async function debugSubscription() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Buscar usuário pelo email
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['jessicapinheiro020301@yahoo.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log('✅ Usuário encontrado:', userId);
    
    // Buscar subscription
    const subResult = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [userId]
    );
    
    console.log('📊 Subscriptions encontradas:', subResult.rows.length);
    subResult.rows.forEach((sub, index) => {
      console.log(`\n--- Subscription ${index + 1} ---`);
      console.log('ID:', sub.id);
      console.log('Plan:', sub.plan);
      console.log('Status:', sub.status);
      console.log('Expires At:', sub.expires_at);
      console.log('Trial Ends At:', sub.trial_ends_at);
      console.log('Created At:', sub.created_at);
      console.log('Updated At:', sub.updated_at);
      
      if (sub.expires_at) {
        const today = new Date();
        const expiresAt = new Date(sub.expires_at);
        today.setHours(0, 0, 0, 0);
        expiresAt.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));
        console.log('Dias restantes calculados:', daysLeft);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

debugSubscription();