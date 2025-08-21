const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configurar AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Configurar multer para upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  }
});

// Upload de foto para S3
const uploadToS3 = async (file) => {
  const fileName = `feira/${uuidv4()}-${Date.now()}.${file.originalname.split('.').pop()}`;
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  const result = await s3.upload(params).promise();
  return result.Location;
};

// @route   POST /api/feira/upload
// @desc    Upload de fotos para S3
// @access  Private
router.post('/upload', auth, upload.array('fotos', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Nenhuma foto enviada' });
    }

    const uploadPromises = req.files.map(file => uploadToS3(file));
    const urls = await Promise.all(uploadPromises);

    res.json({ urls });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ message: 'Erro no upload das fotos' });
  }
});

// @route   GET /api/feira/produtos
// @desc    Listar produtos da feira
// @access  Private
router.get('/produtos', auth, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    let query = `
      SELECT fp.*, u.company_name as produtor_nome
      FROM feira_produtos fp
      LEFT JOIN users u ON fp.user_id = u.id
      WHERE fp.disponivel = true
      ORDER BY fp.created_at DESC
    `;

    // Se for produtor, mostrar apenas seus produtos
    if (req.user.clientType === 'produtor') {
      query = `
        SELECT fp.*, u.company_name as produtor_nome
        FROM feira_produtos fp
        LEFT JOIN users u ON fp.user_id = u.id
        WHERE fp.user_id = $1
        ORDER BY fp.created_at DESC
      `;
    }

    const result = req.user.clientType === 'produtor' 
      ? await pool.query(query, [req.user.id])
      : await pool.query(query);

    // Converter para formato compatível com localStorage
    const produtos = result.rows.map(row => ({
      id: row.id,
      nome: row.nome,
      categoria: row.categoria,
      quantidade: row.quantidade,
      preco: row.preco,
      fotos: row.fotos || [],
      latitude: row.latitude,
      longitude: row.longitude,
      disponivel: row.disponivel,
      userId: row.user_id,
      produtor: row.produtor || row.produtor_nome,
      whatsapp: row.whatsapp,
      endereco: row.endereco,
      descricao: row.descricao,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// @route   POST /api/feira/produtos
// @desc    Criar produto na feira
// @access  Private
router.post('/produtos', auth, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const {
      nome, categoria, quantidade, preco, fotos,
      latitude, longitude, disponivel, whatsapp, endereco, descricao
    } = req.body;

    const query = `
      INSERT INTO feira_produtos 
      (nome, categoria, quantidade, preco, fotos, latitude, longitude, disponivel, user_id, produtor, whatsapp, endereco, descricao)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      nome, categoria, quantidade, preco, fotos,
      latitude, longitude, disponivel !== false,
      req.user.id, req.user.companyName || req.user.name,
      whatsapp, endereco, descricao
    ];

    const result = await pool.query(query, values);
    const produto = result.rows[0];

    // Retornar no formato compatível
    const produtoFormatado = {
      id: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      quantidade: produto.quantidade,
      preco: produto.preco,
      fotos: produto.fotos || [],
      latitude: produto.latitude,
      longitude: produto.longitude,
      disponivel: produto.disponivel,
      userId: produto.user_id,
      produtor: produto.produtor,
      whatsapp: produto.whatsapp,
      endereco: produto.endereco,
      descricao: produto.descricao,
      createdAt: produto.created_at
    };

    res.status(201).json(produtoFormatado);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// @route   PUT /api/feira/produtos/:id
// @desc    Atualizar produto
// @access  Private
router.put('/produtos/:id', auth, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const {
      nome, categoria, quantidade, preco, fotos,
      latitude, longitude, disponivel, descricao
    } = req.body;

    const query = `
      UPDATE feira_produtos 
      SET nome = $1, categoria = $2, quantidade = $3, preco = $4, fotos = $5,
          latitude = $6, longitude = $7, disponivel = $8, descricao = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *
    `;

    const values = [
      nome, categoria, quantidade, preco, fotos,
      latitude, longitude, disponivel !== false, descricao,
      req.params.id, req.user.id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    const produto = result.rows[0];
    const produtoFormatado = {
      id: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      quantidade: produto.quantidade,
      preco: produto.preco,
      fotos: produto.fotos || [],
      latitude: produto.latitude,
      longitude: produto.longitude,
      disponivel: produto.disponivel,
      userId: produto.user_id,
      produtor: produto.produtor,
      whatsapp: produto.whatsapp,
      endereco: produto.endereco,
      descricao: produto.descricao,
      updatedAt: produto.updated_at
    };

    res.json(produtoFormatado);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// @route   DELETE /api/feira/produtos/:id
// @desc    Deletar produto
// @access  Private
router.delete('/produtos/:id', auth, async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const result = await pool.query(
      'DELETE FROM feira_produtos WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    res.json({ message: 'Produto removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;