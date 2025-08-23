require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS básico
app.use(cors());
app.use(express.json());

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