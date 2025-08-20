# Deploy Manual no Elastic Beanstalk

## Passo 1: Instalar AWS CLI
1. Baixe: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Instale e reinicie o terminal

## Passo 2: Configurar AWS CLI
```bash
aws configure
```
- Access Key ID: [sua chave]
- Secret Access Key: [sua chave secreta]
- Region: us-east-2
- Output format: json

## Passo 3: Criar ZIP do projeto
```bash
# No diretório backend
zip -r ark-backend.zip . -x node_modules/\* .git/\* *.log test-\* backup-\*
```

## Passo 4: Deploy via Console AWS
1. Vá para: https://console.aws.amazon.com/elasticbeanstalk/
2. Clique "Create application"
3. Application name: ark-backend
4. Platform: Node.js
5. Upload ark-backend.zip
6. Configure environment variables:
   - DATABASE_URL: postgresql://arkadmin:Flamengo20@ark-database.chwuqogmans6.us-east-2.rds.amazonaws.com:5432/arkdb
   - JWT_SECRET: |QzyK7omJjBjxmU10n.6.m1<J2JlE95^
   - NODE_ENV: production

## Passo 5: Testar
- URL será: http://ark-backend.us-east-2.elasticbeanstalk.com