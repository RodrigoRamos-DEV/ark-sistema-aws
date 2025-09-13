// frontend/src/apiConfig.js
const API_URL = import.meta.env.PROD
  ? 'https://sistema.arksistemas.com.br'
  : 'http://localhost:3000';

// Configuração da API do Asaas
const ASAAS_CONFIG = {
  baseURL: 'https://sandbox.asaas.com/api/v3',
  apiKey: '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmQ0NDA1MzZiLTMzZWUtNDg4OC04MDAwLWQ3Nzc4Njc5YTdjYjo6JGFhY2hfNTNjNjEwNjAtODJhNC00MTViLWE3ZDYtYmJhNDk3NGViMDlh',
  environment: 'sandbox'
};

export { ASAAS_CONFIG };
export default API_URL;