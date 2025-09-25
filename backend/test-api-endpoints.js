const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testApiEndpoints() {
  try {
    console.log('Testando endpoints da API...');
    
    // Gerar token de admin para teste
    const payload = {
      user: {
        id: '47608086-4ffe-4234-a87c-7154b4a8e803',
        email: 'admin@ark.com',
        role: 'admin',
        clientId: null
      }
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Token gerado para teste');
    
    const headers = {
      'x-auth-token': token,
      'Content-Type': 'application/json'
    };
    
    // Testar GET /api/admin/notifications
    console.log('\n--- Testando GET /api/admin/notifications ---');
    try {
      const getResponse = await axios.get('http://localhost:3000/api/admin/notifications', { headers });
      console.log('✅ GET funcionou:', getResponse.data);
    } catch (error) {
      console.error('❌ GET falhou:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
    }
    
    // Testar POST /api/admin/notifications
    console.log('\n--- Testando POST /api/admin/notifications ---');
    try {
      const postData = {
        title: 'Teste API',
        message: 'Mensagem de teste via API',
        type: 'info',
        target_audience: 'all'
      };
      
      const postResponse = await axios.post('http://localhost:3000/api/admin/notifications', postData, { headers });
      console.log('✅ POST funcionou:', postResponse.data);
      
      const notificationId = postResponse.data.id;
      
      // Testar DELETE /api/admin/notifications/:id
      console.log('\n--- Testando DELETE /api/admin/notifications/:id ---');
      try {
        const deleteResponse = await axios.delete(`http://localhost:3000/api/admin/notifications/${notificationId}`, { headers });
        console.log('✅ DELETE funcionou:', deleteResponse.data);
      } catch (error) {
        console.error('❌ DELETE falhou:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
      }
      
    } catch (error) {
      console.error('❌ POST falhou:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testApiEndpoints();