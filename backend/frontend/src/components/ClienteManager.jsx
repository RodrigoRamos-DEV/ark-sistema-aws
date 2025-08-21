import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';
import API_URL from '../apiConfig';
import { Icons } from './Icons';

const ClienteModal = ({ isOpen, onClose, cliente, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    tipo_pessoa: 'PF',
    userType: 'produtor',
    cpf_cnpj: '',
    inscricao_estadual: '',
    ie_isento: false,
    inscricao_municipal: '',
    email: '',
    telefone: '',
    whatsapp: '',
    endereco_logradouro: '',
    endereco_numero: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_uf: '',
    endereco_cep: '',
    observacoes: ''
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        name: cliente.name || '',
        tipo_pessoa: cliente.tipo_pessoa || 'PF',
        userType: cliente.userType || 'produtor',
        cpf_cnpj: cliente.cpf_cnpj || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        ie_isento: cliente.ie_isento || false,
        inscricao_municipal: cliente.inscricao_municipal || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        whatsapp: cliente.whatsapp || '',
        endereco_logradouro: cliente.endereco_logradouro || '',
        endereco_numero: cliente.endereco_numero || '',
        endereco_bairro: cliente.endereco_bairro || '',
        endereco_cidade: cliente.endereco_cidade || '',
        endereco_uf: cliente.endereco_uf || '',
        endereco_cep: cliente.endereco_cep || '',
        observacoes: cliente.observacoes || ''
      });
    } else {
      setFormData({
        name: '',
        tipo_pessoa: 'PF',
        userType: 'produtor',
        cpf_cnpj: '',
        inscricao_estadual: '',
        ie_isento: false,
        inscricao_municipal: '',
        email: '',
        telefone: '',
        whatsapp: '',
        endereco_logradouro: '',
        endereco_numero: '',
        endereco_bairro: '',
        endereco_cidade: '',
        endereco_uf: '',
        endereco_cep: '',
        observacoes: ''
      });
    }
  }, [cliente, isOpen]);

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
    } else if (field === 'telefone' || field === 'whatsapp') {
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
          <h3 style={{margin: 0}}>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'}}>
            <Icons.Cancel />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px'}}>
            <div>
              <label>Nome/Razão Social *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div>
              <label>Tipo Pessoa</label>
              <select
                value={formData.tipo_pessoa}
                onChange={(e) => setFormData({...formData, tipo_pessoa: e.target.value})}
              >
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px'}}>
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
            <div>
              <label>WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
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
                id="ie_isento"
                checked={formData.ie_isento}
                onChange={(e) => setFormData({...formData, ie_isento: e.target.checked, inscricao_estadual: e.target.checked ? '' : formData.inscricao_estadual})}
              />
              <label htmlFor="ie_isento" style={{margin: 0}}>Isento de IE</label>
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
            <button type="button" onClick={onClose} className="btn" style={{backgroundColor: '#888', display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Icons.Cancel /> Cancelar
            </button>
            <button type="submit" className="btn" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Icons.Save /> {cliente ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

function ClienteManager() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null });
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/data/items`, { 
        headers: { 'x-auth-token': token } 
      });
      setClientes(response.data.comprador || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingCliente) {
        const response = await axios.put(
          `${API_URL}/api/data/items/${editingCliente.id}`,
          { name: formData.name, ...formData },
          { headers: { 'x-auth-token': token } }
        );
        setClientes(prev => prev.map(c => c.id === editingCliente.id ? response.data : c));
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const response = await axios.post(
          `${API_URL}/api/data/items`,
          { type: 'comprador', name: formData.name, ...formData },
          { headers: { 'x-auth-token': token } }
        );
        setClientes(prev => [...prev, response.data]);
        toast.success('Cliente criado com sucesso!');
      }
      setModalOpen(false);
      setEditingCliente(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setModalOpen(true);
  };

  const handleDelete = (clienteId) => {
    setConfirmState({
      isOpen: true,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/api/data/items/${clienteId}`, {
            headers: { 'x-auth-token': token }
          });
          setClientes(prev => prev.filter(c => c.id !== clienteId));
          toast.success('Cliente excluído com sucesso!');
          setConfirmState({ isOpen: false, onConfirm: null });
        } catch (error) {
          toast.error('Erro ao excluir cliente');
          setConfirmState({ isOpen: false, onConfirm: null });
        }
      }
    });
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        title="Confirmar Exclusão"
      >
        Tem certeza que deseja excluir este cliente?
      </ConfirmModal>

      <ClienteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCliente(null);
        }}
        cliente={editingCliente}
        onSave={handleSave}
      />

      <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', gap: '15px'}}>
        <h3 style={{margin: 0}}>Clientes</h3>
        <button 
          className="btn"
          onClick={() => setModalOpen(true)}
          style={{display: 'flex', alignItems: 'center', gap: '6px'}}
        >
          <Icons.Plus /> Novo Cliente
        </button>
      </div>

      <div style={{marginBottom: '20px'}}>
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{width: '100%', maxWidth: '300px'}}
        />
      </div>

      {loading ? (
        <p>Carregando clientes...</p>
      ) : (
        <div style={{maxHeight: '500px', overflowY: 'auto'}}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filteredClientes.map(cliente => (
              <li key={cliente.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--cor-borda)' }}>
                <div>
                  <span>{cliente.name}</span>
                </div>
                <div>
                  <button 
                    onClick={() => handleEdit(cliente)}
                    style={{background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px', padding: '4px', display: 'flex', alignItems: 'center'}}
                    title="Editar"
                  >
                    <Icons.Edit />
                  </button>
                  <button 
                    onClick={() => handleDelete(cliente.id)}
                    style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--cor-erro)'}}
                    title="Excluir"
                  >
                    <Icons.Delete />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {filteredClientes.length === 0 && (
            <p style={{textAlign: 'center', padding: '20px'}}>Nenhum cliente encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ClienteManager;