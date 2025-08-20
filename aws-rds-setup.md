# Configuração RDS PostgreSQL na AWS

## Passo 1: Criar RDS no Console AWS

1. **Acesse**: https://console.aws.amazon.com/rds/
2. **Clique**: "Create database"
3. **Configurações**:
   - Engine: PostgreSQL
   - Version: 15.x (mais recente)
   - Template: Free tier (para teste) ou Production (para produção)

## Passo 2: Configurações do Banco

```
DB Instance Identifier: ark-database
Master Username: arkadmin
Master Password: [senha-forte-aqui]
DB Name: arkdb
```

## Passo 3: Configurações de Rede

```
VPC: Default VPC
Subnet Group: default
Public Access: Yes (para acesso externo)
Security Group: Criar novo "ark-db-sg"
```

## Passo 4: Configurações Adicionais

```
Initial Database Name: arkdb
Port: 5432
Parameter Group: default.postgres15
Backup Retention: 7 days
Monitoring: Enhanced monitoring (opcional)
```

## Passo 5: Security Group

Após criar o RDS, configure o Security Group:

1. **Vá para EC2 > Security Groups**
2. **Encontre**: "ark-db-sg"
3. **Adicione regra inbound**:
   - Type: PostgreSQL
   - Port: 5432
   - Source: 0.0.0.0/0 (ou seu IP específico)

## Passo 6: Obter Connection String

Após criação, a string será:
```
postgresql://arkadmin:sua-senha@ark-database.xxxxx.us-east-1.rds.amazonaws.com:5432/arkdb
```

## Custos Estimados (Free Tier)
- RDS t3.micro: Grátis por 12 meses (750 horas/mês)
- Storage: 20GB grátis
- Backup: Grátis até 20GB

## Custos Pós Free Tier
- RDS t3.micro: ~$13/mês
- Storage: ~$2.30/mês por 20GB
- Total estimado: ~$15-20/mês