# 🧪 GUIA COMPLETO DE TESTES - SISTEMA BOOTSTRAP

## 📋 PRÉ-REQUISITOS

### 1. Verificar Instalações
```bash
node --version    # >= 16.0.0
npm --version     # >= 8.0.0
```

### 2. Verificar Banco de Dados
- PostgreSQL rodando na porta 5432
- Database `ark_system` criado
- Usuário com permissões adequadas

## 🚀 INICIALIZAÇÃO DO SISTEMA

### 1. Backend
```bash
cd backend
npm install
npm start
```
**Verificar:** Console deve mostrar "Servidor rodando na porta 5000"

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
**Verificar:** Console deve mostrar "Local: http://localhost:5173"

## 🔐 TESTES DE AUTENTICAÇÃO

### 1. Registro de Usuário
- [ ] Acessar `http://localhost:5173/register`
- [ ] Preencher formulário com dados válidos
- [ ] Verificar criação de conta
- [ ] Verificar redirecionamento para login

### 2. Login
- [ ] Acessar `http://localhost:5173/login`
- [ ] Fazer login com credenciais criadas
- [ ] Verificar redirecionamento para dashboard
- [ ] Verificar token no localStorage

### 3. Logout
- [ ] Clicar em logout
- [ ] Verificar redirecionamento para login
- [ ] Verificar remoção do token

## 📊 TESTES DO DASHBOARD

### 1. Carregamento Inicial
- [ ] Dashboard carrega sem erros
- [ ] Cards de resumo aparecem
- [ ] Gráficos são renderizados
- [ ] Dados são carregados da API

### 2. Filtros de Período
- [ ] Testar filtro "Últimos 7 dias"
- [ ] Testar filtro "Últimos 30 dias"
- [ ] Testar filtro "Últimos 90 dias"
- [ ] Testar filtro "Último ano"

### 3. Responsividade
- [ ] Testar em desktop (>1200px)
- [ ] Testar em tablet (768px-1200px)
- [ ] Testar em mobile (<768px)

## 👥 TESTES DE CLIENTES

### 1. Listagem
- [ ] Acessar página de clientes
- [ ] Verificar carregamento da lista
- [ ] Testar paginação
- [ ] Testar busca por nome/email

### 2. Cadastro
- [ ] Clicar em "Novo Cliente"
- [ ] Preencher formulário completo
- [ ] Verificar validações obrigatórias
- [ ] Salvar e verificar na lista

### 3. Edição
- [ ] Clicar em editar cliente
- [ ] Modificar dados
- [ ] Salvar alterações
- [ ] Verificar atualização

### 4. Exclusão
- [ ] Tentar excluir cliente
- [ ] Verificar confirmação
- [ ] Confirmar exclusão
- [ ] Verificar remoção da lista

## 📦 TESTES DE PRODUTOS

### 1. Listagem
- [ ] Acessar página de produtos
- [ ] Verificar carregamento
- [ ] Testar filtros por categoria
- [ ] Testar busca

### 2. Cadastro
- [ ] Criar novo produto
- [ ] Preencher todos os campos
- [ ] Upload de imagem
- [ ] Verificar salvamento

### 3. Gestão de Estoque
- [ ] Verificar controle de estoque
- [ ] Testar alertas de estoque baixo
- [ ] Atualizar quantidades

## 🛒 TESTES DE PEDIDOS

### 1. Criação de Pedido
- [ ] Acessar "Novo Pedido"
- [ ] Selecionar cliente
- [ ] Adicionar produtos
- [ ] Calcular totais
- [ ] Finalizar pedido

### 2. Gestão de Status
- [ ] Alterar status do pedido
- [ ] Verificar histórico
- [ ] Testar notificações

### 3. Relatórios
- [ ] Gerar relatório de pedidos
- [ ] Filtrar por período
- [ ] Exportar dados

## 📄 TESTES DE NOTAS FISCAIS

### 1. Emissão
- [ ] Emitir NF a partir de pedido
- [ ] Verificar dados obrigatórios
- [ ] Gerar PDF
- [ ] Salvar no sistema

### 2. Consulta
- [ ] Listar notas emitidas
- [ ] Buscar por número/cliente
- [ ] Visualizar detalhes

## 💰 TESTES FINANCEIROS

### 1. Contas a Receber
- [ ] Visualizar pendências
- [ ] Registrar pagamentos
- [ ] Gerar relatórios

### 2. Contas a Pagar
- [ ] Cadastrar despesas
- [ ] Controlar vencimentos
- [ ] Efetuar pagamentos

## 🔧 TESTES DE CONFIGURAÇÕES

### 1. Perfil do Usuário
- [ ] Editar dados pessoais
- [ ] Alterar senha
- [ ] Upload de avatar

### 2. Configurações da Empresa
- [ ] Dados da empresa
- [ ] Configurações fiscais
- [ ] Parâmetros do sistema

## 🌐 TESTES DE API

### 1. Endpoints Principais
```bash
# Testar autenticação
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Testar dashboard
curl -X GET http://localhost:5000/api/data/dashboard \
  -H "x-auth-token: SEU_TOKEN"

# Testar clientes
curl -X GET http://localhost:5000/api/clients \
  -H "x-auth-token: SEU_TOKEN"
```

### 2. Validações
- [ ] Testar campos obrigatórios
- [ ] Testar limites de caracteres
- [ ] Testar formatos de email/telefone
- [ ] Testar autenticação em rotas protegidas

## 🚨 TESTES DE ERRO

### 1. Cenários de Erro
- [ ] Login com credenciais inválidas
- [ ] Acesso sem token
- [ ] Campos obrigatórios vazios
- [ ] Upload de arquivos inválidos
- [ ] Conexão com banco indisponível

### 2. Tratamento de Erros
- [ ] Mensagens de erro claras
- [ ] Não exposição de dados sensíveis
- [ ] Logs adequados no servidor

## 📱 TESTES MOBILE

### 1. Responsividade
- [ ] Layout adapta corretamente
- [ ] Botões são clicáveis
- [ ] Formulários são usáveis
- [ ] Gráficos se ajustam

### 2. Performance
- [ ] Carregamento rápido
- [ ] Navegação fluida
- [ ] Sem travamentos

## 🔒 TESTES DE SEGURANÇA

### 1. Autenticação
- [ ] Tokens expiram corretamente
- [ ] Senhas são hasheadas
- [ ] Sessões são invalidadas

### 2. Autorização
- [ ] Usuários só acessam seus dados
- [ ] Rotas protegidas funcionam
- [ ] Validações server-side

## ✅ CHECKLIST FINAL

### Funcionalidades Críticas
- [ ] Login/Logout funcionando
- [ ] Dashboard carregando
- [ ] CRUD de clientes
- [ ] CRUD de produtos
- [ ] Criação de pedidos
- [ ] Emissão de NF
- [ ] Relatórios básicos

### Performance
- [ ] Tempo de carregamento < 3s
- [ ] Navegação fluida
- [ ] Sem memory leaks
- [ ] API responde < 1s

### UX/UI
- [ ] Interface intuitiva
- [ ] Mensagens claras
- [ ] Feedback visual
- [ ] Responsivo

## 🐛 RELATÓRIO DE BUGS

### Template para Reportar Bugs
```
**Descrição:** 
**Passos para Reproduzir:**
1. 
2. 
3. 

**Resultado Esperado:**
**Resultado Atual:**
**Navegador/Versão:**
**Screenshots:**
```

## 📈 MÉTRICAS DE SUCESSO

- [ ] 100% das funcionalidades críticas funcionando
- [ ] 0 erros de console no frontend
- [ ] 0 erros 500 no backend
- [ ] Tempo de resposta < 1s para 95% das requisições
- [ ] Interface responsiva em todos os dispositivos

---

**Status do Teste:** ⏳ Em Andamento
**Última Atualização:** $(date)
**Testado por:** [Nome do Testador]