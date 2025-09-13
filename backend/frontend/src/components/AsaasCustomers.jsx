import React, { useState } from 'react';
import asaasService from '../asaasService';

const AsaasCustomers = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    cpfCnpj: '',
    address: {
      postalCode: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: ''
    }
  });
  const [createdCustomer, setCreatedCustomer] = useState(null);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const result = await asaasService.createCustomer(newCustomer);
      setCreatedCustomer(result);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        cpfCnpj: '',
        address: {
          postalCode: '',
          street: '',
          number: '',
          complement: '',
          district: '',
          city: '',
          state: ''
        }
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes Asaas</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Novo Cliente
        </button>
      </div>

      {createdCustomer && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>Cliente criado com sucesso!</strong>
          <br />
          ID: {createdCustomer.id} | Nome: {createdCustomer.name}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Novo Cliente</h2>
          <form onSubmit={handleCreateCustomer} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nome completo"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
              className="border p-2 rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Telefone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="CPF/CNPJ"
              value={newCustomer.cpfCnpj}
              onChange={(e) => setNewCustomer({...newCustomer, cpfCnpj: e.target.value})}
              className="border p-2 rounded"
              required
            />
            
            <h3 className="col-span-2 text-md font-semibold mt-4 mb-2">Endereço</h3>
            
            <input
              type="text"
              placeholder="CEP"
              value={newCustomer.address.postalCode}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, postalCode: e.target.value}
              })}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Rua"
              value={newCustomer.address.street}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, street: e.target.value}
              })}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Número"
              value={newCustomer.address.number}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, number: e.target.value}
              })}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Complemento"
              value={newCustomer.address.complement}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, complement: e.target.value}
              })}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Bairro"
              value={newCustomer.address.district}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, district: e.target.value}
              })}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Cidade"
              value={newCustomer.address.city}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, city: e.target.value}
              })}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Estado"
              value={newCustomer.address.state}
              onChange={(e) => setNewCustomer({
                ...newCustomer, 
                address: {...newCustomer.address, state: e.target.value}
              })}
              className="border p-2 rounded"
            />
            
            <div className="col-span-2 flex gap-2 mt-4">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Criar Cliente
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
    </div>
  );
};

export default AsaasCustomers;