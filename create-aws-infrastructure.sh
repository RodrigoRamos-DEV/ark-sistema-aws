#!/bin/bash

echo "🚀 Criando infraestrutura AWS Free Tier..."

# Variáveis
KEY_NAME="ark-key"
SECURITY_GROUP="ark-sg"
DB_PASSWORD="ArkSistema2025!"

# 1. Criar Key Pair
echo "📋 Criando Key Pair..."
aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > ${KEY_NAME}.pem
chmod 400 ${KEY_NAME}.pem

# 2. Criar Security Group
echo "🔒 Criando Security Group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP \
    --description "Security group for ARK Sistema" \
    --query 'GroupId' --output text)

# 3. Configurar regras do Security Group
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3306 --source-group $SG_ID

# 4. Criar instância EC2
echo "💻 Criando instância EC2..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --count 1 \
    --instance-type t2.micro \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --query 'Instances[0].InstanceId' \
    --output text)

# 5. Criar RDS
echo "🗄️ Criando RDS MySQL..."
aws rds create-db-instance \
    --db-instance-identifier ark-db-free \
    --db-instance-class db.t2.micro \
    --engine mysql \
    --engine-version 8.0.35 \
    --master-username admin \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp2 \
    --vpc-security-group-ids $SG_ID \
    --backup-retention-period 0 \
    --no-multi-az \
    --publicly-accessible \
    --storage-encrypted

echo "✅ Infraestrutura criada!"
echo "📝 Instance ID: $INSTANCE_ID"
echo "🔑 Key file: ${KEY_NAME}.pem"
echo "🔒 Security Group: $SG_ID"
echo ""
echo "⏳ Aguarde alguns minutos para as instâncias ficarem prontas..."
echo "🌐 Para conectar: ssh -i ${KEY_NAME}.pem ec2-user@<PUBLIC_IP>"