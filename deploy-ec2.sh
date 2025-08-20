#!/bin/bash
# Script de deploy para EC2

echo "🔄 Iniciando deploy do ARK Backend na EC2..."

# Atualizar sistema
sudo dnf update -y

# Instalar Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Verificar instalação
node --version
npm --version

# Instalar PM2 para gerenciar a aplicação
sudo npm install -g pm2

# Criar diretório da aplicação
sudo mkdir -p /var/www/ark-backend
sudo chown ec2-user:ec2-user /var/www/ark-backend
cd /var/www/ark-backend

# Criar package.json
cat > package.json << 'EOF'
{
  "name": "ark-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "aws-sdk": "^2.1692.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "csv-parser": "^3.2.0",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "handlebars": "^4.7.8",
    "jsonwebtoken": "^9.0.0",
    "multer": "^2.0.2",
    "nodemailer": "^7.0.5",
    "pg": "^8.8.0",
    "qrcode": "^1.5.4",
    "uuid": "^9.0.0",
    "xlsx": "^0.18.5"
  }
}
EOF

# Instalar dependências
npm install

echo "✅ Ambiente preparado! Agora faça upload dos arquivos do código."
echo "📋 Próximo passo: scp -i ark-backend-key.pem -r backend/* ec2-user@IP_PUBLICO:/var/www/ark-backend/"