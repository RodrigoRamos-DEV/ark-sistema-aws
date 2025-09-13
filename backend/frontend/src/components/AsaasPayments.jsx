import React, { useState, useEffect } from 'react';
import asaasService from '../asaasService';

const AsaasPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    customer: '',
    billingType: 'BOLETO',
    value: '',
    dueDate: '',
    description: ''
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await asaasService.getPayments();
      setPayments(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    }
    setLoading(false);
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await asaasService.createPayment(newPayment);
      setNewPayment({
        customer: '',
        billingType: 'BOLETO',
        value: '',
        dueDate: '',
        description: ''
      });
      setShowCreateForm(false);
      loadPayments();
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      RECEIVED: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CONFIRMED: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cobranças Asaas</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Nova Cobrança
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Nova Cobrança</h2>
          <form onSubmit={handleCreatePayment} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="ID do Cliente"
              value={newPayment.customer}
              onChange={(e) => setNewPayment({...newPayment, customer: e.target.value})}
              className="border p-2 rounded"
              required
            />
            <select
              value={newPayment.billingType}
              onChange={(e) => setNewPayment({...newPayment, billingType: e.target.value})}
              className="border p-2 rounded"
            >
              <option value="BOLETO">Boleto</option>
              <option value="PIX">PIX</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={newPayment.value}
              onChange={(e) => setNewPayment({...newPayment, value: e.target.value})}
              className="border p-2 rounded"
              required
            />
            <input
              type="date"
              value={newPayment.dueDate}
              onChange={(e) => setNewPayment({...newPayment, dueDate: e.target.value})}
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              placeholder="Descrição"
              value={newPayment.description}
              onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
              className="border p-2 rounded col-span-2"
            />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center">Carregando...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Valor</th>
                <th className="px-4 py-2 text-left">Vencimento</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="px-4 py-2">{payment.id}</td>
                  <td className="px-4 py-2">{payment.customer}</td>
                  <td className="px-4 py-2">R$ {payment.value}</td>
                  <td className="px-4 py-2">{payment.dueDate}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{payment.billingType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AsaasPayments;