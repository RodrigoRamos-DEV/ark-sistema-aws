import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function BatchEditModal({ isOpen, onClose, onSave, transactions, items }) {
    const [editedTransactions, setEditedTransactions] = useState([]);

    useEffect(() => {
        if (transactions && transactions.length > 0) {
            setEditedTransactions(transactions.map(trx => ({ ...trx })));
        }
    }, [transactions]);

    const handleFieldChange = (index, field, value) => {
        setEditedTransactions(prev => prev.map((trx, i) => 
            i === index ? { ...trx, [field]: value } : trx
        ));
    };

    const handleSaveAll = () => {
        editedTransactions.forEach(trx => {
            onSave(trx, true);
        });
        toast.success(`${editedTransactions.length} lançamentos salvos!`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <div style={{
                backgroundColor: 'var(--cor-card)',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '1200px',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '1px solid var(--cor-borda)'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--cor-primaria)'}}>
                    <h3 style={{margin: 0, color: 'var(--cor-texto)', fontSize: '20px', fontWeight: '600'}}>
                        ✏️ Edição em Lote - {editedTransactions.length} lançamentos
                    </h3>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'var(--cor-erro)', 
                            border: 'none', 
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            fontSize: '18px', 
                            cursor: 'pointer',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{borderBottom: '2px solid var(--cor-primaria)'}}>
                                <th style={{padding: '10px', textAlign: 'left'}}>Data</th>
                                <th style={{padding: '10px', textAlign: 'left'}}>Produto/Compra</th>
                                <th style={{padding: '10px', textAlign: 'left'}}>Cliente/Fornecedor</th>
                                <th style={{padding: '10px', textAlign: 'left'}}>Valor</th>
                                <th style={{padding: '10px', textAlign: 'left'}}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editedTransactions.map((trx, index) => (
                                <tr key={trx.id} style={{borderBottom: '1px solid var(--cor-borda)'}}>
                                    <td style={{padding: '10px'}}>
                                        <input
                                            type="date"
                                            value={trx.transaction_date ? trx.transaction_date.split('T')[0] : ''}
                                            onChange={(e) => handleFieldChange(index, 'transaction_date', e.target.value)}
                                            style={{width: '100%'}}
                                        />
                                    </td>
                                    <td style={{padding: '10px'}}>
                                        <select
                                            value={trx.description || ''}
                                            onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                                            style={{width: '100%'}}
                                        >
                                            <option value={trx.description || ''}>{trx.description || '-- Selecionar --'}</option>
                                            {trx.type === 'venda' ? (
                                                items.produto?.map(item => (
                                                    <option key={item.id} value={item.name}>{item.name}</option>
                                                ))
                                            ) : (
                                                items.compra?.map(item => (
                                                    <option key={item.id} value={item.name}>{item.name}</option>
                                                ))
                                            )}
                                        </select>
                                    </td>
                                    <td style={{padding: '10px'}}>
                                        <select
                                            value={trx.category || ''}
                                            onChange={(e) => handleFieldChange(index, 'category', e.target.value)}
                                            style={{width: '100%'}}
                                        >
                                            <option value={trx.category || ''}>{trx.category || '-- Selecionar --'}</option>
                                            {trx.type === 'venda' ? (
                                                items.comprador?.map(item => (
                                                    <option key={item.id} value={item.name}>{item.name}</option>
                                                ))
                                            ) : (
                                                items.fornecedor?.map(item => (
                                                    <option key={item.id} value={item.name}>{item.name}</option>
                                                ))
                                            )}
                                        </select>
                                    </td>
                                    <td style={{padding: '10px'}}>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={trx.total_price || ''}
                                            onChange={(e) => handleFieldChange(index, 'total_price', parseFloat(e.target.value) || 0)}
                                            style={{width: '100%'}}
                                        />
                                    </td>
                                    <td style={{padding: '10px'}}>
                                        <select
                                            value={trx.status || 'A Pagar'}
                                            onChange={(e) => handleFieldChange(index, 'status', e.target.value)}
                                            style={{width: '100%'}}
                                        >
                                            <option value="Pago">Pago</option>
                                            <option value="A Pagar">A Pagar</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px'}}>
                    <button 
                        onClick={onClose}
                        style={{
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                    >
                        ✖ Cancelar
                    </button>
                    <button 
                        onClick={handleSaveAll}
                        style={{
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: '#28a745',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                    >
                        ✓ Salvar Todos ({editedTransactions.length})
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BatchEditModal;