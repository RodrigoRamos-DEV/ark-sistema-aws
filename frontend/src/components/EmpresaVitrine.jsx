import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import ClientNotifications from './ClientNotifications';

function EmpresaVitrine() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalFoto, setModalFoto] = useState({ isOpen: false, fotos: [], currentIndex: 0 });
  const [favorites, setFavorites] = useState([]);
  const [filters, setFilters] = useState({
    categoria: '',
    precoMax: '',
    distanciaMax: 50,
    ordenacao: 'nome'
  });
  const [userLocation, setUserLocation] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchProdutos();
    loadFavorites();
    getUserLocation();
  }, []);
  
  const loadFavorites = () => {
    const userFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
    setFavorites(userFavorites);
  };
  
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log('Localização não disponível')
      );
    }
  };
  
  const toggleFavorite = (productId) => {
    const userFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
    let updatedFavorites;
    
    if (userFavorites.includes(productId)) {
      updatedFavorites = userFavorites.filter(id => id !== productId);
    } else {
      updatedFavorites = [...userFavorites, productId];
    }
    
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
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

  const fetchProdutos = async () => {
    try {
      // Tentar buscar da API primeiro
      const token = localStorage.getItem('token');
      console.log('EmpresaVitrine: Buscando produtos da API...');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://ark-pro-backend.onrender.com'}/api/feira/produtos`, {
        headers: { 'x-auth-token': token }
      });
      
      console.log('EmpresaVitrine: Response status:', response.status);
      
      if (response.ok) {
        const apiProdutos = await response.json();
        console.log('EmpresaVitrine: Produtos da API:', apiProdutos.length);
        setProdutos(apiProdutos);
      } else {
        console.log('EmpresaVitrine: API falhou, usando localStorage');
        // Fallback para localStorage
        const vitrineProdutos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
        console.log('EmpresaVitrine: Produtos localStorage:', vitrineProdutos.length);
        setProdutos(vitrineProdutos);
      }
    } catch (error) {
      console.log('EmpresaVitrine: Erro ao buscar da API, usando localStorage:', error);
      // Fallback para localStorage
      const vitrineProdutos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      console.log('EmpresaVitrine: Produtos localStorage (catch):', vitrineProdutos.length);
      setProdutos(vitrineProdutos);
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = produtos.filter(produto => {
    if (produto.disponivel === false) return false;
    
    // Filtro de busca
    const matchesSearch = !searchTerm || (
      produto.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.produtor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Filtro de categoria
    const matchesCategory = !filters.categoria || produto.categoria === filters.categoria;
    
    // Filtro de preço
    const matchesPrice = !filters.precoMax || (() => {
      const precoNumerico = parseFloat(produto.preco?.replace(/[^0-9,]/g, '').replace(',', '.'));
      return precoNumerico <= parseFloat(filters.precoMax);
    })();
    
    // Filtro de distância
    const matchesDistance = !userLocation || !produto.latitude || !produto.longitude || (() => {
      const distancia = calcularDistancia(
        userLocation.lat, userLocation.lng,
        parseFloat(produto.latitude), parseFloat(produto.longitude)
      );
      return distancia <= filters.distanciaMax;
    })();
    
    return matchesSearch && matchesCategory && matchesPrice && matchesDistance;
  }).sort((a, b) => {
    switch (filters.ordenacao) {
      case 'preco':
        const precoA = parseFloat(a.preco?.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
        const precoB = parseFloat(b.preco?.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
        return precoA - precoB;
      case 'distancia':
        if (!userLocation || !a.latitude || !b.latitude) return 0;
        const distA = calcularDistancia(userLocation.lat, userLocation.lng, parseFloat(a.latitude), parseFloat(a.longitude));
        const distB = calcularDistancia(userLocation.lat, userLocation.lng, parseFloat(b.latitude), parseFloat(b.longitude));
        return distA - distB;
      default:
        return a.nome?.localeCompare(b.nome) || 0;
    }
  });

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}>
        <p>Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div style={{padding: '20px'}}>
      <div style={{marginBottom: '30px'}}>
        <h2 style={{marginBottom: '20px', color: 'var(--cor-texto)'}}>🏪 Feira - Produtos Disponíveis</h2>
        
        {/* Busca */}
        <input
          type="text"
          placeholder="Buscar produtos, produtores ou descrições..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '10px',
            outline: 'none',
            marginBottom: '20px'
          }}
        />
        
        {/* Filtros */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          padding: '20px',
          backgroundColor: 'var(--cor-card)',
          borderRadius: '10px',
          border: '1px solid var(--cor-borda)'
        }}>
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Categoria</label>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({...filters, categoria: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px'}}
            >
              <option value="">Todas as categorias</option>
              <option value="frutas">🍎 Frutas</option>
              <option value="verduras">🥬 Verduras</option>
              <option value="legumes">🥕 Legumes</option>
              <option value="graos">🌾 Grãos</option>
              <option value="tuberculos">🥔 Tubérculos</option>
              <option value="temperos">🌿 Temperos</option>
              <option value="outros">📦 Outros</option>
            </select>
          </div>
          
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Preço máximo (R$)</label>
            <input
              type="number"
              placeholder="Ex: 50"
              value={filters.precoMax}
              onChange={(e) => setFilters({...filters, precoMax: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px'}}
            />
          </div>
          
          {userLocation && (
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Distância máx: {filters.distanciaMax}km</label>
              <input
                type="range"
                min="1"
                max="200"
                value={filters.distanciaMax}
                onChange={(e) => setFilters({...filters, distanciaMax: parseInt(e.target.value)})}
                style={{width: '100%'}}
              />
            </div>
          )}
          
          <div>
            <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Ordenar por</label>
            <select
              value={filters.ordenacao}
              onChange={(e) => setFilters({...filters, ordenacao: e.target.value})}
              style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px'}}
            >
              <option value="nome">Nome</option>
              <option value="preco">Preço (menor)</option>
              {userLocation && <option value="distancia">Distância</option>}
            </select>
          </div>
          
          <div style={{display: 'flex', alignItems: 'end'}}>
            <button
              onClick={() => setFilters({categoria: '', precoMax: '', distanciaMax: 50, ordenacao: 'nome'})}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {filteredProdutos.length === 0 ? (
        <div style={{textAlign: 'center', padding: '50px'}}>
          <p>Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px'}}>
          {filteredProdutos.map(produto => (
            <div key={produto.id} style={{
              background: 'white',
              borderRadius: '15px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {/* Imagem do produto */}
              <div 
                style={{
                  height: '200px',
                  backgroundColor: '#f0f0f0',
                  overflow: 'hidden',
                  cursor: produto.fotos && produto.fotos.length > 0 ? 'pointer' : 'default',
                  position: 'relative'
                }}
                onClick={() => produto.fotos && produto.fotos.length > 0 && setModalFoto({ isOpen: true, fotos: produto.fotos, currentIndex: 0 })}
              >
                {produto.fotos && produto.fotos.length > 0 ? (
                  <>
                    <img 
                      src={produto.fotos[0]} 
                      alt={produto.nome}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover'
                      }}
                    />
                    
                    {/* Botão de Favoritos */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(produto.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: favorites.includes(produto.id) ? 'rgba(220, 38, 38, 0.9)' : 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={favorites.includes(produto.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      {favorites.includes(produto.id) ? '❤️' : '🤍'}
                    </button>
                    
                    {produto.fotos.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        +{produto.fotos.length - 1}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '4em',
                      color: '#ccc'
                    }}>
                      🌱
                    </div>
                    
                    {/* Botão de Favoritos */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(produto.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: favorites.includes(produto.id) ? 'rgba(220, 38, 38, 0.9)' : 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      title={favorites.includes(produto.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      {favorites.includes(produto.id) ? '❤️' : '🤍'}
                    </button>
                  </>
                )}
              </div>
              
              <div style={{padding: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
                  <div>
                    <h3 style={{margin: '0 0 5px 0', color: '#2c5aa0', fontSize: '1.3em'}}>{produto.nome}</h3>
                    {produto.categoria && (
                      <span style={{
                        fontSize: '0.75em',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        fontWeight: '500'
                      }}>
                        {produto.categoria === 'frutas' ? '🍎 Frutas' :
                         produto.categoria === 'verduras' ? '🥬 Verduras' :
                         produto.categoria === 'legumes' ? '🥕 Legumes' :
                         produto.categoria === 'graos' ? '🌾 Grãos' :
                         produto.categoria === 'tuberculos' ? '🥔 Tubérculos' :
                         produto.categoria === 'temperos' ? '🌿 Temperos' : '📦 Outros'}
                      </span>
                    )}
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8em',
                    backgroundColor: produto.disponivel ? '#4caf50' : '#f44336',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {produto.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </div>
                
                <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '1.1em'}}>👨‍🌾</span>
                  <strong>Produtor:</strong> {produto.produtor}
                </div>
                
                {produto.descricao && (
                  <div style={{marginBottom: '12px', color: '#666', lineHeight: '1.4'}}>
                    {produto.descricao}
                  </div>
                )}
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.1em'}}>💰</span>
                    <div>
                      <div style={{fontSize: '0.9em', color: '#666'}}>Preço</div>
                      <div style={{fontWeight: 'bold', color: '#4caf50'}}>R$ {produto.preco}</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.1em'}}>📦</span>
                    <div>
                      <div style={{fontSize: '0.9em', color: '#666'}}>Unidade</div>
                      <div style={{fontWeight: 'bold'}}>{produto.unidade}</div>
                    </div>
                  </div>
                </div>
                
                {produto.quantidade && (
                  <div style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '1.1em'}}>📊</span>
                    <strong>Quantidade disponível:</strong> {produto.quantidade}
                  </div>
                )}
                
                {produto.localizacao && (
                  <div style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#666'}}>
                    <span style={{fontSize: '1.1em'}}>📍</span>
                    {produto.localizacao}
                  </div>
                )}
                
                <div style={{borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', gap: '10px'}}>
                  <button
                    onClick={() => {
                      const user = JSON.parse(localStorage.getItem('user'));
                      const empresa = user?.companyName || 'Empresa';
                      const mensagem = `Olá! Sou da empresa ${empresa} e vi seu produto "${produto.nome}" no sistema ARK. Ainda está disponível?`;
                      window.open(`https://wa.me/55${produto.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
                    }}
                    style={{
                      flex: 1,
                      background: '#25d366',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    💬 WhatsApp
                  </button>
                  
                  <button
                    onClick={() => window.open(`tel:${produto.whatsapp}`, '_blank')}
                    style={{
                      background: '#2196f3',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      minWidth: '50px'
                    }}
                  >
                    📞
                  </button>
                  
                  {produto.latitude && produto.longitude && (
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${produto.latitude},${produto.longitude}`, '_blank')}
                      style={{
                        background: '#4caf50',
                        color: 'white',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        minWidth: '50px'
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
      )}
      
      {/* Modal de Fotos */}
      {modalFoto.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setModalFoto({ ...modalFoto, isOpen: false })}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '40px',
              height: '40px'
            }}
          >
            ×
          </button>
          
          {modalFoto.fotos.length > 1 && modalFoto.currentIndex > 0 && (
            <button
              onClick={() => setModalFoto({ ...modalFoto, currentIndex: modalFoto.currentIndex - 1 })}
              style={{
                position: 'absolute',
                left: '20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '40px',
                height: '40px'
              }}
            >
              ‹
            </button>
          )}
          
          <img
            src={modalFoto.fotos[modalFoto.currentIndex]}
            alt="Foto do produto"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
          />
          
          {modalFoto.fotos.length > 1 && modalFoto.currentIndex < modalFoto.fotos.length - 1 && (
            <button
              onClick={() => setModalFoto({ ...modalFoto, currentIndex: modalFoto.currentIndex + 1 })}
              style={{
                position: 'absolute',
                right: '20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '40px',
                height: '40px'
              }}
            >
              ›
            </button>
          )}
          
          {modalFoto.fotos.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              background: 'rgba(0,0,0,0.5)',
              padding: '8px 16px',
              borderRadius: '20px'
            }}>
              {modalFoto.currentIndex + 1} / {modalFoto.fotos.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EmpresaVitrine;