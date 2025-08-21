import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import { Icons } from './Icons';

function TransactionModal({ isOpen, onClose, onSave, transactionToEdit, initialType = 'venda', items, defaultEmployeeId, allTransactions }) {
    const [funcionarios, setFuncionarios] = useState([]);
    const [tipo, setTipo] = useState(initialType);
    const [rows, setRows] = useState([{
        employee_id: defaultEmployeeId || '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        quantity: '',
        unit_price: '',
        status: 'A Pagar'
    }]);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (isOpen) {
            setTipo(initialType);
            fetchFuncionarios();
            
            if (transactionToEdit) {
                setRows([{
                    employee_id: transactionToEdit.employee_id,
                    transaction_date: new Date(transactionToEdit.transaction_date).toISOString().split('T')[0],
                    description: transactionToEdit.description,
                    category: transactionToEdit.category || '',
                    quantity: transactionToEdit.quantity,
                    unit_price: transactionToEdit.unit_price,
                    status: transactionToEdit.status
                }]);
            } else {
                setRows([{
                    employee_id: defaultEmployeeId || '',
                    transaction_date: new Date().toISOString().split('T')[0],
                    description: '',
                    category: '',
                    quantity: '',
                    unit_price: '',
                    status: 'A Pagar'
                }]);
            }
        }
    }, [isOpen, initialType, transactionToEdit, defaultEmployeeId]);

    const fetchFuncionarios = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/data/employees`, {
                headers: { 'x-auth-token': token }
            });
            setFuncionarios(response.data);
            
            if (response.data.length > 0 && !rows[0]?.employee_id && !transactionToEdit) {
                setRows(prev => [{ ...prev[0], employee_id: response.data[0].id }]);
            }
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
        }
    };

    const handleChange = (index, e) => {
        const { name, value } = e.target;
        const newRows = [...rows];
        newRows[index][name] = value;
        setRows(newRows);
    };

    const handleBlur = (index, field) => {
        const currentRow = rows[index];
        
        // Se preencheu produto e cliente/fornecedor, buscar último preço
        if (field === 'category' && currentRow.description && currentRow.category && allTransactions && !currentRow.unit_price) {
            const lastTransaction = allTransactions
                .filter(t => 
                    t.description === currentRow.description && 
                    t.category === currentRow.category &&
                    t.type === tipo
                )
                .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0];
            
            if (lastTransaction) {
                const newRows = [...rows];
                newRows[index].unit_price = lastTransaction.unit_price;
                setRows(newRows);
                toast.info(`Preço preenchido automaticamente: R$ ${parseFloat(lastTransaction.unit_price).toFixed(2)}`);
            }
        }
    };

    const addRow = () => {
        const lastRow = rows[rows.length - 1];
        setRows([...rows, {
            employee_id: lastRow.employee_id,
            transaction_date: lastRow.transaction_date,
            description: '',
            category: '',
            quantity: '',
            unit_price: '',
            status: 'A Pagar'
        }]);
    };

    const removeRow = (index) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (transactionToEdit) {
                const transactionData = {
                    ...rows[0],
                    type: tipo,
                    quantity: parseFloat(rows[0].quantity),
                    unit_price: parseFloat(rows[0].unit_price)
                };
                const response = await axios.put(
                    `${API_URL}/api/data/transactions/${transactionToEdit.id}`,
                    transactionData,
                    { headers: { 'x-auth-token': token } }
                );
                onSave(response.data, true);
                toast.success('Lançamento atualizado com sucesso!');
            } else {
                for (const row of rows) {
                    const transactionData = {
                        ...row,
                        type: tipo,
                        quantity: parseFloat(row.quantity),
                        unit_price: parseFloat(row.unit_price)
                    };
                    await axios.post(
                        `${API_URL}/api/data/transactions`,
                        transactionData,
                        { headers: { 'x-auth-token': token } }
                    );
                }
                onSave();
                toast.success(`${rows.length} lançamento(s) criado(s) com sucesso!`);
            }
            
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erro ao salvar lançamento');
        }
    };

    if (!isOpen) return null;

    const clientesList = tipo === 'venda' ? (items.comprador || []) : (items.fornecedor || []);

    return (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px'}}>
            <div style={{width: '100%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto'}} className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3 style={{margin: 0}}>
                        {transactionToEdit ? 'Editar' : 'Nova'} {tipo === 'venda' ? 'Venda' : 'Compra'}
                    </h3>
                    <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5em'}}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Cabeçalhos - Desktop */}
                    <div className="desktop-only" style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1.5fr 1.5fr 1fr 1fr 1fr 0.5fr', gap: '10px', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em', color: 'var(--cor-texto-label)'}}>
                        <div>Funcionário *</div>
                        <div>Data *</div>
                        <div>Qtd *</div>
                        <div>{tipo === 'venda' ? 'Produto' : 'Compra'} *</div>
                        <div>{tipo === 'venda' ? 'Cliente' : 'Fornecedor'}</div>
                        <div>Vlr Unit. *</div>
                        <div>Total</div>
                        <div>Status *</div>
                        <div>Ação</div>
                    </div>
                    
                    {/* Linhas de dados */}
                    {rows.map((row, index) => (
                        <div key={index}>
                            {/* Layout Desktop */}
                            <div className="desktop-only" style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1.5fr 1.5fr 1fr 1fr 1fr 0.5fr', gap: '10px', marginBottom: '10px', padding: '10px', border: '1px solid var(--cor-borda)', borderRadius: '5px', backgroundColor: 'var(--cor-card)'}}>
                                <select name="employee_id" value={row.employee_id} onChange={(e) => handleChange(index, e)} required>
                                    <option value="">Selecione</option>
                                    {funcionarios.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                                </select>
                                <input type="date" name="transaction_date" value={row.transaction_date} onChange={(e) => handleChange(index, e)} required />
                                <input type="number" step="0.01" name="quantity" value={row.quantity} onChange={(e) => handleChange(index, e)} placeholder="0" required />
                                <input type="text" name="description" value={row.description} onChange={(e) => handleChange(index, e)} placeholder="Digite ou selecione" list="produtos-list" required />
                                <input type="text" name="category" value={row.category} onChange={(e) => handleChange(index, e)} onBlur={() => handleBlur(index, 'category')} placeholder="Digite ou selecione" list="clientes-list" />
                                <input type="number" step="0.01" name="unit_price" value={row.unit_price} onChange={(e) => handleChange(index, e)} placeholder="0,00" required />
                                <input type="text" value={`R$ ${((parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0)).toFixed(2)}`} disabled style={{backgroundColor: 'var(--cor-fundo)', color: 'var(--cor-texto)'}} />
                                <select name="status" value={row.status} onChange={(e) => handleChange(index, e)} required>
                                    <option value="A Pagar">A Pagar</option>
                                    <option value="Pago">Pago</option>
                                </select>
                                {!transactionToEdit && (<button type="button" onClick={() => removeRow(index)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-erro)', fontSize: '1.2em'}}>🗑️</button>)}
                            </div>
                            
                            {/* Layout Mobile */}
                            <div className="mobile-only" style={{marginBottom: '15px', padding: '15px', border: '1px solid var(--cor-borda)', borderRadius: '8px', backgroundColor: 'var(--cor-card)'}}>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px'}}>
                                    <div><label style={{fontSize: '0.8em', fontWeight: 'bold'}}>Funcionário *</label>
                                        <select name="employee_id" value={row.employee_id} onChange={(e) => handleChange(index, e)} required style={{width: '100%'}}>
                                            <option value="">Selecione</option>
                                            {funcionarios.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                                        </select>
                                    </div>
                                    <div><label style={{fontSize: '0.8em', fontWeight: 'bold'}}>Data *</label>
                                        <input type="date" name="transaction_date" value={row.transaction_date} onChange={(e) => handleChange(index, e)} required style={{width: '100%'}} />
                                    </div>
                                </div>
                                <div style={{marginBottom: '10px'}}>
                                    <label style={{fontSize: '0.8em', fontWeight: 'bold'}}>{tipo === 'venda' ? 'Produto' : 'Compra'} *</label>
                                    <input type="text" name="description" value={row.description} onChange={(e) => handleChange(index, e)} placeholder="Digite ou selecione" list="produtos-list" required style={{width: '100%'}} />
                                </div>
                                <div style={{marginBottom: '10px'}}>
                                    <label style={{fontSize: '0.8em', fontWeight: 'bold'}}>{tipo === 'venda' ? 'Cliente' : 'Fornecedor'}</label>
                                    <input type="text" name="category" value={row.category} onChange={(e) => handleChange(index, e)} onBlur={() => handleBlur(index, 'category')} placeholder="Digite ou selecione" list="clientes-list" style={{width: '100%'}} />
                                </div>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px'}}>
                                    <div><label style={{fontSize: '0.8em', fontWeight: 'bold'}}>Qtd *</label>
                                        <input type="number" step="0.01" name="quantity" value={row.quantity} onChange={(e) => handleChange(index, e)} placeholder="0" required style={{width: '100%'}} />
                                    </div>
                                    <div><label style={{fontSize: '0.8em', fontWeight: 'bold'}}>Vlr Unit. *</label>
                                        <input type="number" step="0.01" name="unit_price" value={row.unit_price} onChange={(e) => handleChange(index, e)} placeholder="0,00" required style={{width: '100%'}} />
                                    </div>
                                    <div><label style={{fontSize: '0.8em', fontWeight: 'bold'}}>Status *</label>
                                        <select name="status" value={row.status} onChange={(e) => handleChange(index, e)} required style={{width: '100%'}}>
                                            <option value="A Pagar">A Pagar</option>
                                            <option value="Pago">Pago</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <div><strong>Total: R$ {((parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0)).toFixed(2)}</strong></div>
                                    {!transactionToEdit && (<button type="button" onClick={() => removeRow(index)} style={{background: 'var(--cor-erro)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer'}}>🗑️ Remover</button>)}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {!transactionToEdit && (
                        <button 
                            type="button" 
                            onClick={addRow} 
                            className="btn" 
                            style={{width: 'auto', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px'}}
                        >
                            ➕ Adicionar Linha
                        </button>
                    )}
                    
                    <datalist id="produtos-list">
                        {(items.produto || []).map(produto => (
                            <option key={produto.id} value={produto.name} />
                        ))}
                    </datalist>
                    <datalist id="clientes-list">
                        {clientesList.map(cliente => (
                            <option key={cliente.id} value={cliente.name} />
                        ))}
                    </datalist>

                    <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                        <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888'}}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn">
                            {transactionToEdit ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TransactionModal;

// CSS responsivo
const style = document.createElement('style');
style.textContent = `
    .desktop-only {
        display: block;
    }
    .mobile-only {
        display: none;
    }
    
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
        .mobile-only {
            display: block !important;
        }
    }
`;
if (!document.head.querySelector('style[data-transaction-modal]')) {
    style.setAttribute('data-transaction-modal', 'true');
    document.head.appendChild(style);
}