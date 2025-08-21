import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import API_URL from '../apiConfig';
import { Icons } from './Icons';

const PedidoModal = ({ isOpen, onClose, onSave, tipo, funcionarios, produtos, clientes, editingPedido }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    cliente_fornecedor: '',
    data_pedido: new Date().toISOString().split('T')[0],
    data_entrega: ''
  });
  
  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_nome: '',
    quantidade: '',
    preco_unitario: ''
  });
  const [produtosList, setProdutosList] = useState([]);
  const [clientesList, setClientesList] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      if (editingPedido) {
        // Modo edição
        setFormData({
          employee_id: editingPedido.employee_id || '',
          cliente_fornecedor: editingPedido.cliente_fornecedor || '',
          data_pedido: editingPedido.data_pedido || new Date().toISOString().split('T')[0],
          data_entrega: ''
        });
        setItens(editingPedido.itens || []);
      } else {
        // Modo criação
        setFormData({
          employee_id: funcionarios[0]?.id || '',
          cliente_fornecedor: '',
          data_pedido: new Date().toISOString().split('T')[0],
          data_entrega: ''
        });
        setItens([]);
      }
      setNovoItem({ produto_nome: '', quantidade: '', preco_unitario: '' });
      fetchProdutos();
      fetchClientes();
    }
  }, [isOpen, funcionarios, editingPedido, tipo]);

  const fetchProdutos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/data/produtos`, {
        headers: { 'x-auth-token': token }
      });
      setProdutosList(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const fetchClientes = async () => {
    // Usar a prop clientes que já vem filtrada do componente pai
    setClientesList(clientes || []);
  };

  const handleProdutoChange = async (produtoNome) => {
    if (!produtoNome || !formData.cliente_fornecedor) {
      setNovoItem({...novoItem, produto_nome: produtoNome, preco_unitario: ''});
      return;
    }

    try {
      // Buscar último preço usado para este produto com este cliente/fornecedor
      const response = await axios.get(`${API_URL}/api/data/transactions`, {
        headers: { 'x-auth-token': token },
        params: {
          [tipo === 'venda' ? 'product' : 'purchase']: produtoNome,
          [tipo === 'venda' ? 'buyer' : 'supplier']: formData.cliente_fornecedor
        }
      });
      
      const tipoTransacao = tipo === 'venda' ? 'venda' : 'gasto';
      const transactions = response.data.filter(t => 
        t.type === tipoTransacao && 
        t.description === produtoNome && 
        t.category === formData.cliente_fornecedor
      );
      
      let preco = '';
      if (transactions.length > 0) {
        // Pegar o preço da transação mais recente
        const ultimaTransacao = transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0];
        preco = ultimaTransacao.unit_price;
      } else {
        // Se não encontrou histórico, usar preço padrão do produto
        const produto = produtosList.find(p => p.name === produtoNome);
        preco = produto ? (tipo === 'venda' ? produto.preco_venda || '' : produto.preco_custo || '') : '';
      }
      
      setNovoItem({
        ...novoItem,
        produto_nome: produtoNome,
        preco_unitario: preco
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de preços:', error);
      // Fallback para preço padrão do produto
      const produto = produtosList.find(p => p.name === produtoNome);
      setNovoItem({
        ...novoItem,
        produto_nome: produtoNome,
        preco_unitario: produto ? (tipo === 'venda' ? produto.preco_venda || '' : produto.preco_custo || '') : ''
      });
    }
  };

  const handleClienteChange = (clienteNome) => {
    setFormData({...formData, cliente_fornecedor: clienteNome});
    // Se já tem produto selecionado, atualizar preço
    if (novoItem.produto_nome) {
      handleProdutoChange(novoItem.produto_nome);
    }
  };

  const adicionarItem = () => {
    if (!novoItem.produto_nome || !novoItem.quantidade || !novoItem.preco_unitario) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    const subtotal = parseFloat(novoItem.quantidade) * parseFloat(novoItem.preco_unitario);
    const item = {
      ...novoItem,
      quantidade: parseFloat(novoItem.quantidade),
      preco_unitario: parseFloat(novoItem.preco_unitario),
      subtotal
    };

    setItens(prev => [...prev, item]);
    setNovoItem({ produto_nome: '', quantidade: '', preco_unitario: '' });
  };

  const removerItem = (index) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return itens.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      if (editingPedido) {
        // MODO EDIÇÃO - Atualizar pedido existente
        const pedidoId = editingPedido.pedido_id || editingPedido.id;
        
        // 1. Deletar lançamentos antigos do pedido
        const existingTransactions = await axios.get(`${API_URL}/api/data/transactions`, {
          headers: { 'x-auth-token': token }
        });
        
        const transactionsToDelete = existingTransactions.data.filter(t => 
          t.pedido_id === pedidoId || 
          (t.pedido_info && t.pedido_info.includes(editingPedido.cliente_fornecedor))
        );
        
        for (const transaction of transactionsToDelete) {
          await axios.delete(`${API_URL}/api/data/transactions/${transaction.id}`, {
            headers: { 'x-auth-token': token }
          });
        }
        
        // 2. Criar novos lançamentos
        const lancamentos = [];
        for (const item of itens) {
          const lancamentoData = {
            employee_id: formData.employee_id,
            type: tipo === 'venda' ? 'venda' : 'gasto',
            description: item.produto_nome,
            category: formData.cliente_fornecedor,
            quantity: item.quantidade,
            unit_price: item.preco_unitario,
            total_price: item.subtotal,
            transaction_date: formData.data_pedido,
            status: 'A Pagar',
            pedido_id: pedidoId,
            pedido_info: `${tipo === 'venda' ? 'Venda' : 'Compra'} - ${formData.cliente_fornecedor} - ${itens.length} itens`
          };
          
          const response = await axios.post(`${API_URL}/api/data/transactions`, lancamentoData, {
            headers: { 'x-auth-token': token }
          });
          
          lancamentos.push(response.data);
        }
        
        toast.success(`${tipo === 'venda' ? 'Pedido de venda' : 'Pedido de compra'} atualizado! ${itens.length} lançamentos.`);
        onSave({ lancamentos, total: calcularTotal(), pedidoId, isEdit: true });
      } else {
        // MODO CRIAÇÃO - Criar novo pedido
        const pedidoId = uuidv4();
        const lancamentos = [];
        
        for (const item of itens) {
          const lancamentoData = {
            employee_id: formData.employee_id,
            type: tipo === 'venda' ? 'venda' : 'gasto',
            description: item.produto_nome,
            category: formData.cliente_fornecedor,
            quantity: item.quantidade,
            unit_price: item.preco_unitario,
            total_price: item.subtotal,
            transaction_date: formData.data_pedido,
            status: 'A Pagar',
            pedido_id: pedidoId,
            pedido_info: `${tipo === 'venda' ? 'Venda' : 'Compra'} - ${formData.cliente_fornecedor} - ${itens.length} itens`
          };
          
          const response = await axios.post(`${API_URL}/api/data/transactions`, lancamentoData, {
            headers: { 'x-auth-token': token }
          });
          
          lancamentos.push(response.data);
        }
        
        toast.success(`${tipo === 'venda' ? 'Pedido de venda' : 'Pedido de compra'} criado! ${itens.length} lançamentos agrupados.`);
        onSave({ lancamentos, total: calcularTotal(), pedidoId });
      }
      
      onClose();
    } catch (error) {
      console.error('Erro detalhado:', error.response?.data);
      toast.error(error.response?.data?.error || `Erro ao ${editingPedido ? 'atualizar' : 'criar'} pedido`);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}} className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3 style={{margin: 0}}>{editingPedido ? 'Editar' : 'Novo'} {tipo === 'venda' ? 'Pedido de Venda' : 'Pedido de Compra'}</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'}}>
            <Icons.Cancel />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
            <div>
              <label>Funcionário *</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                required
              >
                <option value="">Selecione</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>{tipo === 'venda' ? 'Cliente' : 'Fornecedor'} *</label>
              <select
                value={formData.cliente_fornecedor}
                onChange={(e) => handleClienteChange(e.target.value)}
                required
              >
                <option value="">{tipo === 'venda' ? 'Selecione um cliente' : 'Selecione um fornecedor'}</option>
                {clientesList.map(cliente => (
                  <option key={cliente.id} value={cliente.name}>{cliente.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
            <div>
              <label>Data do Pedido</label>
              <input
                type="date"
                value={formData.data_pedido}
                onChange={(e) => setFormData({...formData, data_pedido: e.target.value})}
              />
            </div>
            <div>
              <label>Data de Entrega</label>
              <input
                type="date"
                value={formData.data_entrega}
                onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
              />
            </div>
          </div>

          <div style={{marginBottom: '20px', border: '1px solid var(--cor-borda)', borderRadius: '8px', padding: '15px'}}>
            <h4>Adicionar Item</h4>
            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end'}}>
              <div>
                <label>Produto</label>
                <select
                  value={novoItem.produto_nome}
                  onChange={(e) => handleProdutoChange(e.target.value)}
                >
                  <option value="">Selecione um produto</option>
                  {produtosList.map(produto => (
                    <option key={produto.id} value={produto.name}>{produto.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Quantidade</label>
                <input
                  type="number"
                  step="0.01"
                  value={novoItem.quantidade}
                  onChange={(e) => setNovoItem({...novoItem, quantidade: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <label>Preço Unit.</label>
                <input
                  type="number"
                  step="0.01"
                  value={novoItem.preco_unitario}
                  onChange={(e) => setNovoItem({...novoItem, preco_unitario: e.target.value})}
                  placeholder="0,00"
                />
              </div>
              <button type="button" onClick={adicionarItem} className="btn" style={{padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <Icons.Plus /> Adicionar
              </button>
            </div>
          </div>

          {itens.length > 0 && (
            <div style={{marginBottom: '20px'}}>
              <h4>Itens do Pedido</h4>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{backgroundColor: 'var(--cor-fundo)', borderBottom: '2px solid var(--cor-borda)'}}>
                    <th style={{padding: '8px', textAlign: 'left'}}>Produto</th>
                    <th style={{padding: '8px', textAlign: 'center'}}>Qtd</th>
                    <th style={{padding: '8px', textAlign: 'right'}}>Preço Unit.</th>
                    <th style={{padding: '8px', textAlign: 'right'}}>Subtotal</th>
                    <th style={{padding: '8px', textAlign: 'center'}}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => (
                    <tr key={index} style={{borderBottom: '1px solid var(--cor-borda)'}}>
                      <td style={{padding: '8px'}}>
                        <select 
                          value={item.produto_nome}
                          onChange={(e) => {
                            const newItens = [...itens];
                            newItens[index].produto_nome = e.target.value;
                            setItens(newItens);
                          }}
                          style={{width: '100%', border: 'none', background: 'var(--cor-card)', color: 'var(--cor-texto)'}}
                        >
                          {produtosList.map(produto => (
                            <option key={produto.id} value={produto.name}>{produto.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{padding: '8px', textAlign: 'center'}}>
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) => {
                            const newItens = [...itens];
                            newItens[index].quantidade = parseFloat(e.target.value);
                            newItens[index].subtotal = newItens[index].quantidade * parseFloat(newItens[index].preco_unitario);
                            setItens(newItens);
                          }}
                          style={{width: '80px', textAlign: 'center', border: 'none', background: 'var(--cor-card)', color: 'var(--cor-texto)'}}
                        />
                      </td>
                      <td style={{padding: '8px', textAlign: 'right'}}>
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) => {
                            const newItens = [...itens];
                            newItens[index].preco_unitario = parseFloat(e.target.value);
                            newItens[index].subtotal = parseFloat(newItens[index].quantidade) * newItens[index].preco_unitario;
                            setItens(newItens);
                          }}
                          style={{width: '100px', textAlign: 'right', border: 'none', background: 'var(--cor-card)', color: 'var(--cor-texto)'}}
                        />
                      </td>
                      <td style={{padding: '8px', textAlign: 'right'}}>R$ {parseFloat(item.subtotal || 0).toFixed(2)}</td>
                      <td style={{padding: '8px', textAlign: 'center'}}>
                        <button type="button" onClick={() => removerItem(index)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-erro)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <Icons.Delete />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: 'var(--cor-fundo)', fontWeight: 'bold'}}>
                    <td colSpan="3" style={{padding: '8px', textAlign: 'right'}}>TOTAL:</td>
                    <td style={{padding: '8px', textAlign: 'right'}}>R$ {calcularTotal().toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}



          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888', display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Icons.Cancel /> Cancelar
            </button>
            <button type="submit" className="btn" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Icons.Save /> {editingPedido ? 'Atualizar Pedido' : 'Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PedidoModal;