# Novo Sistema de Controle Financeiro

## Como usar:

### 1. Executar migração local:
```bash
node run-financial-migration.js
```

### 2. Cadastrar pagamento com múltiplos vendedores:

**POST /api/partners/payments**
```json
{
  "clientId": "uuid-do-cliente",
  "amount": 1000.00,
  "paymentDate": "2025-01-19",
  "notes": "Pagamento janeiro",
  "vendedores": [
    {
      "vendedor_id": 1,
      "porcentagem": 10
    },
    {
      "vendedor_id": 2,
      "porcentagem": 5
    }
  ]
}
```

### 3. Ver comissões por mês:

**GET /api/partners/comissoes?mes=2025-01**

Retorna:
```json
[
  {
    "vendedor_id": 1,
    "vendedor_nome": "João Silva",
    "pix": "joao@email.com",
    "total_pagamentos": 3,
    "total_comissoes": 150.00,
    "total_pago": 0.00,
    "total_pendente": 150.00,
    "status_geral": "tudo_pendente"
  }
]
```

### 4. Marcar como pago (cria retirada automática):

**POST /api/partners/pagamentos/marcar-pago**
```json
{
  "vendedor_id": 1,
  "mes_referencia": "2025-01"
}
```

Isso vai:
- Marcar todas as comissões do vendedor no mês como "pago"
- Criar automaticamente uma retirada na tabela withdrawals
- Vincular as comissões à retirada

### 5. Ver retiradas:

**GET /api/partners/withdrawals**

Mostra todas as retiradas, incluindo as automáticas de comissão.

## Vantagens do novo sistema:

1. **Flexibilidade**: Múltiplos vendedores por pagamento
2. **Controle**: Status individual por comissão
3. **Automação**: Botão "Pagar" cria retirada automaticamente
4. **Rastreabilidade**: Cada comissão vinculada à retirada
5. **Relatórios**: View pronta para dashboards