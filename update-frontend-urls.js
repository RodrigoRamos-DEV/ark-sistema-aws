const fs = require('fs');
const path = require('path');

// URL da nova API na AWS
const NEW_API_URL = 'http://3.15.32.209';

// URLs antigas que podem estar no código (adicione outras se necessário)
const OLD_URLS = [
    'https://ark-backend.onrender.com',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://render-url-antiga'
];

function updateUrlsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        OLD_URLS.forEach(oldUrl => {
            if (content.includes(oldUrl)) {
                content = content.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_API_URL);
                updated = true;
            }
        });
        
        if (updated) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Atualizado: ${filePath}`);
        }
    } catch (err) {
        console.log(`⚠️  Erro ao processar ${filePath}: ${err.message}`);
    }
}

function updateUrlsInDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
                updateUrlsInDirectory(fullPath);
            } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.html') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
                updateUrlsInFile(fullPath);
            }
        });
    } catch (err) {
        console.log(`⚠️  Erro ao processar diretório ${dirPath}: ${err.message}`);
    }
}

console.log('🔄 Atualizando URLs do frontend para AWS...');
console.log(`📡 Nova URL da API: ${NEW_API_URL}`);

// Atualizar frontend
const frontendPath = path.join(__dirname, 'frontend');
if (fs.existsSync(frontendPath)) {
    updateUrlsInDirectory(frontendPath);
    console.log('✅ Frontend atualizado!');
} else {
    console.log('❌ Diretório frontend não encontrado');
    console.log('💡 Certifique-se de que o diretório frontend existe');
}

console.log('🎯 Próximo passo: npm run build no frontend');