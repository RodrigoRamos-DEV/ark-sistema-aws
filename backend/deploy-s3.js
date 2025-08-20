// Script para fazer upload direto para S3 e deploy
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configurar AWS (você precisará das credenciais)
AWS.config.update({
    region: 'us-east-2',
    // accessKeyId: 'sua-access-key',
    // secretAccessKey: 'sua-secret-key'
});

const s3 = new AWS.S3();
const elasticbeanstalk = new AWS.ElasticBeanstalk();

async function deployToS3() {
    try {
        console.log('🔄 Fazendo upload direto para S3...');
        
        // Criar um arquivo ZIP usando Node.js
        const archiver = require('archiver');
        const output = fs.createWriteStream('ark-backend-s3.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', async () => {
            console.log('✅ ZIP criado:', archive.pointer() + ' bytes');
            
            // Upload para S3
            const zipData = fs.readFileSync('ark-backend-s3.zip');
            
            const uploadParams = {
                Bucket: 'elasticbeanstalk-us-east-2-282927508591',
                Key: 'ark-backend-direct.zip',
                Body: zipData
            };
            
            const result = await s3.upload(uploadParams).promise();
            console.log('✅ Upload S3 concluído:', result.Location);
            
        });
        
        archive.on('error', (err) => {
            throw err;
        });
        
        archive.pipe(output);
        
        // Adicionar arquivos ao ZIP
        archive.file('server.js', { name: 'server.js' });
        archive.file('package.json', { name: 'package.json' });
        archive.directory('src/', 'src/');
        
        archive.finalize();
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

console.log('💡 Este script precisa de credenciais AWS configuradas');
console.log('💡 Alternativa: Use a aplicação de exemplo do Elastic Beanstalk primeiro');