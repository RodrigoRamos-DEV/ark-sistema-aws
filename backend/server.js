require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importa os ficheiros de rotas essenciais
const authRoutes = require('./src/routes/authRoutes');
const dataRoutes = require('./src/routes/dataRoutes');
const adminNotificationRoutes = require('./src/routes/admin');
const onlineStatusRoutes = require('./src/routes/onlineStatusRoutes');

// Rotas opcionais com try-catch
let adminRoutes, partnerRoutes, licenseRoutes, backupRoutes, auditRoutes, importExportRoutes, feiraRoutes, migrateRoutes, syncRoutes, fixRoutes;
try {
    adminRoutes = require('./src/routes/adminRoutes');
    partnerRoutes = require('./src/routes/partnerRoutes');
    licenseRoutes = require('./src/routes/licenseRoutes');
    backupRoutes = require('./src/routes/backupRoutes');
    auditRoutes = require('./src/routes/auditRoutes');
    importExportRoutes = require('./src/routes/importExportRoutes');
    feiraRoutes = require('./src/routes/feira');
    migrateRoutes = require('./src/routes/migrate');
    syncRoutes = require('./src/routes/syncRoutes');
    fixRoutes = require('./src/routes/fixRoutes');
} catch (err) {
    console.warn('Algumas rotas opcionais não puderam ser carregadas:', err.message);
}

// Importa middlewares
const { checkTrialStatus } = require('./src/middleware/trialMiddleware');
const auth = require('./src/middleware/authMiddleware');


const app = express();

// Middlewares Globais
const corsOptions = {
  origin: [
    'https://ark-sistema-d9711c405f21.herokuapp.com',
    'https://sistema.arksistemas.com.br',
    'https://arksistemas.com.br',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-auth-token']
};
app.use(cors(corsOptions)); 
app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Torna a pasta 'uploads' publicamente acessível
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Definição das Rotas da API ---
app.use('/api/auth', authRoutes);
app.use('/api/data', auth, checkTrialStatus, dataRoutes);
app.use('/api/admin', adminNotificationRoutes);
app.use('/api/online', onlineStatusRoutes);

// Rotas opcionais
if (adminRoutes) app.use('/api/admin', adminRoutes);
if (partnerRoutes) app.use('/api/partners', auth, checkTrialStatus, partnerRoutes);
if (licenseRoutes) app.use('/api/license', auth, checkTrialStatus, licenseRoutes);
if (backupRoutes) app.use('/api/backup', auth, checkTrialStatus, backupRoutes);
if (auditRoutes) app.use('/api/audit', auth, checkTrialStatus, auditRoutes);
if (importExportRoutes) app.use('/api', auth, checkTrialStatus, importExportRoutes);
if (feiraRoutes) app.use('/api/feira', auth, checkTrialStatus, feiraRoutes);
if (migrateRoutes) app.use('/api/migrate', migrateRoutes);
if (syncRoutes) app.use('/api/sync', syncRoutes);
if (fixRoutes) app.use('/api/fix', fixRoutes);


// --- NOVO: Servir os Ficheiros Estáticos do Frontend ---
// Este bloco de código é a adição principal para o Heroku
if (process.env.NODE_ENV === 'production') {
  // Define o diretório onde os ficheiros de build do frontend estarão
  const frontendBuildPath = path.join(__dirname, 'frontend/dist');
  
  // Serve os ficheiros estáticos (js, css, etc.) a partir desse diretório
  app.use(express.static(frontendBuildPath));

  // Para qualquer outra rota não correspondida pela API, serve o index.html do frontend
  // Isto permite que o roteamento do React (React Router) funcione corretamente
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
    // Mantém a rota raiz para o ambiente de desenvolvimento
    app.get('/', (req, res) => {
        res.send('Servidor ARK Backend está no ar! (Ambiente de Desenvolvimento)');
    });
}


// Middleware de tratamento de erro global
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: err.message,
        timestamp: new Date().toISOString()
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});