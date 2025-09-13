import React, { useState } from 'react';
import AsaasDashboard from './AsaasDashboard';
import AsaasCustomers from './AsaasCustomers';
import AsaasPayments from './AsaasPayments';

const AsaasPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'customers', label: 'Clientes', icon: '👥' },
    { id: 'payments', label: 'Cobranças', icon: '💰' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AsaasDashboard />;
      case 'customers':
        return <AsaasCustomers />;
      case 'payments':
        return <AsaasPayments />;
      default:
        return <AsaasDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default AsaasPage;