import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const PushNotifications = () => {
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {


    // Verificar novas mensagens/avisos admin
    const checkNewMessages = () => {
      const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
      const dismissed = JSON.parse(localStorage.getItem(`dismissedNotifications_${user.id}`) || '[]');
      const unreadCount = notifications.filter(n => !dismissed.includes(n.id)).length;
      
      if (lastMessageCount > 0 && unreadCount > lastMessageCount) {
        const newMessages = unreadCount - lastMessageCount;
        toast.info(`📢 ${newMessages} nova${newMessages > 1 ? 's' : ''} mensagem${newMessages > 1 ? 'ns' : ''} do sistema!`, {
          position: "top-right",
          autoClose: 5000
        });
      }
      
      setLastMessageCount(unreadCount);
    };

    // Verificar produtos próximos (apenas para empresas)
    const checkNearbyProducts = () => {
      if (user.clientType !== 'empresa') return;
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const produtos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
            
            const nearbyProducts = produtos.filter(produto => {
              if (!produto.latitude || !produto.longitude) return false;
              
              const distance = calcularDistancia(
                userLat, userLng,
                parseFloat(produto.latitude), parseFloat(produto.longitude)
              );
              
              return distance <= 10; // 10km de raio
            });
            
            // Verificar se há produtos novos próximos
            const lastNearbyCheck = localStorage.getItem(`lastNearbyCheck_${user.id}`);
            const now = Date.now();
            
            if (!lastNearbyCheck || (now - parseInt(lastNearbyCheck)) > 3600000) { // 1 hora
              if (nearbyProducts.length > 0) {
                toast.success(`📍 ${nearbyProducts.length} produto${nearbyProducts.length > 1 ? 's' : ''} disponível${nearbyProducts.length > 1 ? 'eis' : ''} próximo${nearbyProducts.length > 1 ? 's' : ''} a você!`, {
                  position: "top-right",
                  autoClose: 7000
                });
              }
              localStorage.setItem(`lastNearbyCheck_${user.id}`, now.toString());
            }
          },
          () => {} // Ignorar erro de localização
        );
      }
    };

    const calcularDistancia = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Verificar vencimento de licença (removido - já existe no LicenseWarning)
    const checkLicenseExpiry = () => {
      // Removido - o LicenseWarning já cuida disso
    };

    // Executar verificações iniciais
    setTimeout(() => {
      checkNewMessages();
      checkNearbyProducts();
    }, 2000);

    // Configurar intervalos
    const messageInterval = setInterval(checkNewMessages, 60000); // 1 minuto
    const nearbyInterval = setInterval(checkNearbyProducts, 300000); // 5 minutos
    return () => {
      clearInterval(messageInterval);
      clearInterval(nearbyInterval);
    };
  }, [lastMessageCount, user.id, user.clientType]);

  return null; // Componente invisível
};

export default PushNotifications;