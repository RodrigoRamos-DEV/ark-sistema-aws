const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Criar ZIP usando Node.js para evitar problemas de path do Windows
console.log('Criando ZIP compatível com Linux...');

try {
    // Usar tar (disponível no Windows 10+) em vez de PowerShell
    execSync('tar -czf ark-backend-linux.tar.gz server.js package.json src/', { 
        stdio: 'inherit',
        cwd: __dirname 
    });
    
    console.log('✅ Arquivo ark-backend-linux.tar.gz criado com sucesso!');
    console.log('📁 Use este arquivo para upload no Elastic Beanstalk');
    
} catch (err) {
    console.error('❌ Erro ao criar arquivo:', err.message);
    console.log('💡 Tente usar Git Bash ou WSL para criar o ZIP');
}