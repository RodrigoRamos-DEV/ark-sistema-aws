require('dotenv').config();
const { Pool } = require('pg');

// Script para migrar dados existentes do localStorage para o banco
// IMPORTANTE: Execute este script APÓS os usuários exportarem seus dados

async function migrateFakeData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Criando dados de exemplo para teste...');

    // Buscar um usuário produtor para associar os produtos
    const userResult = await pool.query(`
      SELECT id, company_name FROM users 
      WHERE client_type = 'produtor' 
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('⚠️  Nenhum usuário produtor encontrado. Criando dados de exemplo...');
      return;
    }

    const user = userResult.rows[0];

    // Produtos de exemplo
    const produtosExemplo = [
      {
        nome: 'Tomate Orgânico',
        categoria: 'legumes',
        quantidade: '50 kg',
        preco: '8,50/kg',
        fotos: [],
        latitude: -23.5505,
        longitude: -46.6333,
        disponivel: true,
        produtor: user.company_name,
        whatsapp: '11999999999',
        endereco: 'São Paulo, SP',
        descricao: 'Tomates orgânicos frescos, cultivados sem agrotóxicos'
      },
      {
        nome: 'Alface Crespa',
        categoria: 'verduras',
        quantidade: '30 unidades',
        preco: '3,00/unidade',
        fotos: [],
        latitude: -23.5505,
        longitude: -46.6333,
        disponivel: true,
        produtor: user.company_name,
        whatsapp: '11999999999',
        endereco: 'São Paulo, SP',
        descricao: 'Alface fresca colhida na manhã'
      }
    ];

    for (const produto of produtosExemplo) {
      const query = `
        INSERT INTO feira_produtos 
        (nome, categoria, quantidade, preco, fotos, latitude, longitude, disponivel, user_id, produtor, whatsapp, endereco, descricao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, nome
      `;

      const values = [
        produto.nome, produto.categoria, produto.quantidade, produto.preco, produto.fotos,
        produto.latitude, produto.longitude, produto.disponivel,
        user.id, produto.produtor, produto.whatsapp, produto.endereco, produto.descricao
      ];

      const result = await pool.query(query, values);
      console.log(`✅ Produto criado: ${result.rows[0].nome} (ID: ${result.rows[0].id})`);
    }

    // Criar algumas notificações de exemplo
    const adminResult = await pool.query(`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `);

    if (adminResult.rows.length > 0) {
      const adminId = adminResult.rows[0].id;

      const notificacoesExemplo = [
        {
          title: 'Bem-vindos ao Sistema de Feira!',
          message: 'O novo sistema de feira está disponível. Produtores podem cadastrar seus produtos e empresas podem encontrar fornecedores locais.',
          type: 'success',
          target_audience: 'all'
        },
        {
          title: 'Dica para Produtores',
          message: 'Lembrem-se de manter seus produtos sempre atualizados com preços e disponibilidade.',
          type: 'info',
          target_audience: 'produtor'
        }
      ];

      for (const notif of notificacoesExemplo) {
        const query = `
          INSERT INTO admin_notifications (title, message, type, target_audience, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, title
        `;

        const result = await pool.query(query, [notif.title, notif.message, notif.type, notif.target_audience, adminId]);
        console.log(`📢 Notificação criada: ${result.rows[0].title}`);
      }
    }

    console.log('🎉 Dados de exemplo criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar dados:', error);
  } finally {
    await pool.end();
  }
}

migrateFakeData();