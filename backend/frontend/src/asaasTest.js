// Teste básico da API Asaas
import { ASAAS_CONFIG } from './apiConfig.js';

export const testAsaasConnection = async () => {
  try {
    const response = await fetch(`${ASAAS_CONFIG.baseURL}/myAccount`, {
      headers: {
        'access_token': ASAAS_CONFIG.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Conexão Asaas OK:', data);
    return data;
  } catch (error) {
    console.error('Erro na conexão Asaas:', error);
    return null;
  }
};