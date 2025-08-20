// Utilitário para migrar dados da vitrine do localStorage para o banco de dados
import axios from 'axios';
import API_URL from '../apiConfig';

export const migrarVitrineProdutos = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }

    // Buscar produtos do localStorage
    const produtosLocalStorage = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
    
    if (produtosLocalStorage.length === 0) {
      return { success: true, message: 'Nenhum produto para migrar', migrados: 0 };
    }

    // Filtrar apenas produtos do usuário atual
    const user = JSON.parse(localStorage.getItem('user'));
    const meusProdutos = produtosLocalStorage.filter(p => p.userId === user.id);

    if (meusProdutos.length === 0) {
      return { success: true, message: 'Nenhum produto seu para migrar', migrados: 0 };
    }

    // Enviar para o backend
    const response = await axios.post(`${API_URL}/api/data/vitrine/migrar`, {
      produtos: meusProdutos
    }, {
      headers: { 'x-auth-token': token }
    });

    return {
      success: true,
      message: response.data.msg,
      migrados: response.data.migrados
    };

  } catch (error) {
    console.error('Erro na migração:', error);
    return {
      success: false,
      message: error.response?.data?.error || 'Erro ao migrar produtos',
      migrados: 0
    };
  }
};

export const carregarProdutosDoBanco = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const response = await axios.get(`${API_URL}/api/data/vitrine/meus-produtos`, {
      headers: { 'x-auth-token': token }
    });

    return {
      success: true,
      produtos: response.data
    };

  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    return {
      success: false,
      produtos: [],
      message: error.response?.data?.error || 'Erro ao carregar produtos'
    };
  }
};

export const salvarProdutoNoBanco = async (produto) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const response = await axios.post(`${API_URL}/api/data/vitrine/produtos`, produto, {
      headers: { 'x-auth-token': token }
    });

    return {
      success: true,
      produto: response.data
    };

  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    return {
      success: false,
      message: error.response?.data?.error || 'Erro ao salvar produto'
    };
  }
};

export const atualizarProdutoNoBanco = async (id, produto) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const response = await axios.put(`${API_URL}/api/data/vitrine/produtos/${id}`, produto, {
      headers: { 'x-auth-token': token }
    });

    return {
      success: true,
      produto: response.data
    };

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return {
      success: false,
      message: error.response?.data?.error || 'Erro ao atualizar produto'
    };
  }
};

export const removerProdutoDoBanco = async (id) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token não encontrado');
    }

    const response = await axios.delete(`${API_URL}/api/data/vitrine/produtos/${id}`, {
      headers: { 'x-auth-token': token }
    });

    return {
      success: true,
      message: response.data.msg
    };

  } catch (error) {
    console.error('Erro ao remover produto:', error);
    return {
      success: false,
      message: error.response?.data?.error || 'Erro ao remover produto'
    };
  }
};

export const carregarVitrinePublica = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/data/vitrine-publica`);
    
    return {
      success: true,
      produtos: response.data
    };

  } catch (error) {
    console.error('Erro ao carregar vitrine pública:', error);
    return {
      success: false,
      produtos: [],
      message: error.response?.data?.error || 'Erro ao carregar vitrine'
    };
  }
};