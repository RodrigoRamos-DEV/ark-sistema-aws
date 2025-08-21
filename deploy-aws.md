# Deploy ARK System na AWS

## Pré-requisitos
1. Conta AWS ativa
2. AWS CLI instalado
3. EB CLI instalado

## Passos para Deploy

### 1. Configurar RDS (PostgreSQL)
```bash
# No AWS Console:
# - Criar RDS PostgreSQL
# - Configurar Security Groups
# - Anotar endpoint de conexão
```

### 2. Configurar S3 para Frontend
```bash
# Criar bucket S3
aws s3 mb s3://ark-frontend-bucket

# Configurar website estático
aws s3 website s3://ark-frontend-bucket --index-document index.html
```

### 3. Deploy Backend (Elastic Beanstalk)
```bash
# Inicializar EB
eb init ark-backend --region us-east-1 --platform node.js

# Criar ambiente
eb create ark-production

# Deploy
eb deploy
```

### 4. Configurar Variáveis de Ambiente
```bash
# No EB Console, adicionar:
# - DATABASE_URL
# - JWT_SECRET
# - EMAIL_*
# - AWS_*
```

### 5. Deploy Frontend
```bash
# Build do frontend
npm run build

# Upload para S3
aws s3 sync dist/ s3://ark-frontend-bucket
```

## URLs Finais
- Backend: https://ark-production.elasticbeanstalk.com
- Frontend: https://ark-frontend-bucket.s3-website.amazonaws.com