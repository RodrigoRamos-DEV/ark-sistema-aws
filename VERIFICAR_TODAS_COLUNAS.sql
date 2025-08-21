-- =====================================================
-- VERIFICAR TODAS AS COLUNAS QUE O SISTEMA PRECISA
-- =====================================================

-- Criar uma tabela temporária com todas as colunas que o código espera
CREATE TEMP TABLE expected_columns (
    table_name VARCHAR(50),
    column_name VARCHAR(50),
    data_type VARCHAR(50),
    is_required BOOLEAN DEFAULT false
);

-- Inserir todas as colunas que o sistema ARK precisa
INSERT INTO expected_columns VALUES
-- Tabela users
('users', 'id', 'uuid', true),
('users', 'name', 'varchar', true),
('users', 'email', 'varchar', true),
('users', 'password', 'varchar', true),
('users', 'company_name', 'varchar', false),
('users', 'contact_phone', 'varchar', false),
('users', 'address', 'text', false),
('users', 'logo_url', 'varchar', false),
('users', 'role', 'varchar', false),
('users', 'client_type', 'varchar', false),
('users', 'license_expires_at', 'timestamp', false),
('users', 'created_at', 'timestamp', false),
('users', 'updated_at', 'timestamp', false),
('users', 'ativo', 'boolean', false),
('users', 'codigo', 'varchar', false),
('users', 'website', 'varchar', false),
('users', 'pix', 'varchar', false),
('users', 'client_id', 'uuid', false),

-- Tabela clients
('clients', 'id', 'uuid', true),
('clients', 'name', 'varchar', true),
('clients', 'email', 'varchar', false),
('clients', 'phone', 'varchar', false),
('clients', 'address', 'text', false),
('clients', 'user_id', 'uuid', false),
('clients', 'vendedor_id', 'uuid', false),
('clients', 'partner_id', 'uuid', false),
('clients', 'client_type', 'varchar', false),
('clients', 'created_at', 'timestamp', false),
('clients', 'updated_at', 'timestamp', false),
('clients', 'ativo', 'boolean', false),
('clients', 'codigo', 'varchar', false),
('clients', 'website', 'varchar', false),
('clients', 'pix', 'varchar', false),
('clients', 'logo_backup_path', 'varchar', false),
('clients', 'cpf_cnpj', 'varchar', false),
('clients', 'birth_date', 'date', false),
('clients', 'notes', 'text', false),
('clients', 'is_active', 'boolean', false),

-- Tabela transactions
('transactions', 'id', 'integer', true),
('transactions', 'type', 'varchar', true),
('transactions', 'description', 'text', true),
('transactions', 'amount', 'numeric', true),
('transactions', 'date', 'date', true),
('transactions', 'category', 'varchar', false),
('transactions', 'client_id', 'uuid', false),
('transactions', 'employee_id', 'integer', false),
('transactions', 'user_id', 'uuid', false),
('transactions', 'created_at', 'timestamp', false),
('transactions', 'updated_at', 'timestamp', false),
('transactions', 'payment_method', 'varchar', false),
('transactions', 'due_date', 'date', false),
('transactions', 'paid_date', 'date', false),
('transactions', 'status', 'varchar', false),
('transactions', 'notes', 'text', false),

-- Tabela vendedores
('vendedores', 'id', 'uuid', true),
('vendedores', 'name', 'varchar', true),
('vendedores', 'email', 'varchar', false),
('vendedores', 'phone', 'varchar', false),
('vendedores', 'commission_rate', 'numeric', false),
('vendedores', 'client_id', 'uuid', false),
('vendedores', 'created_at', 'timestamp', false),
('vendedores', 'updated_at', 'timestamp', false),
('vendedores', 'ativo', 'boolean', false),
('vendedores', 'codigo', 'varchar', false),
('vendedores', 'website', 'varchar', false),
('vendedores', 'is_active', 'boolean', false),
('vendedores', 'hire_date', 'date', false),
('vendedores', 'notes', 'text', false),

-- Tabela partners
('partners', 'id', 'integer', true),
('partners', 'name', 'varchar', true),
('partners', 'email', 'varchar', true),
('partners', 'phone', 'varchar', false),
('partners', 'company', 'varchar', false),
('partners', 'status', 'varchar', false),
('partners', 'created_at', 'timestamp', false),
('partners', 'updated_at', 'timestamp', false),
('partners', 'ativo', 'boolean', false),
('partners', 'codigo', 'varchar', false),
('partners', 'website', 'varchar', false),

-- Tabelas da feira (já devem existir)
('feira_produtos', 'id', 'integer', true),
('feira_produtos', 'nome', 'varchar', true),
('feira_produtos', 'categoria', 'varchar', false),
('feira_produtos', 'quantidade', 'varchar', false),
('feira_produtos', 'preco', 'varchar', false),
('feira_produtos', 'fotos', 'text[]', false),
('feira_produtos', 'latitude', 'numeric', false),
('feira_produtos', 'longitude', 'numeric', false),
('feira_produtos', 'disponivel', 'boolean', false),
('feira_produtos', 'user_id', 'uuid', false),
('feira_produtos', 'produtor', 'varchar', false),
('feira_produtos', 'whatsapp', 'varchar', false),
('feira_produtos', 'endereco', 'text', false),
('feira_produtos', 'descricao', 'text', false),
('feira_produtos', 'created_at', 'timestamp', false),
('feira_produtos', 'updated_at', 'timestamp', false);

-- Verificar quais colunas estão faltando
SELECT 
    e.table_name,
    e.column_name,
    e.data_type as expected_type,
    CASE 
        WHEN c.column_name IS NULL THEN '❌ FALTANDO'
        ELSE '✅ EXISTE'
    END as status,
    c.data_type as actual_type
FROM expected_columns e
LEFT JOIN information_schema.columns c 
    ON e.table_name = c.table_name 
    AND e.column_name = c.column_name
    AND c.table_schema = 'public'
WHERE c.column_name IS NULL  -- Mostrar apenas as que estão faltando
ORDER BY e.table_name, e.column_name;

-- Contar quantas estão faltando por tabela
SELECT 
    e.table_name,
    COUNT(*) as colunas_faltando
FROM expected_columns e
LEFT JOIN information_schema.columns c 
    ON e.table_name = c.table_name 
    AND e.column_name = c.column_name
    AND c.table_schema = 'public'
WHERE c.column_name IS NULL
GROUP BY e.table_name
ORDER BY colunas_faltando DESC;

-- Verificar se as tabelas principais existem
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name
        ) THEN '✅ EXISTE'
        ELSE '❌ FALTANDO'
    END as status
FROM (
    SELECT DISTINCT table_name 
    FROM expected_columns
) t
ORDER BY table_name;