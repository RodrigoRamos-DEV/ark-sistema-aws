import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';
import API_URL from '../apiConfig';

const FornecedorModal = ({ isOpen, onClose, fornecedor, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    tipo_pessoa: 'PJ',
    cpf_cnpj: '',
    inscricao_estadual: '',
    ie_isento: false,
    inscricao_municipal: '',
    email: '',
    telefone: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_uf: '',
    endereco_cep: '',
    observacoes: ''
  });

  useEffect(() => {
    if (fornecedor) {
      setFormData({
        name: fornecedor.name || '',
        tipo_pessoa: fornecedor.tipo_pessoa || 'PJ',
        cpf_cnpj: fornecedor.cpf_cnpj || '',
        inscricao_estadual: fornecedor.inscricao_estadual || '',
        ie_isento: fornecedor.ie_isento || false,
        inscricao_municipal: fornecedor.inscricao_municipal || '',
        email: fornecedor.email || '',
        telefone: fornecedor.telefone || '',
        endereco_logradouro: fornecedor.endereco_logradouro || '',
        endereco_numero: fornecedor.endereco_numero || '',
        endereco_bairro: fornecedor.endereco_bairro || '',
        endereco_cidade: fornecedor.endereco_cidade || '',
        endereco_uf: fornecedor.endereco_uf || '',
        endereco_cep: fornecedor.endereco_cep || '',
        observacoes: fornecedor.observacoes || ''
      });
    } else {
      setFormData({
        name: '',
        tipo_pessoa: 'PJ',
        cpf_cnpj: '',
        inscricao_estadual: '',
        ie_isento: false,
        inscricao_municipal: '',
        email: '',
        telefone: '',
        endereco_logradouro: '',
        endereco_numero: '',
        endereco_bairro: '',
        endereco_cidade: '',
        endereco_uf: '',
        endereco_cep: '',
        observacoes: ''
      });
    }
  }, [fornecedor, isOpen]);

  const handleInputChange = async (field, value) => {
    if (field === 'endereco_cep') {
      const numbers = value.replace(/\D/g, '');
      const formatted = numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
      setFormData(prev => ({ ...prev, [field]: formatted }));
      
      if (numbers.length === 8) {
        try {
          const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
          const data = await response.json();
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              endereco_logradouro: data.logradouro || prev.endereco_logradouro,
              endereco_bairro: data.bairro || prev.endereco_bairro,
              endereco_cidade: data.localidade || prev.endereco_cidade,
              endereco_uf: data.uf || prev.endereco_uf
            }));
          }
        } catch (error) {
          console.log('Erro ao buscar CEP:', error);
        }
      }
    } else if (field === 'cpf_cnpj') {
      const numbers = value.replace(/\D/g, '');
      let formatted = '';
      if (numbers.length <= 11) {
        formatted = numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      } else {
        formatted = numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      setFormData(prev => ({ ...prev, [field]: formatted }));
      
      // Buscar dados do CNPJ
      if (numbers.length === 14) {
        try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numbers}`);
          const data = await response.json();
          if (data.cnpj) {
            setFormData(prev => ({
              ...prev,
              name: data.razao_social || data.nome_fantasia || prev.name,
              email: data.email || prev.email,
              telefone: data.ddd_telefone_1 || prev.telefone,
              endereco_logradouro: data.logradouro || prev.endereco_logradouro,
              endereco_numero: data.numero || prev.endereco_numero,
              endereco_bairro: data.bairro || prev.endereco_bairro,
              endereco_cidade: data.municipio || prev.endereco_cidade,
              endereco_uf: data.uf || prev.endereco_uf,
              endereco_cep: data.cep?.replace(/(\d{5})(\d{3})/, '$1-$2') || prev.endereco_cep
            }));
            toast.success('Dados do CNPJ carregados!');
          }
        } catch (error) {
          console.log('Erro ao buscar CNPJ:', error);
          toast.error('CNPJ não encontrado ou inválido');
        }
      }
    } else if (field === 'telefone') {
      const numbers = value.replace(/\D/g, '');
      const formatted = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      setFormData(prev => ({ ...prev, [field]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

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
      <div style={{width: '90%', maxWidth: '700px', height: '80vh', overflowY: 'auto'}} className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h3 style={{margin: 0}}>{fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer'}}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Nome/Razão Social *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div>
              <label>Tipo</label>
              <select
                value={formData.tipo_pessoa}
                onChange={(e) => setFormData({...formData, tipo_pessoa: e.target.value})}
              >
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>{formData.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}</label>
              <input
                type="text"
                value={formData.cpf_cnpj}
                onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>
            <div>
              <label>Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Inscrição Estadual</label>
              <input
                type="text"
                value={formData.inscricao_estadual}
                onChange={(e) => setFormData({...formData, inscricao_estadual: e.target.value})}
                placeholder="000.000.000.000"
                disabled={formData.ie_isento}
              />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px'}}>
              <input
                type="checkbox"
                id="ie_isento_forn"
                checked={formData.ie_isento}
                onChange={(e) => setFormData({...formData, ie_isento: e.target.checked, inscricao_estadual: e.target.checked ? '' : formData.inscricao_estadual})}
              />
              <label htmlFor="ie_isento_forn" style={{margin: 0}}>Isento de IE</label>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Inscrição Municipal</label>
              <input
                type="text"
                value={formData.inscricao_municipal}
                onChange={(e) => setFormData({...formData, inscricao_municipal: e.target.value})}
                placeholder="000000"
              />
            </div>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Logradouro</label>
              <input
                type="text"
                value={formData.endereco_logradouro}
                onChange={(e) => setFormData({...formData, endereco_logradouro: e.target.value})}
                placeholder="Rua, Avenida, etc."
              />
            </div>
            <div>
              <label>Número</label>
              <input
                type="text"
                value={formData.endereco_numero}
                onChange={(e) => setFormData({...formData, endereco_numero: e.target.value})}
                placeholder="123"
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Bairro</label>
              <input
                type="text"
                value={formData.endereco_bairro}
                onChange={(e) => setFormData({...formData, endereco_bairro: e.target.value})}
                placeholder="Centro"
              />
            </div>
            <div>
              <label>Cidade</label>
              <input
                type="text"
                value={formData.endereco_cidade}
                onChange={(e) => setFormData({...formData, endereco_cidade: e.target.value})}
                placeholder="São Paulo"
              />
            </div>
            <div>
              <label>UF</label>
              <select
                value={formData.endereco_uf}
                onChange={(e) => setFormData({...formData, endereco_uf: e.target.value})}
              >
                <option value="">Selecione</option>
                <option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option><option value="AM">AM</option>
                <option value="BA">BA</option><option value="CE">CE</option><option value="DF">DF</option><option value="ES">ES</option>
                <option value="GO">GO</option><option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option>
                <option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option><option value="PR">PR</option>
                <option value="PE">PE</option><option value="PI">PI</option><option value="RJ">RJ</option><option value="RN">RN</option>
                <option value="RS">RS</option><option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option>
                <option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option>
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>CEP</label>
              <input
                type="text"
                value={formData.endereco_cep}
                onChange={(e) => handleInputChange('endereco_cep', e.target.value)}
                placeholder="00000-000"
              />
            </div>
            <div>
              <label>Observações</label>
              <input
                type="text"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Informações adicionais"
              />
            </div>
          </div>

          <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888'}}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              {fornecedor ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

function FornecedorManager() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null });
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/data/items`, { 
        headers: { 'x-auth-token': token } 
      });
      setFornecedores(response.data.fornecedor || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingFornecedor) {
        const response = await axios.put(
          `${API_URL}/api/data/items/${editingFornecedor.id}`,
          { name: formData.name, ...formData },
          { headers: { 'x-auth-token': token } }
        );
        setFornecedores(prev => prev.map(f => f.id === editingFornecedor.id ? response.data : f));
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        const response = await axios.post(
          `${API_URL}/api/data/items`,
          { type: 'fornecedor', name: formData.name, ...formData },
          { headers: { 'x-auth-token': token } }
        );
        setFornecedores(prev => [...prev, response.data]);
        toast.success('Fornecedor criado com sucesso!');
      }
      setModalOpen(false);
      setEditingFornecedor(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar fornecedor');
    }
  };

  const handleEdit = (fornecedor) => {
    setEditingFornecedor(fornecedor);
    setModalOpen(true);
  };

  const handleDelete = (fornecedorId) => {
    setConfirmState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/data/items/${fornecedorId}`, {
            headers: { 'x-auth-token': token }
          });
          setFornecedores(prev => prev.filter(f => f.id !== fornecedorId));
          toast.success('Fornecedor excluído com sucesso!');
          setConfirmState({ isOpen: false, onConfirm: null });
        } catch (error) {
          toast.error('Erro ao excluir fornecedor');
          setConfirmState({ isOpen: false, onConfirm: null });
        }
      }
    });
  };

  const filteredFornecedores = fornecedores.filter(fornecedor =>
    fornecedor.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        title="Confirmar Exclusão"
      >
        Tem certeza que deseja excluir este fornecedor?
      </ConfirmModal>

      <FornecedorModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingFornecedor(null);
        }}
        fornecedor={editingFornecedor}
        onSave={handleSave}
      />

      <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', gap: '15px'}}>
        <h3 style={{margin: 0}}>Fornecedores</h3>
        <button 
          className="btn"
          onClick={() => setModalOpen(true)}
        >
          Novo Fornecedor
        </button>
      </div>

      <div style={{marginBottom: '20px'}}>
        <input
          type="text"
          placeholder="Buscar fornecedores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{width: '100%', maxWidth: '300px'}}
        />
      </div>

      {loading ? (
        <p>Carregando fornecedores...</p>
      ) : (
        <div style={{maxHeight: '500px', overflowY: 'auto'}}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filteredFornecedores.map(fornecedor => (
              <li key={fornecedor.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--cor-borda)' }}>
                <span>{fornecedor.name}</span>
                <div>
                  <button 
                    onClick={() => handleEdit(fornecedor)}
                    style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px'}}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(fornecedor.id)}
                    style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em'}}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {filteredFornecedores.length === 0 && (
            <p style={{textAlign: 'center', padding: '20px'}}>Nenhum fornecedor encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}

export default FornecedorManager;