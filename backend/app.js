const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.json({ 
        message: 'ARK Backend funcionando na AWS!',
        timestamp: new Date().toISOString(),
        environment: 'production'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'ARK Backend' });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});