const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testAuthAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Verificando usuários admin...');
    
    // Verificar se existe usuário admin
    const usersResult = await pool.query(`
      SELECT id, email, role, client_id 
      FROM users 
      WHERE role = 'admin' OR email LIKE '%admin%'
      ORDER BY id
    `);
    
    console.log('Usuários admin encontrados:', usersResult.rows);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado');
      
      // Verificar todos os usuários
      const allUsersResult = await pool.query(`
        SELECT id, email, role, client_id 
        FROM users 
        ORDER BY id 
        LIMIT 5
      `);
      
      console.log('Primeiros 5 usuários:', allUsersResult.rows);
      
      // Promover o primeiro usuário para admin
      if (allUsersResult.rows.length > 0) {
        const firstUser = allUsersResult.rows[0];
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', firstUser.id]);
        console.log(`✅ Usuário ${firstUser.email} promovido para admin`);
      }
    } else {
      const adminUser = usersResult.rows[0];
      console.log(`✅ Usuário admin encontrado: ${adminUser.email}`);
      
      // Testar geração de token
      const payload = {
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          clientId: adminUser.client_id
        }
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('✅ Token gerado para teste:', token.substring(0, 50) + '...');
      
      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verificado:', decoded.user);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testAuthAdmin();