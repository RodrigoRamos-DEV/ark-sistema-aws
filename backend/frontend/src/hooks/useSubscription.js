import { useState, useEffect } from 'react';
import API_URL from '../apiConfig';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/subscription/current`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setSubscription(data);
        } else {
          console.warn('API retornou HTML em vez de JSON');
          // Definir assinatura padrão para evitar erros
          setSubscription({ plan: 'free', status: 'active' });
        }
      } else {
        console.warn('Erro na resposta da API:', response.status);
        setSubscription({ plan: 'free', status: 'active' });
      }
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      // Definir assinatura padrão em caso de erro
      setSubscription({ plan: 'free', status: 'active' });
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (feature) => {
    // Sempre permitir acesso a feira, perfil e planos
    if (['vitrine', 'profile', 'planos'].includes(feature)) {
      return true;
    }
    
    if (!subscription) return false;
    
    // Se está no trial, tem acesso a tudo
    if (subscription.status === 'trial') {
      return true;
    }
    
    // Se é premium ativo, tem acesso a tudo
    if (subscription.plan === 'premium' && subscription.status === 'active') {
      return true;
    }
    
    // Se status é expired ou free, só tem acesso a feira, perfil e planos
    return false;
  };

  return { subscription, loading, hasAccess, refetch: fetchSubscription };
};