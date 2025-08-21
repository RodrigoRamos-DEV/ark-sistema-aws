import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

const FavoritesManager = () => {
  const [favorites, setFavorites] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const userFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
      
      if (userFavorites.length === 0) {
        setFavorites([]);
        return;
      }
      
      // Tentar buscar da API primeiro
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://ark-pro-backend.onrender.com'}/api/feira/produtos`, {
        headers: { 'x-auth-token': token }
      });
      
      let allProducts = [];
      if (response.ok) {
        allProducts = await response.json();
      } else {
        // Fallback para localStorage
        allProducts = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      }
      
      // Buscar produtos completos dos favoritos
      const favoriteProducts = allProducts.filter(product => 
        userFavorites.includes(product.id)
      );
      
      setFavorites(favoriteProducts);
    } catch (error) {
      console.log('Erro ao buscar favoritos da API, usando localStorage:', error);
      // Fallback para localStorage
      const userFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
      const allProducts = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      const favoriteProducts = allProducts.filter(product => 
        userFavorites.includes(product.id)
      );
      setFavorites(favoriteProducts);
    }
  };

  const removeFavorite = (productId) => {
    const userFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
    const updatedFavorites = userFavorites.filter(id => id !== productId);
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(updatedFavorites));
    loadFavorites();
  };

  if (favorites.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3em', marginBottom: '20px', color: 'var(--cor-texto-secundario)' }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <h3>Nenhum produto favorito</h3>
        <p style={{ color: 'var(--cor-texto-secundario)' }}>
          Adicione produtos aos favoritos na feira para acompanhar facilmente
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        Meus Favoritos ({favorites.length})
      </h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {favorites.map(produto => (
          <div key={produto.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {/* Imagem */}
            <div style={{ height: '150px', backgroundColor: '#f0f0f0', position: 'relative' }}>
              {produto.fotos && produto.fotos.length > 0 ? (
                <img 
                  src={produto.fotos[0]} 
                  alt={produto.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ 
                  width: '100%', height: '100%', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '3em', color: '#ccc'
                }}>
                  🌱
                </div>
              )}
              
              <button
                onClick={() => removeFavorite(produto.id)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(220, 38, 38, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Remover dos favoritos"
              >
                ❤️
              </button>
            </div>
            
            {/* Conteúdo */}
            <div style={{ padding: '15px' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>{produto.nome}</h4>
              <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9em' }}>
                👨🌾 {produto.produtor}
              </p>
              <p style={{ margin: '4px 0', color: 'var(--cor-primaria)', fontWeight: 'bold' }}>
                💰 {produto.preco}
              </p>
              <p style={{ margin: '4px 0 12px 0', fontSize: '0.9em' }}>
                📦 {produto.quantidade}
              </p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const empresa = user?.companyName || 'Empresa';
                    const mensagem = `Olá! Sou da empresa ${empresa} e vi seu produto "${produto.nome}" nos meus favoritos. Ainda está disponível?`;
                    window.open(`https://wa.me/55${produto.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
                  }}
                  className="btn"
                  style={{ 
                    backgroundColor: '#25d366', 
                    fontSize: '0.8em',
                    padding: '8px 12px',
                    flex: 1
                  }}
                >
                  💬 WhatsApp
                </button>
                
                {produto.latitude && produto.longitude && (
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${produto.latitude},${produto.longitude}`, '_blank')}
                    className="btn"
                    style={{ 
                      backgroundColor: '#4285f4',
                      fontSize: '0.8em',
                      padding: '8px 12px'
                    }}
                  >
                    📍
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesManager;