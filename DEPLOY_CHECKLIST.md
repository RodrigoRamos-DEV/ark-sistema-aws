# 🚀 CHECKLIST DE DEPLOY PARA PRODUÇÃO

## ✅ PRÉ-DEPLOY (Local)

### 1. Executar Script de Deploy
```bash
cd backend
node ../deploy-production.js
```

### 2. Verificar Arquivos Críticos
- [x] `backend/src/routes/admin.js` - Rotas de notificações
- [x] `backend/frontend/src/components/AdminNotifications.jsx` - Interface
- [x] `backend/src/config/db.js` - Configuração do banco
- [x] `backend/server.js` - Servidor principal

### 3. Variáveis de Ambiente
Verificar se estão configuradas no Heroku:
- [x] `DATABASE_URL` - URL do PostgreSQL
- [x] `JWT_SECRET` - Chave JWT
- [x] `NODE_ENV=production`
- [x] `ASAAS_API_KEY` - Chave do Asaas
- [x] `ASAAS_ENVIRONMENT=production`

## 🔄 DEPLOY

### 1. Commit e Push
```bash
git add .
git commit -m "feat: sistema de notificações admin - deploy produção"
git push heroku main
```

### 2. Executar Migrações no Heroku
```bash
heroku run node deploy-production.js
```

### 3. Verificar Logs
```bash
heroku logs --tail
```

## ✅ PÓS-DEPLOY

### 1. Testar Funcionalidades
- [ ] Login como admin
- [ ] Acessar painel admin
- [ ] Criar notificação de teste
- [ ] Verificar se notificação aparece
- [ ] Deletar notificação de teste

### 2. Verificar Métricas
- [ ] Dashboard carregando
- [ ] Clientes listando
- [ ] Filtros funcionando
- [ ] Status online funcionando

### 3. Monitorar por 30min
- [ ] Sem erros 500
- [ ] Tempo de resposta normal
- [ ] Funcionalidades básicas OK

## 🆘 ROLLBACK (Se necessário)
```bash
heroku rollback
```

## 📞 CONTATOS DE EMERGÊNCIA
- Heroku Support: https://help.heroku.com
- PostgreSQL: Verificar dashboard do provider

---

**Status do Deploy:** 🟡 PENDENTE
**Data:** $(date)
**Responsável:** Admin ARK