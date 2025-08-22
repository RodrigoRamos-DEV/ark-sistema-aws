// Script de debug para testar a configuração da API
console.log('=== DEBUG API CONFIG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Simula a lógica do apiConfig.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://sistema.arksistemas.com.br'
  : 'https://ark-sistema-d9711c405f21.herokuapp.com';

console.log('API_URL configurada:', API_URL);

// Testa se a URL está acessível
const https = require('https');
const http = require('http');

function testUrl(url) {
  const protocol = url.startsWith('https') ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = protocol.get(url, (res) => {
      console.log(`Status da URL ${url}:`, res.statusCode);
      resolve(res.statusCode);
    });
    
    req.on('error', (err) => {
      console.log(`Erro ao acessar ${url}:`, err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function testApis() {
  try {
    console.log('\n=== TESTANDO URLs ===');
    await testUrl('https://sistema.arksistemas.com.br');
    await testUrl('https://ark-sistema-d9711c405f21.herokuapp.com');
  } catch (error) {
    console.log('Erro nos testes:', error.message);
  }
}

testApis();