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
  if (type === 'transactions') {
    headers = ['Data', 'Funcionário', 'Tipo', 'Descrição', 'Categoria', 'Quantidade', 'Valor Unitário', 'Status'];
  }
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers]);
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

// Import data
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    res.json({ 
      success: true, 
      imported: data.length,
      message: `${data.length} registros importados com sucesso` 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar arquivo' });
  }
});

module.exports = router;