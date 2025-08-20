import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import LoadingSpinner from './LoadingSpinner';

const ImportExport = ({ isOpen, onClose, type = 'transactions' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [exportFormat, setExportFormat] = useState('excel');

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('type', type);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/import`, formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${response.data.imported} registros importados com sucesso!`);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao importar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/export/${type}`, {
        headers: { 'x-auth-token': token },
        params: { format: exportFormat },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extension = exportFormat === 'excel' ? 'xlsx' : 'csv';
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Arquivo exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/template/${type}`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao baixar template');
    }
  };

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
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        width: '90%', 
        maxWidth: '600px', 
        backgroundColor: 'var(--cor-card)', 
        borderRadius: '12px', 
        padding: '30px',
        boxShadow: 'var(--sombra-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, color: 'var(--cor-primaria)' }}>
            📊 Importar/Exportar {type === 'transactions' ? 'Lançamentos' : 'Dados'}
          </h2>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {isLoading && <LoadingSpinner text="Processando..." />}

        {!isLoading && (
          <>
            {/* Seção de Importação */}
            <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: 'var(--cor-fundo)', borderRadius: '8px' }}>
              <h3 style={{ color: 'var(--cor-primaria)', marginBottom: '15px' }}>📥 Importar Dados</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <button 
                  onClick={downloadTemplate}
                  className="btn"
                  style={{ backgroundColor: '#17a2b8', width: 'auto', marginBottom: '10px' }}
                >
                  📋 Baixar Template
                </button>
                <small style={{ display: 'block', color: 'var(--cor-texto-label)' }}>
                  Baixe o template para ver o formato correto dos dados
                </small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Selecionar Arquivo (Excel ou CSV)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda)', borderRadius: '5px' }}
                />
              </div>

              <button 
                onClick={handleImport}
                disabled={!importFile}
                className="btn"
                style={{ backgroundColor: '#28a745', width: 'auto' }}
              >
                📥 Importar Dados
              </button>
            </div>

            {/* Seção de Exportação */}
            <div style={{ padding: '20px', backgroundColor: 'var(--cor-fundo)', borderRadius: '8px' }}>
              <h3 style={{ color: 'var(--cor-primaria)', marginBottom: '15px' }}>📤 Exportar Dados</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Formato de Exportação
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda)', borderRadius: '5px' }}
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </div>

              <button 
                onClick={handleExport}
                className="btn"
                style={{ backgroundColor: '#ffc107', color: '#000', width: 'auto' }}
              >
                📤 Exportar Dados
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button 
            onClick={onClose}
            className="btn"
            style={{ backgroundColor: '#6c757d', width: 'auto' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;