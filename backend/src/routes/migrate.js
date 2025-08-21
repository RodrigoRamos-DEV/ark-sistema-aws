const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// @route   POST /api/migrate/feira
// @desc    Executar migrações da feira
// @access  Public (temporário)
router.post('/feira', async (req, res) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Executando migrações da feira...');

    // SQL das migrações inline para evitar problemas de path
    const migrationSQL = `
      -- Tabela para produtos da feira
      CREATE TABLE IF NOT EXISTS feira_produtos (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          categoria VARCHAR(50),
          quantidade VARCHAR(255),
          preco VARCHAR(100),
          fotos TEXT[], -- Array de URLs das fotos
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          disponivel BOOLEAN DEFAULT true,
          user_id UUID REFERENCES users(id),
          produtor VARCHAR(255),
          whatsapp VARCHAR(20),
          endereco TEXT,
          descricao TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabela para favoritos das empresas
      CREATE TABLE IF NOT EXISTS feira_favoritos (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id),
          produto_id INTEGER REFERENCES feira_produtos(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, produto_id)
      );

      -- Tabela para notificações admin
      CREATE TABLE IF NOT EXISTS admin_notifications (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(20) DEFAULT 'info', -- info, warning, success, error
          target_audience VARCHAR(20) DEFAULT 'all', -- all, empresa, produtor
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id)
      );

      -- Tabela para notificações dispensadas por usuário
      CREATE TABLE IF NOT EXISTS dismissed_notifications (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id),
          notification_id INTEGER REFERENCES admin_notifications(id),
          dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, notification_id)
      );

      -- Corrigir coluna client_type na tabela users
      ALTER TABLE users ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'produtor';
      
      -- Atualizar registros existentes sem client_type
      UPDATE users SET client_type = 'produtor' WHERE client_type IS NULL;

      -- Índices para performance
      CREATE INDEX IF NOT EXISTS idx_feira_produtos_user_id ON feira_produtos(user_id);
      CREATE INDEX IF NOT EXISTS idx_feira_produtos_disponivel ON feira_produtos(disponivel);
      CREATE INDEX IF NOT EXISTS idx_feira_produtos_categoria ON feira_produtos(categoria);
      CREATE INDEX IF NOT EXISTS idx_feira_favoritos_user_id ON feira_favoritos(user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_target ON admin_notifications(target_audience);
      CREATE INDEX IF NOT EXISTS idx_users_client_type ON users(client_type);
    `;

    // Executar migração
    await pool.query(migrationSQL);
    console.log('✅ Tabelas da feira criadas com sucesso!');

    // Verificar se as tabelas foram criadas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('feira_produtos', 'feira_favoritos', 'admin_notifications', 'dismissed_notifications')
      ORDER BY table_name
    `);

    console.log('📋 Tabelas criadas:', tablesResult.rows.map(r => r.table_name));

    res.json({
      success: true,
      message: 'Migrações executadas com sucesso!',
      tables: tablesResult.rows.map(r => r.table_name)
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao executar migrações',
      error: error.message
    });
  } finally {
    await pool.end();
  }
});

module.exports = router;