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
      if (!token) return;

      const response = await fetch(`${API_URL}/api/subscription/current`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (feature) => {
    if (!subscription) return false;
    
    // Sempre permitir acesso a feira, perfil e planos
    if (['vitrine', 'profile', 'planos'].includes(feature)) {
      return true;
    }
    
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