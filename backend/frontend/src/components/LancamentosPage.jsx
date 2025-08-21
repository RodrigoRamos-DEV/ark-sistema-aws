import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import TransactionModal from './TransactionModal';
import ConfirmModal from './ConfirmModal';
import Pagination from './Pagination';
import DashboardCards from './DashboardCards';
import TabNavigation from './TabNavigation';

import PedidoModal from './PedidoModal';
import BatchEditModal from './BatchEditModal';
import LoadingSpinner from './LoadingSpinner';
import ImportExport from './ImportExport';
import API_URL from '../apiConfig';

const ITEMS_PER_PAGE = 10;

const TransactionTable = ({ title, transactions, onEdit, onDelete, onDeleteAttachment, selected, onSelect, onSelectAll, onEditPedido, onSort, sortConfig }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="card">
        <h3>{title}</h3>
        <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
      </div>
    );
  }
  
  // Agrupar transações por pedido_id
  const pedidosMap = new Map();
  const transacoesIndividuais = [];
  
  transactions.forEach(trx => {
    if (trx.pedido_id) {
      if (!pedidosMap.has(trx.pedido_id)) {
        pedidosMap.set(trx.pedido_id, {
          id: `pedido_${trx.pedido_id}`,
          pedido_id: trx.pedido_id,
          transaction_date: trx.transaction_date,
          employee_name: trx.employee_name,
          employee_id: trx.employee_id,
          description: '', // Vazio para pedidos
          category: trx.category,
          total_price: 0,
          status: trx.status,
          type: trx.type,
          isPedido: true,
          itens: []
        });
      }
      const pedido = pedidosMap.get(trx.pedido_id);
      pedido.total_price += parseFloat(trx.total_price || 0);
      pedido.itens.push(trx);
    } else {
      transacoesIndividuais.push({
        ...trx,
        isPedido: false
      });
    }
  });
  
  const processedTransactions = [...Array.from(pedidosMap.values()), ...transacoesIndividuais]
    .sort((a, b) => {
      if (!sortConfig) return new Date(b.transaction_date) - new Date(a.transaction_date);
      
      const { key, direction } = sortConfig;
      let aValue = a[key];
      let bValue = b[key];
      
      // Tratamento especial para datas
      if (key === 'transaction_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      // Tratamento especial para números
      if (key === 'total_price') {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="card">
      <h3>{title}</h3>
      {processedTransactions.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--cor-primaria)' }}>
                <th style={{ padding: '10px' }}>
                  <input type="checkbox" onChange={(e) => onSelectAll(e.target.checked, transactions)}
                         checked={transactions.length > 0 && transactions.every(trx => selected.includes(trx.id))} />
                </th>
                <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('transaction_date')}>
                  Data {sortConfig?.key === 'transaction_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('employee_name')}>
                  Funcionário {sortConfig?.key === 'employee_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('description')}>
                  {title.includes('Vendas') ? 'Produto' : 'Compra'} {sortConfig?.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('category')}>
                  {title.includes('Vendas') ? 'Cliente' : 'Fornecedor'} {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('total_price')}>
                  Total {sortConfig?.key === 'total_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }} onClick={() => onSort('status')}>
                  Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {processedTransactions.map(trx => (
                <tr key={trx.id} style={{ 
                  borderBottom: '1px solid var(--cor-borda)',
                  backgroundColor: trx.isPedido ? 'rgba(23, 162, 184, 0.1)' : 'transparent',
                  fontWeight: trx.isPedido ? 'bold' : 'normal'
                }}>
                  <td style={{ padding: '10px' }}><input type="checkbox" checked={selected.includes(trx.id)} onChange={() => onSelect(trx.id)} /></td>
                  <td style={{ padding: '10px' }}>{trx.transaction_date ? new Date(trx.transaction_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</td>
                  <td style={{ padding: '10px' }}>{trx.employee_name || ''}</td>
                  <td style={{ padding: '10px' }}>
                    {trx.isPedido ? (
                      <span style={{ color: '#17a2b8', fontWeight: 'bold' }}>
                        📋 Pedido ({trx.itens.length} itens)
                      </span>
                    ) : (
                      trx.description || ''
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>{trx.category || ''}</td>
                  <td style={{ padding: '10px' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trx.total_price || 0)}</td>
                  <td style={{ padding: '10px' }}>{trx.status || ''}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {trx.attachment_id && (
                      <>
                        <a href={`${API_URL}/${trx.file_path.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" title={trx.file_name} style={{textDecoration: 'none', fontSize: '1.2em', marginRight: '10px'}}>📎</a>
                        <button onClick={() => onDeleteAttachment(trx.attachment_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-erro)', fontWeight: 'bold', fontSize: '1.2em', marginRight: '10px' }} title="Excluir Anexo">✖</button>
                      </>
                    )}
                    {trx.isPedido ? (
                      <button onClick={() => onEditPedido(trx.itens)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px' }} title="Editar Pedido">📋</button>
                    ) : (
                      <button onClick={() => onEdit(trx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px' }} title="Editar">✏️</button>
                    )}
                    <button onClick={() => onDelete(trx.isPedido ? trx.pedido_id : trx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Excluir">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
      )}
    </div>
  );
};

function LancamentosPage() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('venda');
    const [editingTransaction, setEditingTransaction] = useState(null);
    
    useEffect(() => {
        const handleNewTransaction = () => {
            handleOpenAddModal('venda');
        };
        
        window.addEventListener('openNewTransaction', handleNewTransaction);
        return () => window.removeEventListener('openNewTransaction', handleNewTransaction);
    }, []);
    const [selectedTransactions, setSelectedTransactions] = useState([]);
    const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });
    const [items, setItems] = useState({ produto: [], comprador: [], compra: [], fornecedor: [] });
    const [filters, setFilters] = useState({ employeeId: '', startDate: '', endDate: '', status: 'todos', product: 'todos', buyer: 'todos', purchase: 'todos', supplier: 'todos' });
    const [currentPageVendas, setCurrentPageVendas] = useState(1);
    const [currentPageGastos, setCurrentPageGastos] = useState(1);
    const [activeTab, setActiveTab] = useState('vendas');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });
    
    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
    const [pedidoTipo, setPedidoTipo] = useState('venda');
    const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
    const [batchEditTransactions, setBatchEditTransactions] = useState([]);
    const [editingPedido, setEditingPedido] = useState(null);
    const [showImportExport, setShowImportExport] = useState(false);
    
    const DATA_API_URL = `${API_URL}/api/data`; // <-- ADICIONADO para simplificar

    const fetchInitialData = async () => {
        const token = localStorage.getItem('token');
        try {
            const [empResponse, itemsResponse] = await Promise.all([
                axios.get(`${DATA_API_URL}/employees`, { headers: { 'x-auth-token': token } }), // <-- ALTERADO
                axios.get(`${DATA_API_URL}/items`, { headers: { 'x-auth-token': token } })     // <-- ALTERADO
            ]);
            setFuncionarios(empResponse.data);
            setItems(itemsResponse.data);
            if (empResponse.data.length > 0) {
                setFilters(prev => ({ ...prev, employeeId: empResponse.data[0].id }));
            } else {
                setFilters(prev => ({ ...prev, employeeId: 'todos' }));
            }
        } catch (err) {
            setError('Não foi possível carregar os dados para os filtros.');
        }
    };
    
    const fetchTransactions = useCallback(async () => {
        if (!filters.employeeId) return;
        setSelectedTransactions([]);
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            // Criar parâmetros apenas com valores válidos
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'todos' && value !== '') {
                    params.append(key, value);
                }
            });
            
            const response = await axios.get(`${DATA_API_URL}/transactions?${params.toString()}`, { headers: { 'x-auth-token': token } });
            setTransactions(response.data);
        } catch (err) { setError('Não foi possível carregar as transações.'); } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPageVendas(1);
        setCurrentPageGastos(1);
    };



    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPageVendas(1);
        setCurrentPageGastos(1);
    };

    const handleSaveTransaction = (savedTransaction, isEdit) => {
        if (isEdit) {
            setTransactions(prev => prev.map(trx => trx.id === savedTransaction.id ? { ...trx, ...savedTransaction } : trx));
        } else {
            fetchTransactions();
        }
    };
    
    const closeConfirmModal = () => {
        setConfirmState({ isOpen: false, message: '', onConfirm: null });
    };

    const handleDeleteTransaction = (transactionId) => {
        // Verificar se é um pedido (transactionId é um pedido_id)
        const isPedido = transactions.some(trx => trx.pedido_id === transactionId) || 
                        (typeof transactionId === 'string' && transactionId.length === 36 && transactionId.includes('-'));
        
        setConfirmState({
            isOpen: true,
            message: isPedido ? 
                'Você tem certeza que deseja excluir este pedido completo? Todos os itens serão removidos.' :
                'Você tem certeza que deseja excluir este lançamento?',
            onConfirm: async () => {
                const token = localStorage.getItem('token');
                try {
                    if (isPedido) {
                        // Excluir todas as transações do pedido
                        const pedidoTransactions = transactions.filter(trx => trx.pedido_id === transactionId);
                        for (const trx of pedidoTransactions) {
                            await axios.delete(`${DATA_API_URL}/transactions/${trx.id}`, { headers: { 'x-auth-token': token } });
                        }
                        setTransactions(prev => prev.filter(trx => trx.pedido_id !== transactionId));
                        toast.success('Pedido excluído com sucesso!');
                    } else {
                        await axios.delete(`${DATA_API_URL}/transactions/${transactionId}`, { headers: { 'x-auth-token': token } });
                        setTransactions(prev => prev.filter(trx => trx.id !== transactionId));
                        toast.success('Lançamento excluído com sucesso!');
                    }
                    closeConfirmModal();
                } catch (err) {
                    setError(err.response?.data?.error || 'Erro ao excluir');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleDeleteAttachment = (attachmentId) => {
        setConfirmState({
            isOpen: true,
            message: 'Tem certeza que deseja excluir este anexo? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                const token = localStorage.getItem('token');
                try {
                    await axios.delete(`${DATA_API_URL}/attachments/${attachmentId}`, { headers: { 'x-auth-token': token } }); // <-- ALTERADO
                    toast.success("Anexo excluído com sucesso!");
                    fetchTransactions();
                    closeConfirmModal();
                } catch (error) {
                    toast.error("Erro ao excluir o anexo.");
                    closeConfirmModal();
                }
            }
        });
    };

    const handleOpenAddModal = (type) => {
        setModalType(type);
        setEditingTransaction(null);
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (transaction) => {
        setModalType(transaction.type);
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleSelectTransaction = (transactionId) => {
        setSelectedTransactions(prev => prev.includes(transactionId) ? prev.filter(id => id !== transactionId) : [...prev, transactionId]);
    };

    const handleSelectAll = (isChecked, transactionList) => {
        const ids = transactionList.map(t => t.id);
        if (isChecked) {
            const newSelected = [...new Set([...selectedTransactions, ...ids])];
            setSelectedTransactions(newSelected);
        } else {
            const newSelected = selectedTransactions.filter(id => !ids.includes(id));
            setSelectedTransactions(newSelected);
        }
    };

    const handleBatchDelete = () => {
        if (selectedTransactions.length === 0) return;
        setConfirmState({
            isOpen: true,
            message: `Você tem certeza que deseja excluir os ${selectedTransactions.length} lançamentos selecionados?`,
            onConfirm: async () => {
                const token = localStorage.getItem('token');
                try {
                    await axios.post(`${DATA_API_URL}/transactions/batch-delete`, { ids: selectedTransactions }, { headers: { 'x-auth-token': token } });
                    setTransactions(prev => prev.filter(trx => !selectedTransactions.includes(trx.id)));
                    setSelectedTransactions([]);
                    toast.success(`${selectedTransactions.length} lançamentos excluídos com sucesso!`);
                    closeConfirmModal();
                } catch (err) {
                    setError(err.response?.data?.error || 'Erro ao excluir em massa');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBatchStatusChange = (newStatus) => {
        if (selectedTransactions.length === 0) return;
        setConfirmState({
            isOpen: true,
            message: `Alterar status de ${selectedTransactions.length} lançamentos para "${newStatus}"?`,
            onConfirm: async () => {
                const token = localStorage.getItem('token');
                try {
                    // Alterar status localmente (incluindo pedidos)
                    setTransactions(prev => prev.map(trx => {
                        // Se é um pedido selecionado, alterar todas as transações do pedido
                        const isPedidoSelected = selectedTransactions.some(id => id.startsWith('pedido_') && trx.pedido_id === id.replace('pedido_', ''));
                        // Se é uma transação individual selecionada
                        const isTransactionSelected = selectedTransactions.includes(trx.id);
                        
                        if (isPedidoSelected || isTransactionSelected) {
                            return { ...trx, status: newStatus };
                        }
                        return trx;
                    }));
                    setSelectedTransactions([]);
                    toast.success(`Status alterado para ${selectedTransactions.length} lançamentos!`);
                    closeConfirmModal();
                } catch (err) {
                    setError('Erro ao alterar status em massa');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBatchEdit = () => {
        if (selectedTransactions.length === 0) return;
        
        // Pegar as transações selecionadas
        const selectedTrx = transactions.filter(trx => selectedTransactions.includes(trx.id));
        
        if (selectedTrx.length > 0) {
            setBatchEditTransactions(selectedTrx);
            setIsBatchEditOpen(true);
            toast.info(`Editando ${selectedTrx.length} lançamentos em lote`);
        }
    };
    
    const handleEditPedido = (pedidoTransactions) => {
        // Abrir modal de pedido para edição
        const pedidoData = {
            employee_id: pedidoTransactions[0].employee_id,
            cliente_fornecedor: pedidoTransactions[0].category,
            data_pedido: pedidoTransactions[0].transaction_date.split('T')[0],
            itens: pedidoTransactions.map(trx => ({
                produto_nome: trx.description,
                quantidade: trx.quantity,
                preco_unitario: trx.unit_price,
                subtotal: trx.total_price
            })),
            pedido_id: pedidoTransactions[0].pedido_id
        };
        
        // Definir tipo baseado na primeira transação
        const tipo = pedidoTransactions[0].type === 'venda' ? 'venda' : 'compra';
        setPedidoTipo(tipo);
        
        // Passar dados para o modal
        setEditingPedido(pedidoData);
        setIsPedidoModalOpen(true);
    };
    
    const handleBatchEditSave = (savedTransaction, isEdit) => {
        if (isEdit) {
            setTransactions(prev => prev.map(trx => trx.id === savedTransaction.id ? { ...trx, ...savedTransaction } : trx));
        }
    };
    
    const handleBatchEditClose = () => {
        setIsBatchEditOpen(false);
        setBatchEditTransactions([]);
        setSelectedTransactions([]);
    };

    const { paginatedVendas, totalVendasPages, paginatedGastos, totalGastosPages, filteredVendas, filteredGastos } = useMemo(() => {
        const vendas = transactions.filter(t => t.type === 'venda');
        const gastos = transactions.filter(t => t.type === 'gasto');
        
        // Aplicar busca por texto com debounce
        const filteredVendas = vendas.filter(t => 
            !debouncedSearchTerm || 
            t.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.category?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.employee_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
        
        const filteredGastos = gastos.filter(t => 
            !debouncedSearchTerm || 
            t.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.category?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            t.employee_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
        
        const totalVendasPages = Math.ceil(filteredVendas.length / ITEMS_PER_PAGE) || 1;
        const startVendas = (currentPageVendas - 1) * ITEMS_PER_PAGE;
        const paginatedVendas = filteredVendas.slice(startVendas, startVendas + ITEMS_PER_PAGE);
        
        const totalGastosPages = Math.ceil(filteredGastos.length / ITEMS_PER_PAGE) || 1;
        const startGastos = (currentPageGastos - 1) * ITEMS_PER_PAGE;
        const paginatedGastos = filteredGastos.slice(startGastos, startGastos + ITEMS_PER_PAGE);
        
        return { paginatedVendas, totalVendasPages, paginatedGastos, totalGastosPages, filteredVendas, filteredGastos };
    }, [transactions, currentPageVendas, currentPageGastos, debouncedSearchTerm]);
  
    return (
        <div>
            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
                transactionToEdit={editingTransaction}
                initialType={modalType}
                items={items}
                allTransactions={transactions}
                defaultEmployeeId={filters.employeeId !== 'todos' ? filters.employeeId : null}
            />
            
            {/* Modal de edição em lote */}
            <BatchEditModal
                isOpen={isBatchEditOpen}
                onClose={handleBatchEditClose}
                onSave={handleBatchEditSave}
                transactions={batchEditTransactions}
                items={items}
            />
            
            <PedidoModal
                isOpen={isPedidoModalOpen}
                onClose={() => {
                    setIsPedidoModalOpen(false);
                    setEditingPedido(null);
                }}
                onSave={(pedido) => {
                    toast.success(editingPedido ? 'Pedido atualizado com sucesso!' : 'Pedido criado com sucesso!');
                    fetchTransactions();
                    setEditingPedido(null);
                }}
                tipo={pedidoTipo}
                funcionarios={funcionarios}
                produtos={items.produto || []}
                clientes={pedidoTipo === 'venda' ? (items.comprador || []) : (items.fornecedor || [])}
                editingPedido={editingPedido}
            />
            
            <ConfirmModal isOpen={confirmState.isOpen} onClose={closeConfirmModal} onConfirm={confirmState.onConfirm} title="Confirmar Ação">{confirmState.message}</ConfirmModal>
            
            <ImportExport 
                isOpen={showImportExport} 
                onClose={() => setShowImportExport(false)} 
                type="transactions"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <button className="btn" onClick={() => handleOpenAddModal('venda')} style={{ backgroundColor: '#28a745' }}>Nova Venda</button>
                    <button className="btn" onClick={() => handleOpenAddModal('gasto')} style={{ backgroundColor: '#dc3545' }}>Nova Compra</button>
                    <button className="btn" onClick={() => { setPedidoTipo('venda'); setIsPedidoModalOpen(true); }} style={{ backgroundColor: '#17a2b8' }}>Pedido de Venda</button>
                    <button className="btn" onClick={() => { setPedidoTipo('compra'); setIsPedidoModalOpen(true); }} style={{ backgroundColor: '#6f42c1' }}>Pedido de Compra</button>
                    <button className="btn" onClick={() => setShowImportExport(true)} style={{ backgroundColor: '#ffc107', color: '#000' }}>📊 Importar/Exportar</button>
                </div>
            </div>

            <DashboardCards transactions={transactions} filters={filters} />
            
            <TabNavigation 
                activeTab={activeTab} 
                onTabChange={handleTabChange}
                vendasCount={filteredVendas?.length || 0}
                comprasCount={filteredGastos?.length || 0}
            />

            <div className="card">
                <h4>Filtros</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                        <label htmlFor="employeeId">Funcionário</label>
                        <select id="employeeId" name="employeeId" value={filters.employeeId} onChange={handleFilterChange}>
                            <option value="todos">Todos os Funcionários</option>
                            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div><label htmlFor="startDate">De</label><input type="date" id="startDate" name="startDate" value={filters.startDate} onChange={handleFilterChange} /></div>
                    <div><label htmlFor="endDate">Até</label><input type="date" id="endDate" name="endDate" value={filters.endDate} onChange={handleFilterChange} /></div>
                    {activeTab === 'vendas' ? (
                        <>
                            <div><label htmlFor="product">Produto</label><select id="product" name="product" value={filters.product} onChange={handleFilterChange}><option value="todos">Todos</option>{items.produto.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
                            <div><label htmlFor="buyer">Cliente</label><select id="buyer" name="buyer" value={filters.buyer} onChange={handleFilterChange}><option value="todos">Todos</option>{items.comprador.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
                        </>
                    ) : (
                        <>
                            <div><label htmlFor="purchase">Compra</label><select id="purchase" name="purchase" value={filters.purchase} onChange={handleFilterChange}><option value="todos">Todas</option>{items.compra.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
                            <div><label htmlFor="supplier">Fornecedor</label><select id="supplier" name="supplier" value={filters.supplier} onChange={handleFilterChange}><option value="todos">Todos</option>{items.fornecedor.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
                        </>
                    )}
                    <div>
                        <label htmlFor="status">Status</label>
                        <select id="status" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="todos">Todos</option>
                            <option value="Pago">Pago</option>
                            <option value="A Pagar">A Pagar</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="search-input" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Buscar</label>
                    <input
                        id="search-input"
                        type="text"
                        placeholder="Buscar por produto, cliente, fornecedor ou funcionário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{width: '100%', maxWidth: '400px'}}
                        aria-label="Campo de busca para filtrar lançamentos"
                    />
                    {debouncedSearchTerm && (
                        <small style={{ color: 'var(--cor-texto-label)', marginTop: '5px', display: 'block' }}>
                            Buscando por: "{debouncedSearchTerm}"
                        </small>
                    )}
                </div>
            </div>
            
            {/* Botões de Ação em Lote */}
            {selectedTransactions.length > 0 && (
                <div className="card" style={{
                    marginBottom: '20px', 
                    background: 'linear-gradient(135deg, var(--cor-primaria), var(--cor-destaque))',
                    border: '2px solid var(--cor-primaria)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: '12px'
                }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', padding: '5px'}}>
                        <div style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '16px'
                        }}>
                            <span style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                padding: '8px 12px',
                                borderRadius: '20px',
                                fontSize: '14px'
                            }}>
                                📋 {selectedTransactions.length} selecionado(s)
                            </span>
                        </div>
                        <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                            <button 
                                onClick={() => handleBatchEdit()} 
                                style={{
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                ✏️ Editar
                            </button>
                            <button 
                                onClick={() => handleBatchStatusChange('Pago')} 
                                style={{
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                ✓ Pago
                            </button>
                            <button 
                                onClick={() => handleBatchStatusChange('A Pagar')} 
                                style={{
                                    backgroundColor: '#ffc107',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                ⏳ A Pagar
                            </button>
                            <button 
                                onClick={handleBatchDelete} 
                                style={{
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                🗑️ Excluir
                            </button>
                            <button 
                                onClick={() => setSelectedTransactions([])} 
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                            >
                                ✖ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? <LoadingSpinner text="Carregando lançamentos..." /> : 
                <>
                    {activeTab === 'vendas' ? (
                        <>
                            <TransactionTable 
                                title={`Vendas (${filteredVendas?.length || 0})`} 
                                transactions={paginatedVendas} 
                                onEdit={handleOpenEditModal} 
                                onDelete={handleDeleteTransaction} 
                                onDeleteAttachment={handleDeleteAttachment} 
                                selected={selectedTransactions} 
                                onSelect={handleSelectTransaction} 
                                onSelectAll={handleSelectAll}
                                onEditPedido={handleEditPedido}
                                onSort={handleSort}
                                sortConfig={sortConfig}
                            />
                            <Pagination currentPage={currentPageVendas} totalPages={totalVendasPages} onPageChange={setCurrentPageVendas} />
                        </>
                    ) : (
                        <>
                            <TransactionTable 
                                title={`Compras (${filteredGastos?.length || 0})`} 
                                transactions={paginatedGastos} 
                                onEdit={handleOpenEditModal} 
                                onDelete={handleDeleteTransaction} 
                                onDeleteAttachment={handleDeleteAttachment} 
                                selected={selectedTransactions} 
                                onSelect={handleSelectTransaction} 
                                onSelectAll={handleSelectAll}
                                onEditPedido={handleEditPedido}
                                onSort={handleSort}
                                sortConfig={sortConfig}
                            />
                            <Pagination currentPage={currentPageGastos} totalPages={totalGastosPages} onPageChange={setCurrentPageGastos} />
                        </>
                    )}
                </>
            }
            {error && <p className="error-message" style={{ marginTop: '15px' }}>{error}</p>}
        </div>
    );
}

export default LancamentosPage;