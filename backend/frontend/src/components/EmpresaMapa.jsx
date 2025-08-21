import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ClientNotifications from './ClientNotifications';

function EmpresaMapa() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [raioKm, setRaioKm] = useState(50);
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [modalProduto, setModalProduto] = useState(null);

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      // Tentar buscar da API primeiro
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://ark-pro-backend.onrender.com'}/api/feira/produtos`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const apiProdutos = await response.json();
        setProdutos(apiProdutos);
      } else {
        // Fallback para localStorage
        const vitrineProdutos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
        setProdutos(vitrineProdutos);
      }
    } catch (error) {
      console.log('Erro ao buscar da API, usando localStorage:', error);
      // Fallback para localStorage
      const vitrineProdutos = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
      setProdutos(vitrineProdutos);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaflet = () => {
    if (window.L && window.L.markerClusterGroup) {
      initMap();
      return;
    }
    
    // Carregar CSS do Leaflet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    
    // Carregar CSS do MarkerCluster
    const clusterLink = document.createElement('link');
    clusterLink.rel = 'stylesheet';
    clusterLink.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
    document.head.appendChild(clusterLink);
    
    const clusterDefaultLink = document.createElement('link');
    clusterDefaultLink.rel = 'stylesheet';
    clusterDefaultLink.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
    document.head.appendChild(clusterDefaultLink);
    
    // Carregar JS do Leaflet
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      // Carregar JS do MarkerCluster
      const clusterScript = document.createElement('script');
      clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
      clusterScript.onload = () => initMap();
      document.head.appendChild(clusterScript);
    };
    document.head.appendChild(script);
  };

  const calcularDistancia = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filtrarProdutos = () => {
    let produtosFiltrados = produtos.filter(p => p.latitude && p.longitude);
    
    // Filtro por busca
    if (searchTerm) {
      produtosFiltrados = produtosFiltrados.filter(p => 
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.produtor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtro por raio (se tiver localização do usuário)
    if (userLocation) {
      produtosFiltrados = produtosFiltrados.filter(p => {
        const distancia = calcularDistancia(
          userLocation.lat, userLocation.lng,
          parseFloat(p.latitude), parseFloat(p.longitude)
        );
        return distancia <= raioKm;
      });
    }
    
    return produtosFiltrados;
  };

  const initMap = () => {
    const mapElement = document.getElementById('map');
    if (!mapElement || !window.L || !window.L.markerClusterGroup) return;
    
    const produtosFiltrados = filtrarProdutos();
    
    if (produtosFiltrados.length === 0 && !map) {
      // Só mostra mensagem se não tiver mapa criado
      mapElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666;">
          <div style="text-align: center;">
            <div style="font-size: 3em; margin-bottom: 20px;">🗺️</div>
            <h3>Nenhum produto encontrado</h3>
            <p>${searchTerm ? 'Tente uma busca diferente ou' : ''} ${userLocation ? 'aumente o raio de busca' : 'ative a localização para buscar por proximidade'}</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Criar mapa apenas se não existir
    let currentMap = map;
    if (!currentMap) {
      // Garantir que o elemento existe
      if (!document.getElementById('map')) return;
      
      currentMap = window.L.map('map').setView([-14.235, -51.925], 5);
      setMap(currentMap);
      
      // Adicionar tiles apenas uma vez
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(currentMap);
    } else {
      // Limpar layers existentes (exceto o tile layer)
      currentMap.eachLayer((layer) => {
        if (layer instanceof window.L.MarkerClusterGroup || 
            layer instanceof window.L.Circle || 
            layer instanceof window.L.Marker) {
          currentMap.removeLayer(layer);
        }
      });
    }
    
    // Se não tem produtos filtrados, só mostra o mapa vazio
    if (produtosFiltrados.length === 0) {
      return;
    }
    

    
    // Criar cluster group
    const markers = window.L.markerClusterGroup({
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return window.L.divIcon({
          html: `<div style="background: #4caf50; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [40, 40]
        });
      }
    });
    
    // Criar função global para detalhes
    window.showProductDetails = (produtoId) => {
      const prod = produtosFiltrados.find(p => p.id === produtoId);
      if (prod) setModalProduto(prod);
    };
    
    // Adicionar marcadores
    produtosFiltrados.forEach(produto => {
      const marker = window.L.marker([parseFloat(produto.latitude), parseFloat(produto.longitude)])
        .bindPopup(`
          <div style="max-width: 250px;">
            <h3 style="margin: 0 0 10px 0; color: #2c5aa0;">🌱 ${produto.nome}</h3>
            <p><strong>Produtor:</strong> ${produto.produtor}</p>
            <p><strong>Preço:</strong> ${produto.preco}</p>
            <p><strong>Quantidade:</strong> ${produto.quantidade}</p>
            ${userLocation ? `<p><strong>Distância:</strong> ${calcularDistancia(userLocation.lat, userLocation.lng, parseFloat(produto.latitude), parseFloat(produto.longitude)).toFixed(1)} km</p>` : ''}
            <div style="display: flex; gap: 5px; margin-top: 10px;">
              <button onclick="window.showProductDetails && window.showProductDetails(${produto.id})" 
                      style="background: #2196f3; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; flex: 1;">
                🔍 Ver Detalhes
              </button>
              <button onclick="window.open('https://wa.me/55${produto.whatsapp.replace(/\D/g, '')}?text=Ol%C3%A1!%20Sou%20da%20empresa%20e%20vi%20seu%20produto%20${produto.nome}%20no%20sistema%20ARK.%20Ainda%20est%C3%A1%20dispon%C3%ADvel?', '_blank')" 
                      style="background: #25d366; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; flex: 1;">
                💬 WhatsApp
              </button>
            </div>
          </div>
        `);
        
      marker.on('click', () => {
        setSelectedProduto(produto);
      });
      markers.addLayer(marker);
    });
    
    currentMap.addLayer(markers);
    
    // Adicionar círculo de raio se tiver localização
    if (userLocation) {
      window.L.circle([userLocation.lat, userLocation.lng], {
        color: '#2196f3',
        fillColor: '#2196f3',
        fillOpacity: 0.1,
        radius: raioKm * 1000
      }).addTo(currentMap);
      
      window.L.marker([userLocation.lat, userLocation.lng], {
        icon: window.L.divIcon({
          html: '📍',
          className: 'user-location-icon',
          iconSize: [30, 30]
        })
      }).addTo(currentMap).bindPopup('Sua localização');
    }
    
    // Ajustar zoom
    if (produtosFiltrados.length > 0) {
      currentMap.fitBounds(markers.getBounds().pad(0.1));
    }
  };

  const obterLocalizacao = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast.success('Localização obtida!');
        },
        () => toast.error('Erro ao obter localização')
      );
    } else {
      toast.error('Geolocalização não suportada');
    }
  };

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        loadLeaflet();
      }, 100);
    }
  }, [loading, produtos]);
  
  useEffect(() => {
    if (map && !loading && produtos.length > 0) {
      initMap();
    }
  }, [searchTerm, raioKm, userLocation]);

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}>
        <p>Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div style={{height: 'calc(100vh - 80px)', position: 'relative'}}>
      {/* Barra de Busca */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 500,
        background: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Buscar produtos ou produtores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '8px 12px',
            border: '2px solid #ddd',
            borderRadius: '5px',
            outline: 'none'
          }}
        />
        
        <button
          onClick={obterLocalizacao}
          style={{
            background: userLocation ? '#4caf50' : '#2196f3',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {userLocation ? '✓ Localizado' : '📍 Minha Localização'}
        </button>
        
        {userLocation && (
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <label style={{whiteSpace: 'nowrap'}}>Raio: {raioKm}km</label>
            <input
              type="range"
              min="1"
              max="200"
              value={raioKm}
              onChange={(e) => setRaioKm(parseInt(e.target.value))}
              style={{width: '100px'}}
            />
          </div>
        )}
      </div>
      
      <div id="map" style={{width: '100%', height: '100%'}}></div>
      
      {/* Modal de Detalhes do Produto */}
      {modalProduto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <button
              onClick={() => setModalProduto(null)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ×
            </button>
            
            {/* Imagem */}
            <div style={{ height: '250px', backgroundColor: '#f0f0f0', position: 'relative' }}>
              {modalProduto.fotos && modalProduto.fotos.length > 0 ? (
                <img 
                  src={modalProduto.fotos[0]} 
                  alt={modalProduto.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ 
                  width: '100%', height: '100%', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '4em', color: '#ccc'
                }}>
                  🌱
                </div>
              )}
            </div>
            
            {/* Conteúdo */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', color: '#2c5aa0' }}>{modalProduto.nome}</h2>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>👨‍🌾 Produtor:</strong> {modalProduto.produtor}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <strong>💰 Preço:</strong><br/>
                  <span style={{ color: '#4caf50', fontSize: '1.2em', fontWeight: 'bold' }}>{modalProduto.preco}</span>
                </div>
                <div>
                  <strong>📊 Quantidade:</strong><br/>
                  {modalProduto.quantidade}
                </div>
              </div>
              
              {userLocation && (
                <div style={{ marginBottom: '15px' }}>
                  <strong>📍 Distância:</strong> {calcularDistancia(
                    userLocation.lat, userLocation.lng,
                    parseFloat(modalProduto.latitude), parseFloat(modalProduto.longitude)
                  ).toFixed(1)} km
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const empresa = user?.companyName || 'Empresa';
                    const mensagem = `Olá! Sou da empresa ${empresa} e vi seu produto "${modalProduto.nome}" no sistema ARK. Ainda está disponível?`;
                    window.open(`https://wa.me/55${modalProduto.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
                  }}
                  style={{
                    flex: 1,
                    background: '#25d366',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  💬 Entrar em Contato
                </button>
                
                <button
                  onClick={() => window.open(`https://maps.google.com/?q=${modalProduto.latitude},${modalProduto.longitude}`, '_blank')}
                  style={{
                    background: '#4285f4',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    minWidth: '50px'
                  }}
                >
                  🗺️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {selectedProduto && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '300px',
          zIndex: 1000
        }}>
          <button 
            onClick={() => setSelectedProduto(null)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          
          <h3 style={{margin: '0 0 15px 0', color: '#2c5aa0'}}>{selectedProduto.nome}</h3>
          <p><strong>Produtor:</strong> {selectedProduto.produtor}</p>
          <p><strong>Preço:</strong> R$ {selectedProduto.preco}/{selectedProduto.unidade}</p>
          {selectedProduto.quantidade && <p><strong>Quantidade:</strong> {selectedProduto.quantidade}</p>}
          {selectedProduto.descricao && <p><strong>Descrição:</strong> {selectedProduto.descricao}</p>}
          <p><strong>Localização:</strong> {selectedProduto.localizacao}</p>
          
          <button
            onClick={() => {
              const user = JSON.parse(localStorage.getItem('user'));
              const empresa = user?.companyName || 'Empresa';
              const mensagem = `Olá! Sou da empresa ${empresa} e vi seu produto "${selectedProduto.nome}" no sistema ARK. Ainda está disponível?`;
              window.open(`https://wa.me/55${selectedProduto.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`, '_blank');
            }}
            style={{
              background: '#25d366',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%',
              marginTop: '10px'
            }}
          >
            💬 Entrar em Contato
          </button>
        </div>
      )}
    </div>
  );
}

export default EmpresaMapa;