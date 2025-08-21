import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../apiConfig';

const MigrationButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const executeMigration = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/migrate/feira`);
      setResult({ success: true, data: response.data });
      alert('✅ Migrações executadas com sucesso!');
    } catch (error) {
      setResult({ success: false, error: error.message });
      alert('❌ Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 9999,
      background: 'red',
      color: 'white',
      padding: '10px',
      borderRadius: '5px'
    }}>
      <button 
        onClick={executeMigration}
        disabled={loading}
        style={{
          background: loading ? '#666' : '#ff4444',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? '⏳ Executando...' : '🚀 EXECUTAR MIGRAÇÕES'}
      </button>
      
      {result && (
        <div style={{ marginTop: '10px', fontSize: '12px' }}>
          {result.success ? '✅ Sucesso!' : '❌ Erro!'}
        </div>
      )}
    </div>
  );
};

export default MigrationButton;