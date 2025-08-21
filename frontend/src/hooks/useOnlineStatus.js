import { useEffect } from 'react';
import axios from 'axios';
import API_URL from '../apiConfig';

const useOnlineStatus = () => {
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Função para enviar heartbeat
        const sendHeartbeat = async () => {
            try {
                await axios.post(`${API_URL}/api/online/heartbeat`, {}, {
                    headers: { 'x-auth-token': token }
                });
            } catch (error) {
                console.error('Erro ao enviar heartbeat:', error);
            }
        };

        // Enviar heartbeat inicial
        sendHeartbeat();

        // Configurar intervalo para enviar heartbeat a cada 2 minutos
        const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);

        // Enviar heartbeat quando a página ganhar foco
        const handleFocus = () => sendHeartbeat();
        window.addEventListener('focus', handleFocus);

        // Notificar logout quando fechar aba/janela
        const handleBeforeUnload = async () => {
            try {
                await axios.post(`${API_URL}/api/online/logout`, {}, {
                    headers: { 'x-auth-token': token }
                });
            } catch (error) {
                // Ignorar erros no beforeunload
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
};

export default useOnlineStatus;