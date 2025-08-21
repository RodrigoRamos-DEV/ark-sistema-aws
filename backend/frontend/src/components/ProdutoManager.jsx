import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';
import API_URL from '../apiConfig';

const ProdutoModal = ({ isOpen, onClose, produto, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    codigo: '',
    unidade: 'UN',
    categoria: '',
    preco_venda: '',
    preco_custo: '',
    estoque_atual: '',
    estoque_minimo: '',
    observacoes: ''
  });

  useEffect(() => {
    if (produto) {
      setFormData({
        name: produto.name || '',
        codigo: produto.codigo || '',
        unidade: produto.unidade || 'UN',
        categoria: produto.categoria || '',
        preco_venda: produto.preco_venda || '',
        preco_custo: produto.preco_custo || '',
        estoque_atual: produto.estoque_atual || '',
        estoque_minimo: produto.estoque_minimo || '',
        observacoes: produto.observacoes || ''
      });
    } else {
      setFormData({
        name: '',
        codigo: '',
        unidade: 'UN',
        categoria: '',
        preco_venda: '',
        preco_custo: '',
        estoque_atual: '',
        estoque_minimo: '',
        observacoes: ''
      });
    }
  }, [produto, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>
      <div style={{width: '90%', maxWidth: '600px', height: '80vh', overflowY: 'auto'}} className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3 style={{margin: 0}}>{produto ? 'Editar Produto' : 'Novo Produto'}</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer'}}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nome do produto"
                required
              />
            </div>
            <div>
              <label>Código</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                placeholder="Código do produto"
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Unidade</label>
              <select
                value={formData.unidade}
                onChange={(e) => setFormData({...formData, unidade: e.target.value})}
              >
                <option value="UN">Unidade</option>
                <option value="KG">Quilograma</option>
                <option value="L">Litro</option>
                <option value="M">Metro</option>
                <option value="M2">Metro²</option>
                <option value="M3">Metro³</option>
                <option value="CX">Caixa</option>
                <option value="PC">Peça</option>
              </select>
            </div>
            <div>
              <label>Categoria</label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                placeholder="Categoria"
              />
            </div>
            <div></div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_venda}
                onChange={(e) => setFormData({...formData, preco_venda: e.target.value})}
                placeholder="0,00"
              />
            </div>
            <div>
              <label>Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco_custo}
                onChange={(e) => setFormData({...formData, preco_custo: e.target.value})}
                placeholder="0,00"
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Estoque Atual</label>
              <input
                type="number"
                value={formData.estoque_atual}
                onChange={(e) => setFormData({...formData, estoque_atual: e.target.value})}
                placeholder="0"
              />
            </div>
            <div>
              <label>Estoque Mínimo</label>
              <input
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData({...formData, estoque_minimo: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>

          <div style={{marginBottom: '20px'}}>
            <label>Observações</label>
            <input
              type="text"
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              placeholder="Informações adicionais sobre o produto"
            />
          </div>

          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888'}}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              {produto ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

function ProdutoManager() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null });
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/data/produtos`, { 
        headers: { 'x-auth-token': token } 
      });
      setProdutos(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingProduto) {
        const response = await axios.put(
          `${API_URL}/api/data/produtos/${editingProduto.id}`,
          formData,
          { headers: { 'x-auth-token': token } }
        );
        setProdutos(prev => prev.map(p => p.id === editingProduto.id ? response.data : p));
        toast.success('Produto atualizado com sucesso!');
      } else {
        const response = await axios.post(
          `${API_URL}/api/data/produtos`,
          formData,
          { headers: { 'x-auth-token': token } }
        );
        setProdutos(prev => [...prev, response.data]);
        toast.success('Produto criado com sucesso!');
      }
      setModalOpen(false);
      setEditingProduto(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar produto');
    }
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setModalOpen(true);
  };

  const handleDelete = (produtoId) => {
    setConfirmState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/data/produtos/${produtoId}`, {
            headers: { 'x-auth-token': token }
          });
          setProdutos(prev => prev.filter(p => p.id !== produtoId));
          toast.success('Produto excluído com sucesso!');
          setConfirmState({ isOpen: false, onConfirm: null });
        } catch (error) {
          toast.error('Erro ao excluir produto');
          setConfirmState({ isOpen: false, onConfirm: null });
        }
      }
    });
  };

  const filteredProdutos = produtos.filter(produto =>
    produto.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        title="Confirmar Exclusão"
      >
        Tem certeza que deseja excluir este produto?
      </ConfirmModal>

      <ProdutoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduto(null);
        }}
        produto={editingProduto}
        onSave={handleSave}
      />

      <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', gap: '15px'}}>
        <h3 style={{margin: 0}}>Produtos</h3>
        <button 
          className="btn"
          onClick={() => setModalOpen(true)}
        >
          Novo Produto
        </button>
      </div>

      <div style={{marginBottom: '20px'}}>
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{width: '100%', maxWidth: '300px'}}
        />
      </div>

      {loading ? (
        <p>Carregando produtos...</p>
      ) : (
        <div style={{maxHeight: '500px', overflowY: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{backgroundColor: 'var(--cor-fundo)', borderBottom: '2px solid var(--cor-borda)'}}>
                <th style={{padding: '10px', textAlign: 'left'}}>Nome</th>
                <th style={{padding: '10px', textAlign: 'left'}}>Código</th>
                <th style={{padding: '10px', textAlign: 'left'}}>Categoria</th>
                <th style={{padding: '10px', textAlign: 'right'}}>Preço Venda</th>
                <th style={{padding: '10px', textAlign: 'center'}}>Estoque</th>
                <th style={{padding: '10px', textAlign: 'center'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProdutos.map(produto => (
                <tr key={produto.id} style={{borderBottom: '1px solid var(--cor-borda)'}}>
                  <td style={{padding: '10px'}}>{produto.name}</td>
                  <td style={{padding: '10px'}}>{produto.codigo || '-'}</td>
                  <td style={{padding: '10px'}}>{produto.categoria || '-'}</td>
                  <td style={{padding: '10px', textAlign: 'right'}}>
                    {produto.preco_venda ? `R$ ${parseFloat(produto.preco_venda).toFixed(2)}` : '-'}
                  </td>
                  <td style={{padding: '10px', textAlign: 'center'}}>{produto.estoque_atual || 0}</td>
                  <td style={{padding: '10px', textAlign: 'center'}}>
                    <button 
                      onClick={() => handleEdit(produto)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px'}}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(produto.id)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em'}}
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProdutos.length === 0 && (
            <p style={{textAlign: 'center', padding: '20px'}}>Nenhum produto encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ProdutoManager;