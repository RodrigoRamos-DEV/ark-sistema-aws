import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import { Link } from 'react-router-dom';
import '../css/icons.css';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function ControleFinanceiroPage() {
    const [payments, setPayments] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [clients, setClients] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'payment' ou 'withdrawal'
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [comissoes, setComissoes] = useState([]);
    const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));
    const [filtroVendedor, setFiltroVendedor] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [buscaVendedor, setBuscaVendedor] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    const [dashboardData, setDashboardData] = useState({});
    const [showRecibo, setShowRecibo] = useState(false);
    const [dadosRecibo, setDadosRecibo] = useState({});

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        try {
            const [paymentsRes, withdrawalsRes, clientsRes, partnersRes] = await Promise.all([
                axios.get(`${API_URL}/api/partners/payments`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/partners/withdrawals`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/admin/clients`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/partners`, { headers: { 'x-auth-token': token } })
            ]);
            loadComissoes();
            setPayments(paymentsRes.data);
            setWithdrawals(withdrawalsRes.data);
            setClients(clientsRes.data);
            setPartners(partnersRes.data);
        } catch (error) {
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const loadComissoes = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/partners/comissoes?mes=${mesReferencia}`, { headers: { 'x-auth-token': token } });
            setComissoes(response.data);
        } catch (error) {
            console.error('Erro ao carregar comissões:', error);
        }
    };
    
    const exportToExcel = () => {
        const csvContent = "data:text/csv;charset=utf-8," + 
            "Vendedor,Porcentagem,Comissao,Status\n" +
            comissoesFiltradas.map(c => `${c.vendedor_nome},${c.porcentagem}%,${c.total_comissao},${c.status_pagamento}`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `comissoes_${mesReferencia}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Relatório exportado!');
    };
    
    const duplicarPagamento = (payment) => {
        setFormData({
            clientId: payment.client_id,
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            notes: payment.notes || '',
            vendedores: []
        });
        setModalType('payment');
        setEditingItem(null);
        setShowModal(true);
        toast.info('Dados do pagamento copiados!');
    };
    
    const comissoesFiltradas = comissoes.filter(c => {
        const matchVendedor = !filtroVendedor || c.vendedor_id === filtroVendedor;
        const matchStatus = !filtroStatus || c.status_pagamento === filtroStatus;
        const matchBusca = !buscaVendedor || c.vendedor_nome.toLowerCase().includes(buscaVendedor.toLowerCase());
        return matchVendedor && matchStatus && matchBusca;
    });
    
    const gerarRecibo = (vendedor) => {
        setDadosRecibo({
            vendedor_nome: vendedor.vendedor_nome,
            total_comissao: vendedor.total_comissao,
            porcentagem: vendedor.porcentagem,
            mes_referencia: mesReferencia,
            data_pagamento: new Date().toLocaleDateString('pt-BR'),
            numero_recibo: `REC-${Date.now()}`
        });
        setShowRecibo(true);
    };
    
    const imprimirRecibo = () => {
        window.print();
    };
    
    useEffect(() => {
        loadComissoes();
    }, [mesReferencia]);
    
    const pagarComissao = async (vendedor) => {
        if (!vendedor.vendedor_id) {
            toast.error('Vendedor sem ID válido.');
            return;
        }
        
        if (window.confirm(`💰 Pagar comissão de ${formatCurrency(vendedor.total_comissao)} para ${vendedor.vendedor_nome}?\n\n✅ Isso criará automaticamente uma retirada`)) {
            setLoadingAction(true);
            try {
                // Usar APENAS a função marcar-pago que já cria a retirada
                const response = await axios.post(`${API_URL}/api/partners/pagamentos/marcar-pago`, {
                    vendedor_id: vendedor.vendedor_id,
                    mes_referencia: mesReferencia
                }, { headers: { 'x-auth-token': token } });
                
                if (response.data.success) {
                    toast.success(`✅ Comissão de ${formatCurrency(response.data.total_comissao)} paga! Retirada criada automaticamente.`);
                    fetchData();
                    loadComissoes();
                } else {
                    toast.error('Erro ao processar pagamento.');
                }
            } catch (error) {
                const errorMessage = error.response?.data?.error || 'Erro ao processar pagamento.';
                toast.error(errorMessage);
            } finally {
                setLoadingAction(false);
            }
        }
    };

    const openModal = (type, item = null) => {
        setModalType(type);
        setEditingItem(item);
        if (type === 'vendedor') {
            setFormData(item ? {
                name: item.name,
                porcentagem: item.porcentagem,
                pix: item.pix || '',
                endereco: item.endereco || '',
                telefone: item.telefone || ''
            } : {
                name: '',
                porcentagem: '',
                pix: '',
                endereco: '',
                telefone: ''
            });
        } else if (type === 'payment') {
            if (item) {
                // Buscar vendedores do pagamento
                const loadPaymentVendors = async () => {
                    try {
                        const response = await axios.get(`${API_URL}/api/partners/payment-vendors/${item.id}`, { headers: { 'x-auth-token': token } });
                        setFormData({
                            clientId: item.client_id,
                            amount: item.amount,
                            paymentDate: item.payment_date.split('T')[0],
                            notes: item.notes || '',
                            vendedores: response.data || []
                        });
                    } catch (error) {
                        setFormData({
                            clientId: item.client_id,
                            amount: item.amount,
                            paymentDate: item.payment_date.split('T')[0],
                            notes: item.notes || '',
                            vendedores: []
                        });
                    }
                };
                loadPaymentVendors();
            } else {
                setFormData({
                    clientId: '',
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    notes: '',
                    vendedores: []
                });
            }
        } else {
            setFormData(item ? {
                partnerId: item.partner_id,
                amount: item.amount,
                withdrawalDate: item.withdrawal_date.split('T')[0]
            } : {
                partnerId: '',
                amount: '',
                withdrawalDate: new Date().toISOString().split('T')[0]
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoadingAction(true);
        
        // Validação de porcentagem total
        if (modalType === 'payment' && formData.vendedores && formData.vendedores.length > 0) {
            const totalPorcentagem = formData.vendedores.reduce((sum, v) => sum + parseFloat(v.porcentagem || 0), 0);
            if (totalPorcentagem > 100) {
                toast.error(`Total de comissões (${totalPorcentagem.toFixed(2)}%) não pode ultrapassar 100%!`);
                setLoadingAction(false);
                return;
            }
        }
        
        try {
            if (modalType === 'vendedor') {
                if (editingItem) {
                    await axios.put(`${API_URL}/api/partners/vendedores/${editingItem.id}`, formData, { headers: { 'x-auth-token': token } });
                    toast.success('Vendedor atualizado!');
                } else {
                    await axios.post(`${API_URL}/api/partners/vendedores`, formData, { headers: { 'x-auth-token': token } });
                    toast.success('Vendedor cadastrado!');
                }
            } else {
                const url = modalType === 'payment' ? 'payments' : 'withdrawals';
                if (editingItem) {
                    await axios.put(`${API_URL}/api/partners/${url}/${editingItem.id}`, formData, { headers: { 'x-auth-token': token } });
                    toast.success(`${modalType === 'payment' ? 'Pagamento' : 'Retirada'} atualizado!`);
                } else {
                    // Para pagamentos, incluir vendedores na requisição
                    const dataToSend = modalType === 'payment' ? {
                        ...formData,
                        vendedores: formData.vendedores || []
                    } : formData;
                    
                    await axios.post(`${API_URL}/api/partners/${url}`, dataToSend, { headers: { 'x-auth-token': token } });
                    toast.success(`${modalType === 'payment' ? 'Pagamento' : 'Retirada'} adicionado!`);
                }
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error('Erro ao salvar.');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDelete = async (type, id) => {
        if (window.confirm('Confirma exclusão? Se for retirada de comissão, o status voltará para pendente.')) {
            try {
                const url = type === 'payment' ? 'payments' : 'withdrawals';
                
                // Se for retirada, primeiro reverter comissões para pendente
                if (type === 'withdrawal') {
                    await axios.post(`${API_URL}/api/partners/reverter-retirada`, {
                        withdrawal_id: id
                    }, { headers: { 'x-auth-token': token } });
                }
                
                await axios.delete(`${API_URL}/api/partners/${url}/${id}`, { headers: { 'x-auth-token': token } });
                
                toast.success('Excluído com sucesso!');
                fetchData();
                loadComissoes();
            } catch (error) {
                toast.error('Erro ao excluir.');
            }
        }
    };

    const handleDeleteVendedor = async (id) => {
        if (window.confirm('Confirma exclusão do vendedor?')) {
            try {
                await axios.delete(`${API_URL}/api/partners/vendedores/${id}`, { headers: { 'x-auth-token': token } });
                toast.success('Vendedor excluído!');
                fetchData();
            } catch (error) {
                const errorMessage = error.response?.data?.error || 'Erro ao excluir vendedor.';
                toast.error(errorMessage);
            }
        }
    };

    const totalPagamentos = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalRetiradas = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const saldoCaixa = totalPagamentos - totalRetiradas;

    if (loading) return <div className="card"><p>Carregando...</p></div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <Link to="/admin" className="btn" style={{width: 'auto', backgroundColor: '#888'}}>&larr; Voltar</Link>
                <h2>Controle Financeiro</h2>
            </div>

            {/* Resumo */}
            <div className="card" style={{marginBottom: '20px'}}>
                <h3>Resumo Financeiro</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div style={{background: '#e8f5e8', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666'}}>Total Recebido</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#28a745'}}>{formatCurrency(totalPagamentos)}</div>
                    </div>
                    <div style={{background: '#f8d7da', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666'}}>Total Retirado</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#dc3545'}}>{formatCurrency(totalRetiradas)}</div>
                    </div>
                    <div style={{background: '#d1ecf1', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666'}}>Saldo em Caixa</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: saldoCaixa >= 0 ? '#0c5460' : '#dc3545'}}>{formatCurrency(saldoCaixa)}</div>
                    </div>
                </div>
            </div>

            {/* Pagamentos e Retiradas lado a lado */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                {/* Pagamentos */}
                <div className="card">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                        <h3>Pagamentos de Clientes</h3>
                        <button onClick={() => openModal('payment')} className="btn">+ Novo</button>
                    </div>
                    <table style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.payment_date).toLocaleDateString('pt-BR')}</td>
                                    <td>{p.company_name}</td>
                                    <td style={{color: '#28a745', fontWeight: 'bold'}}>{formatCurrency(p.amount)}</td>
                                    <td>
                                        <div style={{display: 'flex', gap: '5px'}}>
                                            <button onClick={() => openModal('payment', p)} style={{background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px'}} title="Editar">✏️ Editar</button>
                                            <button onClick={() => duplicarPagamento(p)} style={{background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px'}} title="Duplicar">📋 Copiar</button>
                                            <button onClick={() => handleDelete('payment', p.id)} style={{background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px'}} title="Excluir">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Retiradas */}
                <div className="card">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                        <h3>Retiradas de Vendedores</h3>
                        <button onClick={() => openModal('withdrawal')} className="btn">+ Nova</button>
                    </div>
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <thead>
                                <tr style={{backgroundColor: '#f8f9fa'}}>
                                    <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6'}}>Data</th>
                                    <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6'}}>Vendedor</th>
                                    <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6'}}>Valor</th>
                                    <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6'}}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map(w => (
                                    <tr key={w.id} style={{borderBottom: '1px solid #dee2e6'}}>
                                        <td style={{padding: '12px'}}>{new Date(w.withdrawal_date).toLocaleDateString('pt-BR')}</td>
                                        <td style={{padding: '12px'}}>{w.partner_name}</td>
                                        <td style={{padding: '12px', textAlign: 'right', color: '#dc3545', fontWeight: 'bold'}}>{formatCurrency(w.amount)}</td>
                                        <td style={{padding: '12px', textAlign: 'center'}}>
                                            <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                                <button onClick={() => openModal('withdrawal', w)} style={{background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                                    </svg>
                                                    Editar
                                                </button>
                                                <button onClick={() => handleDelete('withdrawal', w.id)} style={{background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                                    </svg>
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Dashboard de Comissões */}
            <div className="card" style={{marginBottom: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                <h3 style={{color: 'white', marginBottom: '20px'}}>Dashboard de Comissões - {new Date(mesReferencia + '-01').toLocaleDateString('pt-BR', {month: 'long', year: 'numeric', timeZone: 'UTC'}).replace(/^\w/, c => c.toUpperCase())}</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div style={{background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '8px', textAlign: 'center', backdropFilter: 'blur(10px)'}}>
                        <div style={{fontSize: '14px', marginBottom: '5px'}}>A Pagar</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold'}}>{formatCurrency(comissoesFiltradas.filter(c => c.status_pagamento === 'pendente').reduce((sum, c) => sum + parseFloat(c.total_comissao || 0), 0))}</div>
                    </div>
                    <div style={{background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '8px', textAlign: 'center', backdropFilter: 'blur(10px)'}}>
                        <div style={{fontSize: '14px', marginBottom: '5px'}}>Já Pago</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold'}}>{formatCurrency(comissoesFiltradas.filter(c => c.status_pagamento === 'pago').reduce((sum, c) => sum + parseFloat(c.total_comissao || 0), 0))}</div>
                    </div>
                    <div style={{background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '8px', textAlign: 'center', backdropFilter: 'blur(10px)'}}>
                        <div style={{fontSize: '14px', marginBottom: '5px'}}>Vendedores</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold'}}>{comissoesFiltradas.length}</div>
                    </div>
                </div>
            </div>
            
            {/* Controle de Vendedores */}
            <div className="card" style={{marginBottom: '20px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px'}}>
                    <h3>Controle de Vendedores</h3>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
                        <input 
                            type="text" 
                            placeholder="Buscar vendedor..." 
                            value={buscaVendedor} 
                            onChange={(e) => setBuscaVendedor(e.target.value)}
                            style={{padding: '8px 12px', borderRadius: '20px', border: '2px solid #007bff', minWidth: '200px', fontSize: '14px'}}
                        />
                        <select 
                            value={filtroStatus} 
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            style={{padding: '8px 12px', borderRadius: '20px', border: '2px solid #28a745', fontSize: '14px'}}
                        >
                            <option value="">Todos status</option>
                            <option value="pendente">A Pagar</option>
                            <option value="pago">Pago</option>
                        </select>
                        <button 
                            onClick={exportToExcel} 
                            style={{background: '#28a745', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'}}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '6px'}}>
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            Exportar CSV
                        </button>
                        <input type="month" value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} style={{padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}} />
                    </div>
                </div>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{backgroundColor: '#f8f9fa'}}>
                                <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6'}}>Vendedor</th>
                                <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6'}}>%</th>
                                <th style={{padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6'}}>Comissão</th>
                                <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6'}}>Status</th>
                                <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comissoesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{textAlign: 'center', padding: '30px', color: '#666', fontSize: '16px'}}>
                                        {comissoes.length === 0 ? 'Nenhuma comissão encontrada para este mês.' : 'Nenhum resultado encontrado com os filtros aplicados.'}
                                    </td>
                                </tr>
                            ) : comissoesFiltradas.map((c, i) => (
                                <tr key={i} style={{borderBottom: '1px solid #dee2e6'}}>
                                    <td style={{padding: '12px'}}>{c.vendedor_nome}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>{parseFloat(c.porcentagem || 0).toFixed(1)}%</td>
                                    <td style={{padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#28a745'}}>{formatCurrency(c.total_comissao || 0)}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        <span style={{
                                            padding: '6px 12px', 
                                            borderRadius: '20px', 
                                            backgroundColor: c.status_pagamento === 'pago' ? '#28a745' : '#ffc107', 
                                            color: c.status_pagamento === 'pago' ? '#fff' : '#000', 
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            {c.status_pagamento === 'pago' ? 'Pago' : 'A Pagar'}
                                        </span>
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        {c.status_pagamento === 'pago' ? (
                                            <div style={{display: 'flex', gap: '5px', justifyContent: 'center'}}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#28a745" style={{marginRight: '5px'}}>
                                                    <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                                                </svg>
                                                <button 
                                                    onClick={() => gerarRecibo(c)}
                                                    style={{background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', marginRight: '5px'}} 
                                                    title="Imprimir recibo"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '4px'}}>
                                                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                                    </svg>
                                                    Recibo
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm('Reverter pagamento para pendente?')) {
                                                            axios.post(`${API_URL}/api/partners/pagamentos/marcar-pendente`, {
                                                                vendedor_id: c.vendedor_id,
                                                                mes_referencia: mesReferencia
                                                            }, { headers: { 'x-auth-token': token } })
                                                            .then(() => {
                                                                toast.success('Status alterado para pendente!');
                                                                loadComissoes();
                                                                fetchData();
                                                            })
                                                            .catch(() => toast.error('Erro ao alterar status.'));
                                                        }
                                                    }}
                                                    style={{background: '#ffc107', color: 'black', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '10px'}} 
                                                    title="Reverter para pendente"
                                                >
                                                    Reverter
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => pagarComissao(c)}
                                                disabled={loadingAction}
                                                style={{
                                                    background: loadingAction ? '#ccc' : 'linear-gradient(45deg, #28a745, #20c997)', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    cursor: loadingAction ? 'not-allowed' : 'pointer', 
                                                    padding: '10px 20px', 
                                                    borderRadius: '25px', 
                                                    fontSize: '12px', 
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                                    transform: loadingAction ? 'none' : 'scale(1)',
                                                    transition: 'all 0.2s ease'
                                                }} 
                                                title="Marcar como pago e criar retirada"
                                                onMouseOver={(e) => !loadingAction && (e.target.style.transform = 'scale(1.05)')}
                                                onMouseOut={(e) => !loadingAction && (e.target.style.transform = 'scale(1)')}
                                            >
                                                {loadingAction ? (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '6px', animation: 'spin 1s linear infinite'}}>
                                                            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                                                        </svg>
                                                        Processando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '6px'}}>
                                                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
                                                        </svg>
                                                        Pagar Agora
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vendedores Cadastrados */}
            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3>Vendedores Cadastrados</h3>
                    <button onClick={() => openModal('vendedor')} className="btn">+ Novo Vendedor</button>
                </div>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{backgroundColor: '#f8f9fa'}}>
                                <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6'}}>Nome</th>
                                <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6'}}>Porcentagem</th>
                                <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6'}}>PIX</th>
                                <th style={{padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6'}}>Telefone</th>
                                <th style={{padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6'}}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partners.map(p => (
                                <tr key={p.id} style={{borderBottom: '1px solid #dee2e6'}}>
                                    <td style={{padding: '12px'}}>{p.name}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>{parseFloat(p.porcentagem || 0).toFixed(2)}%</td>
                                    <td style={{padding: '12px'}}>{p.pix}</td>
                                    <td style={{padding: '12px'}}>{p.telefone}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                    <div style={{display: 'flex', gap: '5px'}}>
                                        <button onClick={() => openModal('vendedor', p)} style={{background: '#007bff', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                                            </svg>
                                            Editar
                                        </button>
                                        <button onClick={() => handleDeleteVendedor(p.id)} style={{background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                            </svg>
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div className="card" style={{width: '90%', maxWidth: '500px'}}>
                        <h3>{editingItem ? 'Editar' : 'Novo'} {modalType === 'payment' ? 'Pagamento' : modalType === 'withdrawal' ? 'Retirada' : 'Vendedor'}</h3>
                        <form onSubmit={handleSave}>
                            {modalType === 'vendedor' ? (
                                <>
                                    <div className="input-group">
                                        <label>Nome *</label>
                                        <input type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Porcentagem (%) *</label>
                                        <input type="number" step="0.01" min="0" max="99.99" value={formData.porcentagem || ''} onChange={(e) => {
                                            const value = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 99.99);
                                            setFormData({...formData, porcentagem: value});
                                        }} required />
                                    </div>
                                    <div className="input-group">
                                        <label>PIX</label>
                                        <input type="text" value={formData.pix || ''} onChange={(e) => setFormData({...formData, pix: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label>Telefone</label>
                                        <input type="text" value={formData.telefone || ''} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label>Endereço</label>
                                        <input type="text" value={formData.endereco || ''} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
                                    </div>
                                </>
                            ) : modalType === 'payment' ? (
                                <>
                                    <div className="input-group">
                                        <label>Cliente *</label>
                                        <select value={formData.clientId || ''} onChange={(e) => setFormData({...formData, clientId: e.target.value})} required>
                                            <option value="">Selecione</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Valor *</label>
                                        <input type="number" step="0.01" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Data *</label>
                                        <input type="date" value={formData.paymentDate || ''} onChange={(e) => setFormData({...formData, paymentDate: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label style={{fontWeight: 'bold', color: '#495057'}}>Observações</label>
                                        <textarea 
                                            value={formData.notes || ''} 
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                                            rows="3"
                                            placeholder="Digite observações sobre este pagamento..."
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                border: '2px solid #e9ecef',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                minHeight: '80px',
                                                transition: 'border-color 0.2s ease',
                                                backgroundColor: '#fafafa'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#007bff'}
                                            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                        ></textarea>
                                        <small style={{color: '#6c757d', fontSize: '12px', fontStyle: 'italic'}}>Adicione detalhes sobre o pagamento, forma de recebimento, etc.</small>
                                    </div>
                                    
                                    {/* SEÇÃO DE VENDEDORES */}
                                    <div className="input-group" style={{marginTop: '20px', border: '2px solid #007bff', padding: '15px', borderRadius: '8px'}}>
                                        <label style={{fontSize: '16px', fontWeight: 'bold', color: '#007bff'}}>Vendedores e Comissões</label>
                                        <div style={{backgroundColor: '#f8f9ff', padding: '15px', borderRadius: '6px'}}>
                                            
                                            {(formData.vendedores || []).map((vendedor, index) => (
                                                <div key={index} style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}>
                                                    <select 
                                                        value={vendedor.vendedor_id || ''} 
                                                        onChange={(e) => {
                                                            const newVendedores = [...(formData.vendedores || [])];
                                                            newVendedores[index].vendedor_id = e.target.value;
                                                            
                                                            // Buscar porcentagem do vendedor selecionado
                                                            if (e.target.value) {
                                                                const selectedPartner = partners.find(p => p.id == e.target.value);
                                                                if (selectedPartner) {
                                                                    newVendedores[index].porcentagem = selectedPartner.porcentagem || '';
                                                                }
                                                            } else {
                                                                newVendedores[index].porcentagem = '';
                                                            }
                                                            
                                                            setFormData({...formData, vendedores: newVendedores});
                                                        }}
                                                        style={{flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                                                    >
                                                        <option value="">Selecione vendedor</option>
                                                        {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({parseFloat(p.porcentagem || 0).toFixed(1)}%)</option>)}
                                                    </select>
                                                    <input 
                                                        type="number" 
                                                        placeholder="%" 
                                                        value={vendedor.porcentagem || ''} 
                                                        onChange={(e) => {
                                                            const newVendedores = [...(formData.vendedores || [])];
                                                            newVendedores[index].porcentagem = e.target.value;
                                                            setFormData({...formData, vendedores: newVendedores});
                                                        }}
                                                        step="0.01" 
                                                        min="0" 
                                                        max="100"
                                                        style={{width: '70px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center'}}
                                                    />
                                                    <span style={{fontSize: '14px', color: '#666', fontWeight: 'bold'}}>%</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const newVendedores = (formData.vendedores || []).filter((_, i) => i !== index);
                                                            setFormData({...formData, vendedores: newVendedores});
                                                        }}
                                                        style={{background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px'}}
                                                        title="Remover vendedor"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const vendedoresAtuais = formData.vendedores || [];
                                                    setFormData({
                                                        ...formData, 
                                                        vendedores: [...vendedoresAtuais, {vendedor_id: '', porcentagem: ''}]
                                                    });
                                                }}
                                                style={{background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', padding: '12px 20px', cursor: 'pointer', width: '100%', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}
                                            >
                                                + Adicionar Vendedor
                                            </button>
                                            
                                            {(formData.vendedores || []).length > 0 && (
                                                <div style={{marginTop: '15px', padding: '12px', backgroundColor: '#e9ecef', borderRadius: '6px', border: '1px solid #dee2e6'}}>
                                                    <div style={{fontWeight: 'bold', color: '#495057', marginBottom: '5px', fontSize: '14px'}}>
                                                        📊 Total de comissões: {(formData.vendedores || []).reduce((sum, v) => sum + parseFloat(v.porcentagem || 0), 0).toFixed(2)}%
                                                    </div>
                                                    {formData.amount && (
                                                        <div style={{color: '#28a745', fontWeight: 'bold', fontSize: '14px'}}>
                                                            💰 Valor das comissões: {formatCurrency((formData.vendedores || []).reduce((sum, v) => sum + (parseFloat(formData.amount) * parseFloat(v.porcentagem || 0) / 100), 0))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label>Vendedor *</label>
                                        <select value={formData.partnerId || ''} onChange={(e) => setFormData({...formData, partnerId: e.target.value})} required>
                                            <option value="">Selecione</option>
                                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Valor *</label>
                                        <input type="number" step="0.01" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: e.target.value})} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Data *</label>
                                        <input type="date" value={formData.withdrawalDate || ''} onChange={(e) => setFormData({...formData, withdrawalDate: e.target.value})} required />
                                    </div>
                                </>
                            )}
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{backgroundColor: '#888'}}>Cancelar</button>
                                <button type="submit" className="btn">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal de Recibo */}
            {showRecibo && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div style={{backgroundColor: 'white', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '10px'}}>
                        {/* Conteúdo do Recibo */}
                        <div id="recibo-content" style={{padding: '40px', fontFamily: 'Arial, sans-serif'}}>
                            {/* Cabeçalho */}
                            <div style={{textAlign: 'center', borderBottom: '3px solid #007bff', paddingBottom: '20px', marginBottom: '30px'}}>
                                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px'}}>
                                    <img src="https://i.postimg.cc/Qd98gFMF/Sistema-ARK.webp" alt="Logo ARK" style={{width: '60px', height: '60px', marginRight: '15px'}} />
                                    <h1 style={{color: '#007bff', margin: '0', fontSize: '28px'}}>SISTEMA ARK</h1>
                                </div>
                                <h2 style={{color: '#666', margin: '10px 0 0 0', fontSize: '20px'}}>RECIBO DE COMISSÃO</h2>
                                <p style={{color: '#999', margin: '5px 0 0 0', fontSize: '14px'}}>Nº {dadosRecibo.numero_recibo}</p>
                            </div>
                            
                            {/* Informações do Recibo */}
                            <div style={{marginBottom: '30px'}}>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                                    <div>
                                        <strong style={{color: '#333'}}>Data de Pagamento:</strong>
                                        <div style={{fontSize: '16px', color: '#007bff', fontWeight: 'bold'}}>{dadosRecibo.data_pagamento}</div>
                                    </div>
                                    <div>
                                        <strong style={{color: '#333'}}>Período de Referência:</strong>
                                        <div style={{fontSize: '16px', color: '#007bff', fontWeight: 'bold'}}>{new Date(dadosRecibo.mes_referencia + '-01').toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}).replace(/^\w/, c => c.toUpperCase())}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Dados do Vendedor */}
                            <div style={{backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px'}}>
                                <h3 style={{color: '#333', marginTop: '0', marginBottom: '15px'}}>Dados do Vendedor</h3>
                                <div style={{fontSize: '18px'}}>
                                    <strong>Nome:</strong> <span style={{color: '#007bff', fontWeight: 'bold'}}>{dadosRecibo.vendedor_nome}</span>
                                </div>
                                <div style={{fontSize: '16px', marginTop: '10px'}}>
                                    <strong>Porcentagem de Comissão:</strong> <span style={{color: '#28a745', fontWeight: 'bold'}}>{parseFloat(dadosRecibo.porcentagem || 0).toFixed(1)}%</span>
                                </div>
                            </div>
                            
                            {/* Valor da Comissão */}
                            <div style={{textAlign: 'center', backgroundColor: '#e8f5e8', padding: '25px', borderRadius: '8px', marginBottom: '30px'}}>
                                <h3 style={{color: '#333', marginTop: '0', marginBottom: '10px'}}>Valor da Comissão</h3>
                                <div style={{fontSize: '36px', fontWeight: 'bold', color: '#28a745'}}>
                                    {formatCurrency(dadosRecibo.total_comissao)}
                                </div>
                                <p style={{color: '#666', margin: '10px 0 0 0', fontSize: '14px'}}>Valor pago referente às vendas do período</p>
                            </div>
                            
                            {/* Assinatura */}
                            <div style={{marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd'}}>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px'}}>
                                    <div style={{textAlign: 'center'}}>
                                        <div style={{borderTop: '1px solid #333', marginTop: '40px', paddingTop: '10px'}}>
                                            <strong>Vendedor</strong>
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'center'}}>
                                        <div style={{borderTop: '1px solid #333', marginTop: '40px', paddingTop: '10px'}}>
                                            <strong>Sistema ARK</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Rodapé */}
                            <div style={{textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd', color: '#999', fontSize: '12px'}}>
                                <p>Este recibo foi gerado automaticamente pelo Sistema ARK</p>
                                <p>Data de Emissão: {new Date().toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        
                        {/* Botões de Ação */}
                        <div style={{padding: '20px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                            <button 
                                onClick={() => setShowRecibo(false)}
                                style={{background: '#6c757d', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px'}}
                            >
                                Fechar
                            </button>
                            <button 
                                onClick={imprimirRecibo}
                                style={{background: '#007bff', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'}}
                            >
                                🖨️ Imprimir Recibo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ControleFinanceiroPage;