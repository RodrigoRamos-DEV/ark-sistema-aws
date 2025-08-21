const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Rota para corrigir estrutura da tabela vendedores
router.get('/fix-vendedores-schema', async (req, res) => {
    try {
        console.log('Iniciando correção da estrutura da tabela vendedores...');
        
        // Verificar colunas existentes
        const columns = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'vendedores' 
            ORDER BY ordinal_position
        `);
        
        const existingColumns = columns.rows.map(col => col.column_name);
        console.log('Colunas existentes:', existingColumns);
        
        const results = [];
        
        // Adicionar coluna porcentagem se não existir
        if (!existingColumns.includes('porcentagem')) {
            await db.query(`
                ALTER TABLE vendedores 
                ADD COLUMN porcentagem DECIMAL(5,2) DEFAULT 0
            `);
            results.push('Coluna porcentagem adicionada');
        } else {
            results.push('Coluna porcentagem já existe');
        }
        
        // Adicionar coluna pix se não existir
        if (!existingColumns.includes('pix')) {
            await db.query(`
                ALTER TABLE vendedores 
                ADD COLUMN pix VARCHAR(255) DEFAULT ''
            `);
            results.push('Coluna pix adicionada');
        } else {
            results.push('Coluna pix já existe');
        }
        
        // Adicionar coluna endereco se não existir
        if (!existingColumns.includes('endereco')) {
            await db.query(`
                ALTER TABLE vendedores 
                ADD COLUMN endereco TEXT DEFAULT ''
            `);
            results.push('Coluna endereco adicionada');
        } else {
            results.push('Coluna endereco já existe');
        }
        
        // Adicionar coluna telefone se não existir
        if (!existingColumns.includes('telefone')) {
            await db.query(`
                ALTER TABLE vendedores 
                ADD COLUMN telefone VARCHAR(50) DEFAULT ''
            `);
            results.push('Coluna telefone adicionada');
        } else {
            results.push('Coluna telefone já existe');
        }
        
        // Adicionar coluna profit_share se não existir
        if (!existingColumns.includes('profit_share')) {
            await db.query(`
                ALTER TABLE vendedores 
                ADD COLUMN profit_share DECIMAL(12,2) DEFAULT 0
            `);
            results.push('Coluna profit_share adicionada');
        } else {
            results.push('Coluna profit_share já existe');
        }
        
        // Verificar estrutura final
        const finalColumns = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'vendedores' 
            ORDER BY ordinal_position
        `);
        
        res.json({
            success: true,
            message: 'Estrutura da tabela vendedores corrigida com sucesso!',
            results: results,
            finalStructure: finalColumns.rows
        });
        
    } catch (err) {
        console.error('Erro ao corrigir estrutura:', err.message);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack
        });
    }
});

module.exports = router;