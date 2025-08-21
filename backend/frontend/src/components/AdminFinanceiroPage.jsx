import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import { Link } from 'react-router-dom';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

function AdminFinanceiroPage() {
    const [payments, setPayments] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [clients, setClients] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editingWithdrawal, setEditingWithdrawal] = useState(null);
    
    const [paymentForm, setPaymentForm] = useState({ clientId: '', amount: '', paymentDate: '', notes: '' });
    const [withdrawalForm, setWithdrawalForm] = useState({ partnerId: '', amount: '', withdrawalDate: '' });

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [paymentsRes, withdrawalsRes, clientsRes, partnersRes] = await Promise.all([
                axios.get(`${API_URL}/api/partners/payments`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/partners/withdrawals`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/admin/clients`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/partners`, { headers: { 'x-auth-token': token } })
            ]);
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

    const handlePaymentChange = (e) => setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value });
    const handleWithdrawalChange = (e) => setWithdrawalForm({ ...withdrawalForm, [e.target.name]: e.target.value });

    const handleSavePayment = async (e) => {
        e.preventDefault();
        try {
            if (editingPayment) {
                await axios.put(`${API_URL}/api/partners/payments/${editingPayment.id}`, paymentForm, { headers: { 'x-auth-token': token } });
                toast.success('Pagamento atualizado!');
            } else {
                await axios.post(`${API_URL}/api/partners/payments`, paymentForm, { headers: { 'x-auth-token': token } });
                toast.success('Pagamento adicionado!');
            }
            setShowPaymentModal(false);
            fetchData();
        } catch (error) {
            toast.error('Erro ao salvar pagamento.');
        }
    };

    const handleSaveWithdrawal = async (e) => {
        e.preventDefault();
        try {
            if (editingWithdrawal) {
                await axios.put(`${API_URL}/api/partners/withdrawals/${editingWithdrawal.id}`, withdrawalForm, { headers: { 'x-auth-token': token } });
                toast.success('Retirada atualizada!');
            } else {
                await axios.post(`${API_URL}/api/partners/withdrawals`, withdrawalForm, { headers: { 'x-auth-token': token } });
                toast.success('Retirada adicionada!');
            }
            setShowWithdrawalModal(false);
            fetchData();
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
            notes: payment.notes || ''
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
                await axios.delete(`${API_URL}/api/partners/payments/${id}`, { headers: { 'x-auth-token': token } });
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
                await axios.delete(`${API_URL}/api/partners/withdrawals/${id}`, { headers: { 'x-auth-token': token } });
                toast.success('Retirada excluída!');
                fetchData();
            } catch (error) {
                toast.error('Erro ao excluir retirada.');
            }
        }
    };

    const openPaymentModal = () => {
        setEditingPayment(null);
        setPaymentForm({ clientId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], notes: '' });
        setShowPaymentModal(true);
    };

    const openWithdrawalModal = () => {
        setEditingWithdrawal(null);
        setWithdrawalForm({ partnerId: '', amount: '', withdrawalDate: new Date().toISOString().split('T')[0] });
        setShowWithdrawalModal(true);
    };

    // Cálculos financeiros em tempo real
    const totalPagamentos = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalRetiradas = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const saldoCaixa = totalPagamentos - totalRetiradas;
    
    // Atualizar quando dados mudarem
    useEffect(() => {
        // Força re-render quando dados mudam
    }, [payments, withdrawals]);

    if (loading) return <div className="card"><p>Carregando...</p></div>;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <Link to="/admin" className="btn" style={{width: 'auto', backgroundColor: '#888'}}>&larr; Voltar ao Painel</Link>
                <h2>Controle Financeiro</h2>
            </div>

            {/* Dashboard Financeiro */}
            <div className="card" style={{marginBottom: '20px'}}>
                <h3>Resumo Financeiro</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                    <div style={{background: '#e8f5e8', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total Recebido</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#28a745'}}>{formatCurrency(totalPagamentos)}</div>
                    </div>
                    <div style={{background: '#f8d7da', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total Retirado</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: '#dc3545'}}>{formatCurrency(totalRetiradas)}</div>
                    </div>
                    <div style={{background: '#d1ecf1', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                        <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Saldo em Caixa</div>
                        <div style={{fontSize: '20px', fontWeight: 'bold', color: saldoCaixa >= 0 ? '#0c5460' : '#dc3545'}}>{formatCurrency(saldoCaixa)}</div>
                    </div>
                </div>
            </div>

            {/* Pagamentos */}
            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3>Pagamentos de Clientes</h3>
                    <button onClick={openPaymentModal} className="btn">+ Novo Pagamento</button>
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

            {/* Retiradas */}
            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3>Retiradas de Vendedores</h3>
                    <button onClick={openWithdrawalModal} className="btn">+ Nova Retirada</button>
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

            {/* Modal Pagamento */}
            {showPaymentModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <div className="card" style={{width: '90%', maxWidth: '500px'}}>
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
                                <textarea name="notes" value={paymentForm.notes} onChange={handlePaymentChange} rows="3"></textarea>
                            </div>
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn" style={{backgroundColor: '#888'}}>Cancelar</button>
                                <button type="submit" className="btn">Salvar</button>
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

export default AdminFinanceiroPage;