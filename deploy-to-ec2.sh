#!/bin/bash

# Deploy script para EC2
echo "🚀 Iniciando deploy do ARK Backend..."

# Atualizar sistema
sudo yum update -y

# Instalar Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Instalar PM2
sudo npm install -g pm2

# Clonar repositório
cd /home/ec2-user
git clone https://github.com/RodrigoRamos-DEV/ark-sistema-aws.git
cd ark-sistema-aws/backend

# Instalar dependências
npm install

# Criar arquivo .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=ArkSistema2025!
DB_NAME=ark_sistema
DB_PORT=3306
EOF

# Iniciar com PM2
pm2 start server.js --name "ark-backend"
pm2 startup
pm2 save

# Instalar e configurar nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configurar nginx
sudo tee /etc/nginx/conf.d/ark.conf > /dev/null << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, x-auth-token' always;
    }
}
EOF

sudo systemctl restart nginx

echo "✅ Deploy concluído!"
echo "🌐 Backend disponível em: http://3.15.32.209"