// frontend/src/apiConfig.js
console.log('🔧 API Config - NODE_ENV:', import.meta.env.MODE);
console.log('🔧 API Config - PROD:', import.meta.env.PROD);

const API_URL = import.meta.env.PROD
  ? 'https://sistema.arksistemas.com.br'
  : 'https://ark-sistema-d9711c405f21.herokuapp.com';

console.log('🔧 API Config - URL configurada:', API_URL);

export default API_URL;