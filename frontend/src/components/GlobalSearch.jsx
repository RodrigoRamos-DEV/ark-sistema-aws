import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../apiConfig';

function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchData = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/data/search`, {
          headers: { 'x-auth-token': token },
          params: { q: searchTerm }
        });
        setResults(response.data);
        setIsOpen(true);
      } catch (error) {
        console.error('Erro na busca:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchData, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleResultClick = (result) => {
    setIsOpen(false);
    setSearchTerm('');
    
    switch (result.type) {
      case 'produto':
        navigate('/cadastro');
        setTimeout(() => {
          const event = new CustomEvent('openModal', { detail: { type: 'produtos' } });
          window.dispatchEvent(event);
        }, 100);
        break;
      case 'cliente':
        navigate('/cadastro');
        setTimeout(() => {
          const event = new CustomEvent('openModal', { detail: { type: 'clientes' } });
          window.dispatchEvent(event);
        }, 100);
        break;
      case 'fornecedor':
        navigate('/cadastro');
        setTimeout(() => {
          const event = new CustomEvent('openModal', { detail: { type: 'fornecedores' } });
          window.dispatchEvent(event);
        }, 100);
        break;
      case 'transacao':
        navigate('/lancamentos');
        break;
      case 'nota_fiscal':
        navigate('/cadastro');
        setTimeout(() => {
          const event = new CustomEvent('openModal', { detail: { type: 'notas-fiscais' } });
          window.dispatchEvent(event);
        }, 100);
        break;
      default:
        break;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'produto': return '📦';
      case 'cliente': return '👥';
      case 'fornecedor': return '🏢';
      case 'transacao': return '💰';
      case 'nota_fiscal': return '📄';
      default: return '🔍';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'produto': return 'Produto';
      case 'cliente': return 'Cliente';
      case 'fornecedor': return 'Fornecedor';
      case 'transacao': return 'Lançamento';
      case 'nota_fiscal': return 'Nota Fiscal';
      default: return 'Item';
    }
  };

  return (
    <div className="global-search" ref={searchRef}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Buscar... (Ctrl+K)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 35px 8px 12px',
            border: '1px solid var(--cor-borda)',
            borderRadius: '20px',
            backgroundColor: 'var(--cor-fundo-card)',
            color: 'var(--cor-texto)'
          }}
        />
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--cor-texto-secundario)'
        }}>
          {loading ? <div className="loading-spinner"></div> : '🔍'}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-results">
          {results.map((result, index) => (
            <div
              key={index}
              className="search-item"
              onClick={() => handleResultClick(result)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>{getIcon(result.type)}</span>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)' }}>
                    {getTypeLabel(result.type)}
                    {result.description && ` • ${result.description}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm.length >= 2 && results.length === 0 && !loading && (
        <div className="search-results">
          <div className="search-item" style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
            Nenhum resultado encontrado
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;