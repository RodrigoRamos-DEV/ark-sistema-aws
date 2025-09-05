const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// Download template
router.get('/template/:type', auth, (req, res) => {
  const { type } = req.params;
  
  let headers = [];
  let sampleData = [];
  
  if (type === 'transactions') {
    headers = ['Data', 'Funcionário', 'Tipo', 'Produto/Compra', 'Cliente/Fornecedor', 'Quantidade', 'Valor Unitário', 'Status'];
    sampleData = [
      ['2024-01-15', 'João Silva', 'venda', 'Produto A', 'Cliente XYZ', '10', '25.50', 'Pago'],
      ['2024-01-16', 'Maria Santos', 'gasto', 'Material B', 'Fornecedor ABC', '5', '15.00', 'A Pagar']
    ];
  }
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=template_${type}.xlsx`);
  res.send(buffer);
});

// Export data
router.get('/export/:type', auth, async (req, res) => {
  const { type } = req.params;
  const { format = 'excel' } = req.query;
  
  try {
    const db = require('../config/db');
    let data = [];
    
    if (type === 'transactions') {
      const result = await db.query(`
        SELECT t.transaction_date, e.name as employee_name, t.type, t.description, 
               t.category, t.quantity, t.unit_price, t.total_price, t.status
        FROM transactions t
        JOIN employees e ON t.employee_id = e.id
        WHERE t.client_id = $1
        ORDER BY t.transaction_date DESC
      `, [req.user.clientId]);
      data = result.rows;
    }
    
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, type);
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export.xlsx`);
      res.send(buffer);
    } else {
      // CSV
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export.csv`);
      res.send(csv);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

// Função para encontrar ou criar funcionário
const findOrCreateEmployee = async (db, clientId, employeeName) => {
  if (!employeeName) throw new Error('Nome do funcionário é obrigatório');
  
  let result = await db.query('SELECT id FROM employees WHERE client_id = $1 AND name = $2', [clientId, employeeName]);
  
  if (result.rows.length === 0) {
    result = await db.query('INSERT INTO employees (client_id, name) VALUES ($1, $2) RETURNING id', [clientId, employeeName]);
  }
  
  return result.rows[0].id;
};

// Função para encontrar ou criar item (produto/compra/cliente/fornecedor)
const findOrCreateItem = async (db, clientId, itemName, itemType) => {
  if (!itemName) return null;
  
  let result = await db.query('SELECT id FROM items WHERE client_id = $1 AND name = $2 AND type = $3', [clientId, itemName, itemType]);
  
  if (result.rows.length === 0) {
    result = await db.query('INSERT INTO items (client_id, name, type) VALUES ($1, $2, $3) RETURNING id', [clientId, itemName, itemType]);
  }
  
  return result.rows[0].id;
};

// Import data
router.post('/import', auth, upload.single('file'), async (req, res) => {
  const db = require('../config/db');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'Arquivo vazio ou formato inválido' });
    }
    
    let imported = 0;
    let errors = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validar campos obrigatórios
        if (!row['Data'] || !row['Funcionário'] || !row['Tipo'] || !row['Produto/Compra'] || !row['Quantidade'] || !row['Valor Unitário']) {
          errors.push(`Linha ${i + 2}: Campos obrigatórios em falta`);
          continue;
        }
        
        // Processar data
        let transactionDate;
        if (typeof row['Data'] === 'number') {
          // Data do Excel (número serial)
          const excelDate = new Date((row['Data'] - 25569) * 86400 * 1000);
          transactionDate = excelDate.toISOString().split('T')[0];
        } else {
          // Data como string
          const dateStr = row['Data'].toString();
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            transactionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            transactionDate = dateStr;
          }
        }
        
        // Validar tipo
        const type = row['Tipo'].toLowerCase();
        if (!['venda', 'gasto'].includes(type)) {
          errors.push(`Linha ${i + 2}: Tipo deve ser 'venda' ou 'gasto'`);
          continue;
        }
        
        // Encontrar ou criar funcionário
        const employeeId = await findOrCreateEmployee(db, req.user.clientId, row['Funcionário']);
        
        // Encontrar ou criar produto/compra
        const productType = type === 'venda' ? 'produto' : 'compra';
        await findOrCreateItem(db, req.user.clientId, row['Produto/Compra'], productType);
        
        // Encontrar ou criar cliente/fornecedor
        let categoryName = null;
        if (row['Cliente/Fornecedor']) {
          const categoryType = type === 'venda' ? 'comprador' : 'fornecedor';
          await findOrCreateItem(db, req.user.clientId, row['Cliente/Fornecedor'], categoryType);
          categoryName = row['Cliente/Fornecedor'];
        }
        
        // Processar valores numéricos
        const quantity = parseFloat(row['Quantidade']) || 0;
        const unitPrice = parseFloat(row['Valor Unitário']) || 0;
        const totalPrice = quantity * unitPrice;
        const status = row['Status'] || 'A Pagar';
        
        // Inserir transação
        await db.query(`
          INSERT INTO transactions (client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [req.user.clientId, employeeId, type, transactionDate, row['Produto/Compra'], categoryName, quantity, unitPrice, totalPrice, status]);
        
        imported++;
      } catch (rowError) {
        errors.push(`Linha ${i + 2}: ${rowError.message}`);
      }
    }
    
    res.json({ 
      success: true, 
      imported,
      total: data.length,
      errors: errors.length > 0 ? errors : null,
      message: `${imported} de ${data.length} registros importados com sucesso${errors.length > 0 ? `. ${errors.length} erros encontrados.` : ''}` 
    });
    
  } catch (err) {
    console.error('Erro na importação:', err);
    res.status(500).json({ error: 'Erro ao processar arquivo: ' + err.message });
  }
});

module.exports = router;