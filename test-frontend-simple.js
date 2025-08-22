// Script para testar se o frontend está sendo servido corretamente
const path = require('path');
const fs = require('fs');

// Simula a configuração do servidor
const frontendBuildPath = path.join(__dirname, 'backend/frontend/dist');
console.log('📁 Caminho do frontend:', frontendBuildPath);

// Verifica se o diretório existe
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
        console.log('📝 Conteúdo do index.html:');
        console.log(content);
        
        // Verifica se os assets existem
        const assetsPath = path.join(frontendBuildPath, 'assets');
        if (fs.existsSync(assetsPath)) {
            console.log('✅ Pasta assets existe');
            const assetFiles = fs.readdirSync(assetsPath);
            console.log('📄 Assets encontrados:', assetFiles);
        } else {
            console.log('❌ Pasta assets NÃO existe');
        }
    } else {
        console.log('❌ index.html NÃO encontrado');
    }
} else {
    console.log('❌ Diretório dist NÃO existe');
}

console.log('\n🔍 Verificando configuração do servidor...');

// Verifica se NODE_ENV está definido
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');

// Simula a lógica do servidor
if (process.env.NODE_ENV === 'production') {
    console.log('🏭 Modo PRODUÇÃO - Servindo arquivos estáticos');
} else {
    console.log('🛠️ Modo DESENVOLVIMENTO - API apenas');
}

console.log('\n✅ Teste concluído!');