# 📱 Sistema de Suporte via WhatsApp

## 🚀 Funcionalidades

✅ **Botão flutuante** com animações suaves  
✅ **FAQ automatizado** com busca inteligente  
✅ **Indicador de horário** de funcionamento  
✅ **Respostas automáticas** para dúvidas comuns  
✅ **Integração direta** com WhatsApp  
✅ **Design responsivo** para mobile e desktop  
✅ **Suporte ao tema escuro**  

## ⚙️ Como Configurar

### 1. Alterar seu número do WhatsApp

Edite o arquivo `src/config/supportConfig.js`:

```javascript
whatsappNumber: "5511999999999", // ALTERE AQUI
```

**Formato:** Código do país + DDD + número (sem espaços ou símbolos)
- Brasil: 55
- São Paulo: 11
- Exemplo completo: 5511999999999

### 2. Personalizar horário de funcionamento

```javascript
businessHours: {
  enabled: true, // true = mostra status, false = sempre disponível
  schedule: {
    monday: { start: "08:00", end: "18:00" },
    tuesday: { start: "08:00", end: "18:00" },
    // ... outros dias
    sunday: null // null = fechado
  }
}
```

### 3. Adicionar suas próprias perguntas (FAQ)

```javascript
customFaqs: [
  {
    id: 'minha_pergunta_1',
    question: "Como funciona o pagamento?",
    answer: "Aceitamos cartão, PIX e boleto bancário...",
    keywords: ["pagamento", "cartão", "pix", "boleto"]
  }
]
```

### 4. Personalizar mensagens

```javascript
defaultMessage: "Olá! Preciso de ajuda com o Sistema ARK.",
businessName: "Sistema ARK",
supportName: "Suporte ARK"
```

## 🎨 Personalização Visual

### Cores do tema
```javascript
theme: {
  primaryColor: "#25D366",    // Verde do WhatsApp
  secondaryColor: "#128C7E",  // Verde escuro
  buttonPosition: "bottom-right" // ou "bottom-left"
}
```

### Posição do botão
- `bottom-right`: Canto inferior direito
- `bottom-left`: Canto inferior esquerdo

## 📋 FAQ Padrão Incluída

O sistema já vem com 8 perguntas frequentes sobre:
- Login e senha
- Cadastro de clientes
- Geração de relatórios
- Backup de dados
- Funcionamento offline
- Alteração de senha
- Cadastro de produtos
- Criação de pedidos

## 🔧 Como Funciona

1. **Usuário clica** no botão flutuante
2. **Sistema abre** modal com FAQ
3. **Usuário pesquisa** ou escolhe pergunta
4. **Sistema mostra** resposta automática
5. **Se não resolver**, direciona para WhatsApp
6. **Mensagem personalizada** é enviada com contexto

## 📱 Recursos Avançados

### Busca Inteligente
- Busca por **palavras-chave**
- Busca no **texto da pergunta**
- **Resultados instantâneos**

### Horário de Funcionamento
- **Indicador visual** (online/offline)
- **Mensagem automática** fora do horário
- **Configuração flexível** por dia da semana

### Integração WhatsApp
- **Link direto** para conversa
- **Mensagem pré-formatada** com contexto
- **Abertura em nova aba**

## 🎯 Benefícios para seu Negócio

✅ **Reduz chamados** com respostas automáticas  
✅ **Melhora experiência** do usuário  
✅ **Aumenta conversão** com suporte rápido  
✅ **Economiza tempo** com FAQ automatizada  
✅ **Profissionaliza atendimento**  

## 🚨 Importante

1. **Teste sempre** após alterar configurações
2. **Mantenha FAQ atualizada** com dúvidas reais
3. **Monitore métricas** de uso do suporte
4. **Responda rapidamente** no WhatsApp

## 📞 Suporte Técnico

Se precisar de ajuda para configurar ou personalizar:
- 📱 WhatsApp: [Seu número aqui]
- 📧 Email: [Seu email aqui]

---

**Desenvolvido para Sistema ARK** 🚀