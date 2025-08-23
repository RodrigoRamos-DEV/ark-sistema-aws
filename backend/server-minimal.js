require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configurado
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

// Rotas essenciais
try {
    const authRoutes = require('./src/routes/authRoutes');
    const dataRoutes = require('./src/routes/dataRoutes');
    const adminNotificationRoutes = require('./src/routes/admin');
    const onlineStatusRoutes = require('./src/routes/onlineStatusRoutes');
    const auth = require('./src/middleware/authMiddleware');
    
    // Middleware trial simplificado
    const checkTrialStatus = (req, res, next) => next();
    
    app.use('/api/auth', authRoutes);
    app.use('/api/data', auth, checkTrialStatus, dataRoutes);
    app.use('/api/admin', adminNotificationRoutes);
    app.use('/api/online', onlineStatusRoutes);
} catch (err) {
    console.warn('Erro ao carregar rotas:', err.message);
}

// Rota de teste
app.get('/api/test', (req, res) => {
    res.json({ message: 'Servidor funcionando!' });
});

// Servir frontend
if (process.env.NODE_ENV === 'production') {
    const frontendBuildPath = path.join(__dirname, 'frontend/dist');
    app.use(express.static(frontendBuildPath));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Servidor ARK Backend está no ar!');
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});