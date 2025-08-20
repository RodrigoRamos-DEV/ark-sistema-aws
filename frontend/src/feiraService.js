import axios from 'axios';
import API_URL from './apiConfig';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'x-auth-token': token };
};

// Serviços da Feira
export const feiraService = {
  // Buscar produtos
  async getProdutos() {
    try {
      const response = await axios.get(`${API_URL}/api/feira/produtos`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      // Fallback para localStorage se API falhar
      console.warn('API indisponível, usando localStorage:', error.message);
      return JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
    }
  },

  // Criar produto
  async createProduto(produto) {
    try {
      const response = await axios.post(`${API_URL}/api/feira/produtos`, produto, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      // Fallback para localStorage
      console.warn('API indisponível, salvando no localStorage');
      const produtos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      const novoProduto = { ...produto, id: Date.now() };
      produtos.push(novoProduto);
      localStorage.setItem('vitrine_produtos', JSON.stringify(produtos));
      return novoProduto;
    }
  },

  // Atualizar produto
  async updateProduto(id, produto) {
    try {
      const response = await axios.put(`${API_URL}/api/feira/produtos/${id}`, produto, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      // Fallback para localStorage
      console.warn('API indisponível, atualizando localStorage');
      const produtos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      const index = produtos.findIndex(p => p.id == id);
      if (index !== -1) {
        produtos[index] = { ...produtos[index], ...produto };
        localStorage.setItem('vitrine_produtos', JSON.stringify(produtos));
        return produtos[index];
      }
      throw new Error('Produto não encontrado');
    }
  },

  // Deletar produto
  async deleteProduto(id) {
    try {
      await axios.delete(`${API_URL}/api/feira/produtos/${id}`, {
        headers: getAuthHeaders()
      });
    } catch (error) {
      // Fallback para localStorage
      console.warn('API indisponível, removendo do localStorage');
      const produtos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      const produtosFiltrados = produtos.filter(p => p.id != id);
      localStorage.setItem('vitrine_produtos', JSON.stringify(produtosFiltrados));
    }
  },

  // Upload de fotos
  async uploadFotos(files) {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('fotos', file);
      });

      const response = await axios.post(`${API_URL}/api/feira/upload`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.urls;
    } catch (error) {
      // Fallback para base64
      console.warn('Upload S3 indisponível, usando base64');
      return await Promise.all(
        files.map(file => {
          return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
              const maxSize = 400;
              let { width, height } = img;
              
              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            
            img.src = URL.createObjectURL(file);
          });
        })
      );
    }
  }
};

// Serviços de Notificações Admin
export const notificationService = {
  // Buscar notificações para cliente
  async getClientNotifications() {
    try {
      const response = await axios.get(`${API_URL}/api/admin/notifications/client`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      // Fallback para localStorage
      return JSON.parse(localStorage.getItem('adminNotifications') || '[]');
    }
  },

  // Dispensar notificação
  async dismissNotification(notificationId) {
    try {
      await axios.post(`${API_URL}/api/admin/notifications/dismiss`, 
        { notificationId }, 
        { headers: getAuthHeaders() }
      );
    } catch (error) {
      // Fallback para localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const dismissed = JSON.parse(localStorage.getItem(`dismissedNotifications_${user.id}`) || '[]');
      dismissed.push(notificationId);
      localStorage.setItem(`dismissedNotifications_${user.id}`, JSON.stringify(dismissed));
    }
  }
};