import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';
import API_URL from '../apiConfig';

const NotaFiscalModal = ({ isOpen, onClose, notaFiscal, onSave }) => {
  const [formData, setFormData] = useState({
    tipo: 'saida',
    cliente_fornecedor_nome: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    observacoes: '',
    itens: []
  });
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchDados();
    }
    if (notaFiscal) {
      setFormData({
        tipo: notaFiscal.tipo || 'saida',
        cliente_fornecedor_nome: notaFiscal.cliente_fornecedor_nome || '',
        data_emissao: notaFiscal.data_emissao || new Date().toISOString().split('T')[0],
        data_vencimento: notaFiscal.data_vencimento || '',
        observacoes: notaFiscal.observacoes || '',
        itens: notaFiscal.itens || []
      });
    } else {
      setFormData({
        tipo: 'saida',
        cliente_fornecedor_nome: '',
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: '',
        observacoes: '',
        itens: []
      });
    }
  }, [notaFiscal, isOpen]);

  const fetchDados = async () => {
    try {
      const token = localStorage.getItem('token');
      const [produtosRes, itemsRes] = await Promise.all([
        axios.get(`${API_URL}/api/data/produtos`, { headers: { 'x-auth-token': token } }),
        axios.get(`${API_URL}/api/data/items`, { headers: { 'x-auth-token': token } })
      ]);
      setProdutos(produtosRes.data);
      setClientes(itemsRes.data.comprador || []);
      setFornecedores(itemsRes.data.fornecedor || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const adicionarItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        produto_nome: '',
        produto_codigo: '',
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0,
        cfop: '5102',
        cst: '000'
      }]
    }));
  };

  const removerItem = (index) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const atualizarItem = (index, campo, valor) => {
    setFormData(prev => {
      const novosItens = [...prev.itens];
      novosItens[index] = { ...novosItens[index], [campo]: valor };
      
      if (campo === 'quantidade' || campo === 'valor_unitario') {
        novosItens[index].valor_total = novosItens[index].quantidade * novosItens[index].valor_unitario;
      }
      
      if (campo === 'produto_nome') {
        const produto = produtos.find(p => p.name === valor);
        if (produto) {
          novosItens[index].produto_codigo = produto.codigo || '';
          novosItens[index].valor_unitario = produto.preco_venda || 0;
          novosItens[index].valor_total = novosItens[index].quantidade * (produto.preco_venda || 0);
        }
      }
      
      return { ...prev, itens: novosItens };
    });
  };

  const calcularTotal = () => {
    return formData.itens.reduce((total, item) => total + (item.valor_total || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cliente_fornecedor_nome.trim()) {
      toast.error('Cliente/Fornecedor é obrigatório');
      return;
    }
    if (formData.itens.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    onSave({ ...formData, valor_total: calcularTotal() });
  };

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}} className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3 style={{margin: 0}}>{notaFiscal ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</h3>
          <button onClick={onClose} data-close-modal style={{background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer'}}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Tipo *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                required
              >
                <option value="saida">Saída (Venda)</option>
                <option value="entrada">Entrada (Compra)</option>
              </select>
            </div>
            <div>
              <label>{formData.tipo === 'saida' ? 'Cliente' : 'Fornecedor'} *</label>
              <select
                value={formData.cliente_fornecedor_nome}
                onChange={(e) => setFormData({...formData, cliente_fornecedor_nome: e.target.value})}
                required
              >
                <option value="">Selecione...</option>
                {(formData.tipo === 'saida' ? clientes : fornecedores).map(item => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Data Emissão *</label>
              <input
                type="date"
                value={formData.data_emissao}
                onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
              <h4 style={{margin: 0}}>Itens da Nota Fiscal</h4>
              <button type="button" onClick={adicionarItem} className="btn" style={{padding: '5px 10px', fontSize: '12px'}}>
                + Adicionar Item
              </button>
            </div>
            
            {formData.itens.map((item, index) => (
              <div key={index} style={{border: '1px solid var(--cor-borda)', borderRadius: '5px', padding: '10px', marginBottom: '10px'}}>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end'}}>
                  <div>
                    <label>Produto</label>
                    <select
                      value={item.produto_nome}
                      onChange={(e) => atualizarItem(index, 'produto_nome', e.target.value)}
                    >
                      <option value="">Selecione produto...</option>
                      {produtos.map(produto => (
                        <option key={produto.id} value={produto.name}>{produto.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Quantidade</label>
                    <input
                      type="number"
                      step="0.001"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label>Valor Unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.valor_unitario}
                      onChange={(e) => atualizarItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label>Total</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.valor_total}
                      readOnly
                      style={{backgroundColor: '#f5f5f5'}}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removerItem(index)}
                    style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', color: 'red'}}
                    title="Remover item"
                  >
                    🗑️
                  </button>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px'}}>
                  <div>
                    <label>CFOP</label>
                    <input
                      type="text"
                      value={item.cfop}
                      onChange={(e) => atualizarItem(index, 'cfop', e.target.value)}
                      placeholder="5102"
                    />
                  </div>
                  <div>
                    <label>CST</label>
                    <input
                      type="text"
                      value={item.cst}
                      onChange={(e) => atualizarItem(index, 'cst', e.target.value)}
                      placeholder="000"
                    />
                  </div>
                  <div>
                    <label>Código</label>
                    <input
                      type="text"
                      value={item.produto_codigo}
                      onChange={(e) => atualizarItem(index, 'produto_codigo', e.target.value)}
                      placeholder="Código do produto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '10px', backgroundColor: 'var(--cor-fundo)', borderRadius: '5px'}}>
            <strong>Total da Nota Fiscal:</strong>
            <strong style={{fontSize: '1.2em', color: 'var(--cor-primaria)'}}>
              R$ {calcularTotal().toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </strong>
          </div>

          <div style={{marginBottom: '15px'}}>
            <label>Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
              rows="3"
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="btn-group" style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888'}}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              {notaFiscal ? 'Atualizar' : 'Emitir Nota Fiscal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function NotaFiscalManager() {
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null });
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    status: 'todos',
    dataInicio: '',
    dataFim: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotasFiscais();
  }, []);

  const fetchNotasFiscais = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/data/notas-fiscais`, { 
        headers: { 'x-auth-token': token },
        params: filtros
      });
      setNotasFiscais(response.data);
    } catch (error) {
      console.error('Erro ao buscar notas fiscais:', error);
      toast.error('Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingNota) {
        const response = await axios.put(
          `${API_URL}/api/data/notas-fiscais/${editingNota.id}`,
          formData,
          { headers: { 'x-auth-token': token } }
        );
        setNotasFiscais(prev => prev.map(nf => nf.id === editingNota.id ? response.data : nf));
        toast.success('Nota fiscal atualizada com sucesso!');
      } else {
        const response = await axios.post(
          `${API_URL}/api/data/notas-fiscais`,
          formData,
          { headers: { 'x-auth-token': token } }
        );
        setNotasFiscais(prev => [response.data, ...prev]);
        toast.success('Nota fiscal emitida com sucesso!');
      }
      setModalOpen(false);
      setEditingNota(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar nota fiscal');
    }
  };

  const handleEdit = (nota) => {
    setEditingNota(nota);
    setModalOpen(true);
  };

  const handleDelete = (notaId) => {
    setConfirmState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/data/notas-fiscais/${notaId}`, {
            headers: { 'x-auth-token': token }
          });
          setNotasFiscais(prev => prev.filter(nf => nf.id !== notaId));
          toast.success('Nota fiscal excluída com sucesso!');
          setConfirmState({ isOpen: false, onConfirm: null });
        } catch (error) {
          toast.error('Erro ao excluir nota fiscal');
          setConfirmState({ isOpen: false, onConfirm: null });
        }
      }
    });
  };

  return (
    <div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        title="Confirmar Exclusão"
      >
        Tem certeza que deseja excluir esta nota fiscal?
      </ConfirmModal>

      <NotaFiscalModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingNota(null);
        }}
        notaFiscal={editingNota}
        onSave={handleSave}
      />

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2 style={{margin: 0}}>📄 Notas Fiscais</h2>
        <div style={{display: 'flex', gap: '10px'}}>
          <button 
            className="btn"
            onClick={async () => {
              try {
                const response = await axios.post(`${API_URL}/api/data/notas-fiscais/teste`, {}, {
                  headers: { 'x-auth-token': token }
                });
                toast.success(response.data.message);
                fetchNotasFiscais();
              } catch (error) {
                toast.error('Erro ao criar nota de teste');
              }
            }}
            style={{backgroundColor: '#ff9800'}}
          >
            🧪 Teste
          </button>
          <button 
            className="btn"
            onClick={() => setModalOpen(true)}
          >
            + Nova Nota Fiscal
          </button>
        </div>
      </div>

      <div className="card" style={{marginBottom: '20px'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end'}}>
          <div>
            <label>Tipo</label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
            >
              <option value="todos">Todos</option>
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({...filtros, status: e.target.value})}
            >
              <option value="todos">Todos</option>
              <option value="emitida">Emitida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label>Data Início</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
            />
          </div>
          <div>
            <label>Data Fim</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
            />
          </div>
          <button onClick={fetchNotasFiscais} className="btn">
            🔍 Filtrar
          </button>
        </div>
      </div>

      {loading ? (
        <p>Carregando notas fiscais...</p>
      ) : (
        <div style={{maxHeight: '600px', overflowY: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{backgroundColor: 'var(--cor-fundo)'}}>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--cor-borda)'}}>Número</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--cor-borda)'}}>Tipo</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--cor-borda)'}}>Cliente/Fornecedor</th>
                <th style={{padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--cor-borda)'}}>Data</th>
                <th style={{padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--cor-borda)'}}>Valor</th>
                <th style={{padding: '10px', textAlign: 'center', borderBottom: '1px solid var(--cor-borda)'}}>Status</th>
                <th style={{padding: '10px', textAlign: 'center', borderBottom: '1px solid var(--cor-borda)'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {notasFiscais.map(nota => (
                <tr key={nota.id}>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)'}}>{nota.numero_nf}</td>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)'}}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: nota.tipo === 'saida' ? '#e3f2fd' : '#f3e5f5',
                      color: nota.tipo === 'saida' ? '#1976d2' : '#7b1fa2'
                    }}>
                      {nota.tipo === 'saida' ? 'Saída' : 'Entrada'}
                    </span>
                  </td>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)'}}>{nota.cliente_fornecedor_nome}</td>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)'}}>{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</td>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)', textAlign: 'right'}}>
                    R$ {parseFloat(nota.valor_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)', textAlign: 'center'}}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: nota.status === 'emitida' ? '#e8f5e8' : '#ffebee',
                      color: nota.status === 'emitida' ? '#2e7d32' : '#c62828'
                    }}>
                      {nota.status}
                    </span>
                  </td>
                  <td style={{padding: '10px', borderBottom: '1px solid var(--cor-borda)', textAlign: 'center'}}>
                    <button 
                      onClick={() => window.open(`${API_URL}/api/data/notas-fiscais/${nota.id}/pdf`, '_blank')}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px'}}
                      title="Imprimir/PDF"
                    >
                      🖨️
                    </button>
                    <button 
                      onClick={() => handleEdit(nota)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px'}}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(nota.id)}
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
          {notasFiscais.length === 0 && (
            <p style={{textAlign: 'center', padding: '40px'}}>Nenhuma nota fiscal encontrada</p>
          )}
        </div>
      )}
    </div>
  );
}

export default NotaFiscalManager;