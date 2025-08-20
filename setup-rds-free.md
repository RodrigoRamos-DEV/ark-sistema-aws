# Setup RDS Free Tier

## 1. Criar RDS MySQL (Free Tier)

```bash
aws rds create-db-instance \
    --db-instance-identifier ark-db-free \
    --db-instance-class db.t2.micro \
    --engine mysql \
    --engine-version 8.0.35 \
    --master-username admin \
    --master-user-password SuaSenhaSegura123! \
    --allocated-storage 20 \
    --storage-type gp2 \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --db-subnet-group-name default \
    --backup-retention-period 0 \
    --no-multi-az \
    --publicly-accessible \
    --storage-encrypted \
    --deletion-protection
```

## 2. Configurar Security Group

- Porta 3306 aberta para o EC2
- Porta 80/443 aberta para internet (EC2)

## 3. Variáveis de Ambiente (.env)

```
DB_HOST=ark-db-free.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=SuaSenhaSegura123!
DB_NAME=ark_sistema
DB_PORT=3306
```

## 4. Custos Free Tier (12 meses)

- RDS db.t2.micro: GRATUITO (750 horas/mês)
- 20GB armazenamento: GRATUITO
- EC2 t2.micro: GRATUITO (750 horas/mês)
- Amplify: GRATUITO (build + hosting)

**Total: $0/mês por 12 meses**