// frontend/src/apiConfig.js
const API_URL = import.meta.env.PROD
  ? 'https://sistema.arksistemas.com.br'
  : 'http://localhost:3000';

export default API_URL;