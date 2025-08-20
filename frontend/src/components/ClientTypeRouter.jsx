import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ClientTypeRouter() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user?.clientType === 'empresa') {
      // Redireciona para sistema empresarial (a ser criado)
      navigate('/empresa-dashboard');
    } else {
      // Redireciona para sistema atual (produtores)
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div style={{textAlign: 'center', padding: '50px'}}>
      <p>Redirecionando...</p>
    </div>
  );
}

export default ClientTypeRouter;