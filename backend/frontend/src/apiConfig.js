// frontend/src/apiConfig.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://sistema.arksistemas.com.br'
  : 'https://ark-sistema-d9711c405f21.herokuapp.com';
export default API_URL;