// Script para testar se o frontend está sendo servido corretamente
const express = require('express');
const path = require('path');
const app = express();

// Simula a configuração do servidor
const frontendBuildPath = path.join(__dirname, 'backend/frontend/dist');
console.log('📁 Caminho do frontend:', frontendBuildPath);

// Verifica se o diretório existe
const fs = require('fs');
if (fs.existsSync(frontendBuildPath)) {
    console.log('✅ Diretório dist existe');
    
    // Lista arquivos
    const files = fs.readdirSync(frontendBuildPath);
    console.log('📄 Arquivos encontrados:', files);
    
    // Verifica se index.html existe
    const indexPath = path.join(frontendBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log('✅ index.html encontrado');
        
        // Lê o conteúdo
        const content = fs.readFileSync(indexPath, 'utf8');
        console.log('📝 Primeiras linhas do index.html:');
        console.log(content.substring(0, 200) + '...');
    } else {
        console.log('❌ index.html NÃO encontrado');
    }
} else {
    console.log('❌ Diretório dist NÃO existe');
}

// Testa servir arquivos estáticos
app.use(express.static(frontendBuildPath));

app.get('*', (req, res) => {
    const indexPath = path.join(frontendBuildPath, 'index.html');
    console.log('🌐 Servindo:', req.url, '-> index.html');
    res.sendFile(indexPath);
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de teste rodando em http://localhost:${PORT}`);
    console.log('🔗 Acesse no navegador para testar');
});

// Para o servidor após 30 segundos
setTimeout(() => {
    console.log('⏰ Parando servidor de teste...');
    process.exit(0);
}, 30000);