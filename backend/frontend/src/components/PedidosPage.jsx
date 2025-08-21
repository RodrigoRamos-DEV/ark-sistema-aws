import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';

const PedidosPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/data/pedidos`, {
        headers: { 'x-auth-token': token }
      });
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (pedidoId) => {
    try {
      const response = await axios.get(`${API_URL}/api/data/pedidos/${pedidoId}`, {
        headers: { 'x-auth-token': token }
      });
      setSelectedPedido(response.data);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do pedido');
    }
  };

  const handlePrint = (pedido) => {
    const printWindow = window.open('', '_blank');
    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido ${pedido.numero_pedido}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; font-size: 1.2em; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${pedido.tipo === 'venda' ? 'PEDIDO DE VENDA' : 'PEDIDO DE COMPRA'}</h1>
          <h2>Nº ${pedido.numero_pedido}</h2>
        </div>
        
        <div class="info">
          <div>
            <strong>${pedido.tipo === 'venda' ? 'Cliente:' : 'Fornecedor:'}</strong> ${pedido.cliente_fornecedor}<br>
            <strong>Funcionário:</strong> ${pedido.employee_name}<br>
            <strong>Data do Pedido:</strong> ${new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
          </div>
          <div>
            <strong>Status:</strong> ${pedido.status}<br>
            ${pedido.data_entrega ? `<strong>Data de Entrega:</strong> ${new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}<br>` : ''}
            <strong>Total:</strong> ${formatCurrency(pedido.total)}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Preço Unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${pedido.itens.map(item => `
              <tr>
                <td>${item.produto_nome}</td>
                <td>${item.quantidade}</td>
                <td>${formatCurrency(item.preco_unitario)}</td>
                <td>${formatCurrency(item.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="total">TOTAL:</td>
              <td class="total">${formatCurrency(pedido.total)}</td>
            </tr>
          </tfoot>
        </table>

        ${pedido.observacoes ? `<p><strong>Observações:</strong> ${pedido.observacoes}</p>` : ''}
        
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px;">Imprimir</button>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <h2>Pedidos</h2>
      </div>

      {loading ? (
        <p>Carregando pedidos...</p>
      ) : (
        <div className="card">
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{backgroundColor: 'var(--cor-fundo)', borderBottom: '2px solid var(--cor-borda)'}}>
                <th style={{padding: '10px', textAlign: 'left'}}>Número</th>
                <th style={{padding: '10px', textAlign: 'left'}}>Tipo</th>
                <th style={{padding: '10px', textAlign: 'left'}}>Cliente/Fornecedor</th>
                <th style={{padding: '10px', textAlign: 'left'}}>Funcionário</th>
                <th style={{padding: '10px', textAlign: 'left'}}>Data</th>
                <th style={{padding: '10px', textAlign: 'right'}}>Total</th>
                <th style={{padding: '10px', textAlign: 'center'}}>Itens</th>
                <th style={{padding: '10px', textAlign: 'center'}}>Status</th>
                <th style={{padding: '10px', textAlign: 'center'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(pedido => (
                <tr key={pedido.id} style={{borderBottom: '1px solid var(--cor-borda)'}}>
                  <td style={{padding: '10px'}}>{pedido.numero_pedido}</td>
                  <td style={{padding: '10px'}}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: pedido.tipo === 'venda' ? '#28a74520' : '#dc354520',
                      color: pedido.tipo === 'venda' ? '#28a745' : '#dc3545'
                    }}>
                      {pedido.tipo === 'venda' ? 'Venda' : 'Compra'}
                    </span>
                  </td>
                  <td style={{padding: '10px'}}>{pedido.cliente_fornecedor}</td>
                  <td style={{padding: '10px'}}>{pedido.employee_name}</td>
                  <td style={{padding: '10px'}}>{new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}</td>
                  <td style={{padding: '10px', textAlign: 'right'}}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.total)}
                  </td>
                  <td style={{padding: '10px', textAlign: 'center'}}>{pedido.total_itens}</td>
                  <td style={{padding: '10px', textAlign: 'center'}}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: '#007bff20',
                      color: '#007bff'
                    }}>
                      {pedido.status}
                    </span>
                  </td>
                  <td style={{padding: '10px', textAlign: 'center'}}>
                    <button 
                      onClick={() => handleViewDetails(pedido.id)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px'}}
                      title="Ver detalhes"
                    >
                      👁️
                    </button>
                    <button 
                      onClick={() => handlePrint(selectedPedido || pedido)}
                      style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em'}}
                      title="Imprimir"
                    >
                      🖨️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {pedidos.length === 0 && (
            <p style={{textAlign: 'center', padding: '20px'}}>Nenhum pedido encontrado</p>
          )}
        </div>
      )}

      {selectedPedido && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div style={{width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'}} className="card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3>Detalhes do Pedido {selectedPedido.numero_pedido}</h3>
              <button onClick={() => setSelectedPedido(null)} style={{background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer'}}>×</button>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
              <div>
                <p><strong>{selectedPedido.tipo === 'venda' ? 'Cliente:' : 'Fornecedor:'}</strong> {selectedPedido.cliente_fornecedor}</p>
                <p><strong>Funcionário:</strong> {selectedPedido.employee_name}</p>
                <p><strong>Data do Pedido:</strong> {new Date(selectedPedido.data_pedido).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p><strong>Status:</strong> {selectedPedido.status}</p>
                {selectedPedido.data_entrega && <p><strong>Data de Entrega:</strong> {new Date(selectedPedido.data_entrega).toLocaleDateString('pt-BR')}</p>}
                <p><strong>Total:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedPedido.total)}</p>
              </div>
            </div>

            <h4>Itens do Pedido</h4>
            <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '20px'}}>
              <thead>
                <tr style={{backgroundColor: 'var(--cor-fundo)'}}>
                  <th style={{padding: '8px', textAlign: 'left'}}>Produto</th>
                  <th style={{padding: '8px', textAlign: 'center'}}>Qtd</th>
                  <th style={{padding: '8px', textAlign: 'right'}}>Preço Unit.</th>
                  <th style={{padding: '8px', textAlign: 'right'}}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedPedido.itens?.map((item, index) => (
                  <tr key={index} style={{borderBottom: '1px solid var(--cor-borda)'}}>
                    <td style={{padding: '8px'}}>{item.produto_nome}</td>
                    <td style={{padding: '8px', textAlign: 'center'}}>{item.quantidade}</td>
                    <td style={{padding: '8px', textAlign: 'right'}}>R$ {parseFloat(item.preco_unitario).toFixed(2)}</td>
                    <td style={{padding: '8px', textAlign: 'right'}}>R$ {parseFloat(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedPedido.observacoes && (
              <div style={{marginBottom: '20px'}}>
                <strong>Observações:</strong>
                <p>{selectedPedido.observacoes}</p>
              </div>
            )}

            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
              <button onClick={() => handlePrint(selectedPedido)} className="btn">
                🖨️ Imprimir Pedido
              </button>
              <button onClick={() => setSelectedPedido(null)} className="btn" style={{backgroundColor: '#888'}}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosPage;