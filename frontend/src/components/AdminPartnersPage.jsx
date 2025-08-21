import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import { Link } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function AdminPartnersPage() {
    const [partners, setPartners] = useState([]);
    const [comissoes, setComissoes] = useState([]);
    const [statusPagamentos, setStatusPagamentos] = useState({});
    const [payments, setPayments] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editingWithdrawal, setEditingWithdrawal] = useState(null);
    
    const [paymentForm, setPaymentForm] = useState({ clientId: '', amount: '', paymentDate: '', notes: '', vendedores: [] });
    const [withdrawalForm, setWithdrawalForm] = useState({ partnerId: '', amount: '', withdrawalDate: '' });
    const [dashboardData, setDashboardData] = useState({ totalCaixa: 0, lucroLiquido: 0, aPagarVendedores: 0, disponivelRetirada: 0 });

    const [showVendedorModal, setShowVendedorModal] = useState(false);
    const [editingVendedor, setEditingVendedor] = useState(null);
    const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: null });
    const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));

    const [vendedorForm, setVendedorForm] = useState({ name: '', porcentagem: '', pix: '', endereco: '', telefone: '' });

    const token = localStorage.getItem('token');
    const PARTNERS_API_URL = `${API_URL}/api/partners`;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [partnersRes, paymentsRes, withdrawalsRes, clientsRes] = await Promise.all([
                axios.get(PARTNERS_API_URL, { headers: { 'x-auth-token': token } }),
                axios.get(`${PARTNERS_API_URL}/payments`, { headers: { 'x-auth-token': token } }),
                axios.get(`${PARTNERS_API_URL}/withdrawals`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/admin/clients`, { headers: { 'x-auth-token': token } })
            ]);
            setPartners(partnersRes.data);
            setPayments(paymentsRes.data);
            setWithdrawals(withdrawalsRes.data);
            setClients(clientsRes.data);
            loadComissoes();
            loadDashboardData();
        } catch (error) {
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVendedorChange = (e) => setVendedorForm({ ...vendedorForm, [e.target.name]: e.target.value });
    const handlePaymentChange = (e) => setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value });
    const handleWithdrawalChange = (e) => setWithdrawalForm({ ...withdrawalForm, [e.target.name]: e.target.value });
    
    const handleSavePayment = async (e) => {
        e.preventDefault();
        try {
            if (editingPayment) {
                await axios.put(`${PARTNERS_API_URL}/payments/${editingPayment.id}`, paymentForm, { headers: { 'x-auth-token': token } });
                toast.success('Pagamento atualizado!');
            } else {
                await axios.post(`${PARTNERS_API_URL}/payments`, paymentForm, { headers: { 'x-auth-token': token } });
                toast.success('Pagamento adicionado!');
            }
            setShowPaymentModal(false);
            fetchData();
            loadDashboardData();
        } catch (error) {
            toast.error('Erro ao salvar pagamento.');
        }
    };
    
    const handleSaveWithdrawal = async (e) => {
        e.preventDefault();
        try {
            if (editingWithdrawal) {
                await axios.put(`${PARTNERS_API_URL}/withdrawals/${editingWithdrawal.id}`, withdrawalForm, { headers: { 'x-auth-token': token } });
                toast.success('Retirada atualizada!');
            } else {
                await axios.post(`${PARTNERS_API_URL}/withdrawals`, withdrawalForm, { headers: { 'x-auth-token': token } });
                toast.success('Retirada adicionada!');
            }
            setShowWithdrawalModal(false);
            fetchData();
            loadDashboardData();
        } catch (error) {
            toast.error('Erro ao salvar retirada.');
        }
    };
    
    const handleEditPayment = (payment) => {
        setEditingPayment(payment);
        setPaymentForm({
            clientId: payment.client_id,
            amount: payment.amount,
            paymentDate: payment.payment_date.split('T')[0],
            notes: payment.notes || '',
            vendedores: [] // Para edição, começar vazio (pode implementar busca depois)
        });
        setShowPaymentModal(true);
    };
    
    const handleEditWithdrawal = (withdrawal) => {
        setEditingWithdrawal(withdrawal);
        setWithdrawalForm({
            partnerId: withdrawal.partner_id,
            amount: withdrawal.amount,
            withdrawalDate: withdrawal.withdrawal_date.split('T')[0]
        });
        setShowWithdrawalModal(true);
    };
    
    const handleDeletePayment = async (id) => {
        if (window.confirm('Confirma exclusão do pagamento?')) {
            try {
                await axios.delete(`${PARTNERS_API_URL}/payments/${id}`, { headers: { 'x-auth-token': token } });
                toast.success('Pagamento excluído!');
                fetchData();
            } catch (error) {
                toast.error('Erro ao excluir pagamento.');
            }
        }
    };
    
    const handleDeleteWithdrawal = async (id) => {
        if (window.confirm('Confirma exclusão da retirada?')) {
            try {
                await axios.delete(`${PARTNERS_API_URL}/withdrawals/${id}`, { headers: { 'x-auth-token': token } });
                toast.success('Retirada excluída!');
                fetchData();
            } catch (error) {
                toast.error('Erro ao excluir retirada.');
            }
        }
    };
    
    const loadComissoes = async () => {
        try {
            const response = await axios.get(`${PARTNERS_API_URL}/comissoes?mes=${mesReferencia}`, { headers: { 'x-auth-token': token } });
            setComissoes(response.data);
        } catch (error) {
            toast.error('Erro ao carregar comissões.');
        }
    };
    
    const loadDashboardData = async () => {
        console.log('INICIANDO loadDashboardData');
        try {
            console.log('Fazendo request para:', `${PARTNERS_API_URL}/dashboard-financeiro`);
            const response = await axios.get(`${PARTNERS_API_URL}/dashboard-financeiro`, { headers: { 'x-auth-token': token } });
            console.log('RESPOSTA COMPLETA:', response);
            console.log('Dashboard data recebida:', JSON.stringify(response.data, null, 2));
            console.log('totalCaixa:', response.data.totalCaixa);
            console.log('lucroLiquido:', response.data.lucroLiquido);
            console.log('aPagarVendedores:', response.data.aPagarVendedores);
            console.log('disponivelRetirada:', response.data.disponivelRetirada);
            setDashboardData(response.data || { totalCaixa: 0, lucroLiquido: 0, aPagarVendedores: 0, disponivelRetirada: 0 });
        } catch (error) {
            console.error('ERRO ao carregar dashboard financeiro:', error);
            setDashboardData({ totalCaixa: 0, lucroLiquido: 0, aPagarVendedores: 0, disponivelRetirada: 0 });
        }
    };
    
    const marcarComoPago = async (vendedor_id, valor_comissao) => {
        try {
            const response = await axios.post(`${PARTNERS_API_URL}/pagamentos/marcar-pago`, {
                vendedor_id,
                mes_referencia: mesReferencia,
                valor_comissao
            }, { headers: { 'x-auth-token': token } });
            
            if (response.data.success) {
                toast.success('Pagamento marcado como pago!');
                loadComissoes();
            } else {
                toast.error('Erro ao processar pagamento.');
            }
        } catch (error) {
            console.error('Erro ao marcar pagamento:', error);
            toast.error('Erro ao marcar pagamento: ' + (error.response?.data?.error || error.message));
        }
    };
    
    const marcarComoPendente = async (vendedor_id) => {
        try {
            await axios.post(`${PARTNERS_API_URL}/pagamentos/marcar-pendente`, {
                vendedor_id,
                mes_referencia: mesReferencia
            }, { headers: { 'x-auth-token': token } });
            
            toast.success('Status alterado para pendente!');
            loadComissoes();
        } catch (error) {
            toast.error('Erro ao alterar status.');
        }
    };
    
    const handleOpenVendedorModal = (vendedor = null) => {
        if (vendedor) {
            setEditingVendedor(vendedor);
            setVendedorForm({
                name: vendedor.name,
                porcentagem: vendedor.porcentagem,
                pix: vendedor.pix || '',
                endereco: vendedor.endereco || '',
                telefone: vendedor.telefone || ''
            });
        } else {
            setEditingVendedor(null);
            setVendedorForm({ name: '', porcentagem: '', pix: '', endereco: '', telefone: '' });
        }
        setShowVendedorModal(true);
    };
    
    const handleOpenPaymentModal = () => {
        setEditingPayment(null);
        setPaymentForm({ clientId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], notes: '', vendedores: [] });
        setShowPaymentModal(true);
    };
    
    const handleOpenWithdrawalModal = () => {
        setEditingWithdrawal(null);
        setWithdrawalForm({ partnerId: '', amount: '', withdrawalDate: new Date().toISOString().split('T')[0] });
        setShowWithdrawalModal(true);
    };
    
    const handleSaveVendedor = async (e) => {
        e.preventDefault();
        try {
            if (editingVendedor) {
                await axios.put(`${PARTNERS_API_URL}/vendedores/${editingVendedor.id}`, vendedorForm, { headers: { 'x-auth-token': token } });
                toast.success('Vendedor atualizado com sucesso!');
            } else {
                await axios.post(`${PARTNERS_API_URL}/vendedores`, vendedorForm, { headers: { 'x-auth-token': token } });
                toast.success('Vendedor cadastrado com sucesso!');
            }
            setShowVendedorModal(false);
            fetchData();
        } catch (error) {
            toast.error('Erro ao salvar vendedor.');
        }
    };
    
    useEffect(() => {
        loadComissoes();
    }, [mesReferencia]);

    if (loading) return <div className="card"><p>Carregando controle de vendedores...</p></div>;

    return (
        <div>
            <ConfirmModal isOpen={confirmState.isOpen} onClose={() => setConfirmState({ isOpen: false, onConfirm: null })} onConfirm={confirmState.onConfirm} title="Confirmar Ação">{confirmState.message}</ConfirmModal>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <Link to="/admin" className="btn" style={{width: 'auto', backgroundColor: '#888'}}>&larr; Voltar ao Painel</Link>
                <h2>Controle Financeiro</h2>
                <button onClick={() => handleOpenVendedorModal()} className="btn">+ Novo Vendedor</button>
            </div>

            {/* Dashboard Financeiro */}
            <div className="card" style={{marginBottom: '20px'}}>
                <h3>Dashboard Financeiro</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px'}}>
                    <div style={{background: '#e8f5e8', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total em Caixa</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#28a745'}}>{formatCurrency(dashboardData.totalCaixa)}</div>
                    </div>
                    <div style={{background: '#fff3cd', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Lucro Líquido</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#856404'}}>{formatCurrency(dashboardData.lucroLiquido)}</div>
                    </div>
                    <div style={{background: '#f8d7da', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>A Pagar Vendedores</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#dc3545'}}>{formatCurrency(dashboardData.aPagarVendedores)}</div>
                    </div>
                    <div style={{background: '#d1ecf1', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Disponível p/ Retirada</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#0c5460'}}>{formatCurrency(dashboardData.disponivelRetirada)}</div>
                    </div>
                </div>
                
                {/* Vendedores com Comissões */}
                {dashboardData.vendedoresComissoes && dashboardData.vendedoresComissoes.length > 0 && (
                    <div style={{marginTop: '20px'}}>
                        <h4>Comissões do Mês Atual</h4>
                        <div style={{overflowX: 'auto'}}>
                            <table style={{width: '100%', fontSize: '14px'}}>
                                <thead>
                                    <tr>
                                        <th>Vendedor</th>
                                        <th>%</th>
                                        <th>Vendas</th>
                                        <th>Comissão</th>
                                        <th>Status</th>
                                        <th>PIX</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.vendedoresComissoes.map((v, i) => (
                                        <tr key={i}>
                                            <td>{v.vendedor_nome}</td>
                                            <td>{v.porcentagem === 'Resto' ? 'Resto' : v.porcentagem + '%'}</td>
                                            <td>{formatCurrency(v.total_vendas)}</td>
                                            <td style={{fontWeight: 'bold', color: v.vendedor_nome === 'Rodrigo Ramos CEO' ? '#6f42c1' : '#28a745'}}>
                                                {formatCurrency(v.total_comissao)}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 6px', 
                                                    borderRadius: '3px', 
                                                    backgroundColor: v.status === 'pago' ? '#28a745' : '#ffc107', 
                                                    color: v.status === 'pago' ? '#fff' : '#000', 
                                                    fontSize: '11px'
                                                }}>
                                                    {v.status === 'pago' ? 'Pago' : 'A Pagar'}
                                                </span>
                                            </td>
                                            <td style={{fontSize: '12px'}}>{v.pix}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3>Controle Financeiro - {new Date(mesReferencia + '-01').toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'}).replace(/^\w/, c => c.toUpperCase())}</h3>
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input type="month" value={mesReferencia} onChange={(e) => setMesReferencia(e.target.value)} />
                        <button onClick={loadComissoes} className="btn" style={{padding: '5px 10px', fontSize: '12px'}}>Atualizar</button>
                    </div>
                </div>
                
                {comissoes.length === 0 && (
                    <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                        <p>Nenhuma comissão encontrada para este mês.</p>
                    </div>
                )}
                
                {comissoes.length > 0 && (
                    <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                        <strong>Resumo: </strong>
                        Total de Vendas: {formatCurrency(comissoes.reduce((sum, c) => sum + parseFloat(c.total_vendas || 0), 0))} | 
                        Total de Comissões: {formatCurrency(comissoes.reduce((sum, c) => sum + parseFloat(c.total_comissao || 0), 0))} | 
                        Pagos: {comissoes.filter(c => c.status_pagamento === 'pago').length} | 
                        Pendentes: {comissoes.filter(c => c.status_pagamento !== 'pago').length}
                    </div>
                )}
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Vendedor</th>
                                <th>%</th>
                                <th>Total Vendas</th>
                                <th>Comissão</th>
                                <th>Status</th>
                                <th>PIX</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comissoes.map((c, i) => (
                                <tr key={i}>
                                    <td>{c.vendedor_nome}</td>
                                    <td>{c.porcentagem}%</td>
                                    <td>{formatCurrency(c.total_vendas)}</td>
                                    <td style={{fontWeight: 'bold', color: '#28a745'}}>{formatCurrency(c.total_comissao)}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px', 
                                            borderRadius: '4px', 
                                            backgroundColor: c.status_pagamento === 'pago' ? '#28a745' : '#ffc107', 
                                            color: c.status_pagamento === 'pago' ? '#fff' : '#000', 
                                            fontSize: '12px'
                                        }}>
                                            {c.status_pagamento === 'pago' ? 'Pago' : 'A Pagar'}
                                        </span>
                                    </td>
                                    <td>{c.pix}</td>
                                    <td>
                                        {c.status_pagamento !== 'pago' ? (
                                            <button 
                                                onClick={() => marcarComoPago(c.vendedor_id, c.total_comissao)}
                                                style={{background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'}} 
                                                title="Marcar como Pago"
                                            >
                                                Pagar
                                            </button>
                                        ) : (
                                            <div style={{display: 'flex', gap: '5px'}}>
                                                <span style={{color: '#28a745', fontSize: '16px'}}>✓</span>
                                                <button 
                                                    onClick={() => marcarComoPendente(c.vendedor_id)}
                                                    style={{background: '#ffc107', color: 'black', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '10px'}} 
                                                    title="Marcar como Pendente"
                                                >
                                                    Desfazer
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3>Pagamentos de Clientes</h3>
                    <button onClick={handleOpenPaymentModal} className="btn">+ Novo Pagamento</button>
                </div>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Valor</th>
                                <th>Observações</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.payment_date).toLocaleDateString('pt-BR')}</td>
                                    <td>{p.company_name}</td>
                                    <td style={{color: '#28a745', fontWeight: 'bold'}}>{formatCurrency(p.amount)}</td>
                                    <td>{p.notes}</td>
                                    <td>
                                        <button onClick={() => handleEditPayment(p)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '10px'}} title="Editar">✏️</button>
                                        <button onClick={() => handleDeletePayment(p.id)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px'}} title="Excluir">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3>Retiradas de Vendedores</h3>
                    <button onClick={handleOpenWithdrawalModal} className="btn">+ Nova Retirada</button>
                </div>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Vendedor</th>
                                <th>Valor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {withdrawals.map(w => (
                                <tr key={w.id}>
                                    <td>{new Date(w.withdrawal_date).toLocaleDateString('pt-BR')}</td>
                                    <td>{w.partner_name}</td>
                                    <td style={{color: '#dc3545', fontWeight: 'bold'}}>{formatCurrency(w.amount)}</td>
                                    <td>
                                        <button onClick={() => handleEditWithdrawal(w)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '10px'}} title="Editar">✏️</button>
                                        <button onClick={() => handleDeleteWithdrawal(w.id)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px'}} title="Excluir">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <h3>Lista de Vendedores</h3>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%'}}>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Porcentagem</th>
                                <th>PIX</th>
                                <th>Telefone</th>
                                <th>Endereço</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partners.map(p => (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td>{parseFloat(p.porcentagem || 0).toFixed(2)}%</td>
                                    <td>{p.pix}</td>
                                    <td>{p.telefone}</td>
                                    <td>{p.endereco}</td>
                                    <td>
                                        <button onClick={() => handleOpenVendedorModal(p)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', marginRight: '10px'}} title="Editar">✏️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modal Vendedor */}
            {showVendedorModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div className="card" style={{width: '90%', maxWidth: '500px'}}>
                        <h3>{editingVendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
                        <form onSubmit={handleSaveVendedor}>
                            <div className="input-group">
                                <label>Nome *</label>
                                <input type="text" name="name" value={vendedorForm.name} onChange={handleVendedorChange} required />
                            </div>
                            <div className="input-group">
                                <label>Porcentagem (%) *</label>
                                <input type="number" name="porcentagem" value={vendedorForm.porcentagem} onChange={handleVendedorChange} step="0.01" min="0" max="100" required />
                                <small style={{color: '#666', fontSize: '12px'}}>Valor entre 0 e 100</small>
                            </div>
                            <div className="input-group">
                                <label>PIX</label>
                                <input type="text" name="pix" value={vendedorForm.pix} onChange={handleVendedorChange} />
                            </div>
                            <div className="input-group">
                                <label>Telefone</label>
                                <input type="text" name="telefone" value={vendedorForm.telefone} onChange={handleVendedorChange} />
                            </div>
                            <div className="input-group">
                                <label>Endereço</label>
                                <input type="text" name="endereco" value={vendedorForm.endereco} onChange={handleVendedorChange} />
                            </div>
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                                <button type="button" onClick={() => setShowVendedorModal(false)} className="btn" style={{backgroundColor: '#888'}}>Cancelar</button>
                                <button type="submit" className="btn">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal Pagamento */}
            {showPaymentModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div className="card" style={{width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
                        <h3>{editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}</h3>
                        <form onSubmit={handleSavePayment}>
                            <div className="input-group">
                                <label>Cliente *</label>
                                <select name="clientId" value={paymentForm.clientId} onChange={handlePaymentChange} required>
                                    <option value="">Selecione um cliente</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Valor *</label>
                                <input type="number" name="amount" value={paymentForm.amount} onChange={handlePaymentChange} step="0.01" required />
                            </div>
                            <div className="input-group">
                                <label>Data *</label>
                                <input type="date" name="paymentDate" value={paymentForm.paymentDate} onChange={handlePaymentChange} required />
                            </div>
                            <div className="input-group">
                                <label>Observações</label>
                                <textarea name="notes" value={paymentForm.notes} onChange={handlePaymentChange} rows="2"></textarea>
                            </div>
                            
                            <div className="input-group" style={{backgroundColor: 'red', padding: '20px', margin: '20px 0'}}>
                                <h2 style={{color: 'white', fontSize: '24px'}}>🚨 TESTE - VOCÊ VÊ ISSO? 🚨</h2>
                                <p style={{color: 'white', fontSize: '18px'}}>Se você está vendo esta mensagem vermelha, as mudanças estão funcionando!</p>
                            </div>
                            
                            {/* NOVA SEÇÃO DE VENDEDORES */}
                            <div className="input-group" style={{marginTop: '20px'}}>
                                <label style={{fontSize: '16px', fontWeight: 'bold', color: '#333'}}>🎯 Vendedores e Comissões</label>
                                <div style={{border: '2px solid #007bff', borderRadius: '8px', padding: '15px', backgroundColor: '#f8f9ff'}}>
                                    
                                    {paymentForm.vendedores && paymentForm.vendedores.map((vendedor, index) => (
                                        <div key={index} style={{display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd'}}>
                                            <select 
                                                value={vendedor.vendedor_id || ''} 
                                                onChange={(e) => {
                                                    const newVendedores = [...(paymentForm.vendedores || [])];
                                                    newVendedores[index].vendedor_id = e.target.value;
                                                    setPaymentForm({...paymentForm, vendedores: newVendedores});
                                                }}
                                                style={{flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                                            >
                                                <option value="">Selecione vendedor</option>
                                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <input 
                                                type="number" 
                                                placeholder="%" 
                                                value={vendedor.porcentagem || ''} 
                                                onChange={(e) => {
                                                    const newVendedores = [...(paymentForm.vendedores || [])];
                                                    newVendedores[index].porcentagem = e.target.value;
                                                    setPaymentForm({...paymentForm, vendedores: newVendedores});
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
                                                    const newVendedores = (paymentForm.vendedores || []).filter((_, i) => i !== index);
                                                    setPaymentForm({...paymentForm, vendedores: newVendedores});
                                                }}
                                                style={{background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px'}}
                                                title="Remover vendedor"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const vendedoresAtuais = paymentForm.vendedores || [];
                                            setPaymentForm({
                                                ...paymentForm, 
                                                vendedores: [...vendedoresAtuais, {vendedor_id: '', porcentagem: ''}]
                                            });
                                        }}
                                        style={{background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 15px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%'}}
                                    >
                                        ➕ Adicionar Vendedor
                                    </button>
                                    
                                    {paymentForm.vendedores && paymentForm.vendedores.length > 0 && (
                                        <div style={{marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '6px', fontSize: '13px'}}>
                                            <div style={{fontWeight: 'bold', color: '#495057', marginBottom: '5px'}}>
                                                📊 Total de comissões: {(paymentForm.vendedores || []).reduce((sum, v) => sum + parseFloat(v.porcentagem || 0), 0).toFixed(2)}%
                                            </div>
                                            {paymentForm.amount && (
                                                <div style={{color: '#28a745', fontWeight: 'bold'}}>
                                                    💰 Valor das comissões: {formatCurrency((paymentForm.vendedores || []).reduce((sum, v) => sum + (parseFloat(paymentForm.amount) * parseFloat(v.porcentagem || 0) / 100), 0))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <small style={{color: '#666', fontSize: '12px', fontStyle: 'italic'}}>💡 Adicione os vendedores que receberão comissão deste pagamento</small>
                            </div>
                            
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px'}}>
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn" style={{backgroundColor: '#6c757d', padding: '10px 20px'}}>Cancelar</button>
                                <button type="submit" className="btn" style={{backgroundColor: '#007bff', padding: '10px 20px'}}>💾 Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal Retirada */}
            {showWithdrawalModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div className="card" style={{width: '90%', maxWidth: '500px'}}>
                        <h3>{editingWithdrawal ? 'Editar Retirada' : 'Nova Retirada'}</h3>
                        <form onSubmit={handleSaveWithdrawal}>
                            <div className="input-group">
                                <label>Vendedor *</label>
                                <select name="partnerId" value={withdrawalForm.partnerId} onChange={handleWithdrawalChange} required>
                                    <option value="">Selecione um vendedor</option>
                                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Valor *</label>
                                <input type="number" name="amount" value={withdrawalForm.amount} onChange={handleWithdrawalChange} step="0.01" required />
                            </div>
                            <div className="input-group">
                                <label>Data *</label>
                                <input type="date" name="withdrawalDate" value={withdrawalForm.withdrawalDate} onChange={handleWithdrawalChange} required />
                            </div>
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                                <button type="button" onClick={() => setShowWithdrawalModal(false)} className="btn" style={{backgroundColor: '#888'}}>Cancelar</button>
                                <button type="submit" className="btn">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPartnersPage;