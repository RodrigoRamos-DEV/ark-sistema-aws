import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null; // Não mostra a paginação se houver apenas uma página
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '20px', gap: '10px' }}>
      <button className="btn" onClick={handlePrevious} disabled={currentPage === 1} style={{ width: 'auto' }}>
        Anterior
      </button>
      <span>
        Página {currentPage} de {totalPages}
      </span>
      <button className="btn" onClick={handleNext} disabled={currentPage === totalPages} style={{ width: 'auto' }}>
        Próxima
      </button>
    </div>
  );
}

export default Pagination;