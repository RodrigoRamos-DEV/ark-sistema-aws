import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const TrendChart = ({ transactions, filters }) => {
  const chartData = useMemo(() => {
    // Agrupar por data
    const dataMap = {};
    
    transactions.forEach(t => {
      const date = new Date(t.transaction_date).toLocaleDateString('pt-BR');
      if (!dataMap[date]) {
        dataMap[date] = { vendas: 0, compras: 0 };
      }
      
      if (t.type === 'venda') {
        dataMap[date].vendas += parseFloat(t.total_price);
      } else {
        dataMap[date].compras += parseFloat(t.total_price);
      }
    });

    // Ordenar por data
    const sortedDates = Object.keys(dataMap).sort((a, b) => {
      const dateA = a.split('/').reverse().join('-');
      const dateB = b.split('/').reverse().join('-');
      return dateA.localeCompare(dateB);
    });

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Vendas',
          data: sortedDates.map(date => dataMap[date].vendas),
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Compras',
          data: sortedDates.map(date => dataMap[date].compras),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
  }, [transactions]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Tendência Diária - Vendas vs Compras'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            }).format(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

  return (
    <div className="card">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default TrendChart;