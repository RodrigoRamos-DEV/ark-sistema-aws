# Asaas - Configuração de Produção

## ✅ Status: CONFIGURADO
- **Ambiente:** Produção
- **Conta:** Rodrigo Miguel Ramos (rodrigomramos18@gmail.com)
- **Clientes:** 1 cadastrado
- **Cobranças:** 0 ativas

## 🔧 Configuração Atual

### Variáveis de Ambiente (.env)
```
ASAAS_API_KEY=$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjEyYTk3ZmJkLThmMWQtNDE5OC1iZmRmLWRlZTg4MTExNDhiODo6JGFhY2hfNTdlYjQ3ZTAtZDU3My00NTgwLWFjMmMtY2MxMTBiNzc0MTJm
ASAAS_ENVIRONMENT=production
ASAAS_WEBHOOK_URL=https://ark-sistema-d9711c405f21.herokuapp.com/api/asaas/webhook
```

## 📋 Endpoints Disponíveis

### Testar Conexão
```bash
GET /api/asaas/test
```

### Clientes
```bash
POST /api/asaas/customers
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999999999",
  "cpfCnpj": "12345678901"
}
```

### Cobranças
```bash
POST /api/asaas/payments
{
  "customer": "cus_000005492077",
  "billingType": "BOLETO",
  "value": 100.00,
  "dueDate": "2024-12-31",
  "description": "Licença ARK Sistema"
}
```

## 🔔 Webhook Configuration

### No Painel Asaas:
1. Acesse: Configurações > Integrações > Webhooks
2. URL: `https://ark-sistema-d9711c405f21.herokuapp.com/api/asaas/webhook`
3. Eventos: 
   - PAYMENT_RECEIVED
   - PAYMENT_OVERDUE
   - PAYMENT_DELETED

### Eventos Processados:
- ✅ Pagamento recebido
- ✅ Pagamento vencido
- ✅ Pagamento cancelado

## 💡 Exemplos de Uso

### 1. Criar Cliente e Cobrança
```javascript
// 1. Criar cliente
const customer = await fetch('/api/asaas/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Fazenda São João',
    email: 'contato@fazenda.com',
    cpfCnpj: '12345678000199'
  })
});

// 2. Criar cobrança
const payment = await fetch('/api/asaas/payments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer: customer.id,
    billingType: 'PIX',
    value: 299.90,
    dueDate: '2024-12-31',
    description: 'Licença Mensal ARK Sistema'
  })
});
```

### 2. Tipos de Cobrança Disponíveis
- **BOLETO** - Boleto bancário
- **CREDIT_CARD** - Cartão de crédito
- **PIX** - PIX (instantâneo)
- **DEBIT_CARD** - Cartão de débito

## 🚨 Importante

### Segurança:
- ✅ Chave de produção configurada
- ✅ Webhook com HTTPS
- ✅ Validação de dados

### Monitoramento:
- Logs de transações em `/logs/asaas.log`
- Webhook events em tempo real
- Status de pagamentos atualizados automaticamente

## 🔄 Próximos Passos

1. **Configurar Webhook no Painel Asaas**
2. **Testar fluxo completo de pagamento**
3. **Implementar notificações por email**
4. **Configurar relatórios financeiros**

## 📞 Suporte
- Documentação: https://docs.asaas.com
- Suporte Asaas: suporte@asaas.com
- Status da API: https://status.asaas.com