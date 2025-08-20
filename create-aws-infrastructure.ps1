Write-Host "🚀 Criando infraestrutura AWS Free Tier..." -ForegroundColor Green

# Variáveis
$KEY_NAME = "ark-key"
$SECURITY_GROUP = "ark-sg"
$DB_PASSWORD = "ArkSistema2025!"

try {
    # 1. Criar Key Pair
    Write-Host "📋 Criando Key Pair..." -ForegroundColor Yellow
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text | Out-File -FilePath "${KEY_NAME}.pem" -Encoding ASCII

    # 2. Criar Security Group
    Write-Host "🔒 Criando Security Group..." -ForegroundColor Yellow
    $SG_ID = aws ec2 create-security-group --group-name $SECURITY_GROUP --description "Security group for ARK Sistema" --query 'GroupId' --output text

    # 3. Configurar regras do Security Group
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3306 --source-group $SG_ID

    # 4. Criar instância EC2
    Write-Host "💻 Criando instância EC2..." -ForegroundColor Yellow
    $INSTANCE_ID = aws ec2 run-instances --image-id ami-0c02fb55956c7d316 --count 1 --instance-type t2.micro --key-name $KEY_NAME --security-group-ids $SG_ID --query 'Instances[0].InstanceId' --output text

    # 5. Criar RDS
    Write-Host "🗄️ Criando RDS MySQL..." -ForegroundColor Yellow
    aws rds create-db-instance --db-instance-identifier ark-db-free --db-instance-class db.t2.micro --engine mysql --engine-version 8.0.35 --master-username admin --master-user-password $DB_PASSWORD --allocated-storage 20 --storage-type gp2 --vpc-security-group-ids $SG_ID --backup-retention-period 0 --no-multi-az --publicly-accessible --storage-encrypted

    Write-Host "✅ Infraestrutura criada!" -ForegroundColor Green
    Write-Host "📝 Instance ID: $INSTANCE_ID" -ForegroundColor Cyan
    Write-Host "🔑 Key file: ${KEY_NAME}.pem" -ForegroundColor Cyan
    Write-Host "🔒 Security Group: $SG_ID" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⏳ Aguarde alguns minutos para as instâncias ficarem prontas..." -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}