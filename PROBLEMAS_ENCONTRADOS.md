# 🚨 PROBLEMAS ENCONTRADOS NO SISTEMA ARK

## 1. PROBLEMA CRÍTICO - Campo WhatsApp no Admin
**Localização**: `ClientModal.jsx` linha 71
**Problema**: Campo WhatsApp está sendo buscado mas não está sendo salvo corretamente
**Impacto**: WhatsApp dos produtores pode não aparecer nos produtos

### Solução Necessária:
- Verificar se o campo `contact_phone` está sendo salvo na tabela `clients`
- Garantir que a função `fetchClientProfile` está funcionando

## 2. PROBLEMA - Vitrine usando localStorage
**Localização**: `VitrinePage.jsx` e `EmpresaMapa.jsx`
**Problema**: Produtos da vitrine estão sendo salvos apenas no localStorage
**Impacto**: Dados serão perdidos ao limpar navegador, não funcionará em deploy

### Solução Necessária:
- Criar tabela `produtos_vitrine` no banco
- Implementar endpoints para salvar/buscar produtos da vitrine
- Migrar dados do localStorage para banco

## 3. PROBLEMA - Inconsistência de Dados
**Localização**: `dataController.js` - função `getVitrinePublica`
**Problema**: Função busca produtos da tabela `items` mas vitrine usa localStorage
**Impacto**: Empresas não conseguirão ver produtos dos produtores

## 4. PROBLEMA - Campos Faltando no Banco
**Localização**: Tabela `clients`
**Problema**: Alguns campos podem estar faltando para produtores
**Campos necessários**:
- `contact_phone` (WhatsApp)
- `client_type` 
- Campos de endereço completo

## 5. PROBLEMA - Migrações Não Executadas
**Localização**: Pasta `migration/`
**Problema**: Várias migrações podem não ter sido executadas
**Impacto**: Banco pode não ter estrutura completa

## 6. PROBLEMA - Credenciais AWS Expostas
**Localização**: `.env`
**Problema**: Credenciais AWS estão no arquivo .env que pode ser commitado
**Impacto**: Segurança comprometida

## 7. PROBLEMA - Falta de Validação de Deploy
**Localização**: Geral
**Problema**: Não há verificação se todas as tabelas/campos existem
**Impacto**: Sistema pode quebrar em produção

## 8. PROBLEMA - Inconsistência de Tipos de Usuário
**Localização**: Vários arquivos
**Problema**: Alguns lugares usam 'distribuidor', outros 'empresa'
**Impacto**: Confusão no sistema de permissões

## PRIORIDADE DE CORREÇÃO:
1. 🔴 CRÍTICO: Migrar vitrine do localStorage para banco
2. 🔴 CRÍTICO: Executar todas as migrações necessárias  
3. 🟡 IMPORTANTE: Corrigir campo WhatsApp no admin
4. 🟡 IMPORTANTE: Padronizar tipos de usuário
5. 🟢 BAIXA: Mover credenciais AWS para variáveis de ambiente seguras