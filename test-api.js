const axios = require('axios');

const API_URL = 'http://localhost:5000';

// Cores para console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`)
};

let authToken = '';
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

async function testEndpoint(name, testFn) {
  testResults.total++;
  try {
    await testFn();
    log.success(`${name} - PASSOU`);
    testResults.passed++;
  } catch (error) {
    log.error(`${name} - FALHOU: ${error.message}`);
    testResults.failed++;
  }
}

async function testHealthCheck() {
  const response = await axios.get(`${API_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`Status esperado 200, recebido ${response.status}`);
  }
}

async function testRegister() {
  const userData = {
    nome: 'Teste User',
    email: `teste${Date.now()}@test.com`,
    senha: '123456',
    empresa: 'Teste Empresa'
  };
  
  const response = await axios.post(`${API_URL}/api/auth/register`, userData);
  if (response.status !== 201) {
    throw new Error(`Status esperado 201, recebido ${response.status}`);
  }
  
  // Salvar dados para login
  global.testUser = userData;
}

async function testLogin() {
  if (!global.testUser) {
    throw new Error('Usuário de teste não foi criado');
  }
  
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email: global.testUser.email,
    senha: global.testUser.senha
  });
  
  if (response.status !== 200 || !response.data.token) {
    throw new Error('Login falhou ou token não retornado');
  }
  
  authToken = response.data.token;
}

async function testDashboard() {
  if (!authToken) {
    throw new Error('Token de autenticação não disponível');
  }
  
  const response = await axios.get(`${API_URL}/api/data/dashboard`, {
    headers: { 'x-auth-token': authToken }
  });
  
  if (response.status !== 200) {
    throw new Error(`Status esperado 200, recebido ${response.status}`);
  }
  
  const requiredFields = ['resumo', 'vendas_diarias', 'produtos_mais_vendidos'];
  for (const field of requiredFields) {
    if (!response.data.hasOwnProperty(field)) {
      throw new Error(`Campo obrigatório '${field}' não encontrado na resposta`);
    }
  }
}

async function testClients() {
  if (!authToken) {
    throw new Error('Token de autenticação não disponível');
  }
  
  // Testar listagem
  const listResponse = await axios.get(`${API_URL}/api/clients`, {
    headers: { 'x-auth-token': authToken }
  });
  
  if (listResponse.status !== 200) {
    throw new Error(`Status esperado 200, recebido ${listResponse.status}`);
  }
  
  // Testar criação
  const clientData = {
    nome: 'Cliente Teste',
    email: `cliente${Date.now()}@test.com`,
    telefone: '11999999999',
    endereco: 'Rua Teste, 123'
  };
  
  const createResponse = await axios.post(`${API_URL}/api/clients`, clientData, {
    headers: { 'x-auth-token': authToken }
  });
  
  if (createResponse.status !== 201) {
    throw new Error(`Status esperado 201, recebido ${createResponse.status}`);
  }
}

async function testProducts() {
  if (!authToken) {
    throw new Error('Token de autenticação não disponível');
  }
  
  // Testar listagem
  const listResponse = await axios.get(`${API_URL}/api/products`, {
    headers: { 'x-auth-token': authToken }
  });
  
  if (listResponse.status !== 200) {
    throw new Error(`Status esperado 200, recebido ${listResponse.status}`);
  }
  
  // Testar criação
  const productData = {
    nome: 'Produto Teste',
    descricao: 'Descrição do produto teste',
    preco: 99.99,
    categoria: 'Teste',
    estoque: 10
  };
  
  const createResponse = await axios.post(`${API_URL}/api/products`, productData, {
    headers: { 'x-auth-token': authToken }
  });
  
  if (createResponse.status !== 201) {
    throw new Error(`Status esperado 201, recebido ${createResponse.status}`);
  }
}

async function testUnauthorizedAccess() {
  try {
    await axios.get(`${API_URL}/api/data/dashboard`);
    throw new Error('Acesso não autorizado deveria ter falhado');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Esperado - acesso negado
      return;
    }
    throw error;
  }
}

async function runTests() {
  console.log('🧪 INICIANDO TESTES DE API\n');
  console.log('=' .repeat(50));
  
  // Testes básicos
  await testEndpoint('Health Check', testHealthCheck);
  await testEndpoint('Registro de Usuário', testRegister);
  await testEndpoint('Login', testLogin);
  await testEndpoint('Acesso Não Autorizado', testUnauthorizedAccess);
  
  // Testes com autenticação
  await testEndpoint('Dashboard', testDashboard);
  await testEndpoint('Clientes', testClients);
  await testEndpoint('Produtos', testProducts);
  
  // Relatório final
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RELATÓRIO FINAL');
  console.log('=' .repeat(50));
  
  log.info(`Total de testes: ${testResults.total}`);
  log.success(`Testes aprovados: ${testResults.passed}`);
  
  if (testResults.failed > 0) {
    log.error(`Testes falharam: ${testResults.failed}`);
  }
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  if (successRate >= 90) {
    log.success(`Taxa de sucesso: ${successRate}% - EXCELENTE! 🎉`);
  } else if (successRate >= 70) {
    log.warning(`Taxa de sucesso: ${successRate}% - BOM, mas pode melhorar`);
  } else {
    log.error(`Taxa de sucesso: ${successRate}% - PRECISA DE ATENÇÃO`);
  }
  
  console.log('\n✅ Testes concluídos!');
}

// Executar testes
runTests().catch(error => {
  log.error(`Erro geral nos testes: ${error.message}`);
  process.exit(1);
});