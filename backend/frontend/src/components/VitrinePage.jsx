import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import API_URL from '../apiConfig';
import ClientNotifications from './ClientNotifications';
import { feiraService } from '../feiraService';

function VitrinePage() {
  const [userType, setUserType] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setUserType(user?.userType || 'produtor');
    
    // Buscar dados do perfil
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/data/profile`, { 
          headers: { 'x-auth-token': token } 
        });
        setProfileData(response.data);
        
        // Dados do perfil carregados com sucesso
        console.log('Perfil carregado:', response.data);
      } catch (error) {
        console.log('Erro ao buscar perfil:', error);
      }
    };
    
    fetchProfile();
    
    if (user?.userType === 'distribuidor') {
      loadProdutos();
    } else {
      loadMeusProdutos();
    }
  }, []);

  const loadProdutos = async () => {
    try {
      const allProducts = await feiraService.getProdutos();
      setProdutos(allProducts);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadMeusProdutos = async () => {
    try {
      const allProducts = await feiraService.getProdutos();
      const user = JSON.parse(localStorage.getItem('user'));
      const meusProdutos = allProducts.filter(p => p.userId === user.id);
      setProdutos(meusProdutos);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };



  const AddProductForm = () => {
    const [formData, setFormData] = useState({
      nome: editingProduct?.nome || '',
      categoria: editingProduct?.categoria || '',
      quantidade: editingProduct?.quantidade || '',
      preco: editingProduct?.preco || '',
      fotos: [],
      disponivel: editingProduct?.disponivel !== undefined ? editingProduct.disponivel : true
    });
    const [location, setLocation] = useState(editingProduct ? {
      latitude: editingProduct.latitude,
      longitude: editingProduct.longitude
    } : null);
    const [showMap, setShowMap] = useState(false);
    const [mapInstance, setMapInstance] = useState(null);

    useEffect(() => {
      if (editingProduct) {
        setFormData({
          nome: editingProduct.nome,
          categoria: editingProduct.categoria || '',
          quantidade: editingProduct.quantidade,
          preco: editingProduct.preco,
          fotos: [],
          disponivel: editingProduct.disponivel !== undefined ? editingProduct.disponivel : true
        });
        setLocation({
          latitude: editingProduct.latitude,
          longitude: editingProduct.longitude
        });
      }
    }, [editingProduct]);

    const initLocationMap = () => {
      if (!showMap || mapInstance) return;
      
      setTimeout(() => {
        const mapElement = document.getElementById('location-map');
        if (!mapElement || !window.L) return;
        
        // Tentar obter localização atual para zoom inicial
        if (navigator.geolocation && !location) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              
              const map = window.L.map('location-map').setView([userLat, userLng], 12);
              setMapInstance(map);
              
              window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
              }).addTo(map);
              
              setupMapInteraction(map);
            },
            () => {
              // Se falhar, usar localização padrão
              const map = window.L.map('location-map').setView([-14.235, -51.925], 5);
              setMapInstance(map);
              
              window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
              }).addTo(map);
              
              setupMapInteraction(map);
            }
          );
        } else {
          // Se já tem localização ou geolocalização não disponível
          const initialLat = location ? location.latitude : -14.235;
          const initialLng = location ? location.longitude : -51.925;
          const initialZoom = location ? 12 : 5;
          
          const map = window.L.map('location-map').setView([initialLat, initialLng], initialZoom);
          setMapInstance(map);
          
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          setupMapInteraction(map);
        }
      }, 100);
    };
    
    const setupMapInteraction = (map) => {
      let marker = null;
      
      // Se já tem localização, mostrar marcador
      if (location) {
        marker = window.L.marker([location.latitude, location.longitude]).addTo(map);
        map.setView([location.latitude, location.longitude], 12);
      }
      
      // Clique no mapa para definir localização
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        if (marker) {
          map.removeLayer(marker);
        }
        
        marker = window.L.marker([lat, lng]).addTo(map);
        setLocation({ latitude: lat, longitude: lng });
      });
    };
    
    useEffect(() => {
      if (showMap) {
        // Carregar Leaflet se necessário
        if (!window.L) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = initLocationMap;
          document.head.appendChild(script);
        } else {
          initLocationMap();
        }
      }
    }, [showMap]);

    const getCurrentLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            toast.success('Localização capturada!');
          },
          (error) => {
            toast.error('Erro ao obter localização');
          }
        );
      } else {
        toast.error('Geolocalização não suportada');
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!location) {
        toast.error('Capture a localização primeiro');
        return;
      }
      
      if (formData.fotos.length === 0 && !editingProduct) {
        toast.error('Adicione pelo menos uma foto');
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const allProducts = JSON.parse(localStorage.getItem('vitrine_produtos') || '[]');
        
        console.log('Dados do usuário:', user);
        console.log('Adicionando produto...', formData.nome);
        
        // Upload das fotos
        const fotosUrls = formData.fotos.length > 0 ? await feiraService.uploadFotos(formData.fotos) : [];
        
        const produtoData = {
          nome: formData.nome,
          categoria: formData.categoria,
          quantidade: formData.quantidade,
          preco: formData.preco,
          fotos: fotosUrls.length > 0 ? fotosUrls : (editingProduct?.fotos || []),
          latitude: location.latitude,
          longitude: location.longitude,
          disponivel: formData.disponivel,
          whatsapp: profileData?.contact_phone?.replace(/\D/g, '') || '11999999999',
          endereco: 'Endereço do produtor',
          descricao: formData.descricao || ''
        };

        if (editingProduct) {
          await feiraService.updateProduto(editingProduct.id, produtoData);
        } else {
          await feiraService.createProduto(produtoData);
        }
        
        toast.success(editingProduct ? 'Produto atualizado!' : 'Produto adicionado à feira!');
        setShowAddProduct(false);
        setEditingProduct(null);
        if (userType === 'produtor') {
          loadMeusProdutos();
        } else {
          loadProdutos();
        }
      } catch (error) {
        console.error('Erro completo:', error);
        toast.error('Erro ao adicionar produto: ' + error.message);
      }
    };

    return (
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>{editingProduct ? 'Editar Produto' : 'Adicionar Produto à Feira'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '15px' }}>
            <input
              type="text"
              placeholder="Nome do produto"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              required
            />
            
            <div>
              <label>Categoria</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                style={{width: '100%', padding: '10px', border: '1px solid var(--cor-borda)', borderRadius: '6px'}}
                required
              >
                <option value="">Selecione uma categoria</option>
                <option value="frutas">🍎 Frutas</option>
                <option value="verduras">🥬 Verduras e Folhas</option>
                <option value="legumes">🥕 Legumes</option>
                <option value="graos">🌾 Grãos e Cereais</option>
                <option value="tuberculos">🥔 Tubérculos</option>
                <option value="temperos">🌿 Temperos e Ervas</option>
                <option value="outros">📦 Outros</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Quantidade disponível"
              value={formData.quantidade}
              onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Preço (ex: R$ 2,50/kg)"
              value={formData.preco}
              onChange={(e) => setFormData({...formData, preco: e.target.value})}
              required
            />
            <div>
              <label>Fotos (até 4)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files).slice(0, 4);
                  setFormData({...formData, fotos: files});
                }}
                required={!editingProduct}
              />
              {editingProduct && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0' }}>
                    {formData.fotos.length === 0 ? 'Mantendo fotos atuais' : 'Novas fotos selecionadas'}
                  </p>
                  {editingProduct.fotos && editingProduct.fotos.length > 0 && formData.fotos.length === 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {editingProduct.fotos.map((foto, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img 
                            src={foto} 
                            alt={`Foto atual ${index + 1}`}
                            style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', opacity: 0.7 }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            fontSize: '10px',
                            padding: '2px 4px',
                            borderRadius: '2px'
                          }}>
                            Atual
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {formData.fotos.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {formData.fotos.map((foto, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img 
                        src={URL.createObjectURL(foto)} 
                        alt={`Preview ${index + 1}`}
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFotos = formData.fotos.filter((_, i) => i !== index);
                          setFormData({...formData, fotos: newFotos});
                        }}
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          background: 'red',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label>Status do Produto</label>
              <div style={{ marginTop: '8px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${formData.disponivel ? '#4caf50' : '#f44336'}`,
                  backgroundColor: formData.disponivel ? '#e8f5e8' : '#ffeaea',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.disponivel}
                    onChange={(e) => setFormData({...formData, disponivel: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ 
                    color: formData.disponivel ? '#2e7d32' : '#c62828', 
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {formData.disponivel ? 'Produto Disponível' : 'Produto Indisponível'}
                  </span>
                </label>
              </div>
            </div>
            
            <div>
              <label>Localização da Produção</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                <button type="button" onClick={getCurrentLocation} className="btn" style={{ backgroundColor: '#ff9800' }}>
                  📍 GPS Atual
                </button>
                <button type="button" onClick={() => setShowMap(!showMap)} className="btn" style={{ backgroundColor: '#2196f3' }}>
                  🗺️ Escolher no Mapa
                </button>
                {location && <span style={{ color: 'green' }}>✓ Localização definida</span>}
              </div>
            </div>
            
            {showMap && (
              <div style={{ marginTop: '15px' }}>
                <div style={{ height: '300px', border: '2px solid #ddd', borderRadius: '8px' }}>
                  <div id="location-map" style={{ width: '100%', height: '100%' }}></div>
                </div>
                <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                  Clique no mapa para definir a localização da sua produção
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn">{editingProduct ? 'Atualizar' : 'Adicionar à Feira'}</button>
              <button type="button" onClick={() => {
                setShowAddProduct(false);
                setEditingProduct(null);
              }} className="btn" style={{ backgroundColor: '#6c757d' }}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  };

  const ProductCard = ({ produto }) => (
    <div className="card" style={{ 
      width: '280px', 
      margin: '0', 
      padding: '0',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s ease',
      cursor: userType === 'distribuidor' ? 'pointer' : 'default'
    }}>
      {/* Imagem de Capa */}
      <div style={{ 
        width: '100%', 
        height: '200px', 
        backgroundColor: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {produto.fotos && produto.fotos.length > 0 ? (
          <img 
            src={produto.fotos[0]} 
            alt={produto.nome}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '3em',
            color: '#ccc'
          }}>
            📷
          </div>
        )}
      </div>
      
      {/* Informações do Produto */}
      <div style={{ padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '1.1em', fontWeight: 'bold' }}>
            {produto.nome}
          </h4>
          {produto.categoria && (
            <span style={{
              fontSize: '0.8em',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--cor-primaria)',
              color: 'white'
            }}>
              {produto.categoria === 'frutas' ? '🍎' :
               produto.categoria === 'verduras' ? '🥬' :
               produto.categoria === 'legumes' ? '🥕' :
               produto.categoria === 'graos' ? '🌾' :
               produto.categoria === 'tuberculos' ? '🥔' :
               produto.categoria === 'temperos' ? '🌿' : '📦'}
            </span>
          )}
        </div>
        <p style={{ margin: '4px 0', color: '#666', fontSize: '0.9em' }}>
          <strong>Qtd:</strong> {produto.quantidade}
        </p>
        <p style={{ margin: '4px 0 12px 0', color: '#2c5aa0', fontSize: '1.1em', fontWeight: 'bold' }}>
          {produto.preco}
        </p>
        
        {userType === 'distribuidor' && (
          <>
            <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#888' }}>
              Por: {produto.produtor}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <a 
                href={`https://wa.me/55${produto.whatsapp}?text=Olá! Vi seu produto ${produto.nome} na vitrine e tenho interesse.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ 
                  backgroundColor: '#25d366', 
                  textDecoration: 'none',
                  fontSize: '0.8em',
                  padding: '6px 12px',
                  flex: 1,
                  textAlign: 'center'
                }}
              >
                💬 WhatsApp
              </a>
              <button 
                onClick={() => window.open(`https://maps.google.com/?q=${produto.latitude},${produto.longitude}`, '_blank')}
                className="btn"
                style={{ 
                  backgroundColor: '#4285f4',
                  fontSize: '0.8em',
                  padding: '6px 12px',
                  flex: 1
                }}
              >
                📍 Mapa
              </button>
            </div>
          </>
        )}
        
        {userType === 'produtor' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button 
              onClick={() => editProduto(produto)}
              className="btn"
              style={{ 
                backgroundColor: '#ff9800',
                fontSize: '0.8em',
                padding: '6px 12px',
                flex: 1
              }}
            >
              ✏️ Editar
            </button>
            <button 
              onClick={() => deleteProduto(produto.id)}
              className="btn"
              style={{ 
                backgroundColor: '#f44336',
                fontSize: '0.8em',
                padding: '6px 12px',
                flex: 1
              }}
            >
              🗑️ Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const editProduto = (produto) => {
    setEditingProduct(produto);
    setShowAddProduct(true);
  };

  const deleteProduto = async (produtoId) => {
    if (!window.confirm('Tem certeza que deseja remover este produto da feira?')) return;
    
    try {
      await feiraService.deleteProduto(produtoId);
      toast.success('Produto removido da feira!');
      loadMeusProdutos();
    } catch (error) {
      toast.error('Erro ao remover produto');
    }
  };

  return (
    <div>
      <ClientNotifications />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🏪 Feira {userType === 'produtor' ? 'dos Meus Produtos' : 'de Produtos'}</h2>
        {userType === 'produtor' && (
          <button 
            onClick={() => setShowAddProduct(!showAddProduct)} 
            className="btn"
          >
            ➕ Adicionar Produto
          </button>
        )}
      </div>
      
      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px', 
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            flex: 1, 
            minWidth: '200px', 
            padding: '12px', 
            border: '1px solid var(--cor-borda)', 
            borderRadius: '8px',
            fontSize: '16px'
          }}
        />
        
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          style={{ 
            padding: '12px', 
            border: '1px solid var(--cor-borda)', 
            borderRadius: '8px', 
            minWidth: '150px',
            fontSize: '16px'
          }}
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

      {userType === 'distribuidor' && (
        <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ marginBottom: '15px', color: '#666' }}>Ative a localização para buscar por proximidade</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;
                      window.open(`https://maps.google.com/?q=${lat},${lng}&z=12`, '_blank');
                    },
                    () => {
                      window.open('https://maps.google.com', '_blank');
                    }
                  );
                } else {
                  window.open('https://maps.google.com', '_blank');
                }
              }}
              className="btn"
              style={{ backgroundColor: '#4285f4', fontSize: '1em' }}
            >
              🗺️ Ver Mapa de Produtos
            </button>
            <button 
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      toast.success('Localização ativada! Produtos próximos serão priorizados.');
                      loadProdutos();
                    },
                    () => {
                      toast.error('Não foi possível acessar sua localização');
                    }
                  );
                } else {
                  toast.error('Geolocalização não suportada pelo navegador');
                }
              }}
              className="btn"
              style={{ backgroundColor: '#ff9800', fontSize: '1em' }}
            >
              📍 Ativar Localização
            </button>
          </div>
        </div>
      )}

      {showAddProduct && <AddProductForm />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        {produtos.filter(produto => {
          const matchesSearch = !searchTerm || produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = !categoriaFiltro || produto.categoria === categoriaFiltro;
          return matchesSearch && matchesCategory;
        }).length === 0 ? (
          <div className="card" style={{ 
            textAlign: 'center', 
            padding: '40px',
            gridColumn: '1 / -1'
          }}>
            <p style={{ color: 'var(--cor-texto-secundario)' }}>
              {searchTerm || categoriaFiltro 
                ? 'Nenhum produto encontrado com os filtros aplicados.' 
                : userType === 'produtor' 
                  ? 'Nenhum produto na sua feira ainda. Adicione o primeiro!' 
                  : 'Nenhum produto disponível no momento.'
              }
            </p>
          </div>
        ) : (
          produtos.filter(produto => {
            const matchesSearch = !searchTerm || produto.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !categoriaFiltro || produto.categoria === categoriaFiltro;
            return matchesSearch && matchesCategory;
          }).map(produto => (
            <ProductCard key={produto.id} produto={produto} />
          ))
        )}
      </div>
    </div>
  );
}

export default VitrinePage;