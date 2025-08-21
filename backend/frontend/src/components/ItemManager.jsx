import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';
import API_URL from '../apiConfig'; // <-- ADICIONADO

function ItemManager({ itemType, title }) {
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null });

    const ITEMS_API_URL = `${API_URL}/api/data/items`; // <-- ADICIONADO para simplificar
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const response = await axios.get(ITEMS_API_URL, { headers: { 'x-auth-token': token } }); // <-- ALTERADO
                setItems(response.data[itemType] || []);
            } catch (error) {
                console.error(`Erro ao buscar ${itemType}:`, error);
                toast.error(`Erro ao carregar ${title}`);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [itemType]);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        try {
            const response = await axios.post(ITEMS_API_URL, { type: itemType, name: newItemName }, { headers: { 'x-auth-token': token } }); // <-- ALTERADO
            setItems(prev => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewItemName('');
            toast.success(`${title.slice(0, -1)} adicionado com sucesso!`);
        } catch (error) {
            toast.error(error.response?.data?.error || `Erro ao adicionar ${title}`);
        }
    };

    const handleStartEdit = (item) => {
        setEditingItem(item);
        setEditingName(item.name);
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditingName('');
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        if (!editingName.trim() || !editingItem) return;
        try {
            const response = await axios.put(`${ITEMS_API_URL}/${editingItem.id}`, // <-- ALTERADO
                { name: editingName },
                { headers: { 'x-auth-token': token } }
            );
            setItems(prev => prev.map(item => item.id === editingItem.id ? response.data : item).sort((a, b) => a.name.localeCompare(b.name)));
            handleCancelEdit();
            toast.success(`Item atualizado com sucesso!`);
        } catch (error) {
            toast.error(error.response?.data?.error || `Erro ao atualizar ${title}`);
        }
    };

    const handleDeleteItem = (itemId) => {
        setConfirmState({
            isOpen: true,
            onConfirm: async () => {
                try {
                    await axios.delete(`${ITEMS_API_URL}/${itemId}`, { headers: { 'x-auth-token': token } }); // <-- ALTERADO
                    setItems(prev => prev.filter(item => item.id !== itemId));
                    toast.success(`Item excluído com sucesso!`);
                    setConfirmState({ isOpen: false, onConfirm: null });
                } catch (error) {
                    toast.error(error.response?.data?.error || `Erro ao excluir ${title}`);
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
                Você tem certeza que deseja excluir este item?
            </ConfirmModal>

            <h3>{title}</h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={`Nome do novo ${title.slice(0, -1).toLowerCase()}`}
                />
                <button type="submit" className="btn" style={{ width: 'auto' }}>Adicionar</button>
            </form>

            {loading ? <p>Carregando...</p> : (
                <ul style={{ listStyle: 'none', padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
                    {items.map(item => (
                        <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--cor-borda)' }}>
                            {editingItem && editingItem.id === item.id ? (
                                <form onSubmit={handleUpdateItem} style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        style={{ flexGrow: 1 }}
                                        autoFocus
                                    />
                                    <button type="submit" className="btn" style={{ width: 'auto' }}>Salvar</button>
                                    <button type="button" onClick={handleCancelEdit} className="btn" style={{ width: 'auto', backgroundColor: '#888' }}>Cancelar</button>
                                </form>
                            ) : (
                                <>
                                    <span>{item.name}</span>
                                    <div>
                                        <button onClick={() => handleStartEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px' }} title="Editar">✏️</button>
                                        <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Excluir">🗑️</button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ItemManager;