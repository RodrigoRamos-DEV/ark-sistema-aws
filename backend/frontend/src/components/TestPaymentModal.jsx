import React, { useState } from 'react';

const TestPaymentModal = () => {
    const [showModal, setShowModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        clientId: '',
        amount: '',
        paymentDate: '',
        notes: '',
        vendedores: []
    });

    const partners = [
        { id: 1, name: 'João Silva' },
        { id: 2, name: 'Maria Santos' },
        { id: 3, name: 'Pedro Costa' }
    ];

    const clients = [
        { id: 1, company_name: 'Empresa A' },
        { id: 2, company_name: 'Empresa B' }
    ];

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    return (
        <div style={{ padding: '20px' }}>
            <h1>TESTE - Nova Interface de Pagamento</h1>
            <button 
                onClick={() => setShowModal(true)}
                style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                🧪 ABRIR MODAL DE TESTE
            </button>

            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    zIndex: 9999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '10px',
                        width: '90%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <h2>🧪 TESTE - Novo Pagamento</h2>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cliente *</label>
                            <select style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                <option value="">Selecione um cliente</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Valor *</label>
                            <input 
                                type="number" 
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                step="0.01"
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Data *</label>
                            <input 
                                type="date" 
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>

                        {/* NOVA SEÇÃO DE VENDEDORES */}
                        <div style={{ marginTop: '25px', marginBottom: '20px' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '10px', 
                                fontSize: '18px', 
                                fontWeight: 'bold', 
                                color: '#007bff',
                                background: '#f0f8ff',
                                padding: '10px',
                                borderRadius: '5px',
                                border: '2px solid #007bff'
                            }}>
                                🎯 VENDEDORES E COMISSÕES (NOVA FUNCIONALIDADE)
                            </label>
                            
                            <div style={{
                                border: '3px solid #28a745',
                                borderRadius: '10px',
                                padding: '20px',
                                backgroundColor: '#f8fff8'
                            }}>
                                {paymentForm.vendedores && paymentForm.vendedores.map((vendedor, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        gap: '10px',
                                        alignItems: 'center',
                                        marginBottom: '15px',
                                        padding: '15px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        border: '2px solid #ddd',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        <select 
                                            value={vendedor.vendedor_id || ''}
                                            onChange={(e) => {
                                                const newVendedores = [...(paymentForm.vendedores || [])];
                                                newVendedores[index].vendedor_id = e.target.value;
                                                setPaymentForm({...paymentForm, vendedores: newVendedores});
                                            }}
                                            style={{
                                                flex: 2,
                                                padding: '10px',
                                                borderRadius: '5px',
                                                border: '2px solid #007bff',
                                                fontSize: '14px'
                                            }}
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
                                            style={{
                                                width: '80px',
                                                padding: '10px',
                                                borderRadius: '5px',
                                                border: '2px solid #28a745',
                                                textAlign: 'center',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                        <span style={{ fontSize: '16px', color: '#666', fontWeight: 'bold' }}>%</span>
                                        
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const newVendedores = (paymentForm.vendedores || []).filter((_, i) => i !== index);
                                                setPaymentForm({...paymentForm, vendedores: newVendedores});
                                            }}
                                            style={{
                                                background: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '5px',
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            ❌
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
                                    style={{
                                        background: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '15px 20px',
                                        cursor: 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        width: '100%',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    ➕ ADICIONAR VENDEDOR
                                </button>
                                
                                {paymentForm.vendedores && paymentForm.vendedores.length > 0 && (
                                    <div style={{
                                        marginTop: '20px',
                                        padding: '15px',
                                        backgroundColor: '#e9ecef',
                                        borderRadius: '8px',
                                        border: '2px solid #6c757d'
                                    }}>
                                        <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '8px', fontSize: '16px' }}>
                                            📊 Total de comissões: {(paymentForm.vendedores || []).reduce((sum, v) => sum + parseFloat(v.porcentagem || 0), 0).toFixed(2)}%
                                        </div>
                                        {paymentForm.amount && (
                                            <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '16px' }}>
                                                💰 Valor das comissões: {formatCurrency((paymentForm.vendedores || []).reduce((sum, v) => sum + (parseFloat(paymentForm.amount) * parseFloat(v.porcentagem || 0) / 100), 0))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 25px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                Cancelar
                            </button>
                            <button 
                                style={{
                                    background: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 25px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold'
                                }}
                            >
                                💾 Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestPaymentModal;