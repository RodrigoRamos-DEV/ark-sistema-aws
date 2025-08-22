// frontend/src/apiConfig.js
const API_URL = 'https://ark-sistema-d9711c405f21.herokuapp.com';

// Debug simples
window.ARK_DEBUG = {
  API_URL: API_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
};

console.log('ARK DEBUG:', window.ARK_DEBUG);

export default API_URL;