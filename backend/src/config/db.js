const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(connectionConfig);

module.exports = {
  // Para queries simples, fora de uma transação
  query: (text, params) => pool.query(text, params),
  // Para transações, pegamos um cliente específico do pool
  getClient: () => pool.connect(),
};