# 🚀 COMANDOS PARA DEPLOY EM PRODUÇÃO

## ✅ PRÉ-DEPLOY CONCLUÍDO
- Tabelas criadas e testadas ✅
- Usuário admin verificado ✅
- Funcionalidades testadas ✅

## 🔄 EXECUTAR DEPLOY

### 1. Fazer Commit e Push
```bash
git add .
git commit -m "feat: sistema de notificações admin - deploy produção"
git push heroku main
```

### 2. Executar Migrações no Heroku (IMPORTANTE!)
```bash
heroku run node deploy-production.js
```

### 3. Verificar Logs
```bash
heroku logs --tail
```

### 4. Testar no Browser
- Acesse: https://ark-sistema-d9711c405f21.herokuapp.com
- Login como admin
- Vá para "Avisos aos Clientes"
- Teste criar/deletar notificação

## 🆘 SE DER ERRO
```bash
heroku rollback
```

## 📱 TESTE RÁPIDO
1. Login admin
2. Painel Admin → Aba "Avisos aos Clientes"  
3. Criar notificação teste
4. Verificar se aparece na lista
5. Deletar notificação teste

---
**Status:** 🟢 PRONTO PARA DEPLOY
**Tempo estimado:** 5-10 minutos