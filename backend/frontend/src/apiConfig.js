// frontend/src/apiConfig.js
const API_URL = import.meta.env.PROD
  ? 'https://sistema.arksistemas.com.br'
  : 'https://ark-sistema-d9711c405f21.herokuapp.com';

export default API_URL;