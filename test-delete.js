const https = require('https');

// Função para testar delete de transação
const testDeleteTransaction = (transactionId, token) => {
  const options = {
    hostname: 'sistema.arksistemas.com.br',
    port: 443,
    path: `/api/data/transactions/${transactionId}`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
};

console.log('Para testar, execute:');
console.log('testDeleteTransaction(ID_DA_TRANSACAO, SEU_TOKEN);');
console.log('');
console.log('Exemplo:');
console.log('testDeleteTransaction(123, "seu_token_aqui");');

module.exports = { testDeleteTransaction };