#!/bin/bash

# Script para deploy no EC2 t2.micro (Free Tier)

# Atualizar sistema
sudo yum update -y

# Instalar Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Instalar PM2 para gerenciar o processo
sudo npm install -g pm2

# Criar diretório da aplicação
sudo mkdir -p /opt/ark-backend
sudo chown ec2-user:ec2-user /opt/ark-backend

# Clonar repositório
cd /opt/ark-backend
git clone https://github.com/RodrigoRamos-DEV/ark-sistema-aws.git .

# Instalar dependências do backend
cd backend
npm install --production

# Configurar PM2
pm2 start server.js --name "ark-backend"
pm2 startup
pm2 save

# Configurar nginx como proxy reverso
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo "Deploy concluído! Backend rodando na porta 3000"