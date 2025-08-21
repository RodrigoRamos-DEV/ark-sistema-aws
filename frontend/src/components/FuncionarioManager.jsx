import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';
import API_URL from '../apiConfig';

const FuncionarioModal = ({ isOpen, onClose, funcionario, onSave }) => {
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    if (funcionario) {
      setFormData({ name: funcionario.name || '' });
    } else {
      setFormData({ name: '' });
    }
  }, [funcionario, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>
      <div style={{width: '90%', maxWidth: '400px', height: '80vh', overflowY: 'auto'}} className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3 style={{margin: 0}}>{funcionario ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer'}}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: '20px'}}>
            <label>Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nome do funcionário"
              required
            />
          </div>

          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888'}}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              {funcionario ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

function FuncionarioManager() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFuncionario, setEditingFuncionario] = useState(null);
    const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null });
    const [searchTerm, setSearchTerm] = useState('');

    const token = localStorage.getItem('token');

    const fetchFuncionarios = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/data/employees`, {
                headers: { 'x-auth-token': token }
            });
            setFuncionarios(response.data);
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
            toast.error('Erro ao carregar funcionários');
        } finally {
            setLoading(false);
        }
    };

    // useEffect: Este código roda automaticamente assim que o componente aparece na tela
    useEffect(() => {
        fetchFuncionarios();
    }, []); // O array vazio [] significa que ele só roda uma vez

    const handleSave = async (formData) => {
        try {
            if (editingFuncionario) {
                const response = await axios.put(
                    `${API_URL}/api/data/employees/${editingFuncionario.id}`,
                    formData,
                    { headers: { 'x-auth-token': token } }
                );
                setFuncionarios(prev => prev.map(f => f.id === editingFuncionario.id ? response.data : f));
                toast.success('Funcionário atualizado com sucesso!');
            } else {
                const response = await axios.post(
                    `${API_URL}/api/data/employees`,
                    formData,
                    { headers: { 'x-auth-token': token } }
                );
                setFuncionarios(prev => [...prev, response.data]);
                toast.success('Funcionário criado com sucesso!');
            }
            setModalOpen(false);
            setEditingFuncionario(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erro ao salvar funcionário');
        }
    };

    const handleEdit = (funcionario) => {
        setEditingFuncionario(funcionario);
        setModalOpen(true);
    };

    const handleDelete = (funcionarioId) => {
        setConfirmState({
            isOpen: true,
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_URL}/api/data/employees/${funcionarioId}`, {
                        headers: { 'x-auth-token': token }
                    });
                    setFuncionarios(prev => prev.filter(f => f.id !== funcionarioId));
                    toast.success('Funcionário excluído com sucesso!');
                    setConfirmState({ isOpen: false, onConfirm: null });
                } catch (error) {
                    toast.error('Erro ao excluir funcionário');
                    setConfirmState({ isOpen: false, onConfirm: null });
                }
            }
        });
    };

    if (loading) {
        return <p>Carregando funcionários...</p>;
    }

    const filteredFuncionarios = funcionarios.filter(funcionario =>
        funcionario.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false, onConfirm: null })}
                onConfirm={confirmState.onConfirm}
                title="Confirmar Exclusão"
            >
                Tem certeza que deseja excluir este funcionário?
            </ConfirmModal>

            <FuncionarioModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingFuncionario(null);
                }}
                funcionario={editingFuncionario}
                onSave={handleSave}
            />

            <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', gap: '15px'}}>
                <h3 style={{margin: 0}}>Funcionários</h3>
                <button 
                    className="btn"
                    onClick={() => setModalOpen(true)}
                >
                    Novo Funcionário
                </button>
            </div>

            <div style={{marginBottom: '20px'}}>
                <input
                    type="text"
                    placeholder="Buscar funcionários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{width: '100%', maxWidth: '300px'}}
                />
            </div>

            {loading ? (
                <p>Carregando funcionários...</p>
            ) : (
                <div style={{maxHeight: '500px', overflowY: 'auto'}}>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {filteredFuncionarios.map(funcionario => (
                            <li key={funcionario.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--cor-borda)' }}>
                                <span>{funcionario.name}</span>
                                <div>
                                    <button 
                                        onClick={() => handleEdit(funcionario)}
                                        style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px'}}
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(funcionario.id)}
                                        style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em'}}
                                        title="Excluir"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {filteredFuncionarios.length === 0 && (
                        <p style={{textAlign: 'center', padding: '20px'}}>Nenhum funcionário encontrado</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default FuncionarioManager;