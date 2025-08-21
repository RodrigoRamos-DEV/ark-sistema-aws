--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notifications() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Remover notificações com mais de 30 dias
    DELETE FROM admin_notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Remover dispensas órfãs
    DELETE FROM dismissed_notifications 
    WHERE notification_id NOT IN (SELECT id FROM admin_notifications);
END;
$$;


--
-- Name: cleanup_old_online_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_online_status() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM user_online_status 
    WHERE last_activity < NOW() - INTERVAL '10 minutes';
END;
$$;


--
-- Name: gerar_numero_nf(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gerar_numero_nf(client_uuid uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    contador INTEGER;
    numero VARCHAR;
BEGIN
    -- Buscar próximo número para este cliente
    SELECT COALESCE(MAX(CAST(numero_nf AS INTEGER)), 0) + 1
    INTO contador
    FROM notas_fiscais 
    WHERE client_id = client_uuid;
    
    -- Gerar número sequencial
    numero := LPAD(contador::TEXT, 6, '0');
    
    RETURN numero;
END;
$$;


--
-- Name: gerar_numero_pedido(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gerar_numero_pedido(client_uuid uuid, tipo_pedido character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    contador INTEGER;
    numero VARCHAR;
BEGIN
    -- Buscar próximo número para este cliente e tipo
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_pedido FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO contador
    FROM pedidos 
    WHERE client_id = client_uuid AND tipo = tipo_pedido;
    
    -- Gerar número no formato TIPO001, TIPO002, etc.
    numero := UPPER(tipo_pedido) || LPAD(contador::TEXT, 3, '0');
    
    RETURN numero;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    user_email character varying(255) NOT NULL,
    client_id uuid,
    action_type character varying(255) NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(20) DEFAULT 'info'::character varying,
    target_audience character varying(20) DEFAULT 'all'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid
);


--
-- Name: admin_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_notifications_id_seq OWNED BY public.admin_notifications.id;


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    file_type character varying(100) NOT NULL,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    table_name character varying(100),
    record_id character varying(100),
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backups (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    file_path character varying(500),
    file_size bigint,
    backup_type character varying(50) DEFAULT 'manual'::character varying,
    status character varying(50) DEFAULT 'completed'::character varying,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_name character varying(255) NOT NULL,
    license_status character varying(50) DEFAULT 'Ativo'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    license_expires_at date,
    razao_social character varying(255),
    cnpj character varying(18),
    inscricao_estadual character varying(20),
    inscricao_municipal character varying(20),
    regime_tributario character varying(50),
    responsavel_nome character varying(255),
    telefone character varying(20),
    endereco_logradouro character varying(255),
    endereco_numero character varying(20),
    endereco_bairro character varying(100),
    endereco_cidade character varying(100),
    endereco_uf character varying(2),
    endereco_cep character varying(10),
    logo_path character varying(255),
    contact_phone character varying(50),
    full_address text,
    business_phone character varying(50),
    partner_id uuid,
    client_type character varying(50),
    vendedor_id uuid,
    email character varying(255),
    cnpj_cpf character varying(20),
    endereco character varying(255),
    cpf_cnpj character varying(20),
    birth_date date,
    notes text,
    is_active boolean DEFAULT true,
    logo_backup_path character varying(500),
    ativo boolean DEFAULT true,
    codigo character varying(50),
    pix character varying(255),
    website character varying(255),
    cep character varying(10),
    endereco_rua character varying(255),
    logo_backup_date timestamp without time zone,
    cor_tema character varying(7) DEFAULT '#2c5aa0'::character varying
);


--
-- Name: comissoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comissoes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    vendedor_id uuid NOT NULL,
    pedido_id uuid,
    valor_comissao numeric(10,2) NOT NULL,
    data_pagamento date,
    status character varying(50) DEFAULT 'Pendente'::character varying,
    mes_referencia character varying(7),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: comissoes_vendedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comissoes_vendedores (
    id integer NOT NULL,
    vendedor_id integer,
    cliente_id uuid,
    transaction_id uuid,
    valor_venda numeric(12,2) DEFAULT 0,
    valor_vendedor numeric(12,2) DEFAULT 0,
    mes_referencia character varying(7),
    data_venda date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: comissoes_vendedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comissoes_vendedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comissoes_vendedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comissoes_vendedores_id_seq OWNED BY public.comissoes_vendedores.id;


--
-- Name: dismissed_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dismissed_notifications (
    id integer NOT NULL,
    user_id uuid,
    notification_id integer,
    dismissed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dismissed_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dismissed_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dismissed_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dismissed_notifications_id_seq OWNED BY public.dismissed_notifications.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    subject character varying(255),
    body text,
    template_type character varying(50),
    is_active boolean DEFAULT true,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ativo boolean DEFAULT true
);


--
-- Name: estoque_feira; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estoque_feira (
    id integer NOT NULL,
    produto_id integer,
    client_id uuid,
    quantidade integer,
    data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: estoque_feira_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estoque_feira_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estoque_feira_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estoque_feira_id_seq OWNED BY public.estoque_feira.id;


--
-- Name: feira_favoritos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feira_favoritos (
    id integer NOT NULL,
    user_id uuid,
    produto_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feira_favoritos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feira_favoritos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feira_favoritos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feira_favoritos_id_seq OWNED BY public.feira_favoritos.id;


--
-- Name: feira_produtos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feira_produtos (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    categoria character varying(50),
    quantidade character varying(255),
    preco character varying(100),
    fotos text[],
    latitude numeric(10,8),
    longitude numeric(11,8),
    disponivel boolean DEFAULT true,
    user_id uuid,
    produtor character varying(255),
    whatsapp character varying(20),
    endereco text,
    descricao text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feira_produtos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feira_produtos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feira_produtos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feira_produtos_id_seq OWNED BY public.feira_produtos.id;


--
-- Name: import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_logs (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    table_name character varying(100),
    records_imported integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    status character varying(50) DEFAULT 'processing'::character varying,
    error_details text,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: import_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_logs_id_seq OWNED BY public.import_logs.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    codigo character varying(50),
    unidade character varying(10) DEFAULT 'UN'::character varying,
    categoria character varying(100),
    preco_venda numeric(10,2),
    preco_custo numeric(10,2),
    estoque_atual integer DEFAULT 0,
    estoque_minimo integer DEFAULT 0,
    observacoes text,
    ativo boolean DEFAULT true,
    CONSTRAINT items_type_check CHECK (((type)::text = ANY (ARRAY[('produto'::character varying)::text, ('comprador'::character varying)::text, ('compra'::character varying)::text, ('fornecedor'::character varying)::text])))
);


--
-- Name: itens_nota_fiscal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_nota_fiscal (
    id integer NOT NULL,
    nota_fiscal_id integer,
    produto_nome character varying(255),
    produto_codigo character varying(50),
    quantidade numeric(10,3),
    unidade character varying(10) DEFAULT 'UN'::character varying,
    valor_unitario numeric(10,2),
    valor_total numeric(15,2),
    cfop character varying(10) DEFAULT '5102'::character varying,
    cst character varying(10) DEFAULT '000'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: itens_nota_fiscal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.itens_nota_fiscal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itens_nota_fiscal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.itens_nota_fiscal_id_seq OWNED BY public.itens_nota_fiscal.id;


--
-- Name: itens_pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_pedido (
    id integer NOT NULL,
    pedido_id integer,
    produto_nome character varying(255),
    quantidade numeric(10,3),
    preco_unitario numeric(10,2),
    subtotal numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: itens_pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.itens_pedido_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itens_pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.itens_pedido_id_seq OWNED BY public.itens_pedido.id;


--
-- Name: license_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.license_payments (
    id integer NOT NULL,
    license_id integer,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50),
    transaction_id character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: license_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.license_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: license_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.license_payments_id_seq OWNED BY public.license_payments.id;


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id integer NOT NULL,
    user_id uuid,
    license_key character varying(255) NOT NULL,
    plan_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    max_clients integer DEFAULT 100,
    max_transactions integer DEFAULT 1000,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: licenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.licenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: licenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.licenses_id_seq OWNED BY public.licenses.id;


--
-- Name: notas_fiscais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas_fiscais (
    id integer NOT NULL,
    numero character varying(50) NOT NULL,
    client_id uuid,
    pedido_id integer,
    valor_total numeric(15,2) NOT NULL,
    data_emissao date NOT NULL,
    status character varying(50) DEFAULT 'emitida'::character varying,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notas_fiscais_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notas_fiscais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notas_fiscais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notas_fiscais_id_seq OWNED BY public.notas_fiscais.id;


--
-- Name: pagamentos_comissoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagamentos_comissoes (
    id integer NOT NULL,
    vendedor_id integer,
    mes_referencia character varying(7),
    valor_comissao numeric(12,2) DEFAULT 0,
    data_pagamento date,
    status character varying(20) DEFAULT 'pendente'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pagamentos_comissoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagamentos_comissoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagamentos_comissoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagamentos_comissoes_id_seq OWNED BY public.pagamentos_comissoes.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    profit_share numeric(5,4) NOT NULL,
    ativo boolean DEFAULT true,
    codigo character varying(50),
    website character varying(255),
    company character varying(255),
    status character varying(20) DEFAULT 'active'::character varying
);


--
-- Name: payment_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    vendedor_id text NOT NULL,
    porcentagem numeric(5,2) NOT NULL,
    valor_comissao numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pedido_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedido_items (
    id integer NOT NULL,
    pedido_id integer,
    product_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pedido_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedido_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedido_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedido_items_id_seq OWNED BY public.pedido_items.id;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos (
    id integer NOT NULL,
    client_id uuid,
    vendedor_id uuid,
    total numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'pendente'::character varying,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pedidos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pedidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_id_seq OWNED BY public.pedidos.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2),
    category character varying(100),
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ativo boolean DEFAULT true
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: produtos_feira; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produtos_feira (
    id integer NOT NULL,
    client_id uuid,
    codigo character varying(50),
    nome text NOT NULL,
    unidade_medida text,
    preco numeric(10,2),
    imagem_url text
);


--
-- Name: produtos_feira_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.produtos_feira_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: produtos_feira_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.produtos_feira_id_seq OWNED BY public.produtos_feira.id;


--
-- Name: produtos_vitrine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produtos_vitrine (
    id integer NOT NULL,
    client_id uuid,
    nome character varying(255) NOT NULL,
    descricao text,
    preco character varying(100),
    quantidade character varying(255),
    unidade character varying(10) DEFAULT 'UN'::character varying,
    categoria character varying(50),
    fotos text[],
    latitude numeric(10,8),
    longitude numeric(11,8),
    endereco text,
    disponivel boolean DEFAULT true,
    whatsapp character varying(20),
    produtor_nome character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: produtos_vitrine_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.produtos_vitrine_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: produtos_vitrine_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.produtos_vitrine_id_seq OWNED BY public.produtos_vitrine.id;


--
-- Name: registration_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL
);


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    client_id uuid,
    template_json jsonb,
    template_html text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_templates_id_seq OWNED BY public.report_templates.id;


--
-- Name: system_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_notifications (
    id integer NOT NULL,
    user_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_notifications_id_seq OWNED BY public.system_notifications.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    description text,
    user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    transaction_date date NOT NULL,
    description character varying(255),
    category character varying(255),
    quantity numeric(10,2),
    unit_price numeric(10,2),
    total_price numeric(12,2) NOT NULL,
    status character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    payment_method character varying(50),
    due_date date,
    paid_date date,
    notes text,
    pedido_id character varying(100),
    pedido_info text,
    ativo boolean DEFAULT true,
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY (ARRAY[('venda'::character varying)::text, ('gasto'::character varying)::text])))
);


--
-- Name: user_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_messages (
    id integer NOT NULL,
    sender_id uuid,
    recipient_id uuid,
    subject character varying(255),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_messages_id_seq OWNED BY public.user_messages.id;


--
-- Name: user_online_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_online_status (
    client_id uuid NOT NULL,
    last_activity timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    client_type character varying(20) DEFAULT 'produtor'::character varying,
    license_expires_at timestamp without time zone,
    max_clients integer DEFAULT 100,
    max_transactions integer DEFAULT 1000,
    is_premium boolean DEFAULT false,
    last_login timestamp without time zone,
    company_name character varying(255),
    ativo boolean DEFAULT true,
    codigo character varying(50),
    pix character varying(255),
    website character varying(255),
    contact_phone character varying(20),
    address text,
    logo_url character varying(500),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('funcionario'::character varying)::text])))
);


--
-- Name: vendedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendedores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    client_id uuid,
    name character varying(255) NOT NULL,
    comissao_percentual numeric(5,2) DEFAULT 0.00,
    ativo boolean DEFAULT true,
    is_active boolean DEFAULT true,
    hire_date date,
    notes text,
    codigo character varying(50),
    website character varying(255),
    commission_rate numeric(5,2) DEFAULT 0.00,
    porcentagem numeric(5,2) DEFAULT 0,
    pix character varying(255) DEFAULT ''::character varying,
    endereco text DEFAULT ''::text,
    telefone character varying(50) DEFAULT ''::character varying
);


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    withdrawal_date date DEFAULT CURRENT_DATE NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications ALTER COLUMN id SET DEFAULT nextval('public.admin_notifications_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: comissoes_vendedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes_vendedores ALTER COLUMN id SET DEFAULT nextval('public.comissoes_vendedores_id_seq'::regclass);


--
-- Name: dismissed_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dismissed_notifications ALTER COLUMN id SET DEFAULT nextval('public.dismissed_notifications_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: estoque_feira id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_feira ALTER COLUMN id SET DEFAULT nextval('public.estoque_feira_id_seq'::regclass);


--
-- Name: feira_favoritos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_favoritos ALTER COLUMN id SET DEFAULT nextval('public.feira_favoritos_id_seq'::regclass);


--
-- Name: feira_produtos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_produtos ALTER COLUMN id SET DEFAULT nextval('public.feira_produtos_id_seq'::regclass);


--
-- Name: import_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs ALTER COLUMN id SET DEFAULT nextval('public.import_logs_id_seq'::regclass);


--
-- Name: itens_nota_fiscal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_nota_fiscal ALTER COLUMN id SET DEFAULT nextval('public.itens_nota_fiscal_id_seq'::regclass);


--
-- Name: itens_pedido id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido ALTER COLUMN id SET DEFAULT nextval('public.itens_pedido_id_seq'::regclass);


--
-- Name: license_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_payments ALTER COLUMN id SET DEFAULT nextval('public.license_payments_id_seq'::regclass);


--
-- Name: licenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses ALTER COLUMN id SET DEFAULT nextval('public.licenses_id_seq'::regclass);


--
-- Name: notas_fiscais id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais ALTER COLUMN id SET DEFAULT nextval('public.notas_fiscais_id_seq'::regclass);


--
-- Name: pagamentos_comissoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos_comissoes ALTER COLUMN id SET DEFAULT nextval('public.pagamentos_comissoes_id_seq'::regclass);


--
-- Name: pedido_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_items ALTER COLUMN id SET DEFAULT nextval('public.pedido_items_id_seq'::regclass);


--
-- Name: pedidos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos ALTER COLUMN id SET DEFAULT nextval('public.pedidos_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: produtos_feira id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_feira ALTER COLUMN id SET DEFAULT nextval('public.produtos_feira_id_seq'::regclass);


--
-- Name: produtos_vitrine id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_vitrine ALTER COLUMN id SET DEFAULT nextval('public.produtos_vitrine_id_seq'::regclass);


--
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- Name: system_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_notifications ALTER COLUMN id SET DEFAULT nextval('public.system_notifications_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: user_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_messages ALTER COLUMN id SET DEFAULT nextval('public.user_messages_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, user_id, user_email, client_id, action_type, details, created_at) FROM stdin;
1d610c16-1cad-4178-b8ea-9ce051a14b2f	47608086-4ffe-4234-a87c-7154b4a8e803	admin@ark.com	\N	USER_LOGIN_SUCCESS	\N	2025-07-25 19:45:47.406517+00
3f9463ec-3f07-4ba5-b503-db022c09280c	47608086-4ffe-4234-a87c-7154b4a8e803	admin@ark.com	\N	USER_LOGIN_SUCCESS	\N	2025-07-25 19:47:15.182874+00
8fed737a-e16b-4ce2-8448-1d895893575f	47608086-4ffe-4234-a87c-7154b4a8e803	admin@ark.com	\N	USER_LOGIN_SUCCESS	\N	2025-07-25 19:51:03.195986+00
bb935618-158e-44b4-b48d-102023f58c2c	47608086-4ffe-4234-a87c-7154b4a8e803	admin@ark.com	\N	USER_LOGIN_SUCCESS	\N	2025-07-25 19:52:40.427898+00
9e3143af-a52c-40bc-8d76-5cefbd15aab2	47608086-4ffe-4234-a87c-7154b4a8e803	admin@ark.com	\N	USER_LOGIN_SUCCESS	\N	2025-07-25 20:04:34.774956+00
\.


--
-- Data for Name: admin_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_notifications (id, title, message, type, target_audience, created_at, created_by) FROM stdin;
1	Sistema Atualizado!	O sistema de notificações foi corrigido e agora funciona em produção.	success	all	2025-08-19 20:43:57.487279	\N
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attachments (id, client_id, transaction_id, file_name, file_path, file_type, uploaded_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.backups (id, filename, file_path, file_size, backup_type, status, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, company_name, license_status, created_at, license_expires_at, razao_social, cnpj, inscricao_estadual, inscricao_municipal, regime_tributario, responsavel_nome, telefone, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep, logo_path, contact_phone, full_address, business_phone, partner_id, client_type, vendedor_id, email, cnpj_cpf, endereco, cpf_cnpj, birth_date, notes, is_active, logo_backup_path, ativo, codigo, pix, website, cep, endereco_rua, logo_backup_date, cor_tema) FROM stdin;
198f888a-1376-4228-906a-5c45af912633	Tim do Aipo	Ativo	2025-07-26 16:11:23.982983+00	2025-09-02	Tim do Aipo	002			Simples Nacional	Tim do Aipo	22992053355		S/n	Barracão dos mendes 	Nova Friburgo	RJ		logos/198f888a-1376-4228-906a-5c45af912633/1755333116145-WhatsApp Image 2025-07-23 at 8.05.41 PM.jpeg	22992053355	Barracão dos Mendes, S/n, Barracão dos mendes , Nova Friburgo, RJ, CEP: 28600-991	22992053355	ffc722b6-ba85-4d9f-b7aa-d62d7078f3d2	produtor	\N	renatoveigaf3@gmail.com		\N	\N	\N	\N	t	logos/198f888a-1376-4228-906a-5c45af912633/1754039517446-WhatsApp Image 2025-07-24 at 10.37.46 AM.jpeg	t	\N	Telefone 22992053355		28600-991	Barracão dos Mendes	2025-08-16 08:31:56.145524	#2c5aa0
40d3bbd4-15d7-47c8-9501-564210881b96	Sítio São Jorge 	Ativo	2025-07-26 16:07:25.386286+00	2029-10-16	Jorge Winicius	001			Simples Nacional	Jorge Winicius	0							uploads/1753943208775-636679627-inbound6341608433142020683.jpg	22 99780-4437 	Salinas 	\N	\N	produtor	\N	\N	\N	\N	\N	\N	\N	t	\N	t	\N	\N	\N	\N	\N	\N	#2c5aa0
f2e1b562-db8e-4db4-ac39-6749cf5fea40	Jéssica Cheiro Verde	Vencido	2025-07-26 15:28:20.594522+00	2025-08-03	Jéssica Cheiro Verde	0			Simples Nacional	Jéssica Cheiro Verde	21965799472							\N	\N	\N	222	ffc722b6-ba85-4d9f-b7aa-d62d7078f3d2	produtor	\N	\N	\N	\N	\N	\N	\N	t	\N	t	\N	\N	\N	\N	\N	\N	#2c5aa0
73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	Janderson Mattos	Ativo	2025-08-09 14:51:35.883767+00	2025-09-07	Janderson Matos	\N			Simples Nacional	Janderson Matos	\N							\N	null	null	22981517924	ffc722b6-ba85-4d9f-b7aa-d62d7078f3d2	produtor	\N	\N	\N	\N	\N	\N	\N	t	\N	t	\N	\N	\N	\N	\N	\N	#2c5aa0
091e21fb-4715-4fe8-b006-36e88642b0b2	João Pedro 	Ativo	2025-08-06 23:19:35.632883+00	2025-09-05	João Pedro 	\N			Simples Nacional	João Pedro	\N							logos/091e21fb-4715-4fe8-b006-36e88642b0b2/1755123818404-1000660803.jpg	21 99860-1282 	Bonsucesso 	2	ffc722b6-ba85-4d9f-b7aa-d62d7078f3d2	produtor	\N	\N	\N	\N	\N	\N	\N	t	\N	t	\N	\N	\N	\N	\N	\N	#2c5aa0
120a5304-54be-4290-b0cc-ed1de8d3b16b	TESTE	Trial	2025-08-20 01:25:41.154247+00	2025-08-23	\N	\N			\N	\N	\N	\N					\N	logos/120a5304-54be-4290-b0cc-ed1de8d3b16b/1755653270675-Gemini_Generated_Image_8c6bxp8c6bxp8c6b.png		\N	\N	\N	produtor	\N			\N	\N	\N	\N	t	\N	t	\N					\N	#2c5aa0
923e9d14-e622-4a0d-aea2-56cb21d80096	TESTE EMPRESA	Ativo	2025-08-16 04:02:13.919635+00	2025-09-06	TESTE EMPRESA	\N			Simples Nacional	TESTE EMPRESA	\N							\N	\N	\N	23222222	\N	empresa	\N		\N	\N	\N	\N	\N	t	\N	t	\N	\N	\N	\N	\N	\N	#2c5aa0
f17597af-3441-42a2-b6f4-1d3f03475662	ARK SISTEMAS	Ativo	2025-07-27 18:23:05.948094+00	2025-09-19	Teste	\N			Simples Nacional	Teste	3333333		25	Bomsu	Teresópolis	RJ		logos/f17597af-3441-42a2-b6f4-1d3f03475662/1755353811802-Sistema-ARK.webp	(21) 97304-7049	Estrada Teresópolis-Friburgo, 25, Bomsu, Teresópolis, RJ, CEP: 25995-990	22988472248	\N	produtor	\N	rodrigomramos18@gmail.com	111.111.111-11	\N	\N	\N	\N	t	logos/f17597af-3441-42a2-b6f4-1d3f03475662/1755315919747-capi.png	t	\N	12112112112		25995-990	Estrada Teresópolis-Friburgo	2025-08-16 14:16:51.800368	#1e3a8a
3c20d11f-7278-42c2-aae1-ee59d8e7a6da	Fernandes V.L verduras 	Trial	2025-08-21 16:28:35.050427+00	2025-08-24	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	produtor	\N	\N	\N	\N	\N	\N	\N	t	\N	t	\N	\N	\N	\N	\N	\N	#2c5aa0
b53f72c4-7bdc-457e-89a4-1a636b132608	Rodolfo Moreira	Ativo	2025-07-26 16:03:29.94895+00	2025-09-18	Rodolfo Moreira	00			Simples Nacional	Rodolfo Moreira	21994519762							\N	(21) 99451-9762	\N	222	ffc722b6-ba85-4d9f-b7aa-d62d7078f3d2	produtor	\N			\N	\N	\N	\N	t	\N	t	\N					\N	#2c5aa0
\.


--
-- Data for Name: comissoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comissoes (id, client_id, vendedor_id, pedido_id, valor_comissao, data_pagamento, status, mes_referencia, created_at) FROM stdin;
\.


--
-- Data for Name: comissoes_vendedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comissoes_vendedores (id, vendedor_id, cliente_id, transaction_id, valor_venda, valor_vendedor, mes_referencia, data_venda, created_at) FROM stdin;
\.


--
-- Data for Name: dismissed_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dismissed_notifications (id, user_id, notification_id, dismissed_at) FROM stdin;
1	e9e488a8-ec44-468a-90c1-8eeb9e4a5816	1	2025-08-19 20:44:19.750908
2	04035fda-071c-4ae8-b152-97851d5ca367	1	2025-08-19 20:50:36.194341
6	bf3ec5ba-9413-4c17-b173-501db4da9f1c	1	2025-08-20 01:25:53.960296
10	1257cadd-d214-425d-b8bc-aba90421fb3f	1	2025-08-20 20:16:38.813194
12	ebc367d4-590c-4d20-bec2-bee3b1b0b351	1	2025-08-21 16:33:57.428887
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, name, subject, body, template_type, is_active, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, client_id, name, created_at, ativo) FROM stdin;
d6b751ce-7062-480c-887a-27ac1dd5982d	f2e1b562-db8e-4db4-ac39-6749cf5fea40	Jéssica	2025-07-26 15:33:02.026425+00	t
584b2834-e829-4ecd-97b3-954b7a3c4ae2	b53f72c4-7bdc-457e-89a4-1a636b132608	Diego	2025-07-26 16:06:22.051547+00	t
58d7f907-6b59-4745-a0f6-967ff3321f37	b53f72c4-7bdc-457e-89a4-1a636b132608	Dudu	2025-07-26 16:06:22.06073+00	t
0753cb0f-e757-45e1-aeaa-de74aa6e1eb9	b53f72c4-7bdc-457e-89a4-1a636b132608	Isabel	2025-07-26 16:06:22.066314+00	t
588644a5-81ab-410f-aeaf-28a4fbc3d7a5	40d3bbd4-15d7-47c8-9501-564210881b96	Claudia	2025-07-26 16:09:54.346836+00	t
a2514fa7-591b-4105-ba52-05b8dd50dbf9	40d3bbd4-15d7-47c8-9501-564210881b96	Daniel	2025-07-26 16:09:54.355205+00	t
03b6ede3-b943-40f4-a250-fedf1f4952b4	40d3bbd4-15d7-47c8-9501-564210881b96	Fernando	2025-07-26 16:09:54.35917+00	t
4b447297-e546-4803-8599-e23c864bb099	40d3bbd4-15d7-47c8-9501-564210881b96	Luan	2025-07-26 16:09:54.366559+00	t
d7e5a640-305e-4f64-8f30-55f44597de9e	40d3bbd4-15d7-47c8-9501-564210881b96	Paula	2025-07-26 16:09:54.370764+00	t
f2fb217c-810b-41ae-9695-d4604b9af973	40d3bbd4-15d7-47c8-9501-564210881b96	Quesia	2025-07-26 16:09:54.386094+00	t
e59fbb43-225b-45a7-9c9b-21cd453354b7	40d3bbd4-15d7-47c8-9501-564210881b96	Winicius	2025-07-26 16:09:54.391975+00	t
5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	198f888a-1376-4228-906a-5c45af912633	Tim do Aipo	2025-07-26 16:13:05.650097+00	t
efa10599-ddb3-40fc-a29e-b3d90085cafc	f17597af-3441-42a2-b6f4-1d3f03475662	Rodrigo 	2025-07-28 00:35:11.180839+00	t
70a1935a-4376-4da6-ac8e-00607fa80067	091e21fb-4715-4fe8-b006-36e88642b0b2	Gabriel 	2025-08-06 23:39:12.468065+00	t
80aacb38-7287-486d-b82f-86ecec82888a	091e21fb-4715-4fe8-b006-36e88642b0b2	João 	2025-08-06 23:45:23.765395+00	t
18526a3b-e7a3-4375-b574-b278afb83c2b	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	Janderson Mattos 	2025-08-19 12:05:00.765588+00	t
6270b6d9-3707-4755-8920-1e0ad25d05a2	120a5304-54be-4290-b0cc-ed1de8d3b16b	teste	2025-08-20 01:26:26.193833+00	t
32d3530b-5fa3-4af9-8d6a-ea8f2119986e	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	Paloma 	2025-08-21 16:31:57.301683+00	t
\.


--
-- Data for Name: estoque_feira; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estoque_feira (id, produto_id, client_id, quantidade, data_atualizacao) FROM stdin;
\.


--
-- Data for Name: feira_favoritos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feira_favoritos (id, user_id, produto_id, created_at) FROM stdin;
\.


--
-- Data for Name: feira_produtos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feira_produtos (id, nome, categoria, quantidade, preco, fotos, latitude, longitude, disponivel, user_id, produtor, whatsapp, endereco, descricao, created_at, updated_at) FROM stdin;
6	Repolho	verduras	5000	2,00 Unidade	{https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/0e5b3502-98e8-4b6f-b8f0-9f08666dfb60-1755353408362.jpg,https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/65a6f3e4-2c26-4ecc-86b9-8ebe0d03c701-1755353408373.jpeg}	-22.27240960	-42.78845440	t	e9e488a8-ec44-468a-90c1-8eeb9e4a5816	Rodrigo Ramos	22223333	Endereço do produtor		2025-08-16 14:10:10.29187	2025-08-16 14:10:10.29187
7	Tomate	frutas	10000	90,00	{https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/6eadfe42-dd57-4b03-bb59-0b631507db88-1755353450453.jpeg,https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/c949b2bb-52ba-434f-90a4-3c5da36b78ed-1755353450456.jpeg}	-22.32278030	-42.65047073	t	e9e488a8-ec44-468a-90c1-8eeb9e4a5816	Rodrigo Ramos	22223333	Endereço do produtor		2025-08-16 14:10:51.619881	2025-08-16 14:10:51.619881
8	Rucula Hidroponica	verduras	6000	0,80	{https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/fcff55db-95c1-4c60-b9d4-bf1c401fd10d-1755353485113.jpeg}	-22.26242446	-42.78264999	t	e9e488a8-ec44-468a-90c1-8eeb9e4a5816	Rodrigo Ramos	22223333	Endereço do produtor		2025-08-16 14:11:26.628279	2025-08-16 14:11:26.628279
9	Alface Crespa	verduras	30000	45,00	{https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/eda041ec-de22-41d7-8b4f-7d50140a2e84-1755353544494.jpeg,https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/584d920c-43e1-40d5-a33c-061d707322c4-1755353544496.jpg}	-22.27004979	-42.78162003	t	e9e488a8-ec44-468a-90c1-8eeb9e4a5816	Rodrigo Ramos	22223333	Endereço do produtor		2025-08-16 14:12:26.309461	2025-08-16 14:12:26.309461
10	Cenoura Molho	legumes	5000	2,50	{https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/05736e9b-bbc1-4f42-8c3a-3571f8019e4e-1755353879123.jpg,https://ark-pro-logos-clientes-rodrigo-ramos.s3.sa-east-1.amazonaws.com/feira/9fa76d92-b4ce-4501-9211-58b8c41b1083-1755353879126.jpg}	-22.31530362	-42.66828060	t	e9e488a8-ec44-468a-90c1-8eeb9e4a5816	Rodrigo Ramos	21973047049	Endereço do produtor		2025-08-16 14:18:01.068555	2025-08-16 14:18:01.068555
\.


--
-- Data for Name: import_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.import_logs (id, filename, table_name, records_imported, records_failed, status, error_details, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.items (id, client_id, type, name, created_at, codigo, unidade, categoria, preco_venda, preco_custo, estoque_atual, estoque_minimo, observacoes, ativo) FROM stdin;
666d1516-2a5f-44d4-b390-166a8d7a112e	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	CHEIRO VERDE	2025-07-26 15:33:01.998697+00	\N	UN	\N	\N	\N	0	0	\N	t
ca33d2e0-28d7-4067-aa60-1d7450144c8f	f2e1b562-db8e-4db4-ac39-6749cf5fea40	comprador	NEI DAMAZIO	2025-07-26 15:33:02.006204+00	\N	UN	\N	\N	\N	0	0	\N	t
ba006ebd-d6fc-4771-9035-6634fc6b3004	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Marcelo	2025-07-26 15:33:02.008034+00	\N	UN	\N	\N	\N	0	0	\N	t
d5b52aba-7a2f-4809-9375-7e4fa97456da	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	SALSINHA	2025-07-26 15:33:02.008856+00	\N	UN	\N	\N	\N	0	0	\N	t
8b221784-eeee-4fc1-933e-971cbd0bb023	f2e1b562-db8e-4db4-ac39-6749cf5fea40	comprador	DANIEL	2025-07-26 15:33:02.009854+00	\N	UN	\N	\N	\N	0	0	\N	t
5441b555-8a1d-4969-9b00-2c991cc93015	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Glaucio	2025-07-26 15:33:02.012389+00	\N	UN	\N	\N	\N	0	0	\N	t
709a9915-8bee-4af3-b996-08abf42376e2	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	CEBOLINHA	2025-07-26 15:33:02.013422+00	\N	UN	\N	\N	\N	0	0	\N	t
ee0aa040-3a84-4c41-9b6b-d900ed25db71	f2e1b562-db8e-4db4-ac39-6749cf5fea40	comprador	ELCI	2025-07-26 15:33:02.014286+00	\N	UN	\N	\N	\N	0	0	\N	t
b9531e86-8e5a-444d-86f0-e095365fe976	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Mayara	2025-07-26 15:33:02.015645+00	\N	UN	\N	\N	\N	0	0	\N	t
0173b487-3493-43ac-a023-801a800a2660	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	SALSA G	2025-07-26 15:33:02.016272+00	\N	UN	\N	\N	\N	0	0	\N	t
e1c48873-e0c5-4e1b-a3af-6488aacfeae7	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Lindomar	2025-07-26 15:33:02.016922+00	\N	UN	\N	\N	\N	0	0	\N	t
3d70e39c-d851-4d8e-8517-34c54affee5a	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	CEBOLA G	2025-07-26 15:33:02.017539+00	\N	UN	\N	\N	\N	0	0	\N	t
a732ff7a-76ef-4d1a-aca9-3662ff807e0a	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Gil bolinha	2025-07-26 15:33:02.018151+00	\N	UN	\N	\N	\N	0	0	\N	t
2eb63001-0064-49fa-8d04-ede9ce839f15	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	CHEIRO VERDE PROMOÇÃO	2025-07-26 15:33:02.018758+00	\N	UN	\N	\N	\N	0	0	\N	t
b65553a2-2c09-4845-b4a2-6a8636ac6962	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Landinho	2025-07-26 15:33:02.019363+00	\N	UN	\N	\N	\N	0	0	\N	t
63f10465-614c-46e2-9fe4-72af706c3517	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	SALSINHA PROMOÇÃO	2025-07-26 15:33:02.019976+00	\N	UN	\N	\N	\N	0	0	\N	t
8785ba3d-ad47-438d-9fb1-4f4b830a660e	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Andorinha	2025-07-26 15:33:02.020576+00	\N	UN	\N	\N	\N	0	0	\N	t
cbd28f6b-1990-4d94-9af2-f0bc58a78aed	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Carlos	2025-07-26 15:33:02.021176+00	\N	UN	\N	\N	\N	0	0	\N	t
406e17a3-c7f9-4545-8a14-39fa191e6354	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Thiago	2025-07-26 15:33:02.021804+00	\N	UN	\N	\N	\N	0	0	\N	t
76c18cea-4cdd-4e59-b0f9-76c19a3d914e	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Diego	2025-07-26 15:33:02.0224+00	\N	UN	\N	\N	\N	0	0	\N	t
dd843265-63f2-4b41-96f8-081f0c35f1b5	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Jorginho	2025-07-26 15:33:02.023015+00	\N	UN	\N	\N	\N	0	0	\N	t
0fd462a1-9846-4f6b-a0df-3e2d8c4c845e	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Saraiva	2025-07-26 15:33:02.023616+00	\N	UN	\N	\N	\N	0	0	\N	t
7df3f6d2-bb84-46f9-a666-3eae59603bc3	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Albino	2025-07-26 15:33:02.024267+00	\N	UN	\N	\N	\N	0	0	\N	t
13cd7e98-44db-4dae-aaac-2d10054ae8d6	f2e1b562-db8e-4db4-ac39-6749cf5fea40	fornecedor	Letícia	2025-07-26 15:33:02.024868+00	\N	UN	\N	\N	\N	0	0	\N	t
3a066815-f685-4d03-a1ed-27159b95f880	b53f72c4-7bdc-457e-89a4-1a636b132608	fornecedor	casa	2025-07-26 16:06:22.047157+00	\N	UN	\N	\N	\N	0	0	\N	t
b9e73b72-a9cd-4716-be44-405561d12c9d	40d3bbd4-15d7-47c8-9501-564210881b96	produto	Alface Americana	2025-07-26 16:09:54.322191+00	\N	UN	\N	\N	\N	0	0	\N	t
927ab7e6-548f-44ca-ae42-62aea273103b	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Neuza e Filhos	2025-07-26 16:09:54.329898+00	\N	UN	\N	\N	\N	0	0	\N	t
46fd926c-43d2-432e-900c-a8b6504ced38	40d3bbd4-15d7-47c8-9501-564210881b96	produto	Alface Crespa	2025-07-26 16:09:54.331203+00	\N	UN	\N	\N	\N	0	0	\N	t
7c712f27-8a59-4043-b41f-0f663486a0be	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	folhagens paquy	2025-07-26 16:09:54.332087+00	\N	UN	\N	\N	\N	0	0	\N	t
f2745e7c-dd58-4742-b3ac-81e1e378b32d	40d3bbd4-15d7-47c8-9501-564210881b96	produto	Alface Roxa	2025-07-26 16:09:54.332962+00	\N	UN	\N	\N	\N	0	0	\N	t
5de78173-5966-40d3-abdf-27c2e8efa2a4	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Agro Paula	2025-07-26 16:09:54.334039+00	\N	UN	\N	\N	\N	0	0	\N	t
34809f2e-83eb-46cf-b5da-a45c2237469c	40d3bbd4-15d7-47c8-9501-564210881b96	produto	Salsa	2025-07-26 16:09:54.335004+00	\N	UN	\N	\N	\N	0	0	\N	t
db632f24-b029-4ddc-ae53-8aafd8430a04	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Anselmo	2025-07-26 16:09:54.335888+00	\N	UN	\N	\N	\N	0	0	\N	t
1550d263-a2d7-4687-ac4d-663a0704af26	40d3bbd4-15d7-47c8-9501-564210881b96	produto	Alho Poro	2025-07-26 16:09:54.336942+00	\N	UN	\N	\N	\N	0	0	\N	t
4b5fd17b-a502-4001-8465-fff25a87555e	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Morro Alto	2025-07-26 16:09:54.337919+00	\N	UN	\N	\N	\N	0	0	\N	t
91c8eab4-41de-4ac5-bd4f-ad93044c1d64	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Sitio Daniel	2025-07-26 16:09:54.338855+00	\N	UN	\N	\N	\N	0	0	\N	t
3feb17fc-8b73-4752-b315-d2c94e0833ad	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Rafael	2025-07-26 16:09:54.339554+00	\N	UN	\N	\N	\N	0	0	\N	t
c25856f6-b918-4cc7-ab37-40377affc884	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Duas Folhas	2025-07-26 16:09:54.340194+00	\N	UN	\N	\N	\N	0	0	\N	t
d930d756-8479-4ab6-a3e9-552e74240d5f	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Queiroz e Guarilha	2025-07-26 16:09:54.340881+00	\N	UN	\N	\N	\N	0	0	\N	t
28b45f09-dd67-41bd-87f7-8e5e44259ee4	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Tuca	2025-07-26 16:09:54.341511+00	\N	UN	\N	\N	\N	0	0	\N	t
bac5508e-9880-4811-9336-27750cd02579	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	De Neuza	2025-07-26 16:09:54.342135+00	\N	UN	\N	\N	\N	0	0	\N	t
42fea2d7-9416-4283-a6ce-a1d533e62cf9	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Caipira	2025-07-26 16:09:54.342803+00	\N	UN	\N	\N	\N	0	0	\N	t
a57594a6-2887-4183-bda8-f067d0ab6b63	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	3B	2025-07-26 16:09:54.343409+00	\N	UN	\N	\N	\N	0	0	\N	t
cc320c85-ba8a-4318-9768-dae762777975	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Agro Santos	2025-07-26 16:09:54.34407+00	\N	UN	\N	\N	\N	0	0	\N	t
0a047b79-d9f6-493d-9e2e-545e85dbdf75	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	jonhatan	2025-07-26 16:09:54.344677+00	\N	UN	\N	\N	\N	0	0	\N	t
f47046ba-e91c-4fed-a7bc-a0364658f9f4	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	alex	2025-07-26 16:09:54.345293+00	\N	UN	\N	\N	\N	0	0	\N	t
008efbbd-3c63-4526-a758-950ea2c2bfff	198f888a-1376-4228-906a-5c45af912633	produto	Alecrim	2025-07-26 16:13:05.576688+00	\N	UN	\N	\N	\N	0	0	\N	t
6bf27fa8-20a9-44d6-a317-8d57b57106b5	198f888a-1376-4228-906a-5c45af912633	comprador	Multi folhas	2025-07-26 16:13:05.584586+00	\N	UN	\N	\N	\N	0	0	\N	t
9488f80d-c2b6-4a9e-8af6-daf02729a4b9	198f888a-1376-4228-906a-5c45af912633	produto	Tomilho	2025-07-26 16:13:05.586398+00	\N	UN	\N	\N	\N	0	0	\N	t
4ef865a6-1e19-4362-8ca5-b09404e6c21c	198f888a-1376-4228-906a-5c45af912633	comprador	Alessandro	2025-07-26 16:13:05.587185+00	\N	UN	\N	\N	\N	0	0	\N	t
f4470c27-db72-493b-a891-7c50ae78f08f	198f888a-1376-4228-906a-5c45af912633	fornecedor	Luciana	2025-07-26 16:13:05.587899+00	\N	UN	\N	\N	\N	0	0	\N	t
741fa2b9-ac24-49e9-8630-d01c962bb190	198f888a-1376-4228-906a-5c45af912633	produto	Mangericão	2025-07-26 16:13:05.588653+00	\N	UN	\N	\N	\N	0	0	\N	t
38074015-640e-499a-a747-39992d95deb7	198f888a-1376-4228-906a-5c45af912633	comprador	Vica	2025-07-26 16:13:05.589336+00	\N	UN	\N	\N	\N	0	0	\N	t
155322e3-4305-48cc-9b6f-d4074d2cf9c2	198f888a-1376-4228-906a-5c45af912633	fornecedor	Pai	2025-07-26 16:13:05.59025+00	\N	UN	\N	\N	\N	0	0	\N	t
b8cc0de5-f960-438a-bf94-d967da71daea	198f888a-1376-4228-906a-5c45af912633	produto	Taioba	2025-07-26 16:13:05.591168+00	\N	UN	\N	\N	\N	0	0	\N	t
5f79e1cd-8403-4a88-bef2-f727964a5606	198f888a-1376-4228-906a-5c45af912633	comprador	Fresh folhas	2025-07-26 16:13:05.591992+00	\N	UN	\N	\N	\N	0	0	\N	t
406cf1cd-fb88-49b2-b63d-42badf3afeba	198f888a-1376-4228-906a-5c45af912633	fornecedor	Lindomar	2025-07-26 16:13:05.593115+00	\N	UN	\N	\N	\N	0	0	\N	t
27051ac6-c59c-4b90-aab6-c79d74715e36	198f888a-1376-4228-906a-5c45af912633	produto	Almeirão	2025-07-26 16:13:05.594088+00	\N	UN	\N	\N	\N	0	0	\N	t
32de9263-1f08-405a-ab6e-50c863f75041	198f888a-1376-4228-906a-5c45af912633	comprador	Greide	2025-07-26 16:13:05.594836+00	\N	UN	\N	\N	\N	0	0	\N	t
7e3e8092-5547-4e7c-aec7-f1f60effc33f	198f888a-1376-4228-906a-5c45af912633	fornecedor	Ozia	2025-07-26 16:13:05.595489+00	\N	UN	\N	\N	\N	0	0	\N	t
4a4c2fa1-b747-4b12-a642-b34c470eaa69	198f888a-1376-4228-906a-5c45af912633	produto	Salsa crespa	2025-07-26 16:13:05.596117+00	\N	UN	\N	\N	\N	0	0	\N	t
6862afba-8257-435e-9c16-1da943a42bc5	198f888a-1376-4228-906a-5c45af912633	comprador	Aroldo	2025-07-26 16:13:05.596747+00	\N	UN	\N	\N	\N	0	0	\N	t
760e514d-7263-41c6-8955-deb7f44615f3	198f888a-1376-4228-906a-5c45af912633	fornecedor	Gali	2025-07-26 16:13:05.597349+00	\N	UN	\N	\N	\N	0	0	\N	t
56f4bba2-df49-414b-bdb9-8b80d7a3498f	198f888a-1376-4228-906a-5c45af912633	produto	Alface americana	2025-07-26 16:13:05.597965+00	\N	UN	\N	\N	\N	0	0	\N	t
5935b8cd-237e-4deb-827d-34826d82f952	198f888a-1376-4228-906a-5c45af912633	comprador	Lucas	2025-07-26 16:13:05.598562+00	\N	UN	\N	\N	\N	0	0	\N	t
939a2341-005c-4158-98e7-93a0244889b0	198f888a-1376-4228-906a-5c45af912633	fornecedor	Weliton	2025-07-26 16:13:05.599152+00	\N	UN	\N	\N	\N	0	0	\N	t
67430af8-fc57-4f58-9049-129af0d75220	198f888a-1376-4228-906a-5c45af912633	produto	Alface crespa	2025-07-26 16:13:05.599789+00	\N	UN	\N	\N	\N	0	0	\N	t
a6895732-30b6-48e5-b5e3-578867d378c6	198f888a-1376-4228-906a-5c45af912633	comprador	Albidair	2025-07-26 16:13:05.60038+00	\N	UN	\N	\N	\N	0	0	\N	t
51b9505d-dd9e-4633-a207-52ca90a2430c	198f888a-1376-4228-906a-5c45af912633	fornecedor	Caio	2025-07-26 16:13:05.600973+00	\N	UN	\N	\N	\N	0	0	\N	t
6fab9254-0798-4e52-a69a-0b772c073ee1	198f888a-1376-4228-906a-5c45af912633	produto	Repolho	2025-07-26 16:13:05.601558+00	\N	UN	\N	\N	\N	0	0	\N	t
6a4eaeeb-4415-49c3-be9f-319f90eb822f	198f888a-1376-4228-906a-5c45af912633	comprador	Geovane	2025-07-26 16:13:05.602147+00	\N	UN	\N	\N	\N	0	0	\N	t
66f47671-daee-4e67-b67b-b498694a44c3	198f888a-1376-4228-906a-5c45af912633	fornecedor	Lizete	2025-07-26 16:13:05.602771+00	\N	UN	\N	\N	\N	0	0	\N	t
bea163b8-ad42-4fec-88d9-99429b21fcb0	198f888a-1376-4228-906a-5c45af912633	produto	Loro	2025-07-26 16:13:05.603372+00	\N	UN	\N	\N	\N	0	0	\N	t
327b2f3e-9bd8-4955-a937-0938ec16b0d6	198f888a-1376-4228-906a-5c45af912633	comprador	Fabiane	2025-07-26 16:13:05.603968+00	\N	UN	\N	\N	\N	0	0	\N	t
d177cbe2-0134-4b80-ad5c-ab2c341a0e0b	198f888a-1376-4228-906a-5c45af912633	fornecedor	Zezebri	2025-07-26 16:13:05.604571+00	\N	UN	\N	\N	\N	0	0	\N	t
af0ab5f4-8da1-4771-97fd-f31b7a751935	198f888a-1376-4228-906a-5c45af912633	produto	Alface roxa	2025-07-26 16:13:05.605156+00	\N	UN	\N	\N	\N	0	0	\N	t
149ed348-46c2-4536-8f83-8cdd4e8c60f9	198f888a-1376-4228-906a-5c45af912633	comprador	Jajá e junior	2025-07-26 16:13:05.60585+00	\N	UN	\N	\N	\N	0	0	\N	t
6e084f91-29fe-4660-85dd-f6cd4b63bbb7	198f888a-1376-4228-906a-5c45af912633	fornecedor	Adriano	2025-07-26 16:13:05.606445+00	\N	UN	\N	\N	\N	0	0	\N	t
0670b6b1-c1fd-40b5-8e70-e7c8e0b016eb	198f888a-1376-4228-906a-5c45af912633	produto	Salvia	2025-07-26 16:13:05.607077+00	\N	UN	\N	\N	\N	0	0	\N	t
7d69bc18-3718-4497-a9e3-5c6ac819bb8e	198f888a-1376-4228-906a-5c45af912633	comprador	Tuyane	2025-07-26 16:13:05.607668+00	\N	UN	\N	\N	\N	0	0	\N	t
640ea4c8-9c9a-4a47-a339-b145cf949ade	198f888a-1376-4228-906a-5c45af912633	fornecedor	Eloilso	2025-07-26 16:13:05.608283+00	\N	UN	\N	\N	\N	0	0	\N	t
06015138-145a-4fdd-b648-a85a38477448	198f888a-1376-4228-906a-5c45af912633	produto	Aipo	2025-07-26 16:13:05.609285+00	\N	UN	\N	\N	\N	0	0	\N	t
0190c607-b62a-4bb7-b5bc-45207a6fad9e	198f888a-1376-4228-906a-5c45af912633	comprador	BR	2025-07-26 16:13:05.609978+00	\N	UN	\N	\N	\N	0	0	\N	t
356f0502-4209-4e03-8b2c-4a7a74b8a7cd	198f888a-1376-4228-906a-5c45af912633	fornecedor	Mateus	2025-07-26 16:13:05.61119+00	\N	UN	\N	\N	\N	0	0	\N	t
0bbe3a29-dbbe-4582-9df8-c09bb3d3fe3b	198f888a-1376-4228-906a-5c45af912633	produto	Moca alecrim	2025-07-26 16:13:05.611853+00	\N	UN	\N	\N	\N	0	0	\N	t
1adcd078-3a73-4718-ae7a-7eb269d8e7f2	198f888a-1376-4228-906a-5c45af912633	comprador	Edmilson	2025-07-26 16:13:05.612463+00	\N	UN	\N	\N	\N	0	0	\N	t
b9508eb6-86cb-4bcf-9205-2a9ccb23e510	198f888a-1376-4228-906a-5c45af912633	fornecedor	Marli	2025-07-26 16:13:05.613072+00	\N	UN	\N	\N	\N	0	0	\N	t
47bd2264-d22a-4383-a289-ce92fda774bf	198f888a-1376-4228-906a-5c45af912633	produto	Acelga	2025-07-26 16:13:05.613682+00	\N	UN	\N	\N	\N	0	0	\N	t
e282e25d-9ed2-47f8-af41-eef39791b7f0	198f888a-1376-4228-906a-5c45af912633	comprador	Derson	2025-07-26 16:13:05.61428+00	\N	UN	\N	\N	\N	0	0	\N	t
4d7281a2-9d74-44ef-ac3b-01d97c955aac	198f888a-1376-4228-906a-5c45af912633	fornecedor	Casarão	2025-07-26 16:13:05.614895+00	\N	UN	\N	\N	\N	0	0	\N	t
1167f8c8-061f-44bd-85ea-0f541e2d4ff9	198f888a-1376-4228-906a-5c45af912633	produto	Masso nabo	2025-07-26 16:13:05.615511+00	\N	UN	\N	\N	\N	0	0	\N	t
26ad267b-7769-4e41-9ba7-c7fc559c540b	198f888a-1376-4228-906a-5c45af912633	comprador	Agro Terê	2025-07-26 16:13:05.616102+00	\N	UN	\N	\N	\N	0	0	\N	t
c7815288-ed75-4a45-890d-2e7fafac07b7	198f888a-1376-4228-906a-5c45af912633	fornecedor	Aline	2025-07-26 16:13:05.61671+00	\N	UN	\N	\N	\N	0	0	\N	t
d2105d73-e92a-499b-bc30-36f389f551c1	198f888a-1376-4228-906a-5c45af912633	produto	Radichio	2025-07-26 16:13:05.617294+00	\N	UN	\N	\N	\N	0	0	\N	t
9f6c03fd-2001-42f8-8c1f-2ef80ed1082f	198f888a-1376-4228-906a-5c45af912633	fornecedor	Takeo	2025-07-26 16:13:05.618489+00	\N	UN	\N	\N	\N	0	0	\N	t
be700ce5-7931-49ed-99ff-73e00a0aee56	198f888a-1376-4228-906a-5c45af912633	produto	Coentro	2025-07-26 16:13:05.619079+00	\N	UN	\N	\N	\N	0	0	\N	t
74126117-3810-4b4d-b330-0a9f599889ee	198f888a-1376-4228-906a-5c45af912633	comprador	Acelmo	2025-07-26 16:13:05.619675+00	\N	UN	\N	\N	\N	0	0	\N	t
da0222ae-5d2f-4273-aa31-2309ff1d11b6	198f888a-1376-4228-906a-5c45af912633	produto	Poro	2025-07-26 16:13:05.620847+00	\N	UN	\N	\N	\N	0	0	\N	t
9422ff7e-e2af-42e2-af58-189e23134ec0	198f888a-1376-4228-906a-5c45af912633	comprador	Agro costa	2025-07-26 16:13:05.621443+00	\N	UN	\N	\N	\N	0	0	\N	t
51b85f24-843c-4af7-ae46-cd9b93f93c22	198f888a-1376-4228-906a-5c45af912633	fornecedor	Nando	2025-07-26 16:13:05.622285+00	\N	UN	\N	\N	\N	0	0	\N	t
9282c9e7-375e-4ff4-838d-eec255cde4b8	198f888a-1376-4228-906a-5c45af912633	produto	Caixotao	2025-07-26 16:13:05.622979+00	\N	UN	\N	\N	\N	0	0	\N	t
bb73d3e5-6311-4b3e-a921-6cf967f2bf62	198f888a-1376-4228-906a-5c45af912633	comprador	Alexandre	2025-07-26 16:13:05.623598+00	\N	UN	\N	\N	\N	0	0	\N	t
178d9d00-b507-4044-8195-8297abdb376d	198f888a-1376-4228-906a-5c45af912633	fornecedor	Jander	2025-07-26 16:13:05.624207+00	\N	UN	\N	\N	\N	0	0	\N	t
e27327b2-551e-4abf-8baf-4745930c9e35	198f888a-1376-4228-906a-5c45af912633	produto	Saco isterco	2025-07-26 16:13:05.624872+00	\N	UN	\N	\N	\N	0	0	\N	t
a31cdaf3-2ec1-4a95-b77c-d7c4b864e328	198f888a-1376-4228-906a-5c45af912633	comprador	Guarilha	2025-07-26 16:13:05.625579+00	\N	UN	\N	\N	\N	0	0	\N	t
3427ac5a-36a3-4897-8886-6c7689bcf2e5	198f888a-1376-4228-906a-5c45af912633	fornecedor	Willian	2025-07-26 16:13:05.626376+00	\N	UN	\N	\N	\N	0	0	\N	t
b49aaef4-f1e0-4878-8561-5d04af0d480a	198f888a-1376-4228-906a-5c45af912633	comprador	Tutti Fruti	2025-07-26 16:13:05.62771+00	\N	UN	\N	\N	\N	0	0	\N	t
7b516f63-0bee-4658-9ac9-f746efba5ddb	198f888a-1376-4228-906a-5c45af912633	fornecedor	Aline casa	2025-07-26 16:13:05.628491+00	\N	UN	\N	\N	\N	0	0	\N	t
b794414b-4ce7-4b01-ba6a-ad4e6b3eeba8	198f888a-1376-4228-906a-5c45af912633	produto	Pregado	2025-07-26 16:13:05.629104+00	\N	UN	\N	\N	\N	0	0	\N	t
a5fa3a12-ef12-44e4-89e0-baf89af7395c	198f888a-1376-4228-906a-5c45af912633	comprador	Gleiciel	2025-07-26 16:13:05.629802+00	\N	UN	\N	\N	\N	0	0	\N	t
1019a40f-5245-41d3-9c89-967dd1eb81a1	198f888a-1376-4228-906a-5c45af912633	fornecedor	Lucas	2025-07-26 16:13:05.630521+00	\N	UN	\N	\N	\N	0	0	\N	t
b183e3d6-0d16-4131-8c36-51b58eee2862	198f888a-1376-4228-906a-5c45af912633	produto	Mostarda	2025-07-26 16:13:05.631194+00	\N	UN	\N	\N	\N	0	0	\N	t
9f805c2a-b738-4660-a946-149010fc16a5	198f888a-1376-4228-906a-5c45af912633	comprador	Fabio	2025-07-26 16:13:05.631818+00	\N	UN	\N	\N	\N	0	0	\N	t
adc161d7-07c6-4443-a7b1-26f6256565da	198f888a-1376-4228-906a-5c45af912633	fornecedor	Miguel	2025-07-26 16:13:05.632433+00	\N	UN	\N	\N	\N	0	0	\N	t
dd32e1b1-ba15-4112-910b-1423c881f7e1	198f888a-1376-4228-906a-5c45af912633	produto	Pix	2025-07-26 16:13:05.633166+00	\N	UN	\N	\N	\N	0	0	\N	t
21d98553-6d7d-4e2d-b076-bfcd32fa8e6a	198f888a-1376-4228-906a-5c45af912633	comprador	Waguinho	2025-07-26 16:13:05.633771+00	\N	UN	\N	\N	\N	0	0	\N	t
67411e9d-be71-4696-97e4-7aaf507ea920	198f888a-1376-4228-906a-5c45af912633	fornecedor	Luis esterco	2025-07-26 16:13:05.634361+00	\N	UN	\N	\N	\N	0	0	\N	t
54d9b344-33de-444d-85ea-fa52b4319d05	198f888a-1376-4228-906a-5c45af912633	comprador	Felipe tunin	2025-07-26 16:13:05.634952+00	\N	UN	\N	\N	\N	0	0	\N	t
723f4d29-5e00-42fc-90a0-1fed6947492e	198f888a-1376-4228-906a-5c45af912633	fornecedor	João chencher	2025-07-26 16:13:05.635555+00	\N	UN	\N	\N	\N	0	0	\N	t
d57c2fe4-e1d0-48cd-ae6e-42664b7b6d68	198f888a-1376-4228-906a-5c45af912633	comprador	Tarcísio	2025-07-26 16:13:05.636151+00	\N	UN	\N	\N	\N	0	0	\N	t
f13b408d-1a4a-4cd6-a8e6-8b67ce25f156	198f888a-1376-4228-906a-5c45af912633	fornecedor	Ivan	2025-07-26 16:13:05.636816+00	\N	UN	\N	\N	\N	0	0	\N	t
df20f820-8c24-443d-9120-d1ef2a2fe429	198f888a-1376-4228-906a-5c45af912633	comprador	Dijalma	2025-07-26 16:13:05.637418+00	\N	UN	\N	\N	\N	0	0	\N	t
6482be87-3134-43f0-a454-5024f481d578	198f888a-1376-4228-906a-5c45af912633	fornecedor	Aroldo	2025-07-26 16:13:05.638008+00	\N	UN	\N	\N	\N	0	0	\N	t
f4620be4-086e-47e7-a122-ccfe54aae08d	198f888a-1376-4228-906a-5c45af912633	comprador	Lorenço	2025-07-26 16:13:05.638591+00	\N	UN	\N	\N	\N	0	0	\N	t
70f11784-dc05-48ed-87c6-ba380cea9ac1	198f888a-1376-4228-906a-5c45af912633	fornecedor	Lorinha	2025-07-26 16:13:05.639189+00	\N	UN	\N	\N	\N	0	0	\N	t
95caa28d-fd25-4c4e-9fac-c83f5682d354	198f888a-1376-4228-906a-5c45af912633	comprador	Bibi	2025-07-26 16:13:05.639809+00	\N	UN	\N	\N	\N	0	0	\N	t
27b80454-108c-434c-91de-f6da67a56ed1	198f888a-1376-4228-906a-5c45af912633	fornecedor	Getulin	2025-07-26 16:13:05.640531+00	\N	UN	\N	\N	\N	0	0	\N	t
02f9e0a2-a95a-43ac-86d0-e45198123dbd	198f888a-1376-4228-906a-5c45af912633	comprador	Elivelto	2025-07-26 16:13:05.641133+00	\N	UN	\N	\N	\N	0	0	\N	t
cd6d1093-c955-492e-b451-f9d64b2432ac	198f888a-1376-4228-906a-5c45af912633	fornecedor	Dudu	2025-07-26 16:13:05.641811+00	\N	UN	\N	\N	\N	0	0	\N	t
78b5e960-9e7b-4494-bdf0-38e39b7ad718	198f888a-1376-4228-906a-5c45af912633	comprador	Paquy	2025-07-26 16:13:05.642769+00	\N	UN	\N	\N	\N	0	0	\N	t
1ef51e1e-6f6d-4c6c-baa6-1a49320022a6	198f888a-1376-4228-906a-5c45af912633	fornecedor	Thiago	2025-07-26 16:13:05.643532+00	\N	UN	\N	\N	\N	0	0	\N	t
2de1c551-a01e-4ce4-af1e-75e730538713	198f888a-1376-4228-906a-5c45af912633	comprador	Marquinho cebola	2025-07-26 16:13:05.644162+00	\N	UN	\N	\N	\N	0	0	\N	t
3d73f27e-08b2-4e31-9df4-e85670b45911	198f888a-1376-4228-906a-5c45af912633	comprador	Serra agrícola	2025-07-26 16:13:05.644808+00	\N	UN	\N	\N	\N	0	0	\N	t
c026d6d4-f3ce-4464-9fd1-2e3ad07fb5bb	198f888a-1376-4228-906a-5c45af912633	comprador	Jakeline	2025-07-26 16:13:05.645445+00	\N	UN	\N	\N	\N	0	0	\N	t
0df32ca5-a13d-4e3f-a864-4c05ae72bca1	198f888a-1376-4228-906a-5c45af912633	comprador	Rony bethel	2025-07-26 16:13:05.646168+00	\N	UN	\N	\N	\N	0	0	\N	t
3ba17676-23db-45c1-80bf-10095d2236a7	198f888a-1376-4228-906a-5c45af912633	comprador	Neuza e filho	2025-07-26 16:13:05.646792+00	\N	UN	\N	\N	\N	0	0	\N	t
741d184d-c633-4645-b962-775b2bc688cb	198f888a-1376-4228-906a-5c45af912633	comprador	Dione	2025-07-26 16:13:05.647387+00	\N	UN	\N	\N	\N	0	0	\N	t
2dc5210c-51ee-4448-ace6-06ddf7355515	198f888a-1376-4228-906a-5c45af912633	comprador	Hortifruti	2025-07-26 16:13:05.647977+00	\N	UN	\N	\N	\N	0	0	\N	t
436eb83b-d372-4943-b0fb-5bddcbaeccd2	198f888a-1376-4228-906a-5c45af912633	comprador	Wanderson v l	2025-07-26 16:13:05.648572+00	\N	UN	\N	\N	\N	0	0	\N	t
25c702a1-ac11-4a09-b336-8072263f5f92	f17597af-3441-42a2-b6f4-1d3f03475662	produto	Alface americana 	2025-07-28 00:34:43.289595+00	\N	UN	\N	\N	\N	0	0	\N	t
a48d04b6-a1c3-42b3-855c-3812abc8616f	f17597af-3441-42a2-b6f4-1d3f03475662	comprador	JFC	2025-07-28 00:34:50.554374+00	\N	UN	\N	\N	\N	0	0	\N	t
b20716c7-806f-448d-b34c-4e9ed67a0dcc	f17597af-3441-42a2-b6f4-1d3f03475662	fornecedor	Rezende	2025-07-28 00:35:04.86361+00	\N	UN	\N	\N	\N	0	0	\N	t
b2728738-8dd8-42cb-b284-d96238134d84	198f888a-1376-4228-906a-5c45af912633	fornecedor	Thiago chencher 	2025-07-28 23:11:25.300578+00	\N	UN	\N	\N	\N	0	0	\N	t
dbb4e4c3-afaa-4c15-99ef-b36d6f05d6cf	198f888a-1376-4228-906a-5c45af912633	comprador	Thiago chencher 	2025-07-28 23:12:27.476227+00	\N	UN	\N	\N	\N	0	0	\N	t
f961c9fb-b921-4027-9879-2dc4dc206d6d	198f888a-1376-4228-906a-5c45af912633	produto	Alface romana 	2025-07-28 23:24:28.071412+00	\N	UN	\N	\N	\N	0	0	\N	t
1d35aded-6e89-4a07-9e12-f5c2f605a3c2	198f888a-1376-4228-906a-5c45af912633	fornecedor	Vane	2025-07-29 00:04:38.722214+00	\N	UN	\N	\N	\N	0	0	\N	t
eb9ec307-c38b-497e-a710-c8373deb4cd3	198f888a-1376-4228-906a-5c45af912633	comprador	Vegetable	2025-07-26 16:13:05.617885+00	\N	UN	\N	\N	\N	0	0	\N	t
3627f529-295b-43bd-b59e-c08c6223b347	198f888a-1376-4228-906a-5c45af912633	fornecedor	Maria 	2025-07-29 17:04:15.174952+00	\N	UN	\N	\N	\N	0	0	\N	t
4dad28e7-f69f-472a-90cf-6a1edbd4dac7	198f888a-1376-4228-906a-5c45af912633	fornecedor	Sanin 	2025-07-29 18:28:27.54768+00	\N	UN	\N	\N	\N	0	0	\N	t
61ff2f83-b725-4e93-9b17-b7b279a1ea69	198f888a-1376-4228-906a-5c45af912633	produto	Alecrin	2025-07-26 18:59:45.014643+00	\N	UN	\N	\N	\N	0	0	\N	t
1b334de2-9d22-4613-893e-bc35fe30689e	198f888a-1376-4228-906a-5c45af912633	fornecedor	Gustavo 	2025-07-29 18:30:35.751427+00	\N	UN	\N	\N	\N	0	0	\N	t
865ac215-156e-45d0-bcd1-9af5c948d36e	198f888a-1376-4228-906a-5c45af912633	fornecedor	Jefin 	2025-07-29 18:34:56.459738+00	\N	UN	\N	\N	\N	0	0	\N	t
67adf6d3-62d2-471a-b7a6-1bf85c12cd68	198f888a-1376-4228-906a-5c45af912633	fornecedor	Toninho 	2025-07-29 18:41:45.5081+00	\N	UN	\N	\N	\N	0	0	\N	t
58d1908d-80ed-48e6-9c53-bd127d4e7147	198f888a-1376-4228-906a-5c45af912633	comprador	Rodrigo  água quente 	2025-07-29 22:23:30.629043+00	\N	UN	\N	\N	\N	0	0	\N	t
a83847ec-2637-4a11-83a8-792c18cdc26d	198f888a-1376-4228-906a-5c45af912633	fornecedor	Rodrigo  fazenda 	2025-07-26 16:13:05.620256+00	\N	UN	\N	\N	\N	0	0	\N	t
5f1c2f46-e809-44a2-855d-bfc07f4095a8	198f888a-1376-4228-906a-5c45af912633	produto	Compressor 	2025-07-30 08:37:34.864256+00	\N	UN	\N	\N	\N	0	0	\N	t
6c44c520-7559-4e0c-8b6c-9c041ab0baf8	198f888a-1376-4228-906a-5c45af912633	produto	Ferro 	2025-07-30 08:37:41.308666+00	\N	UN	\N	\N	\N	0	0	\N	t
2269be50-9e3b-46b7-8be9-6ec0a8690bf3	198f888a-1376-4228-906a-5c45af912633	produto	Celular 	2025-07-30 08:37:50.237347+00	\N	UN	\N	\N	\N	0	0	\N	t
e8bc2a79-7aad-44a5-8ee7-27897e4af9bd	198f888a-1376-4228-906a-5c45af912633	produto	Rezende 	2025-07-30 08:37:59.274483+00	\N	UN	\N	\N	\N	0	0	\N	t
35726222-c720-429f-8d90-8caa217070c7	198f888a-1376-4228-906a-5c45af912633	produto	Troco	2025-07-30 08:38:06.785941+00	\N	UN	\N	\N	\N	0	0	\N	t
82354ec9-2253-4fba-a00c-a2654f2483c1	198f888a-1376-4228-906a-5c45af912633	comprador	Caio dispesas	2025-07-30 08:38:23.630214+00	\N	UN	\N	\N	\N	0	0	\N	t
949ec896-5c64-4ff5-a0f3-719886a15278	198f888a-1376-4228-906a-5c45af912633	produto	Luz	2025-07-30 08:43:25.967373+00	\N	UN	\N	\N	\N	0	0	\N	t
2139ef15-99a7-4b53-9cb3-e44a4897cdd0	198f888a-1376-4228-906a-5c45af912633	produto	Semente de aipo 	2025-07-30 08:49:05.454091+00	\N	UN	\N	\N	\N	0	0	\N	t
6f700a88-d96c-4934-874f-41a3dc242a8d	198f888a-1376-4228-906a-5c45af912633	produto	Livaldo	2025-07-30 08:51:17.636251+00	\N	UN	\N	\N	\N	0	0	\N	t
87c20a4c-cee2-45f3-a704-62808c9d54b6	198f888a-1376-4228-906a-5c45af912633	produto	Camera	2025-07-30 08:51:23.61401+00	\N	UN	\N	\N	\N	0	0	\N	t
e1fae5e3-9e12-46b9-8469-a0730eab3faf	198f888a-1376-4228-906a-5c45af912633	produto	Internet 	2025-07-30 08:51:28.781582+00	\N	UN	\N	\N	\N	0	0	\N	t
93a6e62b-5bd6-40a2-b70a-c79966c1b8eb	198f888a-1376-4228-906a-5c45af912633	produto	Isterco 	2025-07-30 08:54:42.189244+00	\N	UN	\N	\N	\N	0	0	\N	t
6ee8bb10-8d99-4e95-939d-d214d3804680	198f888a-1376-4228-906a-5c45af912633	fornecedor	Helena 	2025-07-30 16:07:54.427812+00	\N	UN	\N	\N	\N	0	0	\N	t
bbc6d932-5fb6-41ed-a6b1-b5d331502068	198f888a-1376-4228-906a-5c45af912633	fornecedor	Angeli 	2025-07-30 19:44:09.725991+00	\N	UN	\N	\N	\N	0	0	\N	t
4a2dc38d-465e-4d30-967b-b70e84aa27e2	40d3bbd4-15d7-47c8-9501-564210881b96	comprador	Kremer	2025-07-31 06:23:29.535913+00	\N	UN	\N	\N	\N	0	0	\N	t
2bd68ab7-358a-474e-ac0c-575c7fd510cb	198f888a-1376-4228-906a-5c45af912633	fornecedor	Gilsin	2025-08-01 09:03:09.660037+00	\N	UN	\N	\N	\N	0	0	\N	t
420ec5a8-2401-4c27-97fe-ef1f75bacba1	198f888a-1376-4228-906a-5c45af912633	fornecedor	Dioenes	2025-08-02 21:36:47.571+00	\N	UN	\N	\N	\N	0	0	\N	t
dcc885e7-402d-4123-9cba-d6ee032cdf58	198f888a-1376-4228-906a-5c45af912633	fornecedor	Jenifer	2025-08-02 23:18:18.869699+00	\N	UN	\N	\N	\N	0	0	\N	t
e5ae5d0f-c7d1-4cf4-be1a-c2294f98d61d	198f888a-1376-4228-906a-5c45af912633	produto	Alface crespa 36 pé 	2025-08-04 21:19:36.820328+00	\N	UN	\N	\N	\N	0	0	\N	t
708f85d6-6c1f-42ca-9791-d9255a35f547	198f888a-1376-4228-906a-5c45af912633	fornecedor	Neuza 	2025-08-04 21:36:01.677906+00	\N	UN	\N	\N	\N	0	0	\N	t
582a573c-a721-4c63-88e4-f7774b2c5537	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Mostarda 	2025-08-06 23:36:48.128975+00	\N	UN	\N	\N	\N	0	0	\N	t
995c892c-ff2e-44fd-8a8e-14013303f4ed	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Queiroz e guarilha 	2025-08-06 23:37:08.697878+00	\N	UN	\N	\N	\N	0	0	\N	t
8afdfebf-1565-46e4-885b-f13373c011c3	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Maravilha da serra 	2025-08-06 23:37:29.935782+00	\N	UN	\N	\N	\N	0	0	\N	t
71b1c330-43fa-4189-85f9-0dbaf08d71a2	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Folhas da serra 	2025-08-06 23:37:46.920463+00	\N	UN	\N	\N	\N	0	0	\N	t
dc02c61f-b8a0-4beb-a369-36bbf338c392	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Agro Costa 	2025-08-06 23:37:54.823993+00	\N	UN	\N	\N	\N	0	0	\N	t
6256267b-bb82-4057-b138-7f790a497664	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Sandro	2025-08-06 23:38:06.23179+00	\N	UN	\N	\N	\N	0	0	\N	t
76ffb0f1-4855-4662-b7ac-30c7c05efd2e	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	2 irmão 	2025-08-06 23:38:28.545621+00	\N	UN	\N	\N	\N	0	0	\N	t
f8dcb173-9968-4572-9ae1-7a0cb52166c3	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Thiago chencher 	2025-08-06 23:38:42.617056+00	\N	UN	\N	\N	\N	0	0	\N	t
4e52959a-24f6-41b9-8150-d684a0b155e7	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Vinicius Vila 	2025-08-06 23:38:53.962413+00	\N	UN	\N	\N	\N	0	0	\N	t
0a177bf6-1b49-4913-9c43-5b977577a376	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Alface 	2025-08-07 00:16:25.32948+00	\N	UN	\N	\N	\N	0	0	\N	t
eadb6a68-80fe-4da6-8ee7-f90410306622	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Brocolis americano 	2025-08-07 00:16:39.162856+00	\N	UN	\N	\N	\N	0	0	\N	t
0063153c-8aa1-4ff8-9a66-5177d9afb8c8	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Brocolis comum 	2025-08-07 00:16:49.011595+00	\N	UN	\N	\N	\N	0	0	\N	t
6c841694-9cda-4c65-b32b-f3fc2b84ad67	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Mauro	2025-08-07 21:09:29.217765+00	\N	UN	\N	\N	\N	0	0	\N	t
f61faa84-b310-49fc-a811-5f6bf748fc63	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	Enel 	2025-08-07 21:13:10.74028+00	\N	UN	\N	\N	\N	0	0	\N	t
4bc3d8f0-d95a-46b8-a117-6a43767a6ddb	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	Arrendamento	2025-08-07 21:13:25.329955+00	\N	UN	\N	\N	\N	0	0	\N	t
b8633c45-6775-4f6e-9309-54d7a80cb083	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	Marcelo esterco 	2025-08-07 21:13:34.304112+00	\N	UN	\N	\N	\N	0	0	\N	t
3187de6f-70b3-498a-9704-c37fee264c8a	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	Comercial friburguence 	2025-08-07 21:13:51.061161+00	\N	UN	\N	\N	\N	0	0	\N	t
4c3fde41-4233-4759-8346-ea99489b20fa	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	João grilo	2025-08-07 21:14:04.323977+00	\N	UN	\N	\N	\N	0	0	\N	t
9844cf28-2c0c-434f-b4c3-38d749abdb47	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	Chico Veloso 	2025-08-07 21:15:48.434932+00	\N	UN	\N	\N	\N	0	0	\N	t
8063d955-a2ec-41a1-936d-b66ed6dbd0b0	198f888a-1376-4228-906a-5c45af912633	comprador	Aroldo pix	2025-08-08 09:11:04.975525+00	\N	UN	\N	\N	\N	0	0	\N	t
5c3a47c2-ea23-4ab5-a9cb-d9018b66680d	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	produto	tomate 	2025-08-09 18:08:35.379728+00	\N	UN	\N	\N	\N	0	0	\N	t
58340249-5cd6-4555-9d62-0d2f19817a1d	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	produto	pimentão	2025-08-09 18:08:53.706208+00	\N	UN	\N	\N	\N	0	0	\N	t
7a00632d-9867-4cd5-88e9-6eda6fe70399	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	produto	Abobrinha	2025-08-09 18:09:05.350475+00	\N	UN	\N	\N	\N	0	0	\N	t
305793ee-4c2e-4249-b2bf-2f0499035427	198f888a-1376-4228-906a-5c45af912633	comprador	Dudu vica	2025-08-10 17:23:24.059095+00	\N	UN	\N	\N	\N	0	0	\N	t
b5772fe5-7e83-4afe-a7d5-d61c56dc73cc	198f888a-1376-4228-906a-5c45af912633	produto	Mangericao pequeno 	2025-08-10 17:24:32.871436+00	\N	UN	\N	\N	\N	0	0	\N	t
4b100250-b52a-40a6-bded-6b7e1128b9a6	198f888a-1376-4228-906a-5c45af912633	produto	Moca tomilho 	2025-08-10 17:35:27.527065+00	\N	UN	\N	\N	\N	0	0	\N	t
8fa29e2c-e443-4c5d-ab68-7a26bb26b713	198f888a-1376-4228-906a-5c45af912633	fornecedor	Aroldo pix 	2025-08-11 08:22:11.990063+00	\N	UN	\N	\N	\N	0	0	\N	t
dae0451f-0377-4b58-b10d-ed328c6df9e3	198f888a-1376-4228-906a-5c45af912633	produto	Alfavaca 	2025-08-12 08:40:04.879795+00	\N	UN	\N	\N	\N	0	0	\N	t
f3a5674e-7e95-4a95-acc3-33e00dffb296	198f888a-1376-4228-906a-5c45af912633	fornecedor	Ivanete 	2025-08-14 20:41:11.540389+00	\N	UN	\N	\N	\N	0	0	\N	t
1a1871b1-5b4c-483b-9dfc-5888b0835add	198f888a-1376-4228-906a-5c45af912633	comprador	Clebinho 71	2025-08-15 21:23:49.621612+00	\N	UN	\N	\N	\N	0	0	\N	t
e899cb68-9795-4358-b71b-897b799e1ea6	f2e1b562-db8e-4db4-ac39-6749cf5fea40	produto	SOBRA	2025-07-26 15:33:02.015012+00	\N	UN	\N	\N	\N	0	0	\N	t
fac36571-c7b1-4b9c-ab53-fde0dea30672	b53f72c4-7bdc-457e-89a4-1a636b132608	produto	mudas de crespa	2025-07-26 16:06:22.038965+00	\N	UN	\N	\N	\N	0	0	\N	t
08d9a6ce-2c1d-4863-bdfb-6a7bd7e53034	b53f72c4-7bdc-457e-89a4-1a636b132608	produto	Esterco	2025-07-26 16:06:22.048405+00	\N	UN	\N	\N	\N	0	0	\N	t
86dd55c7-f05e-45e4-89be-20408bf90ae5	b53f72c4-7bdc-457e-89a4-1a636b132608	produto	Mudas de brócolis	2025-07-26 16:06:22.049168+00	\N	UN	\N	\N	\N	0	0	\N	t
d66c3284-e686-4e32-8ac4-a1b82c74e42d	b53f72c4-7bdc-457e-89a4-1a636b132608	produto	mudas de chicoria	2025-07-26 16:06:22.049943+00	\N	UN	\N	\N	\N	0	0	\N	t
94f3bc70-6467-4884-9aed-19dc2eba024d	198f888a-1376-4228-906a-5c45af912633	produto	Caixotao 	2025-07-29 08:43:32.174083+00	\N	UN	\N	\N	\N	0	0	\N	t
caac3bb2-0ac6-4473-9694-cfc8d79b0a7c	198f888a-1376-4228-906a-5c45af912633	produto	Mostarda 	2025-07-29 08:58:47.718325+00	\N	UN	\N	\N	\N	0	0	\N	t
d6582eeb-cf1b-4ca9-ae82-d18f52a3017c	198f888a-1376-4228-906a-5c45af912633	produto	Dia	2025-07-29 22:25:01.555154+00	\N	UN	\N	\N	\N	0	0	\N	t
22f6190c-6c1e-4866-be14-7c0379cb8671	198f888a-1376-4228-906a-5c45af912633	produto	Ferro	2025-07-30 08:36:27.758712+00	\N	UN	\N	\N	\N	0	0	\N	t
0b4b08e1-cf6f-4d3c-a820-7778e64980d5	198f888a-1376-4228-906a-5c45af912633	produto	Troco 	2025-07-30 08:36:46.388691+00	\N	UN	\N	\N	\N	0	0	\N	t
126a8439-d50b-4cfd-bd89-9ca89dcc6e80	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Arrendamento 	2025-08-07 21:16:00.529422+00	\N	UN	\N	\N	\N	0	0	\N	t
0879d04d-3f10-4adc-b3a3-35f5d711e227	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Casa de adubo 	2025-08-12 21:50:14.251308+00	\N	UN	\N	\N	\N	0	0	\N	t
8e742c03-2df5-42a4-a24f-5d00d5de1a10	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	João grilo	2025-08-12 21:50:21.825138+00	\N	UN	\N	\N	\N	0	0	\N	t
a8cc0291-97db-4b4b-9968-77e6bf2bacbd	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Ivan do leite 	2025-08-12 21:50:28.441696+00	\N	UN	\N	\N	\N	0	0	\N	t
f448dc49-1d3c-4623-92b2-2b813a422832	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Enel	2025-08-12 21:50:32.381902+00	\N	UN	\N	\N	\N	0	0	\N	t
9e89da76-4e3f-4fa8-a0f5-968c40b1a5d2	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Marcelo esterco 	2025-08-12 21:50:46.805697+00	\N	UN	\N	\N	\N	0	0	\N	t
e4a1fede-f0c5-458a-bed8-68f331a8a421	f17597af-3441-42a2-b6f4-1d3f03475662	produto	Adubo	2025-07-28 00:34:56.819093+00	\N	UN	\N	\N	\N	0	0	\N	t
0afaac97-1d11-4bd3-87e2-941d2330a87c	f17597af-3441-42a2-b6f4-1d3f03475662	produto	Rabanete	2025-08-16 14:00:18.737248+00	\N	UN	\N	\N	\N	0	0	\N	t
4ca4d3f0-22f9-404e-9d26-ae96446c48c3	f17597af-3441-42a2-b6f4-1d3f03475662	comprador	João 3B	2025-08-16 14:00:51.026859+00	\N	UN	\N	\N	\N	0	0	\N	t
0cd40ccc-cdc3-4ef0-a2c7-857391070cdf	f17597af-3441-42a2-b6f4-1d3f03475662	fornecedor	Maria	2025-08-16 14:01:13.575684+00	\N	UN	\N	\N	\N	0	0	\N	t
aa04c8d8-47cb-4d31-9747-74ea0444ce98	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	fornecedor	Thaís 	2025-08-16 16:07:52.283414+00	\N	UN	\N	\N	\N	0	0	\N	t
c88ad389-e432-434b-8e14-15deddd1923a	198f888a-1376-4228-906a-5c45af912633	comprador	Fernando Amorim 	2025-08-18 17:32:15.512522+00	\N	UN	\N	\N	\N	0	0	\N	t
b23cbae4-fb43-482d-a967-56407f066d5a	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	comprador	Abc	2025-08-19 12:07:57.380303+00	\N	UN	\N	\N	\N	0	0	\N	t
f43166cc-6a9f-4e1c-a6a7-6461b84ae8b2	198f888a-1376-4228-906a-5c45af912633	fornecedor	Pingo 	2025-08-19 18:33:20.880299+00	\N	UN	\N	\N	\N	0	0	\N	t
4d3580a3-222d-4ab7-9b9c-3f71d51a2aa1	091e21fb-4715-4fe8-b006-36e88642b0b2	comprador	Sitio esperança 	2025-08-19 22:36:25.019384+00	\N	UN	\N	\N	\N	0	0	\N	t
8fb0e713-a20f-4fd5-a7e1-e05acb928ba9	120a5304-54be-4290-b0cc-ed1de8d3b16b	produto	teste	2025-08-20 01:26:09.507899+00	\N	UN	\N	\N	\N	0	0	\N	t
7d4c2083-d1c0-4dc9-ae45-bd83914a004c	120a5304-54be-4290-b0cc-ed1de8d3b16b	comprador	teste	2025-08-20 01:26:15.154548+00	\N	UN	\N	\N	\N	0	0	\N	t
2b465f70-fb35-47f4-b923-5c021ba54bad	120a5304-54be-4290-b0cc-ed1de8d3b16b	fornecedor	teste	2025-08-20 01:26:20.830237+00	\N	UN	\N	\N	\N	0	0	\N	t
6632a09a-e791-47ad-8788-ac4c5fc42da1	198f888a-1376-4228-906a-5c45af912633	comprador	Sid Montana 	2025-08-20 15:27:18.78866+00	\N	UN	\N	\N	\N	0	0	\N	t
dd7fe11a-038b-47fb-a1b6-948e57d5d4d4	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	Gabriel 	2025-08-20 22:38:27.615216+00	\N	UN	\N	\N	\N	0	0	\N	t
946423fe-a3e4-4497-970a-2acb81e56eba	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Funcionario	2025-08-20 22:39:40.464336+00	\N	UN	\N	\N	\N	0	0	\N	t
f9acbbfa-7178-4656-80a4-5a63dcab025a	091e21fb-4715-4fe8-b006-36e88642b0b2	fornecedor	João Carlos trator	2025-08-21 14:56:55.274639+00	\N	UN	\N	\N	\N	0	0	\N	t
b47521f3-f1ec-4c17-8f40-abe1a591f118	091e21fb-4715-4fe8-b006-36e88642b0b2	produto	Trator	2025-08-21 14:57:17.754284+00	\N	UN	\N	\N	\N	0	0	\N	t
549b9a47-a87d-4974-b845-ec0b5c0d31c1	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	produto	Couve flor 	2025-08-21 16:30:06.205457+00	1	CX	Legumes 	0.00	0.00	0	0	\N	t
91f6d37d-4288-4ed8-9e83-4b651e56362a	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	fornecedor	Dirceu 	2025-08-21 16:36:30.099765+00	\N	UN	\N	\N	\N	0	0	\N	t
3f86d1c8-088e-4308-bccb-5df89a4d9a9e	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	comprador	Dirceu 	2025-08-21 16:37:44.838918+00	\N	UN	\N	\N	\N	0	0	\N	t
7d2a081f-5078-4b8e-8e28-d717d7e461a0	b53f72c4-7bdc-457e-89a4-1a636b132608	fornecedor	Renato 	2025-08-21 21:02:56.692533+00	\N	UN	\N	\N	\N	0	0	\N	t
ba30a8ab-5822-42d7-a2c1-67fefb5592fb	b53f72c4-7bdc-457e-89a4-1a636b132608	fornecedor	Miel esterco 	2025-08-21 21:03:13.505229+00	\N	UN	\N	\N	\N	0	0	\N	t
765cf2bc-6e95-4c4d-93c4-067a275d811c	b53f72c4-7bdc-457e-89a4-1a636b132608	fornecedor	Comercial friburguense 	2025-08-21 21:03:41.394059+00	\N	UN	\N	\N	\N	0	0	\N	t
df933bf9-c98b-405e-903e-b0a674fbd2c5	b53f72c4-7bdc-457e-89a4-1a636b132608	fornecedor	Rezende 	2025-08-21 21:03:54.494502+00	\N	UN	\N	\N	\N	0	0	\N	t
7df20b8d-e623-4ecc-b3e7-2acff9355aab	b53f72c4-7bdc-457e-89a4-1a636b132608	fornecedor	Gustavo da muda	2025-08-21 21:04:08.468101+00	\N	UN	\N	\N	\N	0	0	\N	t
\.


--
-- Data for Name: itens_nota_fiscal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.itens_nota_fiscal (id, nota_fiscal_id, produto_nome, produto_codigo, quantidade, unidade, valor_unitario, valor_total, cfop, cst, created_at) FROM stdin;
\.


--
-- Data for Name: itens_pedido; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.itens_pedido (id, pedido_id, produto_nome, quantidade, preco_unitario, subtotal, created_at) FROM stdin;
\.


--
-- Data for Name: license_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.license_payments (id, license_id, amount, payment_date, payment_method, transaction_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.licenses (id, user_id, license_key, plan_type, start_date, end_date, is_active, max_clients, max_transactions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notas_fiscais; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notas_fiscais (id, numero, client_id, pedido_id, valor_total, data_emissao, status, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pagamentos_comissoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagamentos_comissoes (id, vendedor_id, mes_referencia, valor_comissao, data_pagamento, status, created_at) FROM stdin;
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partners (id, name, profit_share, ativo, codigo, website, company, status) FROM stdin;
ffc722b6-ba85-4d9f-b7aa-d62d7078f3d2	Rodrigo Ramos	0.7500	t	\N	\N	\N	active
bc820758-ea52-4f72-beed-d3d7782a4157	Jorge Winicius	0.2500	t	\N	\N	\N	active
efd40ece-3462-459a-8ff1-c922ecf3f4b5	Rodrigo Ramos	0.7500	t	\N	\N	\N	active
762a396e-67c3-44d4-9c15-3d821d3fe5ee	Jorge Winicius	0.2500	t	\N	\N	\N	active
b2a16e24-bd7d-4be3-afac-e268ac32448e	Rodrigo Ramos	0.7500	t	\N	\N	\N	active
da60f69c-f88d-4996-a854-ba3043f29927	Jorge Winicius	0.2500	t	\N	\N	\N	active
\.


--
-- Data for Name: payment_vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_vendors (id, payment_id, vendedor_id, porcentagem, valor_comissao, status, created_at) FROM stdin;
60f5b033-e168-4468-be50-b7d5b793ae40	b2861ba5-2d96-46c7-b020-7cd81477a1a3	a9b2d095-ab80-43fe-9cf1-8bc6e0f8c4af	10.00	5.00	pendente	2025-08-20 01:22:33.986919
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, client_id, amount, payment_date, notes, created_at) FROM stdin;
b2861ba5-2d96-46c7-b020-7cd81477a1a3	b53f72c4-7bdc-457e-89a4-1a636b132608	50.00	2025-08-20	MENSALIDADE - PIX - RODRIGO RAMOS - PICPAY 	2025-08-20 01:22:33.982313+00
\.


--
-- Data for Name: pedido_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pedido_items (id, pedido_id, product_id, quantity, unit_price, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: pedidos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pedidos (id, client_id, vendedor_id, total, status, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, description, price, category, user_id, created_at, updated_at, ativo) FROM stdin;
\.


--
-- Data for Name: produtos_feira; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.produtos_feira (id, client_id, codigo, nome, unidade_medida, preco, imagem_url) FROM stdin;
\.


--
-- Data for Name: produtos_vitrine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.produtos_vitrine (id, client_id, nome, descricao, preco, quantidade, unidade, categoria, fotos, latitude, longitude, endereco, disponivel, whatsapp, produtor_nome, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: registration_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registration_tokens (id, client_id, token_hash, expires_at, is_used) FROM stdin;
2da41a33-cd00-4de7-953b-e7772295703e	f2e1b562-db8e-4db4-ac39-6749cf5fea40	04393db36ed990a4c4cf97af8d0207eb630e478a998d00a7c649f5dd9e9f178e	2025-08-02 15:28:20.607+00	t
5bfad30f-c5a5-4c3a-a6f5-a1a7638d83e0	b53f72c4-7bdc-457e-89a4-1a636b132608	25ff9e55da689a10ca57899328e3e7fd6a1e331490b75f29918bf9b03cc7f8a1	2025-08-02 16:03:29.953+00	t
e061a8d4-9376-43be-9b29-d7f465318aa7	40d3bbd4-15d7-47c8-9501-564210881b96	48d9eb4060a6226d26b1989bf3afab3d0a8fc7259d463382342caab0d5aa3b20	2025-08-02 16:07:25.39+00	t
e643e35a-fe01-4514-8ccb-064cf3db4e03	198f888a-1376-4228-906a-5c45af912633	f92129939f2ea187dcf3e7b12070fa3ffa8b078f1487fd01d0f047e57a5bb5d4	2025-08-02 16:11:23.986+00	t
07e5c4af-3cda-435f-9169-be798a17c317	f17597af-3441-42a2-b6f4-1d3f03475662	47c2aeb857f410e1ecfaa78713facd30c9059cd804cbe3c0877edf6115aebfa7	2025-08-03 18:23:05.949+00	t
98cb7ab9-2676-40e5-8b4b-1638b50f53bd	091e21fb-4715-4fe8-b006-36e88642b0b2	34657c531d80ed06dc50550a0d8e8440fdab4b0471a844a00c4c6732055fb239	2025-08-13 23:19:35.638+00	t
a452950d-fc5e-4f15-b3ae-83d6fd6f8afc	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	0ba59cedbd7da7e0531c5474d6c5908aff3b99b974a4505fec508eeee85a9390	2025-08-16 14:51:35.887+00	t
386d5a75-7703-4520-815d-2262f4e08660	923e9d14-e622-4a0d-aea2-56cb21d80096	aabe81dd5b9695d19fcfb1e371e5b4dadc5b4abbb1a7300fd74e53735fa2e2c0	2025-08-23 04:02:13.921+00	t
\.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_templates (id, name, client_id, template_json, template_html, created_at) FROM stdin;
\.


--
-- Data for Name: system_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_notifications (id, user_id, title, message, type, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, setting_key, setting_value, description, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, client_id, employee_id, type, transaction_date, description, category, quantity, unit_price, total_price, status, created_at, payment_method, due_date, paid_date, notes, pedido_id, pedido_info, ativo) FROM stdin;
6a24481e-9ce8-43fa-ad6e-4b1b52c9423c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-03 19:46:09.056757+00	\N	\N	\N	\N	\N	\N	t
08a717e1-eea9-4733-934c-40f6b1960f20	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Acelga	Rodrigo  fazenda 	20.00	1.50	30.00	A Pagar	2025-08-03 20:00:47.411667+00	\N	\N	\N	\N	\N	\N	t
4d4e792c-196e-4eb6-964e-ae9a9ebd0551	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-04 21:23:03.553532+00	\N	\N	\N	\N	\N	\N	t
aa70595b-bc3c-4c15-b382-eaa83e95b849	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-04 21:23:15.421866+00	\N	\N	\N	\N	\N	\N	t
afac4b50-b877-4ce4-ab61-94f0d6fb8fb7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-05 21:26:34.115899+00	\N	\N	\N	\N	\N	\N	t
4c36ec6d-3fc9-45e4-bcdf-af342d3d29b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Acelmo	40.00	2.00	80.00	A Pagar	2025-08-05 22:32:34.795892+00	\N	\N	\N	\N	\N	\N	t
47cf2f6e-b00e-4c4b-88e8-f24a5f671438	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-05 22:32:51.811909+00	\N	\N	\N	\N	\N	\N	t
effb53e0-e834-47a2-a6b5-d5c1672cc540	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Mostarda 	Rodrigo  fazenda 	20.00	0.60	12.00	A Pagar	2025-08-05 22:44:00.616053+00	\N	\N	\N	\N	\N	\N	t
0430b5fe-1974-40d5-ac61-102a538c46ba	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Alecrin	Ivanete 	100.00	1.20	120.00	A Pagar	2025-08-14 20:41:36.232514+00	\N	\N	\N	\N	\N	\N	t
e231227a-e90a-4e97-bef8-d95e7a083f34	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-06 20:37:35.292858+00	\N	\N	\N	\N	\N	\N	t
e1350134-0f57-4be6-9100-c25815624ae7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-06 20:37:45.670235+00	\N	\N	\N	\N	\N	\N	t
78b8b807-abab-47e7-aad0-694910285ecc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Acelmo	50.00	2.00	100.00	A Pagar	2025-08-06 20:37:58.11446+00	\N	\N	\N	\N	\N	\N	t
2a578e0c-f303-4a99-a700-23da7d5159a7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-06 20:38:12.352926+00	\N	\N	\N	\N	\N	\N	t
9dceedad-55e3-4964-bfdf-8c58b80402ca	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-01	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-06 23:56:22.824151+00	\N	\N	\N	\N	\N	\N	t
bb8e306b-af84-41f8-bca6-a90a0bd68f57	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Moca alecrim	Greide	6.00	5.00	30.00	A Pagar	2025-08-07 08:29:14.968789+00	\N	\N	\N	\N	\N	\N	t
7458d871-00ab-4b7f-bf60-0a6f532d80f5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-07 20:46:09.05791+00	\N	\N	\N	\N	\N	\N	t
50250eee-7193-4b39-8ff0-4a98ef699704	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Poro	Derson	10.00	20.00	200.00	A Pagar	2025-08-07 20:55:13.153713+00	\N	\N	\N	\N	\N	\N	t
86462dbe-50b3-4b48-8559-5138305975a0	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Mauro	40.00	0.60	24.00	A Pagar	2025-08-07 21:10:10.93801+00	\N	\N	\N	\N	\N	\N	t
5a26fe1c-3430-4dde-8bcf-051e8170a49d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Jakeline	3.50	24.00	84.00	A Pagar	2025-08-09 01:23:43.894257+00	\N	\N	\N	\N	\N	\N	t
59401c2e-ccfe-40d6-ba67-93730ad75f7f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-09 20:57:32.41395+00	\N	\N	\N	\N	\N	\N	t
b2373aab-2173-451b-9f34-cb051b74da51	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Mangericao pequeno 	Dudu vica	45.00	1.30	58.50	A Pagar	2025-08-10 17:25:08.176+00	\N	\N	\N	\N	\N	\N	t
b069f48a-9955-4af8-9144-7e6f630cbd84	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Neuza e filho	60.00	2.00	120.00	A Pagar	2025-08-10 17:36:54.461602+00	\N	\N	\N	\N	\N	\N	t
cedc4e64-5b80-41c1-b063-e52b91f0bf58	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-10 17:51:26.02913+00	\N	\N	\N	\N	\N	\N	t
05d6ee17-3454-4065-9392-3512636083a7	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-08	Mostarda 	Sandro	150.00	0.80	120.00	A Pagar	2025-08-11 12:08:17.643142+00	\N	\N	\N	\N	\N	\N	t
b95c25bd-72a2-4dd7-89c4-371806ffdc8b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-11 21:20:07.440935+00	\N	\N	\N	\N	\N	\N	t
300e530e-6c6e-457e-8d96-d9af3aaa7a8b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-12 21:29:38.40564+00	\N	\N	\N	\N	\N	\N	t
eda654c2-153e-4af0-8f1a-0a4cdb59028a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-12 21:29:51.309775+00	\N	\N	\N	\N	\N	\N	t
d87f155d-5d15-47df-8348-2fbc4e7ebb9f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Neuza e filho	60.00	2.00	120.00	A Pagar	2025-08-12 21:40:43.404444+00	\N	\N	\N	\N	\N	\N	t
24e75794-a985-48ff-bc87-0a5cc9d40a7d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-13 16:32:59.328754+00	\N	\N	\N	\N	\N	\N	t
4076ff42-35c0-435e-899c-889f38c43eef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-13 16:33:11.67077+00	\N	\N	\N	\N	\N	\N	t
7bbee32e-a7ec-4165-ae3b-3b2b231655dd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-13 16:33:24.136026+00	\N	\N	\N	\N	\N	\N	t
a0948127-2d71-407d-8358-7ff7854a62bb	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Thiago chencher 	23.00	0.80	18.40	A Pagar	2025-08-14 18:21:46.344527+00	\N	\N	\N	\N	\N	\N	t
d7c15d87-f4bd-4f87-8d32-b5f7d7c85954	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Waguinho	6.00	13.00	78.00	A Pagar	2025-08-14 19:17:13.965732+00	\N	\N	\N	\N	\N	\N	t
0bfa7508-7d58-46ad-9b06-22994e20c1f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Loro	Edmilson	7.00	12.00	84.00	A Pagar	2025-08-14 19:28:01.925731+00	\N	\N	\N	\N	\N	\N	t
efe075a4-9d96-4210-b143-8a949657ad07	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	gasto	2025-08-16	Adubo	Rezende	50.00	50.00	2500.00	A Pagar	2025-08-16 05:28:54.899217+00	\N	\N	\N	\N	62c0e233-79fd-4a12-9b5a-379f3e6d9e23	Compra - Rezende - 1 itens	t
d969ff8f-945c-44f4-8ca9-06553604cbfd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-16 22:11:02.707849+00	\N	\N	\N	\N	\N	\N	t
dec62c72-097c-4762-97cd-30fd7d064dd5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Albidair	40.00	1.70	68.00	A Pagar	2025-08-17 14:05:03.092057+00	\N	\N	\N	\N	\N	\N	t
5d141883-bbe4-4180-a707-188c494b55f5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Poro	Derson	12.00	18.00	216.00	A Pagar	2025-08-17 18:35:09.056282+00	\N	\N	\N	\N	\N	\N	t
951d3611-65d4-41b4-991b-2d8557ef4d34	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-18	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-18 12:40:29.205623+00	\N	\N	\N	\N	\N	\N	t
828a184c-c1ab-4ee3-8744-389aab7a7c47	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-18 17:39:22.352751+00	\N	\N	\N	\N	\N	\N	t
f17607fa-320b-4fdc-9b55-ed22a8f78c9d	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-18	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-18 23:01:41.450457+00	\N	\N	\N	\N	\N	\N	t
bbc09c99-9b3a-40b0-98f6-eecab9ab6e3c	b53f72c4-7bdc-457e-89a4-1a636b132608	584b2834-e829-4ecd-97b3-954b7a3c4ae2	gasto	2025-07-16	mudas de chicoria	casa	10.00	65.00	650.00	A PAGAR	2025-07-26 16:06:22.054489+00	\N	\N	\N	\N	\N	\N	t
47e6b178-c14d-4b9e-996f-a643fea0b068	b53f72c4-7bdc-457e-89a4-1a636b132608	584b2834-e829-4ecd-97b3-954b7a3c4ae2	gasto	2025-07-16	mudas de crespa	casa	15.00	50.00	750.00	A PAGAR	2025-07-26 16:06:22.057374+00	\N	\N	\N	\N	\N	\N	t
10875428-b505-46e3-bac9-6de59b66331a	b53f72c4-7bdc-457e-89a4-1a636b132608	584b2834-e829-4ecd-97b3-954b7a3c4ae2	gasto	2025-07-17	Esterco		28.00	18.00	504.00	A PAGAR	2025-07-26 16:06:22.059241+00	\N	\N	\N	\N	\N	\N	t
138d8d7a-6d9c-439d-851b-b29f0378f497	b53f72c4-7bdc-457e-89a4-1a636b132608	58d7f907-6b59-4745-a0f6-967ff3321f37	gasto	2025-07-17	Mudas de brócolis		2.00	40.00	112.00	A PAGAR	2025-07-26 16:06:22.062381+00	\N	\N	\N	\N	\N	\N	t
27dbe618-1e98-46df-bdcd-25ed183a2016	b53f72c4-7bdc-457e-89a4-1a636b132608	58d7f907-6b59-4745-a0f6-967ff3321f37	gasto	2025-07-23	Trator	Rodrigo	1.00	220.00	275.00	A PAGAR	2025-07-26 16:06:22.063192+00	\N	\N	\N	\N	\N	\N	t
70a1236d-9a95-46a8-872a-8989cbc1fcfa	b53f72c4-7bdc-457e-89a4-1a636b132608	58d7f907-6b59-4745-a0f6-967ff3321f37	gasto	2025-07-23	mudas de crespa	Renato	10.00	50.00	500.00	A PAGAR	2025-07-26 16:06:22.064017+00	\N	\N	\N	\N	\N	\N	t
2bc9b88f-a24d-40e8-b876-c31137302c9e	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	gasto	2025-08-19	Casa de adubo 	Comercial friburguence 	1.00	505.00	505.00	A Pagar	2025-08-19 12:49:56.496488+00	\N	\N	\N	\N	\N	\N	t
d099fca1-b501-487f-a757-1520a89a4273	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Aipo	Pai	10.00	11.00	110.00	A Pagar	2025-08-19 18:36:48.893212+00	\N	\N	\N	\N	\N	\N	t
a09f5b27-21f7-4a57-9cc8-712a3f1b7f22	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Loro	Pai	6.00	8.00	48.00	A Pagar	2025-08-19 18:36:59.984966+00	\N	\N	\N	\N	\N	\N	t
bede2bdd-c4be-48c4-a201-cb072e496793	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Acelga	Multi folhas	92.00	2.00	184.00	A Pagar	2025-08-19 19:54:59.706721+00	\N	\N	\N	\N	\N	\N	t
edf9cb2e-afcc-4925-a0f7-45108692a884	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-08-19 20:00:09.146136+00	\N	\N	\N	\N	\N	\N	t
0376e762-0cb0-47fa-ad8d-a78ae8fe1f4f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-19 20:04:03.861764+00	\N	\N	\N	\N	\N	\N	t
1a2c1c30-2255-4e16-abe5-54ae2a7cd038	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Brocolis americano 	Sitio esperança 	200.00	2.50	500.00	A Pagar	2025-08-19 22:36:51.314116+00	\N	\N	\N	\N	\N	\N	t
c03d0884-34f0-40a0-b620-11fa52ce14d7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-20 15:20:55.999205+00	\N	\N	\N	\N	\N	\N	t
5f5c91cc-f1a1-4494-b138-1fbd20f2a47e	b53f72c4-7bdc-457e-89a4-1a636b132608	58d7f907-6b59-4745-a0f6-967ff3321f37	gasto	2025-07-23	mudas de crespa	Casa	3.00	50.00	150.00	A PAGAR	2025-07-26 16:06:22.064719+00	\N	\N	\N	\N	\N	\N	t
89ab35d0-f773-40b0-9011-a9c8dec78f7d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Poro	Waguinho	1.00	18.00	18.00	A Pagar	2025-08-03 19:35:41.346012+00	\N	\N	\N	\N	\N	\N	t
d9bf80e1-90f3-47d6-a363-b16c1ba8156c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-03 19:46:24.747395+00	\N	\N	\N	\N	\N	\N	t
370a0e85-ebd2-4aa5-a90f-ae3c2850aebf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-03 20:01:07.049855+00	\N	\N	\N	\N	\N	\N	t
be25d3cd-b617-4d89-a933-53e355cd3fe7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Acelmo	40.00	2.00	80.00	A Pagar	2025-08-04 21:23:30.614916+00	\N	\N	\N	\N	\N	\N	t
97c21065-9974-4cd0-9cd0-fc1f65426f6d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-04 21:37:49.194361+00	\N	\N	\N	\N	\N	\N	t
ecfcc960-8159-4bd9-b0fd-57b214d70681	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-05 21:26:47.195828+00	\N	\N	\N	\N	\N	\N	t
722b0355-e4ad-4a4a-a8e5-39f99ea653bc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Salsa crespa	Jakeline	40.00	1.20	48.00	A Pagar	2025-08-05 22:33:15.595572+00	\N	\N	\N	\N	\N	\N	t
3561cb30-5f8d-4697-884f-22d8de53a1b2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Acelga	Rodrigo  fazenda 	20.00	1.50	30.00	A Pagar	2025-08-05 22:44:17.100231+00	\N	\N	\N	\N	\N	\N	t
46c2d1dc-1f67-4fed-9553-2aba568979d4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-06 20:38:27.287005+00	\N	\N	\N	\N	\N	\N	t
0532af53-2276-4f3d-9400-ae6756543e2d	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-04	Mostarda 	Folhas da serra 	200.00	0.60	120.00	A Pagar	2025-08-06 23:59:59.983815+00	\N	\N	\N	\N	\N	\N	t
0f7a390f-05c3-48b6-9482-099103fbbd8b	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-03	Mostarda 	Folhas da serra 	130.00	0.60	78.00	A Pagar	2025-08-07 00:00:00.343959+00	\N	\N	\N	\N	\N	\N	t
8dc0c713-f4f9-4256-8ba4-0ea0c3d9f083	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-02	Mostarda 	Folhas da serra 	200.00	0.60	120.00	A Pagar	2025-08-07 00:00:00.426318+00	\N	\N	\N	\N	\N	\N	t
aa91841f-105d-4ef0-9c39-57811cb0b036	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-01	Mostarda 	Folhas da serra 	270.00	0.60	162.00	A Pagar	2025-08-07 00:00:00.443768+00	\N	\N	\N	\N	\N	\N	t
15fcc809-add3-4012-a69a-5e9fcdc8c530	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	Folhas da serra 	280.00	0.60	168.00	A Pagar	2025-08-07 00:00:00.473365+00	\N	\N	\N	\N	\N	\N	t
ac1d9d5c-fc2a-4f18-bf0a-394d036f7e19	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Folhas da serra 	200.00	0.60	120.00	A Pagar	2025-08-07 00:00:00.48599+00	\N	\N	\N	\N	\N	\N	t
ab099af1-199b-4715-9825-d99116169526	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-07 08:29:34.143308+00	\N	\N	\N	\N	\N	\N	t
c537f5bd-b130-4755-a683-0c88c9c43e77	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-07 20:46:23.677878+00	\N	\N	\N	\N	\N	\N	t
b0a4cac9-3629-48a1-a83b-ab13cf5c3588	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Loro	Derson	9.00	10.00	90.00	A Pagar	2025-08-07 20:55:28.010445+00	\N	\N	\N	\N	\N	\N	t
702cbdc2-780a-4dbe-9e57-c9bcf102d72f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-09 01:24:02.545578+00	\N	\N	\N	\N	\N	\N	t
9d0faa2d-1419-4812-a6c3-4faab24f7eb3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-09 20:57:47.817743+00	\N	\N	\N	\N	\N	\N	t
a3c40b71-f2d4-44b9-a28f-bbad583479f8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-10 17:25:42.001125+00	\N	\N	\N	\N	\N	\N	t
05fcc8e6-54d3-4eca-a8b3-4c199b96b94d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Alexandre	10.00	2.00	20.00	A Pagar	2025-08-10 17:37:38.780234+00	\N	\N	\N	\N	\N	\N	t
f106369d-bc7d-44bb-8e56-12c548ee5fd8	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-08	Mostarda 	Queiroz e guarilha 	350.00	0.50	175.00	A Pagar	2025-08-11 12:08:51.270221+00	\N	\N	\N	\N	\N	\N	t
91d3c3d1-d346-4fb4-afd6-a71c39feb42b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Acelga	Getulin	40.00	1.50	60.00	A Pagar	2025-08-11 21:20:22.864062+00	\N	\N	\N	\N	\N	\N	t
d92b5acf-8207-4dc2-af23-2556fe4586ae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-12 21:30:23.203315+00	\N	\N	\N	\N	\N	\N	t
73db310d-b840-40b6-8187-2053d78e264b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-12 21:40:58.019426+00	\N	\N	\N	\N	\N	\N	t
fda405b2-2168-42c2-961a-56b372091084	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-14 01:20:16.077873+00	\N	\N	\N	\N	\N	\N	t
8244334a-00bb-4ed7-b4a3-c6519be74905	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Sandro	70.00	0.80	56.00	A Pagar	2025-08-14 18:22:08.303501+00	\N	\N	\N	\N	\N	\N	t
7ae8cc3e-6f4d-4c9f-ae65-d7c75ec6a2e5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Poro	Waguinho	2.00	18.00	36.00	A Pagar	2025-08-14 19:17:29.07754+00	\N	\N	\N	\N	\N	\N	t
6ab0beab-eb6a-4ce5-9adf-85066d7b12f5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alface americana	Lorenço	8.00	18.00	144.00	A Pagar	2025-08-14 19:35:02.432723+00	\N	\N	\N	\N	\N	\N	t
70ade90d-eecf-4aef-8fe4-2b0636c6dcec	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Alecrin	Nando	36.00	1.20	43.20	A Pagar	2025-08-14 20:42:03.092065+00	\N	\N	\N	\N	\N	\N	t
ccd8fdc2-9942-41d6-9344-cf070439ec6c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-15 21:11:18.305808+00	\N	\N	\N	\N	\N	\N	t
ee673482-03cf-42e9-84c6-501ee2fea682	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-15 21:11:30.879896+00	\N	\N	\N	\N	\N	\N	t
7a95a3fe-32e2-4c9a-acb7-1f2c1be4301a	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	gasto	2025-08-16	Adubo	Rezende	1.00	1.00	1.00	A Pagar	2025-08-16 05:58:48.18441+00	\N	\N	\N	\N	\N	\N	t
002088fc-ae24-4a13-8f8a-163ffccc29d6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Poro	Nando	10.00	13.00	130.00	A Pagar	2025-08-16 22:11:36.905154+00	\N	\N	\N	\N	\N	\N	t
de0167a9-c3f8-49e2-91e4-899e89b5a1a7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-17 14:05:24.98179+00	\N	\N	\N	\N	\N	\N	t
4cc5c339-22de-431c-a06a-a3590d965c6f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Loro	Derson	10.00	10.00	100.00	A Pagar	2025-08-17 18:35:24.589691+00	\N	\N	\N	\N	\N	\N	t
b60c0949-22e9-47c4-8592-51a2d7b72648	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Brocolis americano 	Queiroz e guarilha 	15.00	2.50	37.50	A Pagar	2025-08-18 12:41:03.504261+00	\N	\N	\N	\N	\N	\N	t
a9701bfd-d3ad-471e-b593-3a6d40a8b0c2	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	gasto	2025-08-07	Enel	Chico Veloso 	1.00	500.00	500.00	A Pagar	2025-08-07 21:16:34.436577+00	\N	\N	\N	\N	\N	\N	t
d2e8e980-4155-48a9-8e51-3759735d0b94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Guarilha	8.00	12.00	96.00	A Pagar	2025-08-18 17:40:25.765451+00	\N	\N	\N	\N	\N	\N	t
5544e30f-fec8-40cf-8d70-85f0d1ce5dfb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Felipe tunin	30.00	15.00	450.00	A Pagar	2025-08-18 17:40:37.502414+00	\N	\N	\N	\N	\N	\N	t
f771e7a6-d4f7-4e32-b719-056f940f1a17	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-18	Mostarda 	Thiago chencher 	15.00	0.80	12.00	A Pagar	2025-08-18 23:02:09.573918+00	\N	\N	\N	\N	\N	\N	t
8af36ec6-70e5-4b26-82fe-dc7ab499846e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-19 18:27:10.099398+00	\N	\N	\N	\N	\N	\N	t
9369a991-4bd2-47ee-9a2c-6e7d76df7fde	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-19 18:27:21.562042+00	\N	\N	\N	\N	\N	\N	t
c40b02a8-aacb-4fdd-880f-951377b70d28	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-19 18:27:33.751723+00	\N	\N	\N	\N	\N	\N	t
dd206b1d-8ea5-4a1b-b1e5-fa72ae1dc70d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Guarilha	4.00	12.00	48.00	A Pagar	2025-08-19 18:38:31.970612+00	\N	\N	\N	\N	\N	\N	t
bd71fb0f-7fff-47d2-b07f-2431355d2513	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Felipe tunin	25.00	15.00	375.00	A Pagar	2025-08-19 18:38:42.960295+00	\N	\N	\N	\N	\N	\N	t
dae23d7e-c056-4f92-878b-b3d2eecae17d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-19 19:55:15.928243+00	\N	\N	\N	\N	\N	\N	t
626a947e-c20d-4a30-ba26-1b47f7a39aac	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-19 20:00:26.339479+00	\N	\N	\N	\N	\N	\N	t
fc14c4b9-2e51-4358-96c7-6ec18d8b587b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-19 20:04:19.149279+00	\N	\N	\N	\N	\N	\N	t
9567ab70-6283-4151-a178-b0531067dda4	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	Sandro	60.00	0.80	48.00	A Pagar	2025-08-19 22:37:14.8633+00	\N	\N	\N	\N	\N	\N	t
dbf1d341-38ec-47d3-ac29-a9292d63905e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-20 15:21:06.235773+00	\N	\N	\N	\N	\N	\N	t
a93b86ef-7d82-4036-b5ad-86f1ef5772fc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Aipo	Dudu	10.00	9.00	90.00	A Pagar	2025-08-20 15:21:19.112038+00	\N	\N	\N	\N	\N	\N	t
c57fe689-75eb-45b7-9b2b-142125418fd8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Aipo	Takeo	15.00	8.00	120.00	A Pagar	2025-08-20 15:21:29.986868+00	\N	\N	\N	\N	\N	\N	t
63f576ad-8497-426f-83a7-b0972e45c8b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Acelga	Luciana	60.00	1.50	90.00	A Pagar	2025-08-14 20:43:18.874584+00	\N	\N	\N	\N	\N	\N	t
1461210c-13e9-4faa-b2b7-6ff5ef6480c1	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-03	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-07 00:02:29.206201+00	\N	\N	\N	\N	\N	\N	t
676507b9-d40a-4af7-a4eb-997876b5747a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.680598+00	\N	\N	\N	\N	\N	\N	t
7e40da2c-e04e-4a6f-9b98-51ba2771e4a9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-07 08:29:54.252426+00	\N	\N	\N	\N	\N	\N	t
84d7c280-4d77-4f84-b9f0-aefb3ca84d7b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-02	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.68196+00	\N	\N	\N	\N	\N	\N	t
bc988e9d-cc5b-4873-bdbf-2d0a4dae70a1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Acelga	Multi folhas	147.00	2.00	294.00	A Pagar	2025-08-07 20:46:37.717857+00	\N	\N	\N	\N	\N	\N	t
99245804-71d6-4745-af91-2c1998118f5a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.683858+00	\N	\N	\N	\N	\N	\N	t
e3bb004c-6b80-4756-a52b-a21013accbf8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Moca alecrim	Derson	12.00	5.00	60.00	A Pagar	2025-08-07 20:55:42.456311+00	\N	\N	\N	\N	\N	\N	t
08766787-b558-49b6-8f14-e157aaa2e381	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.685116+00	\N	\N	\N	\N	\N	\N	t
002812ea-f292-424b-b2c6-9ccc669e000f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-07 20:55:54.23733+00	\N	\N	\N	\N	\N	\N	t
867a285a-b354-4a20-8188-c78e5858a799	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-05	Aipo	Agro costa	10.00	2.00	20.00	A PAGAR	2025-07-26 16:13:05.686367+00	\N	\N	\N	\N	\N	\N	t
92f6c87a-4445-4d50-a398-847f82fd26e5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-07 20:56:05.447063+00	\N	\N	\N	\N	\N	\N	t
353ae53a-f80f-407b-8c6f-15643c194848	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.687616+00	\N	\N	\N	\N	\N	\N	t
786f6d9e-1e23-47b6-be99-5d7897befcfb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-15 21:11:49.99177+00	\N	\N	\N	\N	\N	\N	t
2ede94ca-5f2c-4870-8135-48aaf33e554a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.688904+00	\N	\N	\N	\N	\N	\N	t
6e28e290-3516-4995-9d55-2edab092774f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-07	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.690596+00	\N	\N	\N	\N	\N	\N	t
a95d9a87-8072-4e9d-a564-304703da15cf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-09	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.693894+00	\N	\N	\N	\N	\N	\N	t
13ff7714-7820-4df1-a983-03315e143082	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-18	Brocolis americano 	Queiroz e guarilha 	80.00	2.50	200.00	A Pagar	2025-08-18 12:41:31.430901+00	\N	\N	\N	\N	\N	\N	t
c4803e5f-db31-4187-83c4-4fdbfd94f66a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-16 08:20:42.319292+00	\N	\N	\N	\N	\N	\N	t
7eef0cbc-23d4-445e-95e6-c6b066fe26bc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Waguinho	8.00	13.00	104.00	A Pagar	2025-08-03 19:36:29.537878+00	\N	\N	\N	\N	\N	\N	t
a1ecfbe2-fda9-4b91-b70b-b8bc959552c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-17 13:45:05.679168+00	\N	\N	\N	\N	\N	\N	t
26ea942b-f7b5-475e-9a09-35e7f6a163fc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Mostarda	Tuyane	30.00	0.90	27.00	A Pagar	2025-08-03 19:46:52.486524+00	\N	\N	\N	\N	\N	\N	t
be287669-aeab-4365-b1ba-512d5f82918b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-17 13:45:18.769999+00	\N	\N	\N	\N	\N	\N	t
89f9c040-bd22-4c09-8ba3-a013ee4bede9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Mostarda 	Lorinha	10.00	0.60	6.00	A Pagar	2025-08-03 20:01:27.098254+00	\N	\N	\N	\N	\N	\N	t
00f8b77d-29b5-49bf-9498-1ec379fba27e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Geovane	8.00	14.00	112.00	A Pagar	2025-08-17 14:05:45.616491+00	\N	\N	\N	\N	\N	\N	t
1543f6a1-2887-424c-a1b2-f1b4599178a4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Moca tomilho 	Derson	2.00	4.00	8.00	A Pagar	2025-08-17 18:35:52.170229+00	\N	\N	\N	\N	\N	\N	t
8da14a8f-abae-4ec1-8634-9a54c542cf6e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Alecrin	Marli	30.00	1.20	36.00	A Pagar	2025-08-04 21:38:24.513914+00	\N	\N	\N	\N	\N	\N	t
aeaa54c4-5514-4d0a-82e7-272deccbb3b3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Waguinho	8.00	13.00	104.00	A Pagar	2025-08-18 17:41:01.510664+00	\N	\N	\N	\N	\N	\N	t
d98b8cc9-97e3-4760-9eb8-c3acc1600197	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-05 21:27:10.474174+00	\N	\N	\N	\N	\N	\N	t
b4720617-38c0-436c-b614-3efd6a9871e5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Marquinho cebola	27.00	2.00	54.00	A Pagar	2025-08-19 00:06:19.584666+00	\N	\N	\N	\N	\N	\N	t
59047394-5914-4956-a26c-e1e413819d91	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-19 18:28:08.376284+00	\N	\N	\N	\N	\N	\N	t
d48a657e-e82b-4880-945e-44ec8fcee546	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-05 22:44:54.908605+00	\N	\N	\N	\N	\N	\N	t
50ef981a-5c49-44a8-bd3c-31f087b76bb9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alface crespa	Dione	15.00	8.00	120.00	A Pagar	2025-08-19 18:39:06.730302+00	\N	\N	\N	\N	\N	\N	t
6309beb9-68de-4399-8c62-3b42f4934933	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-09 01:24:47.30189+00	\N	\N	\N	\N	\N	\N	t
2e214ce7-fb8e-44f8-a0d5-20215c5f266a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Acelga	Rodrigo  água quente 	50.00	2.00	100.00	A Pagar	2025-08-19 19:56:18.445444+00	\N	\N	\N	\N	\N	\N	t
c61f3264-1550-44dc-8c94-81377f6f1660	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Neuza e filho	50.00	2.00	100.00	A Pagar	2025-08-09 01:24:35.378223+00	\N	\N	\N	\N	\N	\N	t
0fd6a6eb-c27c-46a3-bf36-0f29ba0bbf86	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Fabiane	5.00	1.70	8.50	A Pagar	2025-08-19 20:00:41.239796+00	\N	\N	\N	\N	\N	\N	t
402328c2-1dbf-4d78-81e3-554bcf7266c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Neuza e filho	20.00	2.00	40.00	A Pagar	2025-08-09 20:58:10.37489+00	\N	\N	\N	\N	\N	\N	t
0f5fb59f-c73b-4764-92cd-d0c8be5f7378	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Vegetable	15.00	15.00	225.00	A Pagar	2025-08-19 20:04:36.398718+00	\N	\N	\N	\N	\N	\N	t
f90f0fa7-6f1f-468a-a53a-baeee509d52c	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	Thiago chencher 	50.00	0.80	40.00	A Pagar	2025-08-19 22:37:33.114967+00	\N	\N	\N	\N	\N	\N	t
937f0b43-b101-4d38-9eb4-4e24a57d8b39	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Paquy	10.00	2.00	20.00	A Pagar	2025-08-09 20:58:46.206923+00	\N	\N	\N	\N	\N	\N	t
5d071862-2755-4867-b154-c5f9e2156357	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Alecrim	Weliton	30.00	1.20	36.00	A Pagar	2025-08-20 15:21:43.79846+00	\N	\N	\N	\N	\N	\N	t
6b09954f-432f-4004-87a5-0fb466cd0ccc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-10 17:26:33.92038+00	\N	\N	\N	\N	\N	\N	t
779164ed-9782-47e0-b43b-df24959e0437	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Alecrim	Ozia	50.00	1.20	60.00	A Pagar	2025-08-20 15:21:53.398205+00	\N	\N	\N	\N	\N	\N	t
4caf0a68-b481-43ed-9237-e61fb2631ca4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-10 17:38:27.072815+00	\N	\N	\N	\N	\N	\N	t
8885194a-0a14-42fc-973b-5d899d8e8022	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-20 15:24:25.06969+00	\N	\N	\N	\N	\N	\N	t
ca431ea9-04a5-414e-acae-ac79b2226478	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alface americana	Lorenço	10.00	18.00	180.00	A Pagar	2025-08-11 00:12:15.521243+00	\N	\N	\N	\N	\N	\N	t
c7f7d6d1-45cf-42d0-8570-ae7e627d4963	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-08	Mostarda 	Thiago chencher 	25.00	0.80	20.00	A Pagar	2025-08-11 12:09:24.760409+00	\N	\N	\N	\N	\N	\N	t
927a01bd-c7a2-4052-8adb-ea4ed054d9e6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Acelga	Miguel	80.00	1.50	120.00	A Pagar	2025-08-11 21:20:42.314218+00	\N	\N	\N	\N	\N	\N	t
66837333-579e-48ef-bc9a-c5d0a24c6024	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Tomilho	Wanderson v l	30.00	1.50	45.00	A Pagar	2025-08-12 21:30:37.431129+00	\N	\N	\N	\N	\N	\N	t
552cdc2d-4250-467c-9e11-94d0c00a1dbe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-08-12 21:41:14.546496+00	\N	\N	\N	\N	\N	\N	t
db76b65a-ed46-4ba4-8bca-5e840c225e71	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-14 01:20:36.692029+00	\N	\N	\N	\N	\N	\N	t
3f166c99-4148-4b70-b48a-1463eb6f5dfc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-08-14 01:20:52.632653+00	\N	\N	\N	\N	\N	\N	t
b523ed54-e33f-48b0-bbcc-9b7a9d23a9f2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-14 01:21:05.797898+00	\N	\N	\N	\N	\N	\N	t
8e09864d-535f-4623-9511-fdcfa2b6c952	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-14 19:07:02.749486+00	\N	\N	\N	\N	\N	\N	t
ba101ea4-1a12-4589-8e72-4b96775e9d1a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Tomilho	Waguinho	5.00	1.50	7.50	A Pagar	2025-08-03 19:36:48.479395+00	\N	\N	\N	\N	\N	\N	t
21321b24-51f3-434d-a5ba-6e2aa5534040	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-14 20:44:04.098412+00	\N	\N	\N	\N	\N	\N	t
234a0408-4ab8-41cd-bf3e-127bc142ad96	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Almeirão	Tuyane	20.00	1.30	26.00	A Pagar	2025-08-03 19:47:10.02059+00	\N	\N	\N	\N	\N	\N	t
53fd011c-d95e-4693-9be9-568c4788320c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Paquy	10.00	2.00	20.00	A Pagar	2025-08-15 21:12:14.6238+00	\N	\N	\N	\N	\N	\N	t
d99a4a44-5287-4269-9db9-82e17f4baf26	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Neuza e filho	40.00	2.00	80.00	A Pagar	2025-08-06 20:39:12.671759+00	\N	\N	\N	\N	\N	\N	t
2170b552-5e4e-4b71-8611-33575d5592a8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-06 20:39:28.238379+00	\N	\N	\N	\N	\N	\N	t
ebe4283e-c499-4794-86aa-78d16034b7e4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-16 08:20:58.497677+00	\N	\N	\N	\N	\N	\N	t
65bb8e8f-a1b8-45b8-b7bf-1b76e6690a6e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-06 20:39:40.280651+00	\N	\N	\N	\N	\N	\N	t
2fde6daf-dc97-4631-a7f2-059a52b5a3ef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-17 13:45:36.214228+00	\N	\N	\N	\N	\N	\N	t
fc72cbc6-b623-4827-bd75-e1d66a559a7f	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-01	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-07 00:02:29.308093+00	\N	\N	\N	\N	\N	\N	t
ed0f0ae3-b515-4929-bf31-ba7efcc3169b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Acelga	Geovane	20.00	2.00	40.00	A Pagar	2025-08-17 14:06:02.048245+00	\N	\N	\N	\N	\N	\N	t
6d9b479e-9cc6-4b59-841e-cb12b94ad785	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-07 00:02:29.563063+00	\N	\N	\N	\N	\N	\N	t
c069f7b9-1554-41d6-a894-c59e984790cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Vegetable	10.00	15.00	150.00	A Pagar	2025-08-17 18:36:50.902146+00	\N	\N	\N	\N	\N	\N	t
f3602ea6-8988-4299-8704-3546867a6766	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-07 00:02:29.589031+00	\N	\N	\N	\N	\N	\N	t
8763ccd0-e518-4fc4-81da-8f8946138f14	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	gasto	2025-08-18	Arrendamento 	Chico Veloso 	1.00	500.00	500.00	A Pagar	2025-08-18 12:44:00.236824+00	\N	\N	\N	\N	\N	\N	t
588067bb-ba8f-4499-a446-8908a219d4d1	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-04	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-07 00:02:29.623238+00	\N	\N	\N	\N	\N	\N	t
ea8b90e1-3225-45bc-8b51-94f4b86725ce	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-08-07	Alface americana 	JFC	50.00	18.00	900.00	A Pagar	2025-08-07 16:51:45.464079+00	\N	\N	\N	\N	\N	\N	t
fb2cb08f-49ec-4d0c-b150-8fdfc251b749	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-07 20:46:51.405926+00	\N	\N	\N	\N	\N	\N	t
128f4687-6953-4566-af45-aacfbf2d31d5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Tomilho	Waguinho	10.00	1.50	15.00	A Pagar	2025-08-18 17:41:15.833465+00	\N	\N	\N	\N	\N	\N	t
ec64a7ef-0123-4000-90da-abb87d8269a5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Vegetable	10.00	15.00	150.00	A Pagar	2025-08-07 20:56:35.596848+00	\N	\N	\N	\N	\N	\N	t
f73e9865-bcc4-45aa-b2d7-53abbf8c99b5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	BR	60.00	1.70	102.00	A Pagar	2025-08-19 00:08:33.603213+00	\N	\N	\N	\N	\N	\N	t
860862f1-ffe5-474d-a6ea-90b3290b61b3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	BR	3.00	16.00	48.00	A Pagar	2025-08-19 00:08:45.644223+00	\N	\N	\N	\N	\N	\N	t
864b4026-7d17-4fba-9e67-5c72ca95fe94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Acelga	Eloilso	30.00	1.50	45.00	A Pagar	2025-08-19 18:28:30.77381+00	\N	\N	\N	\N	\N	\N	t
cee78706-7518-4758-9b81-81c00bbbde87	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Acelmo	70.00	2.00	140.00	A Pagar	2025-08-19 18:39:56.200248+00	\N	\N	\N	\N	\N	\N	t
42b1cc24-3d58-4be6-90ad-183456a5571a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Marquinho cebola	45.00	2.00	90.00	A Pagar	2025-08-09 01:25:09.008643+00	\N	\N	\N	\N	\N	\N	t
f6cf840f-3135-4a85-8c26-4698574d8728	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Marquinho cebola	25.00	2.00	50.00	A Pagar	2025-08-09 20:59:22.68987+00	\N	\N	\N	\N	\N	\N	t
172ef3e0-4def-4b1b-aaf1-64311bf1d5d3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Moca alecrim	Greide	10.00	5.00	50.00	A Pagar	2025-08-10 17:27:10.166232+00	\N	\N	\N	\N	\N	\N	t
3257eb68-8379-45ff-bc50-b1c9b00cc9ea	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-16	Aipo	Neuza e filhos	80.00	2.00	160.00	A PAGAR	2025-07-26 16:13:05.740365+00	\N	\N	\N	\N	\N	\N	t
646de4db-3001-4dce-aba4-c17294f96508	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Caixotao 	Casarão	7.00	5.00	35.00	A Pagar	2025-08-10 17:39:41.724163+00	\N	\N	\N	\N	\N	\N	t
5f9d964f-835b-490b-9724-91d5855ce930	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Neuza e filhos	80.00	2.00	160.00	A PAGAR	2025-07-26 16:13:05.741753+00	\N	\N	\N	\N	\N	\N	t
85de166b-71bb-45d6-8875-c3cce30b60d1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Marquinho cebola	19.00	2.00	38.00	A Pagar	2025-08-11 00:12:48.121734+00	\N	\N	\N	\N	\N	\N	t
fce2054d-d6ad-44a2-9232-9290329ace95	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Aipo	Neuza e filhos	80.00	2.00	160.00	A PAGAR	2025-07-26 16:13:05.743696+00	\N	\N	\N	\N	\N	\N	t
256099fc-a35c-4cf7-98f8-2119f6608ea0	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-09	Mostarda 	Thiago chencher 	60.00	0.80	48.00	A Pagar	2025-08-11 12:09:48.369255+00	\N	\N	\N	\N	\N	\N	t
e89c83ac-a511-4989-8533-29823a51fbad	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-02	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.744978+00	\N	\N	\N	\N	\N	\N	t
f18f5625-d7c2-48d9-a39a-eb83cc251af1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Poro	Lindomar	12.00	13.00	156.00	A Pagar	2025-08-11 21:21:02.362534+00	\N	\N	\N	\N	\N	\N	t
862c1512-e011-4b82-9e49-09541d2358a1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.74621+00	\N	\N	\N	\N	\N	\N	t
5e16b7ef-2d79-4e67-8d82-1a39c576baab	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-12 21:31:20.610413+00	\N	\N	\N	\N	\N	\N	t
f397d410-6128-4eb5-877f-da97322d67ac	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.747438+00	\N	\N	\N	\N	\N	\N	t
9861fdd4-078e-4bca-84bd-7b1bc1397b63	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Salsa crespa	Jakeline	45.00	1.20	54.00	A Pagar	2025-08-12 21:41:36.78886+00	\N	\N	\N	\N	\N	\N	t
eb6558ea-d7e7-46df-b63c-5f40f2a3baed	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.748671+00	\N	\N	\N	\N	\N	\N	t
675901e9-719e-4c9e-9745-df72b90006b2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-13 16:34:27.885646+00	\N	\N	\N	\N	\N	\N	t
bd2ce371-62dc-4754-bd0b-8e7206d13309	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.749899+00	\N	\N	\N	\N	\N	\N	t
4701fc0d-ebec-4b00-b1cf-ac8279fd33c5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Alface americana	Lorenço	10.00	18.00	180.00	A Pagar	2025-08-14 01:21:26.086571+00	\N	\N	\N	\N	\N	\N	t
a30720c5-1297-4bf2-ab37-460d7dbc68c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-05	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.751152+00	\N	\N	\N	\N	\N	\N	t
6b46f2d6-057a-45a7-b250-55ddb4fbc46c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-19 19:56:38.37507+00	\N	\N	\N	\N	\N	\N	t
4cc3dc96-2eff-4df4-8ab3-17fe36735624	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-05	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.752363+00	\N	\N	\N	\N	\N	\N	t
6f7c4052-9036-486f-811d-324a6f760d99	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Tuyane	6.00	16.00	96.00	A Pagar	2025-08-19 20:00:59.402876+00	\N	\N	\N	\N	\N	\N	t
a44824b2-aca8-4744-a526-5d9e2a22fe78	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.753622+00	\N	\N	\N	\N	\N	\N	t
f8140d41-a87f-4d47-8306-6dc6f24fd918	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Acelga	Vegetable	120.00	2.00	240.00	A Pagar	2025-08-19 20:04:53.805228+00	\N	\N	\N	\N	\N	\N	t
e7167805-75bf-4c52-8fef-a1a58af2e474	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-07	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.754826+00	\N	\N	\N	\N	\N	\N	t
4f727e57-bef3-4481-a807-113ab7171f4e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.756044+00	\N	\N	\N	\N	\N	\N	t
3f8465a1-fcf2-437a-beb7-a2e08076577c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.757248+00	\N	\N	\N	\N	\N	\N	t
cf768ede-1451-46d6-a394-5be2185a5ed7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-09	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.758544+00	\N	\N	\N	\N	\N	\N	t
2a5c0bd7-ce97-4fa3-b0bf-5f2b26b01491	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-09	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.760296+00	\N	\N	\N	\N	\N	\N	t
cd1f8d0b-4ac4-45ce-b02a-f02bc3bb4194	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-14 19:07:20.5989+00	\N	\N	\N	\N	\N	\N	t
023f0868-e7d4-4102-9267-1a7a3fe1afa9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Acelmo	50.00	2.00	100.00	A Pagar	2025-08-14 19:18:36.630039+00	\N	\N	\N	\N	\N	\N	t
daa0838a-440d-440d-b938-c360abf0682a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-14 20:47:54.097587+00	\N	\N	\N	\N	\N	\N	t
9bb1edbe-9780-465a-a60f-9d4aa6326367	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.761653+00	\N	\N	\N	\N	\N	\N	t
63a216d9-4230-462b-ada7-09e4b7df718b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-14 20:48:09.50285+00	\N	\N	\N	\N	\N	\N	t
6239b112-e259-41b1-bc08-2f98d5744c6c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.762899+00	\N	\N	\N	\N	\N	\N	t
981a30af-ff60-4616-b09d-1b11c82d6771	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-14 20:48:21.726341+00	\N	\N	\N	\N	\N	\N	t
dbc6cd94-2afa-4acb-9f04-c5572ea27092	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.76416+00	\N	\N	\N	\N	\N	\N	t
8ef5839a-acc7-4d34-ac31-314e642859f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Acelga	Multi folhas	140.00	2.00	280.00	A Pagar	2025-08-14 20:48:33.679473+00	\N	\N	\N	\N	\N	\N	t
cc0016d8-42d4-48cd-ac21-4dbb9006f2ae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.765641+00	\N	\N	\N	\N	\N	\N	t
4362c8ac-73ec-4e96-a9e1-9a9bdd6438db	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Rony bethel	24.00	2.00	48.00	A Pagar	2025-08-15 21:12:52.708072+00	\N	\N	\N	\N	\N	\N	t
815521ff-2f24-4115-89d4-c0af68a13733	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-12	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.766949+00	\N	\N	\N	\N	\N	\N	t
7331d5d1-0239-4f99-a692-5d2e4fdf21b3	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-16 13:24:37.482061+00	\N	\N	\N	\N	\N	\N	t
f302b61c-7588-420e-bdab-4aa74ea54372	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-12	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.768178+00	\N	\N	\N	\N	\N	\N	t
b0ee25cc-0f8e-4a22-aefe-b83aac690668	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-16 13:24:37.747621+00	\N	\N	\N	\N	\N	\N	t
b366c128-f249-4e62-a6c3-f3269818a006	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.769429+00	\N	\N	\N	\N	\N	\N	t
032c6290-2fda-4b8d-9bca-6886e55aaed1	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-16 13:24:37.997331+00	\N	\N	\N	\N	\N	\N	t
d7526d31-31df-4597-be5b-54041f3046c6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.770681+00	\N	\N	\N	\N	\N	\N	t
5e2035d3-a339-47b1-97d5-43284482c1fa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-06 20:39:57.185401+00	\N	\N	\N	\N	\N	\N	t
e0c58367-64eb-4013-a010-03dd8165ca29	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.772107+00	\N	\N	\N	\N	\N	\N	t
e2e9e47a-fb31-40d6-ab95-980d3979b7f1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Agro Terê	1.00	14.00	14.00	A PAGAR	2025-07-26 16:13:05.773441+00	\N	\N	\N	\N	\N	\N	t
5a43c654-737e-4de1-b80e-bd2c71dbd2d2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-06	Aipo	Marquinho cebola	25.00	2.00	50.00	A Pagar	2025-08-06 20:40:11.495915+00	\N	\N	\N	\N	\N	\N	t
4386e4ae-716b-42b3-801b-b7ffe5e477ae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.774809+00	\N	\N	\N	\N	\N	\N	t
8144ad03-e86f-48f9-8835-470947993449	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.776503+00	\N	\N	\N	\N	\N	\N	t
7e3a8ad6-5e10-4320-9b76-576171f9fcfe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-03 19:37:43.495082+00	\N	\N	\N	\N	\N	\N	t
d6842c3e-a974-4f53-9e9b-0eb20893852b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.778167+00	\N	\N	\N	\N	\N	\N	t
f31ffb7f-6b76-4021-9a80-003af2c6c409	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Derson	5.00	16.00	80.00	A Pagar	2025-08-03 19:47:32.073882+00	\N	\N	\N	\N	\N	\N	t
dc79785d-b12e-40aa-a300-d32df8ff111c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.779552+00	\N	\N	\N	\N	\N	\N	t
479a240b-1ca1-4be6-ab28-26e124fb1dfb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.780887+00	\N	\N	\N	\N	\N	\N	t
64486532-6158-4235-9502-7abb897a5bce	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-07 17:16:53.157951+00	\N	\N	\N	\N	\N	\N	t
9d4c4a07-b040-4f88-b02b-3735037af964	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-19	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:05.782267+00	\N	\N	\N	\N	\N	\N	t
09be331e-5dc0-40a6-a8d8-4040b7d7124c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Almeirão	Lorinha	20.00	0.80	16.00	A Pagar	2025-08-03 20:01:52.792742+00	\N	\N	\N	\N	\N	\N	t
b3d937b2-f999-457e-9af7-0516a402d066	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-19	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:05.783529+00	\N	\N	\N	\N	\N	\N	t
46996f82-1920-4fcd-8880-749a3b870cda	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-04 21:24:00.859245+00	\N	\N	\N	\N	\N	\N	t
9c68b919-115a-4d2e-aaff-5aba74207962	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Gleiciel	30.00	13.00	390.00	A PAGAR	2025-07-26 16:13:05.784785+00	\N	\N	\N	\N	\N	\N	t
a18a295a-e334-4609-b967-80888055abbd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-04 21:38:45.720452+00	\N	\N	\N	\N	\N	\N	t
134f2a6d-1e44-42a5-ada3-3b14abdae12c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-02	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:05.785996+00	\N	\N	\N	\N	\N	\N	t
31ae35be-708d-45fc-8cab-c18a0b48d013	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-05 21:27:49.191797+00	\N	\N	\N	\N	\N	\N	t
f598061b-2a02-4cb0-8e77-db1129651572	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Aipo	Gleiciel	40.00	13.00	520.00	A PAGAR	2025-07-26 16:13:05.787216+00	\N	\N	\N	\N	\N	\N	t
00d161a6-e7cf-4545-ad0a-7d3f6256b2e2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Neuza e filho	50.00	2.00	100.00	A Pagar	2025-08-05 22:33:45.583795+00	\N	\N	\N	\N	\N	\N	t
63f442f9-60e6-4be2-9314-95e42456f53c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-07	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:05.788485+00	\N	\N	\N	\N	\N	\N	t
6f9ad776-9b3e-4ee6-b2f3-abd8b4a03419	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-05 22:33:59.085039+00	\N	\N	\N	\N	\N	\N	t
98f7ba55-60e9-4dbf-a144-be1ab7ab49a5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Gleiciel	2.00	13.00	26.00	A PAGAR	2025-07-26 16:13:05.790308+00	\N	\N	\N	\N	\N	\N	t
af8bf703-a60f-4e55-be2c-6df422224db7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-05 22:34:12.575239+00	\N	\N	\N	\N	\N	\N	t
86cbd546-ceb7-4c12-841c-6b9df90ddf14	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Masso nabo	Gleiciel	10.00	6.00	60.00	A PAGAR	2025-07-26 16:13:05.791708+00	\N	\N	\N	\N	\N	\N	t
a3d97fbc-bdbb-4094-8f65-b111ef66fe5a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-05 22:34:25.57969+00	\N	\N	\N	\N	\N	\N	t
c1efc21e-0ab3-46d8-b009-d593bbad3b7a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-12	Aipo	Gleiciel	2.00	13.00	26.00	A PAGAR	2025-07-26 16:13:05.793277+00	\N	\N	\N	\N	\N	\N	t
f2d95a9e-d1d2-4498-9242-4d37810c8d3d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-07 17:17:04.751707+00	\N	\N	\N	\N	\N	\N	t
48e1de34-0d67-47cb-9e76-94d8d1d10ad7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:05.794595+00	\N	\N	\N	\N	\N	\N	t
8b982603-45f3-4c12-8a5f-cc50753fdba8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Paquy	14.00	2.00	28.00	A Pagar	2025-08-05 22:34:39.753148+00	\N	\N	\N	\N	\N	\N	t
3194f1d3-9b0b-475a-9a80-24f172a87ee9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-16	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:05.79583+00	\N	\N	\N	\N	\N	\N	t
08521fac-abb9-4569-8786-93046586804d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-07 20:47:07.176466+00	\N	\N	\N	\N	\N	\N	t
cc09f18e-e53a-4ca4-8c6f-e2fc0995ad9a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:05.797204+00	\N	\N	\N	\N	\N	\N	t
f412fcbe-7ef2-44bd-b494-45ab664ec481	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Acelga	Vegetable	125.00	2.00	250.00	A Pagar	2025-08-07 20:57:32.008315+00	\N	\N	\N	\N	\N	\N	t
1335f3c6-136d-4888-8889-3b9ac05ac2f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:05.798461+00	\N	\N	\N	\N	\N	\N	t
aab6efee-6190-42f0-a1c2-2ce62a924714	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-19	Aipo	Gleiciel	2.00	13.00	26.00	A PAGAR	2025-07-26 16:13:05.79968+00	\N	\N	\N	\N	\N	\N	t
3ab7ee33-12b4-47a7-b162-b19d585d4515	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-09 01:25:45.568393+00	\N	\N	\N	\N	\N	\N	t
9f1401ae-c751-4758-8ffe-fd9b0a2ff6b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-09 20:59:59.532867+00	\N	\N	\N	\N	\N	\N	t
f6861d09-b87f-4f60-8f6c-86ff7b1c5ff2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-10 17:27:27.481394+00	\N	\N	\N	\N	\N	\N	t
1638add4-12f8-44b1-bf29-5e8efe91c482	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-02	Aipo	Tarcísio	3.00	15.00	45.00	A PAGAR	2025-07-26 16:13:05.804998+00	\N	\N	\N	\N	\N	\N	t
1053e451-e6de-45a5-b703-67c31b42e753	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-14 20:48:48.397983+00	\N	\N	\N	\N	\N	\N	t
a91dbc40-0c1c-4664-8c7e-8fb9ba1339fa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Aipo	Tarcísio	3.00	15.00	45.00	A PAGAR	2025-07-26 16:13:05.806517+00	\N	\N	\N	\N	\N	\N	t
e838f06a-be81-473d-9d28-b69176f0f7b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-11	Dia	Lucas	1.00	250.00	250.00	A PAGAR	2025-07-26 16:13:05.807162+00	\N	\N	\N	\N	\N	\N	t
243f0b41-19dc-43d6-a77d-72219d41721a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-07	Aipo	Tarcísio	2.00	15.00	30.00	A PAGAR	2025-07-26 16:13:05.807777+00	\N	\N	\N	\N	\N	\N	t
cecd881a-c3d0-4f87-8fcc-38bb1a94f0d0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-20	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.808559+00	\N	\N	\N	\N	\N	\N	t
42a04db3-3703-4678-bf34-68a974385303	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-09	Aipo	Tarcísio	2.00	15.00	30.00	A PAGAR	2025-07-26 16:13:05.809693+00	\N	\N	\N	\N	\N	\N	t
088d68ae-da93-4d9c-9f00-a2f0abaf34aa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-13	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.810505+00	\N	\N	\N	\N	\N	\N	t
a49790fd-3671-431b-90f5-80b530c54cfb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Aipo	Tarcísio	2.00	15.00	30.00	A PAGAR	2025-07-26 16:13:05.811167+00	\N	\N	\N	\N	\N	\N	t
159bdd37-21a2-4d68-96f4-0f7f116af39a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-14	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.811812+00	\N	\N	\N	\N	\N	\N	t
2546b5df-8f38-44e9-9c19-b57cfae4e3ac	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Aipo	Tarcísio	2.00	15.00	30.00	A PAGAR	2025-07-26 16:13:05.812432+00	\N	\N	\N	\N	\N	\N	t
3e85fc6a-2ceb-493d-baed-5145d93160c9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-15	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.813209+00	\N	\N	\N	\N	\N	\N	t
83f9e28c-5486-4070-998e-45e65748ad57	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-16	Aipo	Tarcísio	2.00	15.00	30.00	A PAGAR	2025-07-26 16:13:05.81385+00	\N	\N	\N	\N	\N	\N	t
0c30460e-bf75-4ca8-b5ba-d73ac845a02c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-16	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.814462+00	\N	\N	\N	\N	\N	\N	t
56147b43-bf87-4124-998a-fd4f530919fd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Aipo	Tarcísio	2.00	15.00	30.00	A PAGAR	2025-07-26 16:13:05.815066+00	\N	\N	\N	\N	\N	\N	t
0ae63f57-2214-4cb5-ac0a-cb5bc8e8371a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-17	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.815704+00	\N	\N	\N	\N	\N	\N	t
f576596a-7c0f-4bc1-bb21-1fee72e30186	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-14 20:49:01.150662+00	\N	\N	\N	\N	\N	\N	t
aa3375a9-b77b-42f9-9e24-0ccea080cc01	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-18	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.816919+00	\N	\N	\N	\N	\N	\N	t
ac839a83-b1cf-415d-af36-6920644ebbf1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Caixotao 	Casarão	4.00	5.00	20.00	A Pagar	2025-08-15 21:14:24.1872+00	\N	\N	\N	\N	\N	\N	t
37d76767-cb48-4bc7-bed6-dda6e4f80741	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-19	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.818128+00	\N	\N	\N	\N	\N	\N	t
4ea01224-a126-4688-9d49-10da94f809ed	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.818743+00	\N	\N	\N	\N	\N	\N	t
464b6d79-0916-4b5a-a5dd-d35487341ea6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-13	Dia	Lucas	1.00	50.00	50.00	A PAGAR	2025-07-26 16:13:05.819343+00	\N	\N	\N	\N	\N	\N	t
5e256c35-685d-4310-a3dc-b6726cc41928	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-12	Aipo	Agro costa	10.00	2.00	20.00	A PAGAR	2025-07-26 16:13:05.819957+00	\N	\N	\N	\N	\N	\N	t
0a2c2117-0458-48c5-91b0-93d5d3807621	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-15	Dia	Lucas	1.00	50.00	50.00	A PAGAR	2025-07-26 16:13:05.820653+00	\N	\N	\N	\N	\N	\N	t
f8eb3045-9b1b-4d9f-8e7c-38e636e67cef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.821308+00	\N	\N	\N	\N	\N	\N	t
b3437a53-4437-4c06-83bc-2dcdd903ea83	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-17	Dia	Lucas	1.00	50.00	50.00	A PAGAR	2025-07-26 16:13:05.821927+00	\N	\N	\N	\N	\N	\N	t
1f0bd85b-c18f-4c5c-8afa-7594361811f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Aipo	Agro costa	80.00	2.00	160.00	A PAGAR	2025-07-26 16:13:05.822608+00	\N	\N	\N	\N	\N	\N	t
ca16c4b0-494f-4502-b837-d8f9ecd5cb28	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-20	Dia	Lucas	1.00	50.00	50.00	A PAGAR	2025-07-26 16:13:05.823244+00	\N	\N	\N	\N	\N	\N	t
14eddf02-6383-4d2a-a0a0-e7de731d2cc3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-16	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.823856+00	\N	\N	\N	\N	\N	\N	t
b96dbf98-91aa-4a8f-a30e-d517e0337028	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-12	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.82448+00	\N	\N	\N	\N	\N	\N	t
51d833b7-7f5c-453e-b1cd-fd0261d37d34	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.825161+00	\N	\N	\N	\N	\N	\N	t
a5fdb23a-2d0f-4a87-a6fb-8e6a6f0e2f69	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-21	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.826043+00	\N	\N	\N	\N	\N	\N	t
2f9af63e-6097-4a16-bd3d-6ccc3c13482f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:05.826737+00	\N	\N	\N	\N	\N	\N	t
94168c67-a38c-4cd3-806f-8259e5f19643	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-06 20:41:57.299816+00	\N	\N	\N	\N	\N	\N	t
558fcdf7-3d84-48d1-a96d-3996c5dc893d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-15 21:14:38.793453+00	\N	\N	\N	\N	\N	\N	t
572313e3-97bf-47c9-955a-ca5c19298451	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-15 21:14:53.835+00	\N	\N	\N	\N	\N	\N	t
96130085-1c59-42ea-828f-fea4b6bd9d45	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Alessandro	1.00	15.00	15.00	A PAGAR	2025-07-26 16:13:05.829419+00	\N	\N	\N	\N	\N	\N	t
b2d48328-19c4-4aa8-ad26-dd6b30fddeeb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-03 19:38:16.549822+00	\N	\N	\N	\N	\N	\N	t
7c9c3ad7-5742-42f1-a322-1bb258faefe7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Loro	Alessandro	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:05.830637+00	\N	\N	\N	\N	\N	\N	t
019189a6-4dbf-466f-8b68-934f5f838661	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-15 21:15:06.140625+00	\N	\N	\N	\N	\N	\N	t
df53743b-b527-4f5a-825f-80fc5854b23c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Loro	Alessandro	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:05.831848+00	\N	\N	\N	\N	\N	\N	t
97d8a63d-5387-48f9-9903-b76dbe25b0fe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-22	Dia	Lucas	1.00	50.00	50.00	A PAGAR	2025-07-26 16:13:05.832453+00	\N	\N	\N	\N	\N	\N	t
b0cba55d-d566-4804-84c8-47f233836bfc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Loro	Alessandro	20.00	10.00	200.00	A PAGAR	2025-07-26 16:13:05.833224+00	\N	\N	\N	\N	\N	\N	t
611e6f05-74ae-4eb4-9256-77cbd83552cc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Moca alecrim	Derson	10.00	5.00	50.00	A Pagar	2025-08-03 19:47:47.532817+00	\N	\N	\N	\N	\N	\N	t
f6514563-ff22-4ae9-9992-e28ed830a368	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Loro	Alessandro	20.00	10.00	200.00	A PAGAR	2025-07-26 16:13:05.834497+00	\N	\N	\N	\N	\N	\N	t
405a21f4-234d-4db0-ac65-03c31ce2686b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-03 20:02:10.095068+00	\N	\N	\N	\N	\N	\N	t
bcc0355b-c572-49c0-910e-93f1138ba78c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Loro	Alessandro	20.00	10.00	200.00	A PAGAR	2025-07-26 16:13:05.83648+00	\N	\N	\N	\N	\N	\N	t
afa60f41-c609-4c58-8d23-97426015fe38	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-07 17:17:24.113495+00	\N	\N	\N	\N	\N	\N	t
65e1a1a7-d9b4-4cc8-bd53-41a9a5a6964b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Loro	Alessandro	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:05.838007+00	\N	\N	\N	\N	\N	\N	t
839718de-3f2f-4570-bdfe-a8e1d632089e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Loro	Vica	40.00	1.00	40.00	A Pagar	2025-08-07 20:47:22.166313+00	\N	\N	\N	\N	\N	\N	t
c6641c99-4bdd-4950-94ea-7ed40d2a5235	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Alessandro	1.00	15.00	15.00	A PAGAR	2025-07-26 16:13:05.83935+00	\N	\N	\N	\N	\N	\N	t
731c5f07-eecf-4eba-9f92-84bc9d6a81cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-04 21:25:16.769902+00	\N	\N	\N	\N	\N	\N	t
3bdc2c36-a9f1-4900-9cb2-19b3be77c7cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Loro	Alessandro	15.00	10.00	150.00	A PAGAR	2025-07-26 16:13:05.840763+00	\N	\N	\N	\N	\N	\N	t
6d41c507-12eb-424a-8824-53292446cd17	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Queiroz e guarilha 	460.00	0.50	230.00	A Pagar	2025-08-16 13:24:38.246261+00	\N	\N	\N	\N	\N	\N	t
d5fc6967-dd81-4079-bb1d-5f219298dd23	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-16 13:24:38.326922+00	\N	\N	\N	\N	\N	\N	t
abda3f06-51f1-4e11-8599-6a8d2b13e11f	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Sandro	100.00	0.80	80.00	A Pagar	2025-08-16 13:24:38.486654+00	\N	\N	\N	\N	\N	\N	t
491e1cf7-c9c5-4503-88e8-ac834b0f9875	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-08-05 21:28:05.45538+00	\N	\N	\N	\N	\N	\N	t
8956f1da-2c8c-4c99-b07c-11fdf92e1dfe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Marquinho cebola	19.00	2.00	38.00	A Pagar	2025-08-05 22:35:00.87436+00	\N	\N	\N	\N	\N	\N	t
462cd102-b9e4-4ef8-b0fc-59b117357b47	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-03 19:38:33.861142+00	\N	\N	\N	\N	\N	\N	t
fbaf127a-904d-4fe2-92fb-8bcf0aab1e98	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Loro	Derson	9.00	10.00	90.00	A Pagar	2025-08-03 19:48:01.803007+00	\N	\N	\N	\N	\N	\N	t
9d9af215-b448-4a42-bc46-60fcc011a7eb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-23	Alecrim	Lucas	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:05.850401+00	\N	\N	\N	\N	\N	\N	t
28b7fbff-75b5-4702-a387-1f3fcfc1f5cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-06 20:42:14.227918+00	\N	\N	\N	\N	\N	\N	t
258121d6-fce9-41e8-b770-8fbd8979afdc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.852576+00	\N	\N	\N	\N	\N	\N	t
eb2264da-8169-4b6e-b4c3-f6ccf40ef681	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-03	Mostarda 	Sandro	70.00	0.60	42.00	A Pagar	2025-08-07 00:05:43.097561+00	\N	\N	\N	\N	\N	\N	t
fb6d99ab-7fde-4f91-a8c0-c78ebb24600d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.853891+00	\N	\N	\N	\N	\N	\N	t
0004d8fd-f0ca-46a2-9f29-b7381997f1af	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Neuza e filho	60.00	2.00	120.00	A Pagar	2025-08-04 21:26:32.691928+00	\N	\N	\N	\N	\N	\N	t
f20b5cad-da2a-4426-a615-7b39924a78eb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Acelga	Multi folhas	124.00	2.00	248.00	A PAGAR	2025-07-26 16:13:05.855097+00	\N	\N	\N	\N	\N	\N	t
2c4ac98d-7e65-4a25-a4df-1d5a217ab1e7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.856318+00	\N	\N	\N	\N	\N	\N	t
8bcc77d4-e9eb-4a95-89de-7febd0bbdf56	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Poro	Lindomar	12.00	15.00	180.00	A Pagar	2025-08-04 21:39:22.210148+00	\N	\N	\N	\N	\N	\N	t
7cb4a2b8-31f9-4ff1-86f9-2a4db67ae6c3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.857692+00	\N	\N	\N	\N	\N	\N	t
c1aa062c-186c-47f1-a4ed-471cc8b77713	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Acelga	Multi folhas	137.00	2.00	274.00	A PAGAR	2025-07-26 16:13:05.859376+00	\N	\N	\N	\N	\N	\N	t
cdfb011d-cb5f-4ee4-adfb-f6854e73e785	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-05 21:28:19.694575+00	\N	\N	\N	\N	\N	\N	t
946e51cd-831c-48ed-bfab-22d1c8617ba0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.860876+00	\N	\N	\N	\N	\N	\N	t
5af7d088-0a83-4134-91ec-7ad2a4b5e08b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-24	Saco esterco	Luis esterco	50.00	15.00	750.00	A PAGAR	2025-07-26 16:13:05.861502+00	\N	\N	\N	\N	\N	\N	t
69061fd4-85a3-4a48-a1f0-129f1de8f189	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.862104+00	\N	\N	\N	\N	\N	\N	t
814c4bfa-1dba-484b-ba3c-cbeecc381e38	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Rony bethel	24.00	2.00	48.00	A Pagar	2025-08-05 22:35:16.898481+00	\N	\N	\N	\N	\N	\N	t
cb5c600f-a111-4e22-a269-ac80700a2b80	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Acelga	Multi folhas	156.00	2.00	312.00	A PAGAR	2025-07-26 16:13:05.863338+00	\N	\N	\N	\N	\N	\N	t
ee3887e5-518f-40e8-9ab9-f6b5d5a2c074	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.864574+00	\N	\N	\N	\N	\N	\N	t
2708fea6-395f-4385-b8dc-5c51e0ca61f3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-07 17:17:56.792686+00	\N	\N	\N	\N	\N	\N	t
f0527007-32be-4eaf-b679-7bef7b4befd6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.865839+00	\N	\N	\N	\N	\N	\N	t
daa9b6cc-940f-45ba-9e07-20681f876626	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-24	Dia	Lucas	1.00	50.00	50.00	A PAGAR	2025-07-26 16:13:05.866476+00	\N	\N	\N	\N	\N	\N	t
0ed6808b-5155-4c20-b179-67f4dcc6b033	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Acelga	Multi folhas	158.00	2.00	316.00	A PAGAR	2025-07-26 16:13:05.867284+00	\N	\N	\N	\N	\N	\N	t
44df03ce-4a5b-4df2-9081-08b64a4f4fc5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-07 20:47:46.323152+00	\N	\N	\N	\N	\N	\N	t
08c5f875-8df5-45aa-a449-27753a33fd53	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.86849+00	\N	\N	\N	\N	\N	\N	t
70479183-bfb6-4980-8b15-c9f6a4fa2eb0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.869705+00	\N	\N	\N	\N	\N	\N	t
d94ec034-de8b-4ee0-b793-cf44ad2796aa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Acelga	Multi folhas	148.00	2.00	296.00	A PAGAR	2025-07-26 16:13:05.870901+00	\N	\N	\N	\N	\N	\N	t
17bc6d80-18ca-4c04-8cfa-f7f09bc7f2bf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.872092+00	\N	\N	\N	\N	\N	\N	t
8e0724ee-6b12-4378-82ae-4c491aaffaa1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-25	Pix	Aroldo	1.00	1000.00	1000.00	A PAGAR	2025-07-26 16:13:05.872697+00	\N	\N	\N	\N	\N	\N	t
e02c63be-d98b-4825-9f88-971c7b7fe82c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.873283+00	\N	\N	\N	\N	\N	\N	t
67057c95-b7b6-42e8-880a-6d452eb3752d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-09 01:25:58.373251+00	\N	\N	\N	\N	\N	\N	t
61d9462f-4828-4397-8505-fada6d847c6c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Acelga	Multi folhas	192.00	2.00	384.00	A PAGAR	2025-07-26 16:13:05.874512+00	\N	\N	\N	\N	\N	\N	t
f37c2e49-8094-45d2-afbd-fa7b254c0fa8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.876148+00	\N	\N	\N	\N	\N	\N	t
bebc9f2f-7941-4f50-b1f2-2ca2a181a400	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-10 17:27:42.669137+00	\N	\N	\N	\N	\N	\N	t
ec8e5e46-d665-4075-bba8-83d2928aa3fa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.877468+00	\N	\N	\N	\N	\N	\N	t
a3523770-05d5-44e3-ac65-77bb2dcfb58a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-10 17:27:55.216021+00	\N	\N	\N	\N	\N	\N	t
3ac25231-24fa-4f0c-aff5-a522facd301c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Acelga	Multi folhas	122.00	2.00	244.00	A PAGAR	2025-07-26 16:13:05.878676+00	\N	\N	\N	\N	\N	\N	t
156772fa-14d0-482b-b7f1-f95f5d4c4eb9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:05.879886+00	\N	\N	\N	\N	\N	\N	t
028380ec-54f9-45f7-a4c0-653d33d85b69	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-10 17:39:58.74126+00	\N	\N	\N	\N	\N	\N	t
91117c5b-cec7-4ce8-8be8-0fd2c53377fb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:05.881085+00	\N	\N	\N	\N	\N	\N	t
27aeb01b-26e6-4a41-93db-36d7cd2fc1d6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-11 07:48:28.814297+00	\N	\N	\N	\N	\N	\N	t
078f7982-af7a-488d-b16f-bce67b9d6d37	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Acelga	Multi folhas	138.00	2.00	276.00	A PAGAR	2025-07-26 16:13:05.882356+00	\N	\N	\N	\N	\N	\N	t
71c25b1d-cdb6-48ba-9f5b-ed14c71c3fc6	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-11	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-11 12:10:11.24639+00	\N	\N	\N	\N	\N	\N	t
bd46a834-fb52-405b-976d-647c080b8154	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Alface crespa	Multi folhas	10.00	12.00	120.00	A PAGAR	2025-07-26 16:13:05.88354+00	\N	\N	\N	\N	\N	\N	t
86849f2c-381d-4202-9fa5-d63b9f600c87	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Poro	Mateus	2.00	15.00	30.00	A Pagar	2025-08-11 21:21:18.14621+00	\N	\N	\N	\N	\N	\N	t
30cc401a-fa84-44e7-92c9-e80c8b3b2eb3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-12 21:31:39.482271+00	\N	\N	\N	\N	\N	\N	t
8c2c63eb-bef3-4451-bb3e-054b2bb16a06	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-12 21:31:54.540586+00	\N	\N	\N	\N	\N	\N	t
b517b812-5041-470d-b54c-f986324317e2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-12 21:32:06.160322+00	\N	\N	\N	\N	\N	\N	t
79eee4d4-e9da-4bd3-9d65-cd4a8c941274	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Acelga	Multi folhas	121.00	2.00	242.00	A Pagar	2025-08-12 21:32:18.867946+00	\N	\N	\N	\N	\N	\N	t
63906d84-a841-47ec-92e4-1fa65ce01039	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-12 21:32:31.316648+00	\N	\N	\N	\N	\N	\N	t
7c8bf816-0a38-4b81-a000-0015d9e1b34c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-12 21:32:44.764466+00	\N	\N	\N	\N	\N	\N	t
a2b72ab9-f320-4547-8f7e-625f9fcf6c50	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-12 21:41:51.969134+00	\N	\N	\N	\N	\N	\N	t
e76bfc25-7a6d-4f66-adaa-0bcd1e079d73	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-12 21:42:04.990305+00	\N	\N	\N	\N	\N	\N	t
61978ebb-d171-413d-ac36-b0d43c40926d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-13 16:34:43.918271+00	\N	\N	\N	\N	\N	\N	t
dd79e3a9-89d8-4c29-adf3-6e68668b8aee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Moca alecrim	Greide	6.00	5.00	30.00	A Pagar	2025-08-14 20:49:18.516497+00	\N	\N	\N	\N	\N	\N	t
9a1e7c1c-5099-4f13-a6a6-bd869832c42a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Poro	Mateus	1.00	15.00	15.00	A Pagar	2025-08-15 21:15:25.886262+00	\N	\N	\N	\N	\N	\N	t
9c7f154c-33f6-47be-9788-9537dbef248d	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-16 13:24:38.607084+00	\N	\N	\N	\N	\N	\N	t
a2a366f2-86c6-477c-b19b-3e9ca3020930	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-16 13:24:38.858399+00	\N	\N	\N	\N	\N	\N	t
2f45d011-fb2a-4652-8249-f59afa4d6381	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Serra agrícola	3.00	16.00	48.00	A Pagar	2025-08-03 19:38:48.615259+00	\N	\N	\N	\N	\N	\N	t
a25c3d04-3440-41fc-823c-8e50c68f6563	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Queiroz e guarilha 	460.00	0.50	230.00	A Pagar	2025-08-16 13:24:39.102829+00	\N	\N	\N	\N	\N	\N	t
24257b17-6b4e-4dda-a116-a2e6d7e95420	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-06 20:42:32.334486+00	\N	\N	\N	\N	\N	\N	t
58600555-4970-4210-92af-b0f524910573	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Sandro	100.00	0.80	80.00	A Pagar	2025-08-16 13:24:39.362908+00	\N	\N	\N	\N	\N	\N	t
0d5190a7-f4ce-44b7-a137-948e3b1eef3b	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-16 13:24:39.425049+00	\N	\N	\N	\N	\N	\N	t
95923dc5-952e-4f62-9e0b-5ff9251ea0d0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-03 19:39:03.50233+00	\N	\N	\N	\N	\N	\N	t
ffb51570-7749-4992-ae8b-76900a017ca5	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Thiago chencher 	30.00	0.80	24.00	A Pagar	2025-08-16 13:24:39.610881+00	\N	\N	\N	\N	\N	\N	t
801d6fb8-0bb7-4c09-ab3e-329f8c536c52	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-15	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-16 13:24:39.871918+00	\N	\N	\N	\N	\N	\N	t
67f125fd-e4cf-4a2e-8733-6e2ccda1c358	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-17 13:46:00.01575+00	\N	\N	\N	\N	\N	\N	t
79b0085e-9b1e-466e-9355-269f173bf23b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Acelga	Rodrigo  água quente 	50.00	2.00	100.00	A Pagar	2025-08-17 14:06:18.881225+00	\N	\N	\N	\N	\N	\N	t
51f96f4b-d767-4937-bc4c-7728ad5931af	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Acelga	Vegetable	130.00	2.00	260.00	A Pagar	2025-08-17 18:37:13.025039+00	\N	\N	\N	\N	\N	\N	t
ac888d44-12fe-42c9-9be4-7bdfb8863509	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Aipo	Pai	10.00	11.00	110.00	A Pagar	2025-08-17 18:37:30.125255+00	\N	\N	\N	\N	\N	\N	t
8f0902e9-7e98-4ed6-89bb-9034de64c6d3	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-08-18	Alface americana 	JFC	10.00	18.00	180.00	A Pagar	2025-08-18 15:28:45.019921+00	\N	\N	\N	\N	\N	\N	t
71760faf-5565-4336-ab5f-bdc45d19068f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-18 17:41:30.913616+00	\N	\N	\N	\N	\N	\N	t
15e5d981-b455-484e-84a9-0177ff1491c0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Jajá e junior	1.00	15.00	15.00	A PAGAR	2025-07-26 16:13:05.897001+00	\N	\N	\N	\N	\N	\N	t
774ae246-4b17-4729-b589-c04f67632d84	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Poro	Derson	14.00	20.00	280.00	A Pagar	2025-08-03 19:48:18.60379+00	\N	\N	\N	\N	\N	\N	t
9f3becbc-efda-4225-b9b5-8a08afcd002e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Radichio	Jajá e junior	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:05.898388+00	\N	\N	\N	\N	\N	\N	t
57344fe9-8494-4a31-b2ab-012c027d1fd0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-19 12:01:56.728888+00	\N	\N	\N	\N	\N	\N	t
0b555fcf-238d-4d90-b55a-64f164b88045	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Jajá e junior	20.00	15.00	300.00	A PAGAR	2025-07-26 16:13:05.899692+00	\N	\N	\N	\N	\N	\N	t
d5a512e0-7e0f-4dbf-aeac-f221460c9c96	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Agro costa	60.00	2.00	120.00	A Pagar	2025-08-04 21:26:52.947773+00	\N	\N	\N	\N	\N	\N	t
2ff1e4bb-404e-4b05-a0df-091de3be65e7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Jajá e junior	105.00	15.00	1575.00	A PAGAR	2025-07-26 16:13:05.900989+00	\N	\N	\N	\N	\N	\N	t
84290ce4-ee59-4e34-a1ca-2342077c21ee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Caixotao 	Casarão	5.00	5.00	25.00	A Pagar	2025-08-04 22:34:40.74067+00	\N	\N	\N	\N	\N	\N	t
d3ec1084-a4f5-46c7-be17-0b85bbd84f84	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Jajá e junior	40.00	15.00	600.00	A PAGAR	2025-07-26 16:13:05.902271+00	\N	\N	\N	\N	\N	\N	t
739933b6-e10a-4d30-8e95-50d9847a40ae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Loro	Fabio	5.00	10.00	50.00	A Pagar	2025-08-19 12:02:08.280363+00	\N	\N	\N	\N	\N	\N	t
731dfcc0-a3af-449c-b69e-f4c0ce188aa8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Aipo	Jajá e junior	50.00	15.00	750.00	A PAGAR	2025-07-26 16:13:05.903567+00	\N	\N	\N	\N	\N	\N	t
bb68b9e5-b4a9-497e-8631-06042c227450	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Alecrim	Ozia	50.00	1.20	60.00	A Pagar	2025-08-19 18:28:51.435424+00	\N	\N	\N	\N	\N	\N	t
57f75c54-3a52-43d1-8b35-2ef332d926b1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Jajá e junior	20.00	15.00	300.00	A PAGAR	2025-07-26 16:13:05.904965+00	\N	\N	\N	\N	\N	\N	t
358673da-92ce-43e8-84f3-af4d9d8cc653	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-08-05 21:28:34.178518+00	\N	\N	\N	\N	\N	\N	t
7c83b500-0195-4da0-9a20-22ec7fa816a8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Jajá e junior	30.00	15.00	450.00	A PAGAR	2025-07-26 16:13:05.906331+00	\N	\N	\N	\N	\N	\N	t
425f606a-aecc-41a2-9907-37b071ad5e77	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Acelga	Rony bethel	15.00	1.80	27.00	A Pagar	2025-08-05 22:35:30.523319+00	\N	\N	\N	\N	\N	\N	t
f08a7340-a24e-437e-a761-0cef2a9d48c0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-07 20:47:59.594592+00	\N	\N	\N	\N	\N	\N	t
50585600-d7ec-4188-92fc-ae4d46ef6a66	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Jakeline	3.50	24.00	84.00	A Pagar	2025-08-19 18:40:09.497053+00	\N	\N	\N	\N	\N	\N	t
dcd29b39-c5cf-4482-b3bf-fc8cb61a006b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Acelmo	70.00	2.00	140.00	A Pagar	2025-08-07 20:58:43.507464+00	\N	\N	\N	\N	\N	\N	t
c2a846a8-a91c-4159-a9a0-ffcc3303fd7f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Alface americana		5.00	18.00	90.00	A Pagar	2025-08-08 13:30:09.23969+00	\N	\N	\N	\N	\N	\N	t
161707b9-ae27-498a-b033-3ed109216e24	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Loro	Vica	20.00	1.00	20.00	A Pagar	2025-08-19 19:56:55.265936+00	\N	\N	\N	\N	\N	\N	t
47425e04-7387-4351-9b72-3ce78a864e24	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-19 20:01:13.776488+00	\N	\N	\N	\N	\N	\N	t
31243398-a245-4f20-8936-2d03f5cd33c4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-10 17:28:09.436725+00	\N	\N	\N	\N	\N	\N	t
16a5d5d0-8189-4936-bf6d-b6675d2463f8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-10 17:40:13.504238+00	\N	\N	\N	\N	\N	\N	t
2b19e7ad-e4e6-40e3-b74b-1b05bd3356d9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-11 07:48:50.822324+00	\N	\N	\N	\N	\N	\N	t
c40bac05-f82a-48a8-8df0-79945cb9c255	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-09	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-11 12:10:35.533218+00	\N	\N	\N	\N	\N	\N	t
2142dbc2-bbb2-4b13-95b4-b56b2e4f5d94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-11 21:21:32.568853+00	\N	\N	\N	\N	\N	\N	t
504b8c3e-fadb-4254-a2ef-4c441ac21b61	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Loro	Vica	40.00	1.00	40.00	A Pagar	2025-08-12 21:32:59.252675+00	\N	\N	\N	\N	\N	\N	t
52b3718c-c53a-46fd-8d7e-e11e751a2c87	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-12 21:33:11.275232+00	\N	\N	\N	\N	\N	\N	t
3212bb8b-7f10-4c16-b479-729d1b31f63f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Paquy	20.00	2.00	40.00	A Pagar	2025-08-12 21:42:18.496851+00	\N	\N	\N	\N	\N	\N	t
0f4319f0-ef30-457e-afa8-b9bedb8b9463	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-13 16:35:12.591257+00	\N	\N	\N	\N	\N	\N	t
8f35e2e0-0299-475f-bcee-b3e4d2208600	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Caixotao 	Casarão	5.00	5.00	25.00	A Pagar	2025-08-14 01:21:47.60881+00	\N	\N	\N	\N	\N	\N	t
e4ab5e00-85c1-4f2a-8814-c40a0578af1e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-14 19:07:36.887597+00	\N	\N	\N	\N	\N	\N	t
9c210418-bbb8-4956-8783-739914b01365	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Jakeline	3.50	24.00	84.00	A Pagar	2025-08-14 19:18:53.718622+00	\N	\N	\N	\N	\N	\N	t
6b86adb7-0794-460e-b820-60249c5d2b2f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	BR	30.00	1.70	51.00	A Pagar	2025-08-14 19:35:55.305396+00	\N	\N	\N	\N	\N	\N	t
71677fa2-9083-4628-8c54-7ffcd537e0f4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alface romana 	Vegetable	30.00	1.50	45.00	A Pagar	2025-08-19 20:05:09.170883+00	\N	\N	\N	\N	\N	\N	t
faefc7a4-c98b-477f-a473-c90ce07d875e	120a5304-54be-4290-b0cc-ed1de8d3b16b	6270b6d9-3707-4755-8920-1e0ad25d05a2	venda	2025-08-20	teste	teste	1.00	5.00	5.00	A Pagar	2025-08-20 01:26:41.526445+00	\N	\N	\N	\N	\N	\N	t
8da199d2-c9ab-480d-a21d-dfe5d926e5e4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-03 19:39:18.572715+00	\N	\N	\N	\N	\N	\N	t
d78e1857-c65a-49c7-9bf6-661e445ef394	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-03 20:03:00.048146+00	\N	\N	\N	\N	\N	\N	t
80202acb-ec7b-44df-874e-010f75902d93	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Alecrim	Bibi	100.00	1.70	170.00	A PAGAR	2025-07-26 16:13:05.927115+00	\N	\N	\N	\N	\N	\N	t
d47cfc49-d260-49f6-b29b-f19437364ca2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Alecrim	Bibi	100.00	1.70	170.00	A PAGAR	2025-07-26 16:13:05.92841+00	\N	\N	\N	\N	\N	\N	t
1803d6ff-e06a-4aa9-8a8f-5078bffa6026	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Alecrim	Bibi	100.00	1.70	170.00	A PAGAR	2025-07-26 16:13:05.929634+00	\N	\N	\N	\N	\N	\N	t
a858ee5b-3518-438a-8c31-72935b9617a5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Alecrim	Bibi	100.00	1.70	170.00	A PAGAR	2025-07-26 16:13:05.930874+00	\N	\N	\N	\N	\N	\N	t
d2028170-6e4a-4323-b3e1-9547fa8ac9fd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-06 20:43:06.348116+00	\N	\N	\N	\N	\N	\N	t
51d48713-fb15-41d5-a549-20b490c4e478	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-04 21:27:22.756457+00	\N	\N	\N	\N	\N	\N	t
a3b22c92-5306-4c22-b3ee-621c5bebf84e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Moca alecrim	Greide	5.00	5.00	25.00	A Pagar	2025-08-07 20:48:27.436861+00	\N	\N	\N	\N	\N	\N	t
7b4e79a8-dfbb-4f94-b4b1-407d47625df9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Jakeline	3.50	24.00	84.00	A Pagar	2025-08-07 20:59:02.256249+00	\N	\N	\N	\N	\N	\N	t
fb328dc7-3400-4557-9141-3b83fa080713	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Tomilho	Fabiane	10.00	1.50	15.00	A Pagar	2025-08-05 21:28:52.372156+00	\N	\N	\N	\N	\N	\N	t
5b2688f0-340c-42d0-8aa8-a73aa7dec41a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Caixotao 	Casarão	5.00	5.00	25.00	A Pagar	2025-08-05 22:37:06.771575+00	\N	\N	\N	\N	\N	\N	t
0c6603a4-078d-4e74-921c-16f9293cb641	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Aipo	Caio	41.00	11.00	451.00	A Pagar	2025-08-05 22:37:19.030004+00	\N	\N	\N	\N	\N	\N	t
b12c3c9f-d290-4b54-aac9-e015653ba19c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-05 22:37:35.892479+00	\N	\N	\N	\N	\N	\N	t
31d182a0-ad58-42a4-ac7b-908d5ba5084b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-05 22:37:48.342844+00	\N	\N	\N	\N	\N	\N	t
e3fc5010-a248-438d-bc32-7bfad5930268	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Aipo	Pai	10.00	11.00	110.00	A Pagar	2025-08-05 22:38:01.182544+00	\N	\N	\N	\N	\N	\N	t
8c816467-01c1-4cc6-acec-a72b2b52882b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Aipo	Caio	41.00	11.00	451.00	A Pagar	2025-08-08 18:37:53.697591+00	\N	\N	\N	\N	\N	\N	t
748842db-6882-4727-8af9-6e14af79b2c4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	BR	100.00	1.70	170.00	A Pagar	2025-08-10 08:12:57.956681+00	\N	\N	\N	\N	\N	\N	t
db30e8f0-5b2d-4797-87dc-4c46a6c8d34d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Loro	BR	2.00	11.00	22.00	A Pagar	2025-08-10 08:13:10.378464+00	\N	\N	\N	\N	\N	\N	t
3f2c22f6-8fb7-4e25-a591-e50b7b44bbbe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Albidair	40.00	1.70	68.00	A Pagar	2025-08-10 17:28:25.752211+00	\N	\N	\N	\N	\N	\N	t
c0a2fdaf-212a-4656-bf1a-376205e0fe7c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-10 17:28:39.999386+00	\N	\N	\N	\N	\N	\N	t
ad285e24-254d-4e61-9451-a099796a42cc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Aipo	Pai	10.00	11.00	110.00	A Pagar	2025-08-10 17:40:36.301159+00	\N	\N	\N	\N	\N	\N	t
63a301a3-1ebe-4f3e-aea2-a75819e255c9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-03-30	Troco	Aroldo	1.00	3252.00	3252.00	A Pagar	2025-08-11 07:54:37.804292+00	\N	\N	\N	\N	\N	\N	t
fae8a7bb-c6a3-4787-817a-339ce5bb61af	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-11 21:21:50.402827+00	\N	\N	\N	\N	\N	\N	t
e902dbf7-626c-487f-a7ec-b5b043134c0d	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-09	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-11 12:10:59.772527+00	\N	\N	\N	\N	\N	\N	t
0a5cade2-c14c-4505-98c6-e6193d16face	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-12 21:33:24.746123+00	\N	\N	\N	\N	\N	\N	t
b634ac26-93bc-46c4-8011-58655389735d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-12 21:44:48.073511+00	\N	\N	\N	\N	\N	\N	t
8016a1e3-b5ef-432a-9eb0-961976e5dc21	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Alecrin	Marli	30.00	1.20	36.00	A Pagar	2025-08-13 16:35:26.045868+00	\N	\N	\N	\N	\N	\N	t
6dcf6c8c-1b11-4a09-a0e4-a92b8ddec85a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-14 01:22:01.501541+00	\N	\N	\N	\N	\N	\N	t
08c9f854-5d48-48bf-81c5-b88c935a93c8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Aipo	Pai	15.00	11.00	165.00	A Pagar	2025-08-14 19:07:55.900154+00	\N	\N	\N	\N	\N	\N	t
05ac7337-3c11-40fc-abc4-a03e54c9c4f5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-03 19:39:34.174498+00	\N	\N	\N	\N	\N	\N	t
88430a13-67e3-4cc1-8e68-3a18ba8c27f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-16	Pix	Aroldo	1.00	1000.00	1000.00	A PAGAR	2025-07-26 16:13:05.964754+00	\N	\N	\N	\N	\N	\N	t
414f92b1-18c6-42df-baec-647a1d32d477	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Poro	Mateus	6.00	15.00	90.00	A Pagar	2025-08-03 20:03:14.43882+00	\N	\N	\N	\N	\N	\N	t
17420641-fa28-41da-bbd6-63d88d572ffc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-03 20:03:28.992827+00	\N	\N	\N	\N	\N	\N	t
5ff76334-cb95-4e57-b199-24a78ec7dacc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-04 21:27:35.88025+00	\N	\N	\N	\N	\N	\N	t
674b3b29-a16d-44af-8d35-5b1c3f957339	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Poro	Lindomar	10.00	15.00	150.00	A Pagar	2025-08-06 20:43:24.09914+00	\N	\N	\N	\N	\N	\N	t
5acf7197-7736-49bf-a298-1161e7744ab9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Tuyane	4.00	16.00	64.00	A Pagar	2025-08-05 21:29:10.681869+00	\N	\N	\N	\N	\N	\N	t
246e4776-e059-4922-8d4e-26848a3fd8fc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Salsa crespa	Lorinha	40.00	1.00	40.00	A Pagar	2025-08-05 22:38:18.651218+00	\N	\N	\N	\N	\N	\N	t
796b2506-4fbf-46a2-bda4-d3b58010c16d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Acelga	Miguel	100.00	1.50	150.00	A Pagar	2025-08-06 20:43:37.36731+00	\N	\N	\N	\N	\N	\N	t
725b92cb-d128-41bc-836a-4f45caf711e1	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	Sandro	90.00	0.80	72.00	A Pagar	2025-08-07 00:06:11.396717+00	\N	\N	\N	\N	\N	\N	t
22cc9fbb-9df5-4731-bcf0-dbf2dd5f5099	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Acelga	Mateus	80.00	1.50	120.00	A Pagar	2025-08-07 17:18:58.596876+00	\N	\N	\N	\N	\N	\N	t
1e8c8acb-d156-4658-b00e-74e4c44e5288	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-07 20:48:42.854848+00	\N	\N	\N	\N	\N	\N	t
eae79910-2995-4858-bac7-99feef5cc026	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Salsa crespa	Jakeline	10.00	1.20	12.00	A Pagar	2025-08-07 20:59:16.88666+00	\N	\N	\N	\N	\N	\N	t
a08a3708-aa86-40f8-adf4-049a659e80d8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-08 18:38:08.646063+00	\N	\N	\N	\N	\N	\N	t
5e4b589c-37fa-4901-8d21-ba0739f6e17d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-08-10 08:27:02.967708+00	\N	\N	\N	\N	\N	\N	t
d02aeb93-47d3-4bbb-b01d-76ec17eb8cf1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-08-10 17:28:59.519252+00	\N	\N	\N	\N	\N	\N	t
6b1e55d1-ac6f-4ad8-8c5f-466de25cd07d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-10 17:40:52.656535+00	\N	\N	\N	\N	\N	\N	t
4ad627fe-d2ec-4086-802b-b2d391a2ce20	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-04-30	Troco	Aroldo	1.00	3661.00	3661.00	A Pagar	2025-08-11 07:55:24.140693+00	\N	\N	\N	\N	\N	\N	t
7f53c368-e19e-475b-be90-af87aad2c77d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Caixotao 	Casarão	6.00	5.00	30.00	A Pagar	2025-08-11 21:22:18.457957+00	\N	\N	\N	\N	\N	\N	t
f0cbea85-b9a7-40e1-ba6a-be0a17b87873	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Moca alecrim	Greide	8.00	5.00	40.00	A Pagar	2025-08-12 21:33:40.001049+00	\N	\N	\N	\N	\N	\N	t
68bdf9de-01a0-4352-8b4b-e146cd288fb7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-12 21:45:09.866903+00	\N	\N	\N	\N	\N	\N	t
de86f1fb-84bb-49e5-8b21-66930f4e82a8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-12 21:45:22.830461+00	\N	\N	\N	\N	\N	\N	t
ff11ceea-9a20-47d1-a3b3-eef79b0cd6b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Aipo	Pai	10.00	11.00	110.00	A Pagar	2025-08-12 21:45:35.836156+00	\N	\N	\N	\N	\N	\N	t
58cd659b-4357-474e-b8b7-bfa7ab424683	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-13 16:35:45.77324+00	\N	\N	\N	\N	\N	\N	t
420333d8-664a-4293-a88d-12eda3e61dca	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-14 01:22:38.397619+00	\N	\N	\N	\N	\N	\N	t
52621561-cdd1-4220-9acb-b5da5336429e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-14 19:09:12.535257+00	\N	\N	\N	\N	\N	\N	t
3ce192dd-2b3e-486c-a6ce-04410df998f9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Salsa crespa	Jakeline	40.00	1.20	48.00	A Pagar	2025-08-14 19:19:09.048529+00	\N	\N	\N	\N	\N	\N	t
bb261bdc-ea71-4870-8ca0-85cb0d6a327a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Loro	BR	2.00	11.00	22.00	A Pagar	2025-08-14 19:36:10.964417+00	\N	\N	\N	\N	\N	\N	t
ed315504-8cf8-4e8e-8763-2534f129dc39	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-14 20:49:33.182547+00	\N	\N	\N	\N	\N	\N	t
86419e49-5dff-4cf8-ad5a-f09e55949790	120a5304-54be-4290-b0cc-ed1de8d3b16b	6270b6d9-3707-4755-8920-1e0ad25d05a2	gasto	2025-08-20	teste	teste	100.00	10.00	1000.00	A Pagar	2025-08-20 01:26:52.505231+00	\N	\N	\N	\N	\N	\N	t
a600d4ce-a537-47ff-b4d8-a7f4fa538933	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-08-16	Alface americana 	JFC	10.00	18.00	180.00	A Pagar	2025-08-16 13:58:52.33113+00	\N	\N	\N	\N	\N	\N	t
1fdcdc8d-ecac-4831-9430-b0be8b052a4c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Alecrim	Ozia	50.00	1.20	60.00	A Pagar	2025-08-17 13:46:16.567606+00	\N	\N	\N	\N	\N	\N	t
165a6caf-da24-4438-bd8f-245a5e249dfc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-17 14:06:43.402876+00	\N	\N	\N	\N	\N	\N	t
a5b438fc-bf6a-459d-8af9-aad17d5bc0a5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-17 14:06:52.229302+00	\N	\N	\N	\N	\N	\N	t
9dc1013a-a698-4151-89cd-de645cb527c4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Caixotao	Casarão	6.00	5.00	30.00	A Pagar	2025-08-17 18:38:00.308224+00	\N	\N	\N	\N	\N	\N	t
2de1dc23-bff6-443e-b1ec-208ff8362eb2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Fernando Amorim 	1.00	16.00	16.00	A Pagar	2025-08-18 17:32:52.296572+00	\N	\N	\N	\N	\N	\N	t
6e8331da-25cb-4b37-8252-132199b2b19c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-08-18 17:41:46.646405+00	\N	\N	\N	\N	\N	\N	t
bf45aab8-0c69-485f-9530-3e8a0f0e57a3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-18 17:41:56.864062+00	\N	\N	\N	\N	\N	\N	t
0a9d8de3-e780-4b3a-aca6-d41b9756af15	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-18 17:42:08.305533+00	\N	\N	\N	\N	\N	\N	t
49d25a92-ce33-4244-b06b-87b251927272	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	18526a3b-e7a3-4375-b574-b278afb83c2b	venda	2025-08-19	Abobrinha	Abc	30.00	70.00	2100.00	A Pagar	2025-08-19 12:09:05.77409+00	\N	\N	\N	\N	\N	\N	t
822003a4-498a-4d6f-a3c9-bc50c6d5b3ca	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	18526a3b-e7a3-4375-b574-b278afb83c2b	venda	2025-08-19	tomate 	Abc	29.00	80.00	2320.00	A Pagar	2025-08-19 12:09:05.075177+00	\N	\N	\N	\N	\N	\N	t
36b696ec-0a32-4e41-8c87-8303f7b5bcca	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Moca alecrim	Ozia	20.00	3.00	60.00	A Pagar	2025-08-19 18:29:05.799904+00	\N	\N	\N	\N	\N	\N	t
9594d525-0164-47f2-97cf-188a22fa976c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Salsa crespa	Jakeline	50.00	1.20	60.00	A Pagar	2025-08-19 18:40:27.646414+00	\N	\N	\N	\N	\N	\N	t
c598b098-e236-4638-8785-af0617d52f8c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-19 19:57:52.397097+00	\N	\N	\N	\N	\N	\N	t
eb795aa7-c4ce-42dd-8676-6f1b000070a3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Acelga	Multi folhas	137.00	2.00	274.00	A Pagar	2025-08-03 19:39:48.346907+00	\N	\N	\N	\N	\N	\N	t
57110057-e4e5-45d7-9129-353e3bfe4021	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Tomilho	Tuyane	20.00	1.60	32.00	A Pagar	2025-08-19 20:01:27.687259+00	\N	\N	\N	\N	\N	\N	t
0712a995-121e-4047-bb6f-02b9634cc9bb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Loro	Alessandro	10.00	10.00	100.00	A Pagar	2025-08-19 20:05:27.187647+00	\N	\N	\N	\N	\N	\N	t
a60663f5-2b25-4be2-b6ce-db1579c7b4d2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Moca alecrim	Ozia	20.00	3.00	60.00	A Pagar	2025-08-20 15:22:10.099116+00	\N	\N	\N	\N	\N	\N	t
ae821fdd-80ad-4f93-82e9-cd90436d82d3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Poro	Nando	10.00	13.00	130.00	A Pagar	2025-08-20 15:24:46.982284+00	\N	\N	\N	\N	\N	\N	t
db8fd342-6920-4a37-bee5-c024bee7e79c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-03 20:03:44.290758+00	\N	\N	\N	\N	\N	\N	t
295d0b66-98d1-44e1-a8d9-f64e38839877	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Aipo	Jajá e junior	20.00	15.00	300.00	A PAGAR	2025-07-26 16:13:06.018144+00	\N	\N	\N	\N	\N	\N	t
47327aed-0a7d-4497-a9b4-1f9e1fccbe76	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Jajá e junior	40.00	15.00	600.00	A PAGAR	2025-07-26 16:13:06.018828+00	\N	\N	\N	\N	\N	\N	t
f8fc0ef2-e745-4382-b51b-566ef2b1fec9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Aipo	Tarcísio	3.00	15.00	45.00	A PAGAR	2025-07-26 16:13:06.019434+00	\N	\N	\N	\N	\N	\N	t
073b92cc-d49d-415f-80af-15d9323bd16f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Marquinho cebola	16.00	2.00	32.00	A Pagar	2025-08-04 21:27:53.821943+00	\N	\N	\N	\N	\N	\N	t
5a38e596-539b-4995-84be-1865951fdbc9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-06 20:43:50.101885+00	\N	\N	\N	\N	\N	\N	t
e1b475fe-3491-4018-bf88-ac9072197d0e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-06 20:44:02.433683+00	\N	\N	\N	\N	\N	\N	t
af58d296-5857-427b-95fe-8d7136a84d27	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Poro	Mateus	2.00	15.00	30.00	A Pagar	2025-08-20 15:25:02.437777+00	\N	\N	\N	\N	\N	\N	t
6693c46d-b3ec-4df0-86ab-77d83053ce5f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-05 21:29:28.214332+00	\N	\N	\N	\N	\N	\N	t
e6042f04-7671-4db8-b37e-b4e7457975f1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Felipe tunin	25.00	15.00	375.00	A Pagar	2025-08-20 15:26:55.903429+00	\N	\N	\N	\N	\N	\N	t
8530509a-ee6f-4b76-9bf2-3df5d8dcbaf4	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-20	Mostarda 	Queiroz e guarilha 	300.00	0.40	120.00	A Pagar	2025-08-20 20:19:52.878011+00	\N	\N	\N	\N	\N	\N	t
1f5c94cb-4554-46ff-8679-b3683e66dde7	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-20	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-20 20:19:53.158046+00	\N	\N	\N	\N	\N	\N	t
1e35a67a-feb8-4a7a-9b4f-a00864ad0118	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-20	Mostarda 	Sandro	100.00	0.80	80.00	A Pagar	2025-08-20 20:19:53.824977+00	\N	\N	\N	\N	\N	\N	t
5a22882c-d639-47e4-ad3e-a91972b83598	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Gleiciel	1.00	13.00	13.00	A PAGAR	2025-07-26 16:13:06.025675+00	\N	\N	\N	\N	\N	\N	t
e35924b2-f7a3-465c-b807-42b0ed3fe024	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Gleiciel	2.00	13.00	26.00	A PAGAR	2025-07-26 16:13:06.026552+00	\N	\N	\N	\N	\N	\N	t
512f9f4f-3c63-4acc-ae0c-71239764a11d	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-20	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-20 20:19:54.098516+00	\N	\N	\N	\N	\N	\N	t
c7d6dece-4ca8-4e78-bd92-cc4714210764	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Jakeline	4.00	24.00	108.00	A PAGAR	2025-07-26 16:13:06.02848+00	\N	\N	\N	\N	\N	\N	t
757c3b18-730f-4240-8efa-61450483578c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.029094+00	\N	\N	\N	\N	\N	\N	t
829f8565-aa33-4901-a62e-6522daaae11f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-02	Aipo	Jakeline	3.00	24.00	72.00	A PAGAR	2025-07-26 16:13:06.029702+00	\N	\N	\N	\N	\N	\N	t
3f8b8a68-68a6-414d-8d28-ed1f8e9b2d15	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-02	Salsa crespa	Jakeline	15.00	1.20	18.00	A PAGAR	2025-07-26 16:13:06.030306+00	\N	\N	\N	\N	\N	\N	t
3b01a497-6621-408a-b76a-a19c781bba92	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Jakeline	3.00	24.00	84.00	A PAGAR	2025-07-26 16:13:06.030901+00	\N	\N	\N	\N	\N	\N	t
8214db26-8ebb-45fa-aac4-01e75a74a6f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Salsa crespa	Jakeline	25.00	1.20	30.00	A PAGAR	2025-07-26 16:13:06.031605+00	\N	\N	\N	\N	\N	\N	t
bb9f1196-e528-4b96-9903-107aeb726b80	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	aipo	Jakeline	2.00	24.00	60.00	A PAGAR	2025-07-26 16:13:06.032206+00	\N	\N	\N	\N	\N	\N	t
8216f21c-db39-4780-84ff-2d25005c88d0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Salsa crespa	Jakeline	30.00	1.20	36.00	A PAGAR	2025-07-26 16:13:06.032826+00	\N	\N	\N	\N	\N	\N	t
b6bff3f2-c897-44fc-8059-8920ef29e35e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-05	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.033444+00	\N	\N	\N	\N	\N	\N	t
de1f55bf-90b0-401e-abf7-e1e0cb1b7a96	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-05	Salsa crespa	Jakeline	30.00	1.20	36.00	A PAGAR	2025-07-26 16:13:06.034249+00	\N	\N	\N	\N	\N	\N	t
241de17f-999c-4813-8b57-492abb8477c6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Jakeline	2.00	24.00	60.00	A PAGAR	2025-07-26 16:13:06.034898+00	\N	\N	\N	\N	\N	\N	t
4ed3cac1-eeaa-4807-aca2-b0ad6ad55d41	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Salsa crespa	Jakeline	30.00	1.20	36.00	A PAGAR	2025-07-26 16:13:06.035521+00	\N	\N	\N	\N	\N	\N	t
8f4d797d-b0ce-4af5-a4b8-bdf2a1e4462c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-07	Aipo	Jakeline	2.00	24.00	60.00	A PAGAR	2025-07-26 16:13:06.036165+00	\N	\N	\N	\N	\N	\N	t
ba07d19d-d214-4d82-9d19-442f10d75418	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-07	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.036851+00	\N	\N	\N	\N	\N	\N	t
959c6bde-3083-478f-a35a-98aaa9fcac51	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Jakeline	5.00	24.00	120.00	A PAGAR	2025-07-26 16:13:06.037493+00	\N	\N	\N	\N	\N	\N	t
701201df-8081-46b6-bd36-1b0f7169456e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-09	Aipo	Jakeline	4.00	24.00	108.00	A PAGAR	2025-07-26 16:13:06.038132+00	\N	\N	\N	\N	\N	\N	t
795a742b-4fb9-4198-84a9-d6795ecbf81c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-09	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.038749+00	\N	\N	\N	\N	\N	\N	t
e4db6416-ddbb-4b88-8ab1-f8df55cbb829	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Jakeline	3.00	24.00	72.00	A PAGAR	2025-07-26 16:13:06.03942+00	\N	\N	\N	\N	\N	\N	t
aed0c656-5bd8-4d04-9fcf-9c48f3efd7e0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.040067+00	\N	\N	\N	\N	\N	\N	t
a973e306-2854-40fa-b8fc-a4902ba8fd8a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.040677+00	\N	\N	\N	\N	\N	\N	t
21a5cc8d-48e3-4a61-ab70-2c60333d35bf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Salsa crespa	Jakeline	30.00	1.20	36.00	A PAGAR	2025-07-26 16:13:06.041273+00	\N	\N	\N	\N	\N	\N	t
e3e62736-1fcd-46d8-94d4-bb70dbaf2b89	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-12	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.042064+00	\N	\N	\N	\N	\N	\N	t
066e3bf0-840a-4f8b-bcfe-85b766f0e699	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-12	Salsa crespa	Jakeline	30.00	1.20	36.00	A PAGAR	2025-07-26 16:13:06.042996+00	\N	\N	\N	\N	\N	\N	t
577a3acf-48b0-46ec-9d83-fcc074e51027	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.043854+00	\N	\N	\N	\N	\N	\N	t
89b088a8-f407-4869-b1fb-b83183904891	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.044495+00	\N	\N	\N	\N	\N	\N	t
226921a3-d558-4003-ad48-be41ba439895	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Aipo	Jakeline	1.00	24.00	36.00	A PAGAR	2025-07-26 16:13:06.045107+00	\N	\N	\N	\N	\N	\N	t
df00b36a-6543-4cdb-b9b5-1cd922364cdd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-14	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.045734+00	\N	\N	\N	\N	\N	\N	t
53600710-3e1d-432f-ae97-8d7734b96ea2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Jakeline	3.00	24.00	72.00	A PAGAR	2025-07-26 16:13:06.046346+00	\N	\N	\N	\N	\N	\N	t
507cde5d-fb5a-40d7-ac53-c6ddd0674390	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Salsa crespa	Jakeline	40.00	1.20	48.00	A PAGAR	2025-07-26 16:13:06.046952+00	\N	\N	\N	\N	\N	\N	t
c160e5fd-0658-4cb8-addf-0609efae94b9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-16	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.047547+00	\N	\N	\N	\N	\N	\N	t
44f7c1fe-f02c-4a54-99f9-94bd1ce79de2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-16	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.048155+00	\N	\N	\N	\N	\N	\N	t
c03910eb-b292-493b-8d40-86d393184f9c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Jakeline	3.00	24.00	72.00	A PAGAR	2025-07-26 16:13:06.048795+00	\N	\N	\N	\N	\N	\N	t
ad517883-b5eb-4873-b748-dc9ef5e81693	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Salsa crespa	Jakeline	15.00	1.20	18.00	A PAGAR	2025-07-26 16:13:06.049386+00	\N	\N	\N	\N	\N	\N	t
5e9e524e-bf14-42ae-b2b1-c41fe7af5819	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Aipo	Jakeline	1.00	24.00	36.00	A PAGAR	2025-07-26 16:13:06.050082+00	\N	\N	\N	\N	\N	\N	t
a051a437-fb83-4203-a4ef-a09a2ae63cef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Salsa crespa	Jakeline	40.00	1.20	48.00	A PAGAR	2025-07-26 16:13:06.050687+00	\N	\N	\N	\N	\N	\N	t
4f0b2c54-3db6-4dd2-a0e1-0595e408c235	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-19	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.051269+00	\N	\N	\N	\N	\N	\N	t
a97fe9de-4db5-4c3d-8940-7a76a1749860	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-19	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.05186+00	\N	\N	\N	\N	\N	\N	t
8e3fd273-113b-4ea8-b732-0af016a9a34b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.052463+00	\N	\N	\N	\N	\N	\N	t
b91d397c-de2e-45d8-8aad-b0b01e876460	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Salsa crespa	Jakeline	25.00	1.20	30.00	A PAGAR	2025-07-26 16:13:06.05322+00	\N	\N	\N	\N	\N	\N	t
61e7f792-4c56-4b6a-976d-f00d0a8302de	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.05382+00	\N	\N	\N	\N	\N	\N	t
edbcfc72-54f6-4517-a288-3b283f78bc32	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Salsa crespa	Jakeline	20.00	1.20	24.00	A PAGAR	2025-07-26 16:13:06.05442+00	\N	\N	\N	\N	\N	\N	t
d448ed54-3f93-49ae-a958-b13e8ae6bf0a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Jakeline	4.00	24.00	96.00	A PAGAR	2025-07-26 16:13:06.055008+00	\N	\N	\N	\N	\N	\N	t
eb3932f1-18fd-4822-84b4-bcfa66ccf52e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Salsa crespa	Jakeline	50.00	1.20	60.00	A PAGAR	2025-07-26 16:13:06.055698+00	\N	\N	\N	\N	\N	\N	t
9da56395-b81f-47ce-8729-a910ee4cd14c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Salsa crespa	Jakeline	25.00	1.20	30.00	A PAGAR	2025-07-26 16:13:06.056298+00	\N	\N	\N	\N	\N	\N	t
f43fa443-b70b-4546-ac63-9d2e0ba9dfc9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:06.073962+00	\N	\N	\N	\N	\N	\N	t
c5a53d4c-5b23-4db1-a8bd-4c94347ef756	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:06.074551+00	\N	\N	\N	\N	\N	\N	t
b60ecb5a-dfac-4d71-b2ed-a1934ef6c085	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:06.075137+00	\N	\N	\N	\N	\N	\N	t
2382c42f-848c-410f-aa71-102651762f5f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:06.076067+00	\N	\N	\N	\N	\N	\N	t
2e09adbc-daec-4841-a556-3e3250f6d7c9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Agro Terê	2.00	14.00	28.00	A PAGAR	2025-07-26 16:13:06.076799+00	\N	\N	\N	\N	\N	\N	t
a0ee3003-064f-47aa-8152-be0d6e432662	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:06.077416+00	\N	\N	\N	\N	\N	\N	t
c98e4c47-1158-488c-ba83-8044db60efd2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-14 20:49:46.59315+00	\N	\N	\N	\N	\N	\N	t
911ef631-53b0-4d9b-870b-edeb3ea10b62	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alecrim	Bibi	100.00	1.70	170.00	A PAGAR	2025-07-26 16:13:06.079232+00	\N	\N	\N	\N	\N	\N	t
0cf90484-ed35-4359-ad52-b30f052a5575	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alecrim	Bibi	100.00	1.70	170.00	A PAGAR	2025-07-26 16:13:06.079962+00	\N	\N	\N	\N	\N	\N	t
eae1b109-e2de-4c7c-9035-6af16bceed65	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Serra agrícola	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.080555+00	\N	\N	\N	\N	\N	\N	t
272e1b0c-2efd-4e69-912c-e4e4ef8ccd99	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Serra agrícola	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.08114+00	\N	\N	\N	\N	\N	\N	t
708b6e1e-c832-430e-9b5e-3950bc9ec9a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Serra agrícola	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.081744+00	\N	\N	\N	\N	\N	\N	t
ed9436e9-22aa-4659-a29e-83dd97c9c70c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-16 21:59:07.92052+00	\N	\N	\N	\N	\N	\N	t
4198a6e0-6a65-4987-8182-f3005466cdfe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Alecrim	Ivanete 	100.00	1.20	120.00	A Pagar	2025-08-17 13:46:37.726417+00	\N	\N	\N	\N	\N	\N	t
e74ebf08-5ae8-4bc4-a61d-e3d77f7a9668	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:06.08352+00	\N	\N	\N	\N	\N	\N	t
da46e052-1a95-431d-916f-acce30c283e1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:06.084104+00	\N	\N	\N	\N	\N	\N	t
8ad68d56-81f5-48a9-bb73-709a3713cd44	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Acelga	Multi folhas	157.00	2.00	314.00	A PAGAR	2025-07-26 16:13:06.084701+00	\N	\N	\N	\N	\N	\N	t
944cfb03-d19d-4df4-8385-3cd8fcc53217	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alface crespa	Multi folhas	10.00	12.00	120.00	A PAGAR	2025-07-26 16:13:06.085293+00	\N	\N	\N	\N	\N	\N	t
db819d6b-b62f-4e33-a72a-ce4db08e6f2a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:06.085909+00	\N	\N	\N	\N	\N	\N	t
1d78ad91-80a4-4d41-926d-0d0a9cccd0c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:06.086511+00	\N	\N	\N	\N	\N	\N	t
f5e014d5-7346-4448-bc82-f569fb9291e9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Acelga	Multi folhas	145.00	2.00	290.00	A PAGAR	2025-07-26 16:13:06.087099+00	\N	\N	\N	\N	\N	\N	t
21d3ca9b-5660-4a97-93e1-46c15a759d6c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alface crespa	Multi folhas	10.00	12.00	120.00	A PAGAR	2025-07-26 16:13:06.08769+00	\N	\N	\N	\N	\N	\N	t
70555df4-dafe-43e3-8ab2-d25948309d94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-03 19:40:01.599689+00	\N	\N	\N	\N	\N	\N	t
90c8741f-5152-48b4-b18e-c58d7b544fee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-03 19:49:49.002423+00	\N	\N	\N	\N	\N	\N	t
ea07eb7f-457f-4e1f-9131-229bd6b2605e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Vegetable	6.00	15.00	90.00	A Pagar	2025-08-03 19:50:03.075058+00	\N	\N	\N	\N	\N	\N	t
6ba2435f-0687-44a9-ab74-9defa92615f2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Acelga	Luciana	100.00	1.50	150.00	A Pagar	2025-08-03 20:04:04.350359+00	\N	\N	\N	\N	\N	\N	t
ce50c68c-2fb4-45ad-a6d1-53f55ea31b5b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Acelga	Lizete	30.00	1.50	45.00	A Pagar	2025-08-17 13:46:54.700627+00	\N	\N	\N	\N	\N	\N	t
cb8b832b-d31d-43a0-9cb1-da88be360703	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-17 14:07:04.825392+00	\N	\N	\N	\N	\N	\N	t
a3bed929-9ef8-4947-a1a8-f25032d2b67c	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-16	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-17 21:28:11.428591+00	\N	\N	\N	\N	\N	\N	t
dde5fb2e-4e46-460a-aae1-a392717d3b2d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-18 17:35:02.810342+00	\N	\N	\N	\N	\N	\N	t
6af05df5-54a5-4c96-9382-a676e187ccb1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-23	Aipo	Jakeline	2.00	24.00	48.00	A PAGAR	2025-07-26 16:13:06.095338+00	\N	\N	\N	\N	\N	\N	t
59921155-8906-431a-bdbf-cc6ce6b1e02d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-23	Salsa crespa	Jakeline	25.00	1.20	30.00	A PAGAR	2025-07-26 16:13:06.096093+00	\N	\N	\N	\N	\N	\N	t
3be2e424-9305-4df7-9fee-8108fcf9be61	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-23	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:06.096742+00	\N	\N	\N	\N	\N	\N	t
74556473-fe41-4625-9538-5e0aa9f20769	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-18 17:35:20.777083+00	\N	\N	\N	\N	\N	\N	t
73f38581-a2f2-4f30-a1bb-56b5c6f4144a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-18 17:35:34.578584+00	\N	\N	\N	\N	\N	\N	t
ff073cb9-3e26-4c31-90dd-b03ec2d773bb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Jajá e junior	50.00	15.00	750.00	A PAGAR	2025-07-26 16:13:06.099215+00	\N	\N	\N	\N	\N	\N	t
6dbeaad7-51c9-483f-b8d2-a88075c72540	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-23	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.099841+00	\N	\N	\N	\N	\N	\N	t
e9e4a949-4f60-460c-a682-33f3626ae9f8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.100445+00	\N	\N	\N	\N	\N	\N	t
447cced1-47ab-49ed-bc28-6bd1ff9cb38b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-21	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.101052+00	\N	\N	\N	\N	\N	\N	t
ac77ba9d-1109-42cf-8fdd-149ec4c4588b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.101658+00	\N	\N	\N	\N	\N	\N	t
00425731-1bc0-4ceb-bd84-518397f28608	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.102301+00	\N	\N	\N	\N	\N	\N	t
02001f99-d7d2-497b-8cec-401a21cd3869	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-04	Acelga	Rony bethel	15.00	1.80	27.00	A PAGAR	2025-07-26 16:13:06.103174+00	\N	\N	\N	\N	\N	\N	t
2d0a49c8-6ff9-4831-8968-ee337056768c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.103793+00	\N	\N	\N	\N	\N	\N	t
05490442-2899-4ab7-b940-6d307c1b3c70	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Acelga	Rony bethel	15.00	1.80	27.00	A PAGAR	2025-07-26 16:13:06.104389+00	\N	\N	\N	\N	\N	\N	t
df390877-8dcc-41df-8e16-cb880bab63da	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.104984+00	\N	\N	\N	\N	\N	\N	t
a73033b4-7ca2-4f1e-8a30-4342a06efba3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-11	Acelga	Rony bethel	15.00	1.80	27.00	A PAGAR	2025-07-26 16:13:06.105583+00	\N	\N	\N	\N	\N	\N	t
ee71ec3c-9faa-4e84-acde-37ecfa6b02ef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.106176+00	\N	\N	\N	\N	\N	\N	t
c22ada47-859e-497c-ac88-2bde2ede65f0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Acelga	Rony bethel	15.00	1.80	27.00	A PAGAR	2025-07-26 16:13:06.106778+00	\N	\N	\N	\N	\N	\N	t
d2d24153-45f9-47fd-8158-0db5c9487192	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-18	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.107364+00	\N	\N	\N	\N	\N	\N	t
3cc92e72-e838-4dc5-b6c1-bc690aa7d223	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.107956+00	\N	\N	\N	\N	\N	\N	t
da8bfac7-9df4-445f-ac01-1b10102f51e6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Acelga	Rony bethel	15.00	1.80	27.00	A PAGAR	2025-07-26 16:13:06.10863+00	\N	\N	\N	\N	\N	\N	t
243afe3a-68ff-4ae7-8a3d-926309afc7c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-05 21:29:48.091128+00	\N	\N	\N	\N	\N	\N	t
ef1d41aa-59cc-4560-b6b2-1cff74cf4aa2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Almeirão	Lorinha	10.00	0.80	8.00	A Pagar	2025-08-05 22:39:41.03324+00	\N	\N	\N	\N	\N	\N	t
c95932ad-1565-4df0-8759-0c3a36c82f33	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-04	Mostarda 	Sandro	150.00	0.60	90.00	A Pagar	2025-08-07 00:06:11.399209+00	\N	\N	\N	\N	\N	\N	t
bdea0841-e448-4908-87cc-48306963d189	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Coentro	Luciana	10.00	3.00	30.00	A Pagar	2025-08-07 17:20:37.998405+00	\N	\N	\N	\N	\N	\N	t
f08b0a04-efb4-4dfb-89a8-84cf14c2f979	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-07 20:49:03.14604+00	\N	\N	\N	\N	\N	\N	t
ed8f73ec-ecfc-4160-b732-21ac29fe59f9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-07 20:49:15.494823+00	\N	\N	\N	\N	\N	\N	t
4b95de2e-1020-4dcf-8975-a85bcd6b7f08	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Vica	1.00	16.00	16.00	A Pagar	2025-08-03 19:40:23.600438+00	\N	\N	\N	\N	\N	\N	t
62d0b7a2-52df-4a45-9ebf-749097f43a8f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Acelga	Vegetable	170.00	2.00	340.00	A Pagar	2025-08-03 19:50:21.060972+00	\N	\N	\N	\N	\N	\N	t
a9c76cbb-c3a0-4bfc-a856-e5ebc0dc8030	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Coentro	Luciana	10.00	3.00	30.00	A Pagar	2025-08-03 20:04:24.565256+00	\N	\N	\N	\N	\N	\N	t
a5731a43-2b94-4531-a0c3-cd97cfc9a3a3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-04 21:32:00.256635+00	\N	\N	\N	\N	\N	\N	t
c4cfa466-c8fa-46e2-bb1e-fe51129ccc22	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Waguinho	4.00	13.00	52.00	A Pagar	2025-08-05 21:22:20.780855+00	\N	\N	\N	\N	\N	\N	t
198ff106-ddc0-4c15-ada5-233cb3efbae9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-05 21:30:03.604697+00	\N	\N	\N	\N	\N	\N	t
081ed348-a004-4eeb-a206-7cd5c9d374bc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Mostarda 	Lorinha	10.00	0.60	6.00	A Pagar	2025-08-05 22:39:56.197093+00	\N	\N	\N	\N	\N	\N	t
a712e628-1b44-40d0-a105-17c6b2aeb7b5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Tuyane	6.00	16.00	96.00	A Pagar	2025-08-14 20:50:10.175454+00	\N	\N	\N	\N	\N	\N	t
df94c561-bb0f-49ca-9c4e-4d464c0d3dc0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-14 20:50:21.978567+00	\N	\N	\N	\N	\N	\N	t
2f8b2d9e-a1dd-41ef-a1d5-9cb462b5fc0c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-15 21:16:56.445335+00	\N	\N	\N	\N	\N	\N	t
08130fc1-c983-49c9-b6fa-f56a4e4acce0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-16 21:59:22.413469+00	\N	\N	\N	\N	\N	\N	t
17b62289-9a18-478c-884b-c7ffab9f61cc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-17 13:47:21.26322+00	\N	\N	\N	\N	\N	\N	t
6fe7f847-0648-4b8c-bef9-db15f2bbd080	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-08-17 14:07:17.426923+00	\N	\N	\N	\N	\N	\N	t
bb0c7a90-cca3-46ba-9afd-30eb34a0f6b7	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-16	Mostarda 	Folhas da serra 	160.00	0.60	96.00	A Pagar	2025-08-17 21:28:11.788282+00	\N	\N	\N	\N	\N	\N	t
251912f8-28c0-43d5-9ec1-d82577706699	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-07-28 22:49:22.597277+00	\N	\N	\N	\N	\N	\N	t
c3a2ac5c-5b01-4e88-917b-65e2b2f2db38	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-16	Mostarda 	Sandro	100.00	0.80	80.00	A Pagar	2025-08-17 21:28:12.061718+00	\N	\N	\N	\N	\N	\N	t
440e95f5-6e42-45ef-bfb6-cb1534c38c41	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-07 17:20:57.671529+00	\N	\N	\N	\N	\N	\N	t
c8eb0910-c9a1-430c-bef5-e03ad17922cc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-07 20:49:33.605384+00	\N	\N	\N	\N	\N	\N	t
b3c979a4-1259-4a1b-a821-d94320f06b06	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Neuza e filho	40.00	2.00	80.00	A Pagar	2025-08-07 20:59:31.991818+00	\N	\N	\N	\N	\N	\N	t
aab92884-67cb-4448-bade-4a396ac284a4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Gleiciel	2.00	13.00	26.00	A PAGAR	2025-07-26 16:13:06.130184+00	\N	\N	\N	\N	\N	\N	t
a8b1d939-8c9e-4a99-88fe-5b6d4edb5dca	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Agro costa	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.133548+00	\N	\N	\N	\N	\N	\N	t
c83f0727-12dd-43d5-84b5-cb558050b975	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-08 18:38:21.968575+00	\N	\N	\N	\N	\N	\N	t
736a5e72-8f27-4015-991e-84af739e118b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-09 15:50:23.85935+00	\N	\N	\N	\N	\N	\N	t
6b979224-e19f-49cb-aeba-6690adb0969e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-09 15:50:34.252249+00	\N	\N	\N	\N	\N	\N	t
60f920d2-339b-4a54-b01a-feaa82218c61	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.138399+00	\N	\N	\N	\N	\N	\N	t
29bce3fc-85cb-4a1b-8c24-69359fc24068	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.139031+00	\N	\N	\N	\N	\N	\N	t
8bf62516-1cbe-431f-82d9-166b4755ad32	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.13966+00	\N	\N	\N	\N	\N	\N	t
903c4d76-96eb-4c27-a4ad-e53a12ae1363	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.140244+00	\N	\N	\N	\N	\N	\N	t
65bec592-4194-486b-8c34-1d7d5d381737	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Tomilho	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.140838+00	\N	\N	\N	\N	\N	\N	t
c2f7ab11-800b-492c-9deb-0ca86e4c9609	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.141423+00	\N	\N	\N	\N	\N	\N	t
5d6ce30e-7f49-4b1e-9deb-40ed22a30b16	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Jakeline	3.00	24.00	72.00	A PAGAR	2025-07-26 16:13:06.142292+00	\N	\N	\N	\N	\N	\N	t
1d664fcf-3626-4fda-a1b9-e9ad43849804	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Salsa crespa	Jakeline	25.00	1.20	30.00	A PAGAR	2025-07-26 16:13:06.143411+00	\N	\N	\N	\N	\N	\N	t
e128262b-b851-4088-b1fd-fda87a5c7544	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Fabiane	2.00	16.00	32.00	A Pagar	2025-08-10 17:29:26.91094+00	\N	\N	\N	\N	\N	\N	t
12e29134-f622-4ffa-b9a3-76489000833a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-05-30	Troco	Aroldo	1.00	3078.00	3078.00	A Pagar	2025-08-11 07:55:58.730336+00	\N	\N	\N	\N	\N	\N	t
84fa6163-2048-40c7-92ad-1d10d1fa55c1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Poro	Waguinho	2.00	18.00	36.00	A Pagar	2025-08-11 21:11:29.456235+00	\N	\N	\N	\N	\N	\N	t
8efad0b7-0707-40b5-931e-015991e8e1e0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Alface americana	Lorenço	10.00	18.00	180.00	A Pagar	2025-08-11 21:22:32.684309+00	\N	\N	\N	\N	\N	\N	t
002c1b34-4b9a-4e85-a71b-d89362cb6d7d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-12 21:33:56.098156+00	\N	\N	\N	\N	\N	\N	t
7c117a21-2a2b-4755-b9de-0639e49914e4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-12 21:34:09.476811+00	\N	\N	\N	\N	\N	\N	t
a0b8ece3-eed2-412a-a841-2ceb47acc957	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-12 21:34:22.27299+00	\N	\N	\N	\N	\N	\N	t
d5c70641-51f5-48ad-9d74-b09d3316f490	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Loro	Pai	30.00	8.00	240.00	A Pagar	2025-08-12 21:45:51.637848+00	\N	\N	\N	\N	\N	\N	t
f165fb94-2197-41c4-91ac-415783567988	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-12 21:46:03.910939+00	\N	\N	\N	\N	\N	\N	t
350ba418-712b-48cb-ae68-51a8f73bb5e2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Moca alecrim	Greide	6.00	5.00	30.00	A PAGAR	2025-07-26 16:13:06.1585+00	\N	\N	\N	\N	\N	\N	t
afadd7a5-ec7c-4dda-8e0c-b63b98aaf45e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.159245+00	\N	\N	\N	\N	\N	\N	t
4d6e9887-42e8-43bb-8fbd-2c70a6a88999	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Moca alecrim	Greide	10.00	5.00	50.00	A PAGAR	2025-07-26 16:13:06.160112+00	\N	\N	\N	\N	\N	\N	t
459db20c-f51a-4e1e-92cc-f6f5f9b90b24	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.160849+00	\N	\N	\N	\N	\N	\N	t
f5d840ea-dad8-4868-9293-cb2ebfa79c05	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Moca alecrim	Greide	6.00	5.00	30.00	A PAGAR	2025-07-26 16:13:06.1615+00	\N	\N	\N	\N	\N	\N	t
0d56f404-5876-45fd-b4e0-50a892ad84f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.162098+00	\N	\N	\N	\N	\N	\N	t
922e59eb-92fa-48f6-b2bb-6be3c16ad9b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Moca alecrim	Greide	6.00	5.00	30.00	A PAGAR	2025-07-26 16:13:06.162722+00	\N	\N	\N	\N	\N	\N	t
7adf3cbe-86b4-4a03-b52f-0eed6bfd2691	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.163351+00	\N	\N	\N	\N	\N	\N	t
5ff5b890-73c0-4744-a338-39fcd386ee86	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Moca alecrim	Greide	10.00	5.00	50.00	A PAGAR	2025-07-26 16:13:06.164014+00	\N	\N	\N	\N	\N	\N	t
6a9b1a4f-a2a7-406d-8e2f-c5db44cd1f0c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Loro	Greide	15.00	10.00	150.00	A PAGAR	2025-07-26 16:13:06.164699+00	\N	\N	\N	\N	\N	\N	t
88ec611f-2ff5-440f-84d7-afc97a062ec3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Moca alecrim	Greide	5.00	5.00	25.00	A PAGAR	2025-07-26 16:13:06.165353+00	\N	\N	\N	\N	\N	\N	t
84cc2d46-e768-41bd-ae75-fa56d6b96cae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.165974+00	\N	\N	\N	\N	\N	\N	t
ae064048-a61f-4550-8553-c4d58004ea9c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Moca alecrim	Greide	6.00	5.00	30.00	A PAGAR	2025-07-26 16:13:06.166613+00	\N	\N	\N	\N	\N	\N	t
c3bd93ac-e4f5-4ac7-a215-925384520e83	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.167227+00	\N	\N	\N	\N	\N	\N	t
fe13bc7f-d1bb-4a04-b1fb-57aa1a3d7a1d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Coentro	Greide	10.00	4.00	40.00	A PAGAR	2025-07-26 16:13:06.167843+00	\N	\N	\N	\N	\N	\N	t
d6a914d2-9105-440d-91af-370e3c03b5b6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Moca alecrim	Greide	8.00	5.00	40.00	A PAGAR	2025-07-26 16:13:06.168451+00	\N	\N	\N	\N	\N	\N	t
7bd1aea8-d9b4-4ddd-bb19-47ccc6d4f4a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.169058+00	\N	\N	\N	\N	\N	\N	t
277f7039-20ac-4eeb-8be9-666f881ecafd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Coentro	Greide	10.00	4.00	40.00	A PAGAR	2025-07-26 16:13:06.169669+00	\N	\N	\N	\N	\N	\N	t
ed6ce53e-aece-454c-8b56-c89083e43389	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Moca alecrim	Greide	4.00	5.00	20.00	A PAGAR	2025-07-26 16:13:06.170248+00	\N	\N	\N	\N	\N	\N	t
0548e064-5fc9-4e82-b69c-4de3af162d6a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Coentro	Greide	10.00	4.00	40.00	A PAGAR	2025-07-26 16:13:06.170835+00	\N	\N	\N	\N	\N	\N	t
3b45d85a-b08d-4a90-a2dd-ecead8e146aa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Moca alecrim	Greide	6.00	5.00	30.00	A PAGAR	2025-07-26 16:13:06.171438+00	\N	\N	\N	\N	\N	\N	t
2f9a5cdd-b519-4105-abc9-c26943cdbbcd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Loro	Greide	10.00	10.00	100.00	A PAGAR	2025-07-26 16:13:06.172017+00	\N	\N	\N	\N	\N	\N	t
fe78e709-41f4-43fa-acec-8ebd3036d3fb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Coentro	Greide	10.00	4.00	40.00	A PAGAR	2025-07-26 16:13:06.172643+00	\N	\N	\N	\N	\N	\N	t
dcab1fcb-9b39-4653-a406-2b1a59cc377e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-14 20:50:37.082423+00	\N	\N	\N	\N	\N	\N	t
c3263ed5-ecd4-49ff-9ea6-828acee553b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-15 21:17:21.546892+00	\N	\N	\N	\N	\N	\N	t
155fa1b3-c660-4124-9709-0e59aa47b3e3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-16 21:59:41.279194+00	\N	\N	\N	\N	\N	\N	t
0ef621c2-0e10-462f-8c3c-eb94c4c70ae1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-16 21:59:50.686232+00	\N	\N	\N	\N	\N	\N	t
6fa06013-6794-4e64-8f39-b21367a1f674	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-16 22:00:03.937031+00	\N	\N	\N	\N	\N	\N	t
e18493f8-6b29-4e0a-9aac-9261ee9dc02e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Acelga	Rodrigo  fazenda 	20.00	1.50	30.00	A Pagar	2025-08-17 13:47:38.052238+00	\N	\N	\N	\N	\N	\N	t
a0f3dbcb-2ef6-43a6-a5a1-2f26ed8c6c99	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	BR	50.00	1.70	85.00	A Pagar	2025-08-17 14:08:15.751679+00	\N	\N	\N	\N	\N	\N	t
cd6801eb-ea46-4e05-bf2e-465ee8546aee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Loro	BR	2.00	11.00	22.00	A Pagar	2025-08-17 14:08:27.264913+00	\N	\N	\N	\N	\N	\N	t
72765055-9798-41e7-83a8-ecd2c0477d59	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-16	Mostarda 	Thiago chencher 	50.00	0.80	40.00	A Pagar	2025-08-17 21:28:12.404517+00	\N	\N	\N	\N	\N	\N	t
eb3c088d-ba27-4f56-9b73-1f9953edacf1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.17965+00	\N	\N	\N	\N	\N	\N	t
a8120ad1-b7d9-45a0-862e-c6ea7df5e277	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.180247+00	\N	\N	\N	\N	\N	\N	t
0db5b394-1691-4e72-954d-2415638a9dc8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.180844+00	\N	\N	\N	\N	\N	\N	t
37905ae0-f414-4779-ab84-7c0121539731	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.181432+00	\N	\N	\N	\N	\N	\N	t
57af3e5d-1ccf-46fa-8425-27059b99195f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.182179+00	\N	\N	\N	\N	\N	\N	t
632f91c2-ff65-45ff-91ce-5f1865f43cbe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.182796+00	\N	\N	\N	\N	\N	\N	t
5e75f07c-ea04-4546-82c2-3a50634cf617	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.183397+00	\N	\N	\N	\N	\N	\N	t
71eaf64d-32a3-4522-b0c5-40b9a85cc096	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.183987+00	\N	\N	\N	\N	\N	\N	t
6b48b56f-8949-4bb3-8d5a-7217988bc841	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Alecrim	Wanderson v l	50.00	1.50	75.00	A PAGAR	2025-07-26 16:13:06.184607+00	\N	\N	\N	\N	\N	\N	t
037a00dc-8bd9-4d0d-986e-fc4958e65f77	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Tomilho	Wanderson v l	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.185187+00	\N	\N	\N	\N	\N	\N	t
ab237a5c-fbd4-4dff-a4e9-e7fe278b392f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Alecrim	Bibi	50.00	1.70	85.00	A PAGAR	2025-07-26 16:13:06.185791+00	\N	\N	\N	\N	\N	\N	t
dad6957b-ce0d-4253-8ae6-032d4d59b5a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-03 19:40:36.811802+00	\N	\N	\N	\N	\N	\N	t
67da53fd-19a9-4a62-a3b8-e581f15b8674	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-14 20:50:50.66742+00	\N	\N	\N	\N	\N	\N	t
ddb12156-3c0a-4d28-bf06-320664a5c899	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Multi folhas	5.00	16.00	80.00	A PAGAR	2025-07-26 16:13:06.187594+00	\N	\N	\N	\N	\N	\N	t
31dc446b-448b-498d-95b3-9d4d7d186de5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Alecrim	Multi folhas	60.00	1.70	102.00	A PAGAR	2025-07-26 16:13:06.188174+00	\N	\N	\N	\N	\N	\N	t
93364e8b-195f-4427-a2bb-9ce0927785c1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Acelga	Multi folhas	165.00	2.00	330.00	A PAGAR	2025-07-26 16:13:06.189262+00	\N	\N	\N	\N	\N	\N	t
d3be1b2d-bef0-43a1-893f-cd8ff7cd4655	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Alface crespa	Multi folhas	10.00	12.00	120.00	A PAGAR	2025-07-26 16:13:06.189877+00	\N	\N	\N	\N	\N	\N	t
73174df6-76d9-475b-a5c6-4a78fead6a9e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Loro	Alessandro	20.00	10.00	200.00	A PAGAR	2025-07-26 16:13:06.190461+00	\N	\N	\N	\N	\N	\N	t
7ca2676d-1840-4637-bb48-58b9037423cd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Loro	Alessandro	20.00	10.00	200.00	A PAGAR	2025-07-26 16:13:06.191041+00	\N	\N	\N	\N	\N	\N	t
b3b52154-77d8-454a-9ce3-54c63d96510f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Loro	Alessandro	20.00	10.00	200.00	A PAGAR	2025-07-26 16:13:06.191639+00	\N	\N	\N	\N	\N	\N	t
56bb6ca5-f053-4641-8c23-258e5d43fb00	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-15 21:17:36.032928+00	\N	\N	\N	\N	\N	\N	t
2428f94c-5258-4b5f-a042-28a05a52e8b7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-16 22:00:21.213296+00	\N	\N	\N	\N	\N	\N	t
82f1c5b7-6842-4dff-8895-e7fd78cbb752	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Mostarda 	Rodrigo  fazenda 	20.00	0.60	12.00	A Pagar	2025-08-17 13:47:54.349584+00	\N	\N	\N	\N	\N	\N	t
3292f42f-4923-4b61-b716-333d38895aa4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Vica	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.19459+00	\N	\N	\N	\N	\N	\N	t
e0ed6b39-76d6-4c38-99a9-ef9dbb883f88	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.195182+00	\N	\N	\N	\N	\N	\N	t
24a89e2a-3c9e-4dc6-bf9a-fa759b7c49f9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Tomilho	Vica	10.00	1.00	10.00	A PAGAR	2025-07-26 16:13:06.195787+00	\N	\N	\N	\N	\N	\N	t
c16d161a-8afb-4574-ae28-e49f88f280a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Vica	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.196421+00	\N	\N	\N	\N	\N	\N	t
991e896d-2c4e-418d-8b45-29f155b0bea4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.197002+00	\N	\N	\N	\N	\N	\N	t
dae5d630-9d2f-44e6-98e6-27febe1efc6e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Vica	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.197585+00	\N	\N	\N	\N	\N	\N	t
88eeaf38-93e8-41f3-82c2-adf8eef02556	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Loro	Vica	40.00	1.00	40.00	A PAGAR	2025-07-26 16:13:06.198166+00	\N	\N	\N	\N	\N	\N	t
062ccc52-2fb8-4140-baea-7db82ce92499	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.198774+00	\N	\N	\N	\N	\N	\N	t
c4dd3377-b514-4a6b-832d-c53a329e45a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Vica	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.199371+00	\N	\N	\N	\N	\N	\N	t
0760fa17-d082-4b6c-bed3-44d483c9cbae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.199974+00	\N	\N	\N	\N	\N	\N	t
d4264f1b-71eb-4423-8ae5-fdaffce26a26	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Loro	Vica	20.00	1.00	20.00	A PAGAR	2025-07-26 16:13:06.200558+00	\N	\N	\N	\N	\N	\N	t
8dd55982-e8ba-48be-8627-b44dd7733215	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Vica	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.20114+00	\N	\N	\N	\N	\N	\N	t
21a8928c-365b-4883-bae5-8436ac8e2ab6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.201731+00	\N	\N	\N	\N	\N	\N	t
7ed32b0f-60b5-4d56-8eaf-b83507d317ed	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Tomilho	Vica	10.00	1.00	10.00	A PAGAR	2025-07-26 16:13:06.202307+00	\N	\N	\N	\N	\N	\N	t
5d980fc9-edc6-4b81-9df4-b81892432588	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.202955+00	\N	\N	\N	\N	\N	\N	t
cb56dc2e-dd99-4694-beeb-cb49695da818	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Vica	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.203657+00	\N	\N	\N	\N	\N	\N	t
7a1dcc8f-1f5b-495c-b214-c7be07aefbc1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Alecrim	Vica	70.00	1.00	70.00	A PAGAR	2025-07-26 16:13:06.20433+00	\N	\N	\N	\N	\N	\N	t
6b668b62-e829-4d07-aba8-a077fdb87bdb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.204937+00	\N	\N	\N	\N	\N	\N	t
e2fa36a3-72c6-4c73-9e6d-9f33e60aeabc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Vica	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.205535+00	\N	\N	\N	\N	\N	\N	t
b1e41165-14c8-4869-ba52-e918538f7ec3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.206143+00	\N	\N	\N	\N	\N	\N	t
ddce58f3-47ab-48a9-a144-75995cc6fd60	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.206745+00	\N	\N	\N	\N	\N	\N	t
82aaa7e5-9770-49a4-90f3-e3520a95c8fb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Tomilho	Vica	10.00	1.00	10.00	A PAGAR	2025-07-26 16:13:06.207332+00	\N	\N	\N	\N	\N	\N	t
139b9ccf-dc25-46a2-9d70-a337a0c25b93	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Vica	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.207922+00	\N	\N	\N	\N	\N	\N	t
4920e1d3-9d58-42a3-859e-3947175a8e10	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.208502+00	\N	\N	\N	\N	\N	\N	t
e3a27d96-c379-455e-b557-2e705ac9cae0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.209131+00	\N	\N	\N	\N	\N	\N	t
af3e995a-e2d7-467e-8d0a-c2af098f34ab	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Vica	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.209964+00	\N	\N	\N	\N	\N	\N	t
0ca25706-1582-43dc-a8e7-51800b56dcab	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.210651+00	\N	\N	\N	\N	\N	\N	t
2f9bc1eb-ee09-4085-8ebc-43735615f06c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.21124+00	\N	\N	\N	\N	\N	\N	t
a262cf65-efa7-427d-a1ad-56ae1517f4e9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Vica	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.211836+00	\N	\N	\N	\N	\N	\N	t
1864f716-b414-45e0-b4f0-60a85c17f5f4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.21242+00	\N	\N	\N	\N	\N	\N	t
8b109bee-3e62-4375-b3c8-4d6cfd868539	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.21314+00	\N	\N	\N	\N	\N	\N	t
767d1548-d1fa-4ba3-938f-38b9eadc8d64	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Vica	3.00	16.00	48.00	A PAGAR	2025-07-26 16:13:06.213738+00	\N	\N	\N	\N	\N	\N	t
ad00bb79-061f-4d22-ac92-0077e3ebb2fc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Alecrim	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.214321+00	\N	\N	\N	\N	\N	\N	t
fd4c5fd9-6b20-4e8e-a532-1e1b2f2587ec	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Loro	Vica	60.00	1.00	60.00	A PAGAR	2025-07-26 16:13:06.214933+00	\N	\N	\N	\N	\N	\N	t
dd030d13-b442-44b0-a46f-0587f16f592e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Tomilho	Vica	10.00	1.00	10.00	A PAGAR	2025-07-26 16:13:06.215533+00	\N	\N	\N	\N	\N	\N	t
5e5b17f5-ded7-4df9-8e91-4f48bee05381	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.216123+00	\N	\N	\N	\N	\N	\N	t
d9297c56-6ec5-4c14-a387-d0a7b5b7dbf2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.216749+00	\N	\N	\N	\N	\N	\N	t
31a63911-cbf7-48dd-8dc4-12dee4368dbf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Tomilho	Aroldo	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.217332+00	\N	\N	\N	\N	\N	\N	t
e217df3b-7041-4579-98ab-71399e5cd1a2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.217927+00	\N	\N	\N	\N	\N	\N	t
55acdff8-4f3e-4f82-8a33-930965f14840	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.218508+00	\N	\N	\N	\N	\N	\N	t
5e2597f8-c6d1-49ef-b56a-ecc9f585968f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Tomilho	Aroldo	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.219086+00	\N	\N	\N	\N	\N	\N	t
bc433daf-f21c-4171-8708-6514afc1dbc5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.219815+00	\N	\N	\N	\N	\N	\N	t
0f096cb0-c231-4e38-a9a3-e9ed70cef872	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.220424+00	\N	\N	\N	\N	\N	\N	t
37a14eea-058f-4f90-ba8a-6d5c2ff8f521	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Tomilho	Aroldo	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.221103+00	\N	\N	\N	\N	\N	\N	t
235d04a5-c196-4041-b938-82d035abf720	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.221767+00	\N	\N	\N	\N	\N	\N	t
4c12f2b8-0c77-4240-b3f2-a8e92a494c57	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.222384+00	\N	\N	\N	\N	\N	\N	t
6f7a3dc3-3892-41a8-97d1-6d7019fdf63d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Tomilho	Aroldo	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.223005+00	\N	\N	\N	\N	\N	\N	t
8691e8d6-1fd2-4c96-a8eb-59f0ae849020	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.223641+00	\N	\N	\N	\N	\N	\N	t
28425997-7b78-45e4-b349-dc1f49c78f74	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.224255+00	\N	\N	\N	\N	\N	\N	t
6d98746f-ceec-4649-8fc9-04383193e272	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Tomilho	Aroldo	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.224945+00	\N	\N	\N	\N	\N	\N	t
67caaaf6-b60e-4cb5-8c67-7ba0788a773b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.225625+00	\N	\N	\N	\N	\N	\N	t
ce80e624-ace3-4500-8386-98c4d236876c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.226524+00	\N	\N	\N	\N	\N	\N	t
b1e6daf1-f341-494d-81c9-9cae1b2ef08b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Tomilho	Aroldo	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.22722+00	\N	\N	\N	\N	\N	\N	t
55319f16-45a5-404d-bcc2-47e31a00856e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.227846+00	\N	\N	\N	\N	\N	\N	t
6e552974-a21b-41e0-a470-b2653a1eff81	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.228449+00	\N	\N	\N	\N	\N	\N	t
1fb0532d-7a8d-47e5-afec-7a378006d8c5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.22904+00	\N	\N	\N	\N	\N	\N	t
83c21c8d-7bec-4502-a79a-afc0afac0e5a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.22965+00	\N	\N	\N	\N	\N	\N	t
a49a4465-6bc9-4567-bc06-110eff420b71	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Pregado	Aroldo	100.00	1.50	150.00	A PAGAR	2025-07-26 16:13:06.23026+00	\N	\N	\N	\N	\N	\N	t
c9d920b0-616a-4cfd-aef5-4f810fa067cc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.230894+00	\N	\N	\N	\N	\N	\N	t
b9eb8096-82dd-490d-8433-516045274309	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.231496+00	\N	\N	\N	\N	\N	\N	t
3396057e-28c9-4b4f-b75c-09c27933f6fa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.232089+00	\N	\N	\N	\N	\N	\N	t
2209a7e5-365e-4a8f-90a9-793d7abc9c64	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.232698+00	\N	\N	\N	\N	\N	\N	t
0340e0fb-a15e-4f99-b8bd-334bbdac7302	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Aroldo	10.00	14.00	140.00	A PAGAR	2025-07-26 16:13:06.2333+00	\N	\N	\N	\N	\N	\N	t
7e278e9d-dd02-401b-a90c-1974443cddc9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Alecrim	Aroldo	30.00	1.70	51.00	A PAGAR	2025-07-26 16:13:06.233897+00	\N	\N	\N	\N	\N	\N	t
5f38724a-d36a-42b0-a9d3-ddfce8a7fc68	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-08-14 20:51:05.441846+00	\N	\N	\N	\N	\N	\N	t
fac55cb2-e7bf-4169-aee0-2a67e6bff2b2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-15	Aipo	Takeo	15.00	8.00	120.00	A Pagar	2025-08-15 21:17:53.513121+00	\N	\N	\N	\N	\N	\N	t
3a2ab54f-d557-4c8a-b79f-0be5d5a31425	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-16 22:00:38.863826+00	\N	\N	\N	\N	\N	\N	t
f28e50f9-c097-44e5-a1b3-d0788b89fb03	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Acelmo	50.00	2.00	100.00	A Pagar	2025-08-16 22:00:51.942478+00	\N	\N	\N	\N	\N	\N	t
75867de6-e383-4e9f-874d-6225b77fb34a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Coentro	Rodrigo  fazenda 	10.00	3.00	30.00	A Pagar	2025-08-17 13:48:19.660622+00	\N	\N	\N	\N	\N	\N	t
f8e3aab0-02b1-4c4e-a885-8d772ae1b0d9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	BR	2.00	16.00	32.00	A Pagar	2025-08-17 14:08:44.953989+00	\N	\N	\N	\N	\N	\N	t
8d6a15b5-ce86-45f5-9891-7b221b11d2dd	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-16	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-17 21:28:12.683901+00	\N	\N	\N	\N	\N	\N	t
8f1dd219-d1e1-400a-97fa-81e872a8e6db	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-16	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-17 21:28:12.689613+00	\N	\N	\N	\N	\N	\N	t
62723749-43eb-435f-a959-1cd700f7e736	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-18 17:36:08.699851+00	\N	\N	\N	\N	\N	\N	t
b184661b-abde-4090-83e3-959766277c19	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Acelga	Miguel	100.00	1.50	150.00	A Pagar	2025-08-18 17:36:22.09102+00	\N	\N	\N	\N	\N	\N	t
1c22bec8-5fec-4f21-a5c9-542e53f9529b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Acelga	Getulin	50.00	1.50	75.00	A Pagar	2025-08-18 17:36:33.822883+00	\N	\N	\N	\N	\N	\N	t
187a7b63-12bb-4935-a10b-b7aadbe5307c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.241673+00	\N	\N	\N	\N	\N	\N	t
da23f4c8-0010-4392-a270-bc5feb21df84	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Acelga	Fabiane	4.00	2.50	10.00	A PAGAR	2025-07-26 16:13:06.242366+00	\N	\N	\N	\N	\N	\N	t
101ad2ea-5887-450c-b360-a8a584016e1f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Alecrim	Fabiane	5.00	1.70	8.50	A PAGAR	2025-07-26 16:13:06.243341+00	\N	\N	\N	\N	\N	\N	t
ec291b82-a682-499e-8a63-401df8b0e264	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Tomilho	Fabiane	5.00	1.50	7.50	A PAGAR	2025-07-26 16:13:06.243998+00	\N	\N	\N	\N	\N	\N	t
3cb409cf-84aa-4997-ae2c-78e55a3458ed	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.244615+00	\N	\N	\N	\N	\N	\N	t
428fc55c-3e9d-4b06-8f15-fafe3a98eef3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.245208+00	\N	\N	\N	\N	\N	\N	t
00340767-3ff5-4182-b971-aaf491446297	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Tomilho	Fabiane	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.245826+00	\N	\N	\N	\N	\N	\N	t
d82558a1-b005-40dc-8569-535a7795c61e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Fabiane	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.246419+00	\N	\N	\N	\N	\N	\N	t
03ab6bbd-01b7-450e-801a-2b376024b323	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Acelga	Fabiane	4.00	2.50	10.00	A PAGAR	2025-07-26 16:13:06.247012+00	\N	\N	\N	\N	\N	\N	t
2e4a7282-d592-4dab-9d11-cb9673671232	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Alecrim	Fabiane	5.00	1.70	8.50	A PAGAR	2025-07-26 16:13:06.247603+00	\N	\N	\N	\N	\N	\N	t
bd85778f-471b-4ae0-b90a-2171c246e2df	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Tomilho	Fabiane	5.00	1.50	7.50	A PAGAR	2025-07-26 16:13:06.248183+00	\N	\N	\N	\N	\N	\N	t
2d49d06f-ac6b-46a5-a059-5dab2fb7d4f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.248774+00	\N	\N	\N	\N	\N	\N	t
a385a4c7-af14-487c-b9a8-184c863f3b97	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.249353+00	\N	\N	\N	\N	\N	\N	t
8d8aedb8-ebe3-492e-9d48-1997712cf98e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Tomilho	Fabiane	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.249937+00	\N	\N	\N	\N	\N	\N	t
8010f06c-10ab-4e66-a2d5-082d8508da4c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.250545+00	\N	\N	\N	\N	\N	\N	t
c5cf802b-ca0a-4d48-a184-ebd3f2896e91	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Acelga	Fabiane	6.00	2.50	15.00	A PAGAR	2025-07-26 16:13:06.251184+00	\N	\N	\N	\N	\N	\N	t
bba075ad-d878-4414-af58-090118c4e54c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.251971+00	\N	\N	\N	\N	\N	\N	t
081998d1-11a9-4289-89ef-75e0998b34e1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Tomilho	Fabiane	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.2526+00	\N	\N	\N	\N	\N	\N	t
604c50aa-841d-479a-86d2-95ec2502b23d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.253195+00	\N	\N	\N	\N	\N	\N	t
83398a31-4d22-4a08-b747-056e9a73ad95	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Acelga	Fabiane	4.00	2.50	10.00	A PAGAR	2025-07-26 16:13:06.253792+00	\N	\N	\N	\N	\N	\N	t
fe193a04-950d-4feb-b41a-32932df96e23	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.254375+00	\N	\N	\N	\N	\N	\N	t
b1519bfb-fe05-44ac-9692-93796d97e205	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Tomilho	Fabiane	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.254964+00	\N	\N	\N	\N	\N	\N	t
d48614e4-e7e8-42f5-9777-7f127e14438c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.255542+00	\N	\N	\N	\N	\N	\N	t
5e6aa75e-270c-4071-9a3b-1bb120e66553	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Tomilho	Fabiane	5.00	1.50	7.50	A PAGAR	2025-07-26 16:13:06.256121+00	\N	\N	\N	\N	\N	\N	t
18fb5c17-4c73-4eeb-a091-fa4cc74b05b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Fabiane	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.256743+00	\N	\N	\N	\N	\N	\N	t
e260ec45-4720-41a1-968a-d29893dabec4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Acelga	Fabiane	6.00	2.50	15.00	A PAGAR	2025-07-26 16:13:06.257322+00	\N	\N	\N	\N	\N	\N	t
f9cf2ba5-0740-4f41-86b2-e22c78bb92ad	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.257935+00	\N	\N	\N	\N	\N	\N	t
eb2bde52-3c68-466c-a4f5-ccfa6a1d89a2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Tomilho	Fabiane	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.258569+00	\N	\N	\N	\N	\N	\N	t
26bcda02-83a6-4fca-b437-a6b60e43c6b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Loro	Fabiane	1.00	10.00	10.00	A PAGAR	2025-07-26 16:13:06.259237+00	\N	\N	\N	\N	\N	\N	t
8c946162-57a2-4844-bbe8-90d0b739c5c9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Fabiane	2.00	16.00	32.00	A PAGAR	2025-07-26 16:13:06.260092+00	\N	\N	\N	\N	\N	\N	t
153d4a81-a753-4658-bf95-1932e9691801	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Acelga	Fabiane	4.00	2.50	10.00	A PAGAR	2025-07-26 16:13:06.260731+00	\N	\N	\N	\N	\N	\N	t
efd9f0c7-d1a9-4bd3-a644-9754be883433	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.261322+00	\N	\N	\N	\N	\N	\N	t
b081ee71-9744-4913-bcd5-375fcadd502b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Tomilho	Fabiane	10.00	1.50	15.00	A PAGAR	2025-07-26 16:13:06.262032+00	\N	\N	\N	\N	\N	\N	t
6d768da7-219f-42e0-8500-450b8aded6fd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Loro	Fabiane	2.00	10.00	20.00	A PAGAR	2025-07-26 16:13:06.262927+00	\N	\N	\N	\N	\N	\N	t
37b81b5f-cd3a-438a-855c-ffd002986d7e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Fabiane	1.00	16.00	16.00	A PAGAR	2025-07-26 16:13:06.263538+00	\N	\N	\N	\N	\N	\N	t
50b9dad7-971b-4d50-bfcb-a62648d09ff6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Alecrim	Fabiane	10.00	1.70	17.00	A PAGAR	2025-07-26 16:13:06.264144+00	\N	\N	\N	\N	\N	\N	t
3237e03d-ed13-47dc-ba24-01e9b96100b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Tomilho	Fabiane	5.00	1.50	7.50	A PAGAR	2025-07-26 16:13:06.264772+00	\N	\N	\N	\N	\N	\N	t
d87780a4-a79d-4de6-a87a-4cea0481622e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Loro	Vica	30.00	1.00	30.00	A Pagar	2025-08-03 19:40:53.718929+00	\N	\N	\N	\N	\N	\N	t
f633247a-f4d7-4ca8-8505-d5ecc4df8853	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-08-03 19:50:37.44633+00	\N	\N	\N	\N	\N	\N	t
0f92ab96-8923-4e02-82d7-6416033be313	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Derson	2.00	16.00	32.00	A Pagar	2025-08-14 20:51:25.63596+00	\N	\N	\N	\N	\N	\N	t
206e1c58-ac0d-4374-8d78-d95549964657	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-03-17	Aipo	Clebinho 71	1.00	12.00	12.00	A Pagar	2025-08-15 21:24:51.146641+00	\N	\N	\N	\N	\N	\N	t
9cbd39cf-91ec-4856-9913-a91eb6a8b1e6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Jakeline	2.50	24.00	60.00	A Pagar	2025-08-16 22:01:17.723531+00	\N	\N	\N	\N	\N	\N	t
86ef80bf-c99a-4028-8e2a-f7a75f597594	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Alecrim	Weliton	30.00	1.20	36.00	A Pagar	2025-08-17 13:49:40.540177+00	\N	\N	\N	\N	\N	\N	t
f8193c5d-cc24-4adb-9f54-9820fa4af1dc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Edmilson	2.00	16.00	32.00	A Pagar	2025-08-17 14:09:31.833001+00	\N	\N	\N	\N	\N	\N	t
2f4fe871-51dd-4c9b-b2ed-321753e3960a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Edmilson	15.00	1.70	25.50	A Pagar	2025-08-17 14:09:43.729399+00	\N	\N	\N	\N	\N	\N	t
09802e3b-2c75-4ec2-95dd-d40502b7bf58	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-08-17 14:09:57.498919+00	\N	\N	\N	\N	\N	\N	t
37a2910b-cf1a-49e6-93f1-420cabfe5441	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-18 17:36:46.147329+00	\N	\N	\N	\N	\N	\N	t
ecaafb22-d5c5-4208-8f8f-031e6cc8a8b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Acelmo	70.00	2.00	140.00	A Pagar	2025-08-18 17:42:42.735222+00	\N	\N	\N	\N	\N	\N	t
fa9c89e9-439c-4121-87cb-00943edf5783	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Hortifruti	60.00	2.20	132.00	A Pagar	2025-08-18 17:42:53.806561+00	\N	\N	\N	\N	\N	\N	t
b75acfbb-b815-4668-b2e6-5f7cc42d1725	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	18526a3b-e7a3-4375-b574-b278afb83c2b	gasto	2025-08-19	pimentão	Thaís 	49.00	55.00	2695.00	A Pagar	2025-08-19 12:12:20.744851+00	\N	\N	\N	\N	\N	\N	t
2aa62672-9324-4a51-90df-bb51c3d50796	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Acelga	Luciana	60.00	1.50	90.00	A Pagar	2025-08-19 18:29:29.026004+00	\N	\N	\N	\N	\N	\N	t
c0ac9475-2a2b-4bc2-831a-6875d7a0e3ce	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Salsa crespa	Lorinha	50.00	1.00	50.00	A Pagar	2025-08-19 18:40:44.373329+00	\N	\N	\N	\N	\N	\N	t
1921a1a9-630f-4dd6-b2e2-8e0920235873	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Moca alecrim	Greide	7.00	5.00	35.00	A Pagar	2025-08-19 19:58:10.405807+00	\N	\N	\N	\N	\N	\N	t
5fe03394-18d5-4d44-84e2-027af5bcf6ae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-19 20:01:45.642109+00	\N	\N	\N	\N	\N	\N	t
66590368-bae6-4faa-942e-49e8c2c918b1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Fernando Amorim 	1.00	16.00	16.00	A Pagar	2025-08-19 20:05:42.710849+00	\N	\N	\N	\N	\N	\N	t
a1639e73-7b54-4b9c-a861-20ad6f6e67b9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-20 08:24:28.880114+00	\N	\N	\N	\N	\N	\N	t
aab7ea12-52a2-45b9-a3f3-b814b9eef5b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-20 15:22:58.367859+00	\N	\N	\N	\N	\N	\N	t
ef569a6e-286a-497a-8b48-94b519305fb7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Caixotao	Casarão	5.00	5.00	25.00	A Pagar	2025-08-20 15:25:16.977345+00	\N	\N	\N	\N	\N	\N	t
9c4cca17-282c-40f2-8cdd-eec61d1add16	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Sid Montana 	2.00	12.00	24.00	A Pagar	2025-08-20 15:27:38.036711+00	\N	\N	\N	\N	\N	\N	t
5042f018-83be-4bc9-9318-566e27a7590f	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-20	Brocolis americano 	Queiroz e guarilha 	202.00	2.50	505.00	A Pagar	2025-08-20 20:19:54.343584+00	\N	\N	\N	\N	\N	\N	t
eba40878-8ab9-42d0-83b8-13fab793480d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-20 21:12:46.552304+00	\N	\N	\N	\N	\N	\N	t
2ba529a7-674a-44ae-a72a-0b201dcb3e31	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Acelmo	70.00	2.00	140.00	A Pagar	2025-08-20 21:13:07.343221+00	\N	\N	\N	\N	\N	\N	t
1c7ddff6-36d8-42c6-8f5f-7f4067d800ad	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-20 21:13:18.540132+00	\N	\N	\N	\N	\N	\N	t
cdd76dd4-a284-43e5-912c-f1aa49f3fc4a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-20 21:13:30.942454+00	\N	\N	\N	\N	\N	\N	t
a4301d6f-b572-47a8-a91d-9cef1c58cb49	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Neuza e filho	70.00	2.00	140.00	A Pagar	2025-08-20 21:13:43.099348+00	\N	\N	\N	\N	\N	\N	t
3df7fea9-cae1-4c63-8a5c-4ce78cd2f055	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-20 21:13:53.987913+00	\N	\N	\N	\N	\N	\N	t
dd72c077-adc5-494a-96a5-c9e8be3f4f37	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Alexandre	15.00	2.00	30.00	A Pagar	2025-08-20 21:14:07.360044+00	\N	\N	\N	\N	\N	\N	t
29127d4e-90c8-4f60-976f-7a7ad25c2a46	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-20 21:14:24.135834+00	\N	\N	\N	\N	\N	\N	t
dc443863-c62d-4074-bb68-6b2195d5bb97	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Marquinho cebola	20.00	1.90	38.00	A Pagar	2025-08-20 21:14:42.730943+00	\N	\N	\N	\N	\N	\N	t
7f1ea210-6471-4be3-8a09-cb685b0a0285	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Hortifruti	30.00	2.20	66.00	A Pagar	2025-08-20 21:31:02.881138+00	\N	\N	\N	\N	\N	\N	t
a4b305b1-9da0-4df6-8acb-3443a9732d6a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Hortifruti	60.00	2.20	132.00	A Pagar	2025-08-20 21:32:15.168961+00	\N	\N	\N	\N	\N	\N	t
96929c3e-f597-4f4a-b9b8-7683cfcd8350	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	gasto	2025-08-20	Funcionario	Gabriel 	1.00	300.00	300.00	A Pagar	2025-08-20 22:40:05.212406+00	\N	\N	\N	\N	\N	\N	t
83c341d0-420f-45c2-88f5-20d24f45a5d3	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	gasto	2025-08-21	Trator	João Carlos trator	1.00	235.00	235.00	A Pagar	2025-08-21 14:58:45.918087+00	\N	\N	\N	\N	\N	\N	t
8ea5002c-07ae-4986-983d-a06add167433	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Mostarda 	Queiroz e guarilha 	150.00	0.40	60.00	A Pagar	2025-08-21 15:03:38.911511+00	\N	\N	\N	\N	\N	\N	t
ffc239a9-a276-4806-b6bd-ed77d4364f4b	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Brocolis americano 	Queiroz e guarilha 	80.00	2.30	184.00	A Pagar	2025-08-21 15:03:39.686196+00	\N	\N	\N	\N	\N	\N	t
0e82ba34-d231-45dd-b09d-0f4c6ca9666b	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Mostarda 	2 irmão 	150.00	0.50	75.00	A Pagar	2025-08-21 15:03:39.943865+00	\N	\N	\N	\N	\N	\N	t
976a3192-a207-480b-b477-a9f8d6120dff	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-17	Aipo	Tuyane	6.00	16.00	96.00	A PAGAR	2025-07-26 16:13:06.295215+00	\N	\N	\N	\N	\N	\N	t
08cfc89e-19e4-48ae-aef3-5e708644841a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-17	Alecrim	Tuyane	20.00	1.70	34.00	A PAGAR	2025-07-26 16:13:06.295827+00	\N	\N	\N	\N	\N	\N	t
c6931639-fce1-4ebc-ab8b-460859e2361a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-17	Tomilho	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.29643+00	\N	\N	\N	\N	\N	\N	t
ea0e8fab-8355-41cb-9370-3db616a563a2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-17	Mangericão	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.297015+00	\N	\N	\N	\N	\N	\N	t
7585e913-7d62-4612-8d2a-c7e7511b5379	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-17	Mostarda	Tuyane	20.00	0.90	18.00	A PAGAR	2025-07-26 16:13:06.297684+00	\N	\N	\N	\N	\N	\N	t
15c70c7c-3902-48ef-836d-e3d94695abb8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-17	Taioba	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.298282+00	\N	\N	\N	\N	\N	\N	t
027a568a-99ea-488e-b477-4f5c68684dac	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-19	Aipo	Tuyane	6.00	16.00	96.00	A PAGAR	2025-07-26 16:13:06.298876+00	\N	\N	\N	\N	\N	\N	t
96594067-1ca1-4cf7-b372-04d8e6545815	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-19	Alecrim	Tuyane	20.00	1.70	34.00	A PAGAR	2025-07-26 16:13:06.299469+00	\N	\N	\N	\N	\N	\N	t
7760b2b8-38ee-4a87-bc4c-2d00072e94e4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-19	Tomilho	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.300175+00	\N	\N	\N	\N	\N	\N	t
67fb608c-adb7-40a9-bf71-8ef303c4e4cf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-19	Mangericão	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.300888+00	\N	\N	\N	\N	\N	\N	t
5b8d2004-c456-48d3-a085-2ace22395653	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-19	Mostarda	Tuyane	20.00	0.90	18.00	A PAGAR	2025-07-26 16:13:06.301547+00	\N	\N	\N	\N	\N	\N	t
5ac66171-d906-4993-bd33-c496e2321ded	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-22	Aipo	Tuyane	6.00	16.00	96.00	A PAGAR	2025-07-26 16:13:06.302162+00	\N	\N	\N	\N	\N	\N	t
f1f23eaf-08b2-40ef-8cc9-c16981ebf208	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-22	Alecrim	Tuyane	20.00	1.70	34.00	A PAGAR	2025-07-26 16:13:06.302771+00	\N	\N	\N	\N	\N	\N	t
549f189a-c339-4650-ac14-2653b76b55a5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-22	Tomilho	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.303367+00	\N	\N	\N	\N	\N	\N	t
f0aa42db-b02c-499d-af6d-12e76513b03b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-22	Mangericão	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.303958+00	\N	\N	\N	\N	\N	\N	t
7122361d-9c2e-4893-ba77-3fd224b338fb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-22	Mostarda	Tuyane	20.00	0.90	18.00	A PAGAR	2025-07-26 16:13:06.30455+00	\N	\N	\N	\N	\N	\N	t
beee69b1-1879-471e-a0c7-8f35581af201	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-22	Taioba	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.305132+00	\N	\N	\N	\N	\N	\N	t
21381f27-5edb-4856-81ee-e67995ac4de0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-24	Aipo	Tuyane	6.00	16.00	96.00	A PAGAR	2025-07-26 16:13:06.305741+00	\N	\N	\N	\N	\N	\N	t
740d4dfc-afa7-4ad2-bd97-fdb8ad627a3f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-24	Alecrim	Tuyane	20.00	1.70	34.00	A PAGAR	2025-07-26 16:13:06.306359+00	\N	\N	\N	\N	\N	\N	t
8b5ac83e-ad9f-4b9f-b9ea-37a90184a82c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-24	Tomilho	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.306997+00	\N	\N	\N	\N	\N	\N	t
740bdb31-c745-4726-92e6-b588cbe5945d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-24	Mangericão	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.307617+00	\N	\N	\N	\N	\N	\N	t
0a127d91-ced9-45a3-97e5-a8db431e4669	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-24	Mostarda	Tuyane	20.00	0.90	18.00	A PAGAR	2025-07-26 16:13:06.308213+00	\N	\N	\N	\N	\N	\N	t
22292fc3-9195-4fbb-9bdb-c59a0609ea2f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-24	Taioba	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.30901+00	\N	\N	\N	\N	\N	\N	t
cfbc5ad4-74b0-40cc-88e8-551265f01078	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-26	Aipo	Tuyane	6.00	16.00	96.00	A PAGAR	2025-07-26 16:13:06.309832+00	\N	\N	\N	\N	\N	\N	t
15c76933-3552-4b9b-b093-b31c88f13326	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-26	Alecrim	Tuyane	20.00	1.70	34.00	A PAGAR	2025-07-26 16:13:06.310492+00	\N	\N	\N	\N	\N	\N	t
75d7b711-6028-487d-a06f-dc3e1e9e787b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-26	Tomilho	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.311106+00	\N	\N	\N	\N	\N	\N	t
9e6dfa8d-f67e-42f6-beb2-531b4e8c9465	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-26	Mangericão	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.31171+00	\N	\N	\N	\N	\N	\N	t
4f2d7d25-c44e-41fd-938a-a98d21b1dcf3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-26	Mostarda	Tuyane	20.00	0.90	18.00	A PAGAR	2025-07-26 16:13:06.312293+00	\N	\N	\N	\N	\N	\N	t
3c80fc83-0f72-4707-a8c0-6f7b33bddafb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-26	Taioba	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.312883+00	\N	\N	\N	\N	\N	\N	t
14c095c0-0969-402a-b8a0-58dbc6f869e5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Aipo	Tuyane	6.00	16.00	96.00	A PAGAR	2025-07-26 16:13:06.31353+00	\N	\N	\N	\N	\N	\N	t
12c29a9c-38ee-4d73-8734-b89c743593bc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Alecrim	Tuyane	20.00	1.70	34.00	A PAGAR	2025-07-26 16:13:06.31431+00	\N	\N	\N	\N	\N	\N	t
6af908ab-136d-4713-acde-889a5202d6b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Tomilho	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.314913+00	\N	\N	\N	\N	\N	\N	t
00af3e12-47b0-4c8c-9aeb-a6be7de49836	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Mangericão	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.315496+00	\N	\N	\N	\N	\N	\N	t
6aed40a6-afb2-4391-a7fa-21af0d1e83be	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Mostarda	Tuyane	20.00	0.90	18.00	A PAGAR	2025-07-26 16:13:06.316078+00	\N	\N	\N	\N	\N	\N	t
fbcdad11-09b9-4863-bbc4-29f0a2dff1a4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Taioba	Tuyane	20.00	1.50	30.00	A PAGAR	2025-07-26 16:13:06.316674+00	\N	\N	\N	\N	\N	\N	t
3fe2cabc-226f-472b-8616-8fa667dd7131	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-29	Almeirão	Tuyane	10.00	1.30	13.00	A PAGAR	2025-07-26 16:13:06.317252+00	\N	\N	\N	\N	\N	\N	t
abe9f888-a43a-45c3-ad9d-c990b6abd3e6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-06 20:44:56.203247+00	\N	\N	\N	\N	\N	\N	t
8d38ceb9-6a05-4061-9310-5527d20b06b9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Alecrin	Marli	30.00	1.20	36.00	A Pagar	2025-08-06 20:45:08.7673+00	\N	\N	\N	\N	\N	\N	t
ca1df8e8-2991-4579-a815-957e378a4e27	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Moca alecrim	Derson	11.00	5.00	55.00	A Pagar	2025-08-14 20:51:42.742821+00	\N	\N	\N	\N	\N	\N	t
295eff37-5d65-44af-87de-c849a401ec0b	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-02	Mostarda 	Sandro	130.00	0.60	78.00	A Pagar	2025-08-07 00:06:11.199055+00	\N	\N	\N	\N	\N	\N	t
fc64ec13-ba83-4f64-8b6c-13985d8ee1c0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-04-01	Aipo	Clebinho 71	1.00	12.00	12.00	A Pagar	2025-08-15 21:25:10.279401+00	\N	\N	\N	\N	\N	\N	t
cf59ab99-5b95-400e-a057-6e57fdf8efde	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Aipo	Takeo	15.00	8.00	120.00	A Pagar	2025-08-07 17:21:24.395944+00	\N	\N	\N	\N	\N	\N	t
7b495b06-fb27-4051-a7cf-02921d441aa0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-07 20:49:48.767645+00	\N	\N	\N	\N	\N	\N	t
d30ec29e-cc3d-498e-ab7a-768768bd60f1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-08 18:38:40.229951+00	\N	\N	\N	\N	\N	\N	t
7c064e7f-2def-426f-a7a5-79154ede407f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-09 15:50:52.071138+00	\N	\N	\N	\N	\N	\N	t
58e147aa-8d8d-41f6-b470-50e5cdf436ca	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Acelga	Fabiane	4.00	2.50	10.00	A Pagar	2025-08-10 17:29:41.146344+00	\N	\N	\N	\N	\N	\N	t
06c1f69f-3509-439e-ba56-c06c26e92912	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-30	Troco	Aroldo	1.00	3040.00	3040.00	A Pagar	2025-08-11 07:57:07.987943+00	\N	\N	\N	\N	\N	\N	t
264f0708-a703-4270-9f26-765ed79ecac6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	BR	100.00	1.70	170.00	A Pagar	2025-08-12 08:39:06.371135+00	\N	\N	\N	\N	\N	\N	t
a1269907-abe7-49bc-bdb7-ae86bcf67ee4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-12 21:34:37.421905+00	\N	\N	\N	\N	\N	\N	t
0d6a1ca2-665b-4f76-845a-ba55d4f8c688	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-12 21:34:50.233261+00	\N	\N	\N	\N	\N	\N	t
08d23fcf-f363-4f9f-b709-42558e2ae8d1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Acelga	Geovane	20.00	2.00	40.00	A Pagar	2025-08-12 21:35:02.933956+00	\N	\N	\N	\N	\N	\N	t
6b0eae49-1b30-412e-b4ba-03889aa85a34	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-12 21:35:17.841262+00	\N	\N	\N	\N	\N	\N	t
5b976563-38b2-4e9b-aceb-e880538bc05f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Acelga	Fabiane	6.00	2.50	15.00	A Pagar	2025-08-12 21:35:30.676544+00	\N	\N	\N	\N	\N	\N	t
41b6ce7e-c02c-4d7a-bd4e-494888bc3152	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-08-12 21:35:42.924666+00	\N	\N	\N	\N	\N	\N	t
e47f310b-66c8-4721-9c8d-e8aa8f58bd7f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Salsa crespa	Lorinha	45.00	1.00	45.00	A Pagar	2025-08-12 21:46:19.772803+00	\N	\N	\N	\N	\N	\N	t
6c0c100c-ff39-46c6-be07-6c1a1b8f0e9e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Acelga	Miguel	80.00	1.50	120.00	A Pagar	2025-08-13 16:36:01.534173+00	\N	\N	\N	\N	\N	\N	t
6e9a06be-9695-4bec-9e27-51501b4fef35	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Neuza e filho	70.00	2.00	140.00	A Pagar	2025-08-14 01:22:59.393209+00	\N	\N	\N	\N	\N	\N	t
104df144-ac2f-49c2-bf09-bbe1a17657c3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-14 19:20:55.103888+00	\N	\N	\N	\N	\N	\N	t
55897dbf-cedc-44a1-9c85-fa0e201728f8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-14 19:36:48.195176+00	\N	\N	\N	\N	\N	\N	t
f2f8e62e-caf6-424e-8bb9-7c0ea8e2e346	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-16 22:01:31.38626+00	\N	\N	\N	\N	\N	\N	t
47ec5be9-4c51-4b2d-96e9-a68d6cc591a7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Acelga	Luciana	60.00	1.50	90.00	A Pagar	2025-08-17 13:50:04.561655+00	\N	\N	\N	\N	\N	\N	t
e3aec537-146f-4c8f-a7ba-46e3a8099063	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-17 13:50:14.709311+00	\N	\N	\N	\N	\N	\N	t
084ab5c2-6bfd-45b3-9bc0-543ffdfd9090	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-06 20:45:23.026957+00	\N	\N	\N	\N	\N	\N	t
536bcf7f-ebcc-4000-869c-a9aac1ef6645	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Moca tomilho 	Derson	2.00	4.00	8.00	A Pagar	2025-08-14 20:51:58.032735+00	\N	\N	\N	\N	\N	\N	t
e97196e8-2302-4565-9658-181b10ce7e35	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Poro	Derson	11.00	18.00	198.00	A Pagar	2025-08-14 20:52:11.210233+00	\N	\N	\N	\N	\N	\N	t
a1759066-80a5-4bdc-a712-6e68feccdc7e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-05-16	Aipo	Clebinho 71	2.00	12.00	24.00	A Pagar	2025-08-15 21:25:37.297134+00	\N	\N	\N	\N	\N	\N	t
bf54f22e-f621-465e-a1a5-8bde596a6a6a	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Sandro	90.00	0.80	72.00	A Pagar	2025-08-07 00:06:11.39829+00	\N	\N	\N	\N	\N	\N	t
33348d71-746c-4bf5-834d-a69557bef481	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-07 17:21:43.11191+00	\N	\N	\N	\N	\N	\N	t
ef72cb15-6b48-4fc0-91e7-ca07f5dfe01b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-07 20:50:10.052916+00	\N	\N	\N	\N	\N	\N	t
d865e20f-d348-4672-895e-b99a3d4b7602	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-07 21:01:00.796767+00	\N	\N	\N	\N	\N	\N	t
817039a9-6161-453b-b591-0914a8674e30	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Acelga	Lizete	30.00	1.50	45.00	A Pagar	2025-08-08 18:38:57.348377+00	\N	\N	\N	\N	\N	\N	t
f80a3e74-1113-48a0-b044-4bf3ff6cf8d5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Poro	Mateus	1.00	15.00	15.00	A Pagar	2025-08-08 18:39:10.085459+00	\N	\N	\N	\N	\N	\N	t
daca166a-41df-48db-b0c6-0af2792083e1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-09 15:51:13.161461+00	\N	\N	\N	\N	\N	\N	t
a59e2f99-e5d6-4e7e-bb54-57b182c5dffd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Fabiane	5.00	1.70	8.50	A Pagar	2025-08-10 17:31:21.496212+00	\N	\N	\N	\N	\N	\N	t
d6bc67ba-71a3-4e11-baeb-4d957efb9516	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-10 17:41:39.113213+00	\N	\N	\N	\N	\N	\N	t
5d038dd0-a2d8-4564-a84d-5a180fe6825d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-04-04	Pix	Aroldo pix 	1.00	1000.00	1000.00	A Pagar	2025-08-11 08:22:47.532124+00	\N	\N	\N	\N	\N	\N	t
2df2e4e7-876d-45f2-bf31-5f84431d9cd5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-11 21:12:29.443357+00	\N	\N	\N	\N	\N	\N	t
d570f2a8-5df0-4b04-8f04-4b10e2651ee8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-11 21:12:40.689745+00	\N	\N	\N	\N	\N	\N	t
766fa72d-6808-4f8c-82d5-cd0714f4e82c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Acelmo	80.00	2.00	160.00	A Pagar	2025-08-11 21:12:53.248609+00	\N	\N	\N	\N	\N	\N	t
5fff72f9-edd9-44e9-b11d-9b84a62435a5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Loro	BR	2.00	11.00	22.00	A Pagar	2025-08-12 08:39:36.633164+00	\N	\N	\N	\N	\N	\N	t
69876fa1-ba97-45f3-a4e3-b6ac2c6d03fa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Tomilho	Fabiane	5.00	1.50	7.50	A Pagar	2025-08-12 21:35:57.313344+00	\N	\N	\N	\N	\N	\N	t
4d7e32a2-229f-478a-824d-00ecd63c6542	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Tuyane	6.00	16.00	96.00	A Pagar	2025-08-12 21:36:11.959303+00	\N	\N	\N	\N	\N	\N	t
a8ff4b2f-3e77-4c95-81b0-ca15d844f7ee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-12 21:36:23.818978+00	\N	\N	\N	\N	\N	\N	t
d44e4eb2-5775-49fc-9dbf-7af1151c6557	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-12 21:46:35.77073+00	\N	\N	\N	\N	\N	\N	t
cbf624f5-3130-45bc-829a-9224646aa8f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-13 16:36:49.462043+00	\N	\N	\N	\N	\N	\N	t
3bb01d0f-7db1-4633-8240-f49792b2aa6d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Neuza e filho	60.00	2.00	120.00	A Pagar	2025-08-14 19:21:28.0921+00	\N	\N	\N	\N	\N	\N	t
a3343dd0-2311-4965-b385-3acb713516b3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-14 19:37:08.998547+00	\N	\N	\N	\N	\N	\N	t
411f1351-b024-46ff-9099-4b97d812a87a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Hortifruti	48.00	2.20	105.60	A Pagar	2025-08-16 22:01:56.003205+00	\N	\N	\N	\N	\N	\N	t
aedf501a-9058-4f48-b5ab-c1efd3f95635	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-16 22:02:11.118228+00	\N	\N	\N	\N	\N	\N	t
b42eb82f-2cff-4019-bfd4-57756ea6dcd6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Saco isterco	Luis esterco	50.00	15.00	750.00	A Pagar	2025-08-17 13:50:43.929924+00	\N	\N	\N	\N	\N	\N	t
ffb08963-87ae-44d3-b39d-2cb61d63cf6a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-17 14:28:03.630615+00	\N	\N	\N	\N	\N	\N	t
b6148a7f-3da7-44d5-99f5-efc07233a850	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.361068+00	\N	\N	\N	\N	\N	\N	t
299fbcda-b0c4-4b93-bd63-22b5c842012b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.361677+00	\N	\N	\N	\N	\N	\N	t
983e5a79-fb82-4f3c-908a-267e32ae6386	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.362262+00	\N	\N	\N	\N	\N	\N	t
c9b71947-b01d-4dea-873b-09d3380d060d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.362859+00	\N	\N	\N	\N	\N	\N	t
2f06ca7f-16af-4dea-874a-0a2bcfaad0ea	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.36345+00	\N	\N	\N	\N	\N	\N	t
47597d72-77ed-48fd-b534-d9b1fda2745d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.364044+00	\N	\N	\N	\N	\N	\N	t
8091065c-7c4b-4781-b7cc-835e35efc450	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.36469+00	\N	\N	\N	\N	\N	\N	t
6314aabc-cc90-4d0b-a09c-f6822e8472b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.365282+00	\N	\N	\N	\N	\N	\N	t
7fa3897f-51ba-4db6-bc87-7a3df077e19e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.365875+00	\N	\N	\N	\N	\N	\N	t
98c889cd-5b29-4876-a26b-de5e240b3334	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.366453+00	\N	\N	\N	\N	\N	\N	t
22a11759-a578-46e6-8e83-6694d4132c73	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.367064+00	\N	\N	\N	\N	\N	\N	t
9b36ab24-360c-4428-8f48-996d9e49dab2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.367651+00	\N	\N	\N	\N	\N	\N	t
10df799c-acd3-4bb4-8a03-593c644c0ee3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.368215+00	\N	\N	\N	\N	\N	\N	t
32a2fde5-20d2-440a-852a-c717f5e0df7d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.368796+00	\N	\N	\N	\N	\N	\N	t
9de1df0e-c9be-463a-b5ff-6c48ed2cf7e4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Aipo	Geovane	5.00	14.00	70.00	A PAGAR	2025-07-26 16:13:06.369369+00	\N	\N	\N	\N	\N	\N	t
57738032-c0d5-4bea-8846-10dda7774439	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Acelga	Geovane	20.00	2.00	40.00	A PAGAR	2025-07-26 16:13:06.369955+00	\N	\N	\N	\N	\N	\N	t
6c33c736-ea89-4848-84ae-65b5a4bd73cd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.37054+00	\N	\N	\N	\N	\N	\N	t
27f50c3b-2cb7-4208-8444-dd051ddfeb6c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-20	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.371115+00	\N	\N	\N	\N	\N	\N	t
1243ada2-61a6-4e32-9471-2136cec737b1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-22	Aipo	Geovane	6.00	14.00	84.00	A PAGAR	2025-07-26 16:13:06.371703+00	\N	\N	\N	\N	\N	\N	t
f2dcf068-8097-4e26-8de4-24a9ee4cd0b9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Aipo	Geovane	7.00	14.00	98.00	A PAGAR	2025-07-26 16:13:06.372273+00	\N	\N	\N	\N	\N	\N	t
5531bcea-b124-4ccb-8ccc-ed2ac484989e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-24	Acelga	Geovane	40.00	2.00	80.00	A PAGAR	2025-07-26 16:13:06.372867+00	\N	\N	\N	\N	\N	\N	t
81c3d203-18f0-4bd5-89f5-946d94686d80	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Aipo	Jajá e junior	80.00	15.00	1200.00	A PAGAR	2025-07-26 16:13:06.373455+00	\N	\N	\N	\N	\N	\N	t
06b1dffb-b26f-4a18-a2f9-1a1dcf5d636e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Loro	Derson	10.00	10.00	100.00	A Pagar	2025-08-14 20:52:23.886771+00	\N	\N	\N	\N	\N	\N	t
52443bd9-4f3e-41d8-821b-18dba269fd75	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Vegetable	10.00	15.00	150.00	A Pagar	2025-08-14 20:52:42.13995+00	\N	\N	\N	\N	\N	\N	t
cca519fd-2216-4f0f-81d2-3b35af241681	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-06-01	Aipo	Clebinho 71	4.00	12.00	48.00	A Pagar	2025-08-15 21:27:12.896092+00	\N	\N	\N	\N	\N	\N	t
b1274a11-dbea-4b20-9e85-340b3fc47e41	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-16 22:02:24.672349+00	\N	\N	\N	\N	\N	\N	t
a06fba86-23ec-4ee7-b062-602536f0c6c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-17 13:51:58.990143+00	\N	\N	\N	\N	\N	\N	t
9e1bacdf-ff01-4e9f-8146-7dc93d65c1be	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Aipo	Jakeline	3.00	24.00	72.00	A PAGAR	2025-07-26 16:13:06.381594+00	\N	\N	\N	\N	\N	\N	t
d8fb3271-c301-4b5b-a227-bc06cd69da9a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Salsa crespa	Jakeline	30.00	1.20	36.00	A PAGAR	2025-07-26 16:13:06.382182+00	\N	\N	\N	\N	\N	\N	t
fb7ff4ac-64bb-415c-bc87-475d4ee151b4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Aipo	Agro Terê	3.00	14.00	42.00	A PAGAR	2025-07-26 16:13:06.382796+00	\N	\N	\N	\N	\N	\N	t
47e2d009-b493-42a9-b720-df10a0b5bc6b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Acelga	Agro Terê	4.00	2.00	8.00	A PAGAR	2025-07-26 16:13:06.383386+00	\N	\N	\N	\N	\N	\N	t
c7a4db90-3ccd-4950-a6e0-425946664ba8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-03 19:41:17.529933+00	\N	\N	\N	\N	\N	\N	t
e26c0f4d-d35f-4971-ada6-be2a64f78639	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Aipo	Rony bethel	24.00	2.00	48.00	A PAGAR	2025-07-26 16:13:06.38521+00	\N	\N	\N	\N	\N	\N	t
6bf087a0-bf77-4cc3-8aec-e5fec2a3291c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Acelga	Rony bethel	15.00	1.80	27.00	A PAGAR	2025-07-26 16:13:06.385792+00	\N	\N	\N	\N	\N	\N	t
cab0fcfa-bf0b-4062-bee7-3568c12ee759	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-03 19:50:54.789949+00	\N	\N	\N	\N	\N	\N	t
436a5939-1848-4227-a7d6-b243c825a897	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-03 19:51:09.287794+00	\N	\N	\N	\N	\N	\N	t
4db96d67-b5e7-4f7b-9888-c3dc276a1717	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-07-28	Alface americana 	JFC	100.00	18.00	1800.00	A Pagar	2025-07-28 00:35:34.862978+00	\N	\N	\N	\N	\N	\N	t
d56df782-d5c8-4940-9c2b-ae272012238b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Mangericao pequeno 	Dudu vica	40.00	1.30	52.00	A Pagar	2025-08-17 14:28:33.573264+00	\N	\N	\N	\N	\N	\N	t
bf0162ff-b2a6-4b19-8cea-2c96bf3efce3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-07-28 22:41:56.20104+00	\N	\N	\N	\N	\N	\N	t
8303e020-c3ef-4614-a329-3558dbbc6a0d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-07-28 20:30:14.662801+00	\N	\N	\N	\N	\N	\N	t
ca015202-42ba-43a2-a9cd-b6e9a7b205a3	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-07-28	Alface americana 	JFC	1.00	1.50	1.50	A Pagar	2025-07-28 21:48:13.500475+00	\N	\N	\N	\N	\N	\N	t
b4ff6490-0ad5-4d35-93f3-7db2688b04ae	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-07-27	Alface americana 	JFC	11.00	11.11	122.21	A Pagar	2025-07-28 21:48:27.820071+00	\N	\N	\N	\N	\N	\N	t
eb626eff-e753-4f3a-947b-1d2b0ea703f4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-28	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-07-28 22:19:15.172411+00	\N	\N	\N	\N	\N	\N	t
7b30d34f-4142-4cef-8fde-c154fdf2a104	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-17 21:32:22.122177+00	\N	\N	\N	\N	\N	\N	t
c0456ba3-ec17-4c89-9b9d-5d1948e45cbd	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Mostarda 	Sandro	60.00	0.80	48.00	A Pagar	2025-08-17 21:32:22.229888+00	\N	\N	\N	\N	\N	\N	t
1a07c8b0-dd0a-41df-a448-47c9e9fdae3f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-07-28 22:32:57.382959+00	\N	\N	\N	\N	\N	\N	t
c04f0fc2-72b6-42a1-84dc-3dab8544e6ee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-06	Caixotao 	Casarão	6.00	5.00	30.00	A Pagar	2025-08-06 20:45:43.886642+00	\N	\N	\N	\N	\N	\N	t
fe27b62b-4e7c-40c3-9684-03c9e367583b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Acelga	Geovane	20.00	2.00	40.00	A Pagar	2025-07-28 22:49:43.719491+00	\N	\N	\N	\N	\N	\N	t
9929cd67-8782-4f8d-98b1-8237ef9353e8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Tomilho	Fabiane	10.00	1.50	15.00	A Pagar	2025-07-28 22:51:23.598999+00	\N	\N	\N	\N	\N	\N	t
fadf8382-10aa-4942-818b-540143755e3c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-07-28 22:52:49.652519+00	\N	\N	\N	\N	\N	\N	t
81a09c92-1422-4fdd-8ba7-3a129899420f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-28	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-07-28 23:01:59.89712+00	\N	\N	\N	\N	\N	\N	t
3316bad5-a74c-46ec-9201-0e6c768098b3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-04 21:32:46.342211+00	\N	\N	\N	\N	\N	\N	t
06ed9ff8-153a-4d45-853a-faec8ce1f927	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-01	Mostarda 	Sandro	150.00	0.60	90.00	A Pagar	2025-08-07 00:06:11.39429+00	\N	\N	\N	\N	\N	\N	t
e2357928-7cc4-408f-a093-7010753f44d0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Aipo	Pai	20.00	11.00	220.00	A Pagar	2025-08-07 17:22:06.003832+00	\N	\N	\N	\N	\N	\N	t
4b3fac33-0f30-4f99-a6c3-4a123a4116b3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-08-07 20:50:24.211832+00	\N	\N	\N	\N	\N	\N	t
b77ca0ee-2a22-472e-97e7-59de43cd4359	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Tomilho	Waguinho	10.00	1.50	15.00	A Pagar	2025-08-05 21:22:37.370268+00	\N	\N	\N	\N	\N	\N	t
0296b540-540b-40cb-b234-4e468a022204	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Mostarda	Tuyane	30.00	0.90	27.00	A Pagar	2025-08-05 21:30:18.59205+00	\N	\N	\N	\N	\N	\N	t
8ac8532c-fbeb-4993-aca2-099cfe149beb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-07 21:01:42.989347+00	\N	\N	\N	\N	\N	\N	t
4c0aeb7c-d5f8-40fc-a1b3-ee151a1b5dda	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Alecrin	Weliton	50.00	1.20	60.00	A Pagar	2025-08-08 18:39:25.779919+00	\N	\N	\N	\N	\N	\N	t
09575eb3-84cc-44d0-860b-8e1d38c96547	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Acelga	Miguel	100.00	1.50	150.00	A Pagar	2025-08-09 15:51:43.043768+00	\N	\N	\N	\N	\N	\N	t
00e8ab06-9d19-466c-a25d-47601fca5d3b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Tomilho	Fabiane	5.00	1.50	7.50	A Pagar	2025-08-10 17:31:46.202379+00	\N	\N	\N	\N	\N	\N	t
77fb1dd6-48b9-4aea-b418-cf605f8f366c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-05 22:40:12.607833+00	\N	\N	\N	\N	\N	\N	t
899bbde1-91ca-4896-9bc3-654aaa6525ef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-10 17:41:56.214143+00	\N	\N	\N	\N	\N	\N	t
016f14a6-482b-453a-8725-aea11782666e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-04-23	Pix	Aroldo pix 	1.00	2000.00	2000.00	A Pagar	2025-08-11 08:23:33.689167+00	\N	\N	\N	\N	\N	\N	t
53e382db-5df2-4eec-bb3e-8819a7c7fdb1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-08-11 21:13:19.791974+00	\N	\N	\N	\N	\N	\N	t
4bc51302-1753-4a90-b527-024d0e07ed61	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alfavaca 	BR	30.00	2.00	60.00	A Pagar	2025-08-12 08:40:24.066944+00	\N	\N	\N	\N	\N	\N	t
25ef042d-66a1-4bfe-bb27-978d5ddf752e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-12 21:36:37.924228+00	\N	\N	\N	\N	\N	\N	t
54c5fe7a-5414-414f-8f8b-7379c4965aa2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-12 21:47:04.334939+00	\N	\N	\N	\N	\N	\N	t
2e0f7ebe-72b1-4af9-b7bf-0cf381a27506	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-12 21:47:31.40993+00	\N	\N	\N	\N	\N	\N	t
cb1fad15-f64d-414a-8a9b-79eb447d1277	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Acelga	Getulin	50.00	1.50	75.00	A Pagar	2025-08-13 16:37:12.562772+00	\N	\N	\N	\N	\N	\N	t
56c80dab-e476-4cbd-9909-c83821456dbf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-14 01:23:39.709448+00	\N	\N	\N	\N	\N	\N	t
ad4a0a05-36ae-44d3-8005-0d09d19f707e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Poro	Mateus	2.00	15.00	30.00	A Pagar	2025-08-14 19:10:17.827973+00	\N	\N	\N	\N	\N	\N	t
d096b3d9-790c-47b4-847c-97acc942e69c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-14 19:22:15.732071+00	\N	\N	\N	\N	\N	\N	t
81316f7b-e253-46e1-af03-45b1d1fd4f92	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	gasto	2025-07-28	Adubo	Rezende	10.00	50.00	500.00	A Pagar	2025-07-28 00:35:51.969903+00	\N	\N	\N	\N	\N	\N	t
666c6667-739b-48f8-b6b3-052e6c2e1550	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-26	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-07-28 20:28:24.371987+00	\N	\N	\N	\N	\N	\N	t
bb01c191-808d-4665-a1f5-29a4edb63ca6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-28	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-07-28 20:30:31.120912+00	\N	\N	\N	\N	\N	\N	t
b029c8c0-e971-4b72-a243-f84af73a8d09	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-26	Aipo	Gleiciel	2.00	13.00	26.00	A Pagar	2025-07-28 20:54:06.406891+00	\N	\N	\N	\N	\N	\N	t
efa84445-ee79-4e9e-ba1b-83218ab5e45c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-03 19:41:33.693761+00	\N	\N	\N	\N	\N	\N	t
67796c1f-7f70-4bcc-b2b3-dd30533558a3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Acelga	Vegetable	140.00	2.00	280.00	A Pagar	2025-08-14 20:52:56.369678+00	\N	\N	\N	\N	\N	\N	t
3efbeca0-d397-4d96-b0f3-812a7dfc2b83	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-28	Acelga	Agro Terê	2.00	2.00	4.00	A Pagar	2025-07-28 22:19:45.563454+00	\N	\N	\N	\N	\N	\N	t
452de9d8-4c4d-4d30-b44e-71b014dd4115	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-14 20:53:12.345954+00	\N	\N	\N	\N	\N	\N	t
305dca3c-11c8-4015-8b83-57aa4f65f23e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-14 20:53:23.152967+00	\N	\N	\N	\N	\N	\N	t
5f84c32b-b78c-4f45-ac90-2e7aa8d192e2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Serra agrícola	3.00	16.00	48.00	A Pagar	2025-07-28 22:34:29.413437+00	\N	\N	\N	\N	\N	\N	t
f033bb25-d2a3-4f4d-8686-4e22a9e6efc6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-07-28 22:40:15.221026+00	\N	\N	\N	\N	\N	\N	t
d84c927e-9483-4f31-ac78-82dbba361a5d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Vica	2.00	16.00	32.00	A Pagar	2025-07-28 22:44:22.314734+00	\N	\N	\N	\N	\N	\N	t
3b170408-4628-423c-8bdf-825da577c5d2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Moca alecrim	Greide	6.00	5.00	30.00	A Pagar	2025-07-28 22:47:58.579873+00	\N	\N	\N	\N	\N	\N	t
588e7c82-b4ef-454c-aab6-10b32cec7870	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Fabiane	2.00	16.00	32.00	A Pagar	2025-07-28 22:50:23.825254+00	\N	\N	\N	\N	\N	\N	t
981d7d52-af64-4b51-b169-365fde673e59	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Tuyane	4.00	16.00	64.00	A Pagar	2025-07-28 22:51:43.14604+00	\N	\N	\N	\N	\N	\N	t
c2b467e6-6210-4771-ac27-2b17bba72246	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-07-28 22:53:16.303799+00	\N	\N	\N	\N	\N	\N	t
b1f4721f-2f70-4f47-ab89-af18cb50c97c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Clebinho 71	2.00	12.00	24.00	A Pagar	2025-08-15 21:28:00.428736+00	\N	\N	\N	\N	\N	\N	t
9a400e7e-3ce7-4f6c-99d0-831061576145	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-07-28 22:56:46.76714+00	\N	\N	\N	\N	\N	\N	t
c46bc3f8-6c76-4fd3-bb71-e5be71efd546	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Marquinho cebola	17.00	2.00	34.00	A Pagar	2025-08-16 22:02:46.415687+00	\N	\N	\N	\N	\N	\N	t
6a763a2a-ef5a-48b5-b0b2-102ec0d13f35	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-16	Aipo	Paquy	6.00	2.00	12.00	A Pagar	2025-08-16 22:03:00.260729+00	\N	\N	\N	\N	\N	\N	t
724d8dea-2d95-4223-a621-a9103d4c8143	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Poro	Nando	10.00	13.00	130.00	A Pagar	2025-08-13 16:37:49.282911+00	\N	\N	\N	\N	\N	\N	t
6d13928c-aa8a-4430-b693-ff1c4d090edd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-07 17:22:29.541868+00	\N	\N	\N	\N	\N	\N	t
650d9c11-59c3-4202-b873-01b66f27ab64	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-07 20:50:37.888224+00	\N	\N	\N	\N	\N	\N	t
ad269ff4-0c3d-4aa0-868b-b499055e2eeb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-07 21:01:57.413017+00	\N	\N	\N	\N	\N	\N	t
e5ae1e77-9f29-4af2-a815-9546d4cff268	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alface crespa	Dione	30.00	8.00	240.00	A Pagar	2025-08-17 14:00:34.508502+00	\N	\N	\N	\N	\N	\N	t
30a8302f-b1e9-4cd2-bcc5-a7353317c318	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-09 15:52:02.996217+00	\N	\N	\N	\N	\N	\N	t
4ba5efa9-6d72-430a-a734-61cfa2c8ce2a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Neuza e filho	90.00	2.00	180.00	A Pagar	2025-08-03 19:51:28.745134+00	\N	\N	\N	\N	\N	\N	t
3c5c9bca-0e9c-4421-89ae-135ebeb05044	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Mangericao pequeno 	Maria 	40.00	0.80	32.00	A Pagar	2025-08-17 14:46:04.761362+00	\N	\N	\N	\N	\N	\N	t
5e088019-5121-4e40-aac6-53170644677d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-03 20:05:00.201327+00	\N	\N	\N	\N	\N	\N	t
5b81daf8-912b-4842-ad2b-6e918b6e444d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Waguinho	8.00	13.00	104.00	A Pagar	2025-08-10 17:18:56.430692+00	\N	\N	\N	\N	\N	\N	t
702e8cf7-a067-484d-83e6-4e229d742054	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Tuyane	6.00	16.00	96.00	A Pagar	2025-08-10 17:32:13.59675+00	\N	\N	\N	\N	\N	\N	t
cd660912-80ad-4ee2-9713-7bffc206ee56	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-10 17:32:25.175442+00	\N	\N	\N	\N	\N	\N	t
4dd4b850-8b2f-4b7b-b504-54abab1ba6f1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Mangericao pequeno 	Maria 	45.00	0.80	36.00	A Pagar	2025-08-10 17:44:10.054538+00	\N	\N	\N	\N	\N	\N	t
e4472387-7f51-4288-be3e-99b3713e3bbf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-05-16	Pix	Aroldo pix 	1.00	2000.00	2000.00	A Pagar	2025-08-11 08:24:00.992531+00	\N	\N	\N	\N	\N	\N	t
11731eb8-37b3-44e2-bffe-c9b36df21fe3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-11 21:13:38.470922+00	\N	\N	\N	\N	\N	\N	t
5e4d7ba2-118d-41d4-84cb-be44604320b6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-04 21:33:09.812425+00	\N	\N	\N	\N	\N	\N	t
0bd43945-0d36-4e46-9fee-495d0c343fed	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Alecrin	Lucas	30.00	1.20	36.00	A Pagar	2025-08-12 08:44:00.977561+00	\N	\N	\N	\N	\N	\N	t
b363ec5d-8b31-4dc6-a768-d3e7bec9aa8a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-12 21:36:53.533685+00	\N	\N	\N	\N	\N	\N	t
bd68eb22-0eff-4a1b-a5a0-5bdac433b149	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-14 01:23:59.683286+00	\N	\N	\N	\N	\N	\N	t
1ba646dc-846b-4919-9f7b-346ad7355620	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-14 19:10:33.810416+00	\N	\N	\N	\N	\N	\N	t
6cc45c56-858f-434a-ac32-78fe8e8b3bc2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-14 19:22:28.761821+00	\N	\N	\N	\N	\N	\N	t
b92e5eb3-c120-42a4-8320-b6cfcc22e35a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Bibi	130.00	1.70	221.00	A Pagar	2025-08-14 19:37:23.499218+00	\N	\N	\N	\N	\N	\N	t
c228a53f-0fd2-495e-aaef-f8e875048d1c	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-17 21:32:22.368206+00	\N	\N	\N	\N	\N	\N	t
17ba6e0e-c95e-4e6f-a1eb-18e6085cece5	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Mostarda 	Folhas da serra 	160.00	0.60	96.00	A Pagar	2025-08-17 21:32:22.395508+00	\N	\N	\N	\N	\N	\N	t
819f8584-0e26-4200-b79f-aab1e2e43f51	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Mostarda 	2 irmão 	100.00	0.50	50.00	A Pagar	2025-08-17 21:32:22.499924+00	\N	\N	\N	\N	\N	\N	t
276b1903-334c-4886-8a84-6dca987378f9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Almeirão	Tuyane	10.00	1.30	13.00	A Pagar	2025-08-05 21:30:34.176885+00	\N	\N	\N	\N	\N	\N	t
d3e8cc13-8aee-42e8-97f0-6971b4b21d1e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-05 22:40:28.489305+00	\N	\N	\N	\N	\N	\N	t
818c167b-692c-49ee-b358-a319e809a369	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Marquinho cebola	7.00	2.00	14.00	A Pagar	2025-08-14 20:53:40.305468+00	\N	\N	\N	\N	\N	\N	t
56feec23-8be4-40e4-9fe3-9fbadeddf5a2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Compressor 	Caio dispesas	1.00	65.00	65.00	A Pagar	2025-08-15 21:52:15.612669+00	\N	\N	\N	\N	\N	\N	t
dc03197b-c932-473e-b2d2-edaf636061c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-28	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-07-28 20:31:03.496116+00	\N	\N	\N	\N	\N	\N	t
b0c27053-1649-4f69-820e-38b3a0c5ecc3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-26	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-07-28 20:29:04.418948+00	\N	\N	\N	\N	\N	\N	t
41de701e-993d-4275-b5b9-92e44b0ef415	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-28	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-07-28 20:54:42.71148+00	\N	\N	\N	\N	\N	\N	t
008fd8cb-118d-4694-a131-5c03dc128a24	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-16 22:03:23.105253+00	\N	\N	\N	\N	\N	\N	t
817cffd5-a433-481f-9e64-7db6b06249e3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Neuza e filho	60.00	2.00	120.00	A Pagar	2025-08-17 14:01:03.848493+00	\N	\N	\N	\N	\N	\N	t
aaf8d2d3-7fa5-49b2-bbe0-5d0dbe98d534	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-06 21:12:09.49205+00	\N	\N	\N	\N	\N	\N	t
d2b30799-93b0-4ef3-a3d9-eba7b46c2611	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Agro costa	60.00	2.00	120.00	A Pagar	2025-08-17 14:01:12.996953+00	\N	\N	\N	\N	\N	\N	t
9867926e-c6cb-4f07-853c-e5b40692ad9a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-17 18:13:31.333034+00	\N	\N	\N	\N	\N	\N	t
5549267f-2d42-4405-8ba5-7073a42bbc32	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-08-12 21:37:09.204378+00	\N	\N	\N	\N	\N	\N	t
9325a0c0-26ac-425c-a26c-e8316d8433fc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Moca alecrim	Greide	4.00	5.00	20.00	A Pagar	2025-08-03 19:41:52.172058+00	\N	\N	\N	\N	\N	\N	t
638a4488-f037-4d2d-aef5-49c72177435b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-07-28 22:40:58.026232+00	\N	\N	\N	\N	\N	\N	t
7e77ba7a-c0f3-4304-b6df-094f2a11a93d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-07-28 22:44:53.836627+00	\N	\N	\N	\N	\N	\N	t
f376803e-0f1b-46fa-b575-3e2c4eb7a225	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-07-28 22:48:23.596663+00	\N	\N	\N	\N	\N	\N	t
4eefeb63-aade-4721-a3e8-74a0ac03495b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Acelga	Fabiane	8.00	2.50	20.00	A Pagar	2025-07-28 22:50:42.158976+00	\N	\N	\N	\N	\N	\N	t
060529a3-d362-49fe-979c-6062ca947674	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-07-28 22:52:02.596175+00	\N	\N	\N	\N	\N	\N	t
cca3754d-f286-464d-8e49-c70fc9c051c4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-17 18:13:57.178564+00	\N	\N	\N	\N	\N	\N	t
2b48da7d-3b11-4c40-811b-3dfc81090d1a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-07-28 22:57:03.153876+00	\N	\N	\N	\N	\N	\N	t
5de42229-01a8-44a6-ab45-bd4bb4cece8f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Acelga	Multi folhas	122.00	2.00	244.00	A Pagar	2025-08-17 18:14:07.139157+00	\N	\N	\N	\N	\N	\N	t
cb535592-797d-4f17-a259-c18129560f91	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-25	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-07-28 23:16:59.087728+00	\N	\N	\N	\N	\N	\N	t
3e8efc29-dcef-4022-a13a-a1141eaefe78	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Mostarda 	Rodrigo  fazenda 	20.00	0.60	12.00	A Pagar	2025-08-07 17:22:48.711493+00	\N	\N	\N	\N	\N	\N	t
8f077959-24d5-4d16-b339-6f97c02e65da	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Tomilho	Fabiane	10.00	1.50	15.00	A Pagar	2025-08-07 20:50:52.205926+00	\N	\N	\N	\N	\N	\N	t
373c1c3e-b465-4858-b7ac-0ff8a06df5b1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Fabiane	5.00	1.70	8.50	A Pagar	2025-08-07 20:51:05.280087+00	\N	\N	\N	\N	\N	\N	t
68981d8a-298c-4fc7-aef8-c6723b73bbfe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Caixotao 	Casarão	7.00	5.00	35.00	A Pagar	2025-08-03 20:05:35.042568+00	\N	\N	\N	\N	\N	\N	t
9b46abbd-a05a-4a04-804d-78e9a6dd707f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Paquy	10.00	2.00	20.00	A Pagar	2025-08-07 21:02:13.070204+00	\N	\N	\N	\N	\N	\N	t
ea02b692-476c-412a-add8-68e295273e75	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Acelga	Miguel	100.00	1.50	150.00	A Pagar	2025-08-04 21:33:27.708618+00	\N	\N	\N	\N	\N	\N	t
2ad8d775-8084-4669-bb07-66fdb2cb24e3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Poro	Waguinho	1.00	18.00	18.00	A Pagar	2025-08-10 17:19:13.864726+00	\N	\N	\N	\N	\N	\N	t
9f41dbb9-dee9-40d6-a16a-5c0c4afcadbf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-10 17:32:46.143001+00	\N	\N	\N	\N	\N	\N	t
2e582de1-e167-4d9d-b630-6aeade78291b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-10 17:48:03.647029+00	\N	\N	\N	\N	\N	\N	t
bc3a0ae7-8076-4fb2-a038-f6787f3fcdc8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-05-30	Pix	Aroldo pix 	1.00	2000.00	2000.00	A Pagar	2025-08-11 08:24:24.413133+00	\N	\N	\N	\N	\N	\N	t
2460d5f2-5b0b-44e0-b0c8-7ef6fa9eedae	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Neuza e filho	60.00	2.00	120.00	A Pagar	2025-08-11 21:13:57.445339+00	\N	\N	\N	\N	\N	\N	t
7c79d3c2-98dd-47a8-995f-97866463f94e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-11 21:14:14.162219+00	\N	\N	\N	\N	\N	\N	t
97553bfb-f251-4517-afe6-28305dae73a0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-11 21:14:25.69723+00	\N	\N	\N	\N	\N	\N	t
756a4272-736e-45e9-b757-d95f2e2b8e9a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-11 21:14:38.045024+00	\N	\N	\N	\N	\N	\N	t
c93eb957-6ec0-4f60-9882-27a703aa6994	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-11	Aipo	Marquinho cebola	15.00	2.00	30.00	A Pagar	2025-08-11 21:14:51.397984+00	\N	\N	\N	\N	\N	\N	t
fc1957f4-b575-40b8-8565-09284700f401	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-13	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-13 22:17:53.128967+00	\N	\N	\N	\N	\N	\N	t
0c120ade-4bfe-43e4-b502-50edf9482d86	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-11	Mostarda 	Folhas da serra 	180.00	0.60	108.00	A Pagar	2025-08-12 14:35:16.602331+00	\N	\N	\N	\N	\N	\N	t
1cb9d68a-da1d-499b-865a-8877cfdb711c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-14 01:24:13.916928+00	\N	\N	\N	\N	\N	\N	t
9c1c2799-cb8a-4f89-9dbe-8d3af030a911	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Alecrin	Lucas	50.00	1.20	60.00	A Pagar	2025-08-14 19:10:53.709598+00	\N	\N	\N	\N	\N	\N	t
62e276ec-2e72-4039-b641-304db9437ea6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Aipo	Takeo	15.00	8.00	120.00	A Pagar	2025-08-14 19:11:11.049117+00	\N	\N	\N	\N	\N	\N	t
f94793a2-692c-4e4d-bed3-fd900fedcd0d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Serra agrícola	2.00	16.00	32.00	A Pagar	2025-08-14 19:23:29.776236+00	\N	\N	\N	\N	\N	\N	t
52ed3232-3114-4e2f-9f39-ac67b0ba2394	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Elivelto	1.00	16.00	16.00	A Pagar	2025-08-14 19:23:42.167784+00	\N	\N	\N	\N	\N	\N	t
d9b594b2-d3fb-4851-a94e-81c6f551b277	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Derson	2.00	16.00	32.00	A Pagar	2025-08-05 21:31:34.655767+00	\N	\N	\N	\N	\N	\N	t
d5710d80-cbe6-49d9-bd23-142eed77a5a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Acelga	Luciana	80.00	1.50	120.00	A Pagar	2025-08-05 22:41:45.285217+00	\N	\N	\N	\N	\N	\N	t
0692e6e7-e18d-4da4-9d5d-7c60711d8f46	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Jakeline	2.00	24.00	48.00	A Pagar	2025-07-28 20:29:40.053767+00	\N	\N	\N	\N	\N	\N	t
bee1e7f6-ad0c-4b95-b871-0cf5076b6920	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Ferro 	Caio dispesas	1.00	120.00	120.00	A Pagar	2025-08-15 21:52:48.93082+00	\N	\N	\N	\N	\N	\N	t
38a1293b-baba-4d65-a490-a0f54796ed14	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-16 22:03:35.204386+00	\N	\N	\N	\N	\N	\N	t
a7ecb24d-a95e-4001-9053-a6fe3db8b38b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-26	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-07-28 22:17:51.832407+00	\N	\N	\N	\N	\N	\N	t
7a182609-eca4-4256-8067-abb095f7a4d6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-16 22:03:48.978023+00	\N	\N	\N	\N	\N	\N	t
7dd8950a-7065-41ff-916c-332284ba9b3c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-03 19:42:10.523265+00	\N	\N	\N	\N	\N	\N	t
000b2de2-cd6c-4c4f-829e-9665709eee37	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Agro costa	50.00	2.00	100.00	A Pagar	2025-08-03 19:51:59.179615+00	\N	\N	\N	\N	\N	\N	t
b7cdf2a0-33b3-45ae-a421-1cc2ff006724	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Acelga	Multi folhas	100.00	2.00	200.00	A Pagar	2025-07-28 22:41:26.75565+00	\N	\N	\N	\N	\N	\N	t
1c248c89-907b-4879-8c22-b6089e0b7d32	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Loro	Vica	40.00	1.00	40.00	A Pagar	2025-07-28 22:45:31.209938+00	\N	\N	\N	\N	\N	\N	t
f108c633-4b63-49fa-85fe-dfe6a440aece	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-07-28 22:48:57.287914+00	\N	\N	\N	\N	\N	\N	t
539c5251-7878-455b-a443-92f0c90cb3a9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-07-28 22:51:02.210086+00	\N	\N	\N	\N	\N	\N	t
d437f00d-bbd4-41c2-a431-a8474860eb5c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-07-28 22:52:29.039296+00	\N	\N	\N	\N	\N	\N	t
248b631b-e1be-4a1a-8f3d-84a25134c6aa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Aipo	Takeo	15.00	8.00	120.00	A Pagar	2025-08-16 22:04:03.309434+00	\N	\N	\N	\N	\N	\N	t
1fc36c5b-0a3d-4265-b09b-1008f3203be3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Guarilha	3.00	12.00	36.00	A Pagar	2025-08-17 14:01:32.700514+00	\N	\N	\N	\N	\N	\N	t
8e7f889a-1171-4259-a56c-854e61e9eb78	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-27	Aipo	Agro costa	60.00	2.00	120.00	A Pagar	2025-07-28 23:01:43.856248+00	\N	\N	\N	\N	\N	\N	t
2841ccd6-e93e-43e1-b032-90980b53c794	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Waguinho	8.00	13.00	104.00	A Pagar	2025-08-17 14:01:42.783998+00	\N	\N	\N	\N	\N	\N	t
0bc34e8c-d53f-43af-b0c9-cf984b522339	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Alexandre	10.00	2.00	20.00	A Pagar	2025-08-03 19:52:12.065361+00	\N	\N	\N	\N	\N	\N	t
a2f708c1-dc7f-4c58-bc39-356f0abbfed8	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-03	Mostarda 	2 irmão 	220.00	0.50	110.00	A Pagar	2025-08-07 00:07:56.350759+00	\N	\N	\N	\N	\N	\N	t
419bf68b-9319-4a67-9795-d635b2878b4b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Acelga	Rodrigo  fazenda 	20.00	1.50	30.00	A Pagar	2025-08-07 17:23:02.472333+00	\N	\N	\N	\N	\N	\N	t
0a5fab2b-fb41-489d-b59f-7496f90e9802	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Tuyane	4.00	16.00	64.00	A Pagar	2025-08-07 20:51:30.157745+00	\N	\N	\N	\N	\N	\N	t
e4aff0ad-4920-4aa4-9992-747cccc625f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Marquinho cebola	41.00	2.00	82.00	A Pagar	2025-08-07 21:02:27.186892+00	\N	\N	\N	\N	\N	\N	t
7c923344-f912-48f5-9aaf-3fff47e45ae0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-03 19:52:25.937233+00	\N	\N	\N	\N	\N	\N	t
21db311d-b09c-4457-bea0-7d63db5c6c38	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-08 18:40:34.219801+00	\N	\N	\N	\N	\N	\N	t
2f07a50b-62e7-4c2c-bd90-a77c6c9a95d7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Aipo	Marquinho cebola	21.00	2.00	42.00	A Pagar	2025-08-03 20:24:37.590938+00	\N	\N	\N	\N	\N	\N	t
51cb541a-d9d2-49ea-9d46-1be9e06926a3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-13	Aipo	Marquinho cebola	71.00	2.00	142.00	A Pagar	2025-08-14 01:24:34.687027+00	\N	\N	\N	\N	\N	\N	t
b600c2f0-b21f-4a63-99d8-60f57498879b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-04 21:33:49.203475+00	\N	\N	\N	\N	\N	\N	t
394ce5a0-8c6a-47fe-8253-e7094f072300	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-10 17:20:14.08429+00	\N	\N	\N	\N	\N	\N	t
f6297041-a9cf-42c2-9c86-ef5797eab4ac	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-10 17:20:27.587216+00	\N	\N	\N	\N	\N	\N	t
be15241e-646e-4671-9fab-46b9a8c9cc35	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-10 17:33:06.214255+00	\N	\N	\N	\N	\N	\N	t
54f1c044-6952-4496-95c0-bfde0d4f015e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-10 17:48:20.220024+00	\N	\N	\N	\N	\N	\N	t
5eca67d9-545b-4b72-886f-e5d540e0ede0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-06-06	Pix	Aroldo pix 	1.00	1000.00	1000.00	A Pagar	2025-08-11 08:24:54.865922+00	\N	\N	\N	\N	\N	\N	t
aec239ae-2e28-4407-8037-445d5ab288d6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Aipo	Caio	42.00	11.00	462.00	A Pagar	2025-08-11 21:17:58.00044+00	\N	\N	\N	\N	\N	\N	t
a2cdb602-046a-4563-bacf-6fd04aca62e0	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-11	Mostarda 	Sandro	100.00	0.80	80.00	A Pagar	2025-08-12 14:36:01.066046+00	\N	\N	\N	\N	\N	\N	t
8801bb50-e3eb-4ea9-b12b-b33805b2f1a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Derson	2.00	16.00	32.00	A Pagar	2025-08-12 21:37:49.695585+00	\N	\N	\N	\N	\N	\N	t
efa5c55e-5870-40c3-b2a0-32871f21a691	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Mostarda 	Rodrigo  fazenda 	20.00	0.60	12.00	A Pagar	2025-08-12 21:48:20.602887+00	\N	\N	\N	\N	\N	\N	t
5861a42c-472b-45c8-8929-a743c9f7bb06	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-13	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-13 22:18:18.42875+00	\N	\N	\N	\N	\N	\N	t
9d09386a-d08b-4d77-b088-844b54a79a5a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-14 19:11:31.134124+00	\N	\N	\N	\N	\N	\N	t
8c9d9450-017f-4980-902d-ebf3d69cb74c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-14 19:23:53.75544+00	\N	\N	\N	\N	\N	\N	t
ceb7679b-c7d2-4b8f-a70b-84c29c343779	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Tomilho	Waguinho	5.00	1.50	7.50	A Pagar	2025-08-17 14:01:53.497596+00	\N	\N	\N	\N	\N	\N	t
a4f5aa52-a43a-4296-89ed-bfbe8ce0594c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-17 18:14:39.262127+00	\N	\N	\N	\N	\N	\N	t
df9b8bb9-8a20-4f9c-a774-d6b461366077	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-18 17:37:01.097722+00	\N	\N	\N	\N	\N	\N	t
7961538b-3c3c-4b0f-a55c-5bfe21902ce7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Jakeline	1.00	24.00	24.00	A Pagar	2025-08-18 17:43:08.402695+00	\N	\N	\N	\N	\N	\N	t
134fbcc3-99b2-4440-b9f2-c6880b7f60b1	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	18526a3b-e7a3-4375-b574-b278afb83c2b	venda	2025-08-19	tomate 	Abc	2.00	56.00	112.00	A Pagar	2025-08-19 12:21:04.726309+00	\N	\N	\N	\N	\N	\N	t
59077d28-9728-43cd-b345-5f3980f1f505	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Alface romana 	Takeo	30.00	1.00	30.00	A Pagar	2025-08-19 18:29:54.767842+00	\N	\N	\N	\N	\N	\N	t
384db0b8-764c-4af4-ab12-6d624a814a93	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Saco isterco	Luis esterco	80.00	15.00	1200.00	A Pagar	2025-08-19 18:41:05.895662+00	\N	\N	\N	\N	\N	\N	t
eb2e8b89-2de9-4422-9af5-d90d2701d783	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-19 19:58:26.713379+00	\N	\N	\N	\N	\N	\N	t
a8226768-fa40-4cd4-a44e-3e4cb66f0a2a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Mostarda 	Tuyane	20.00	0.90	18.00	A Pagar	2025-08-19 20:02:00.106107+00	\N	\N	\N	\N	\N	\N	t
0fc9110c-9648-4692-8e02-4ef786a1db93	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-05 21:23:38.266379+00	\N	\N	\N	\N	\N	\N	t
d435eca1-552b-4bd5-ad2a-e77af8f8600d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-05 21:23:51.4184+00	\N	\N	\N	\N	\N	\N	t
6ffaccb7-6646-486e-846d-7a32cc410662	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-05 21:24:04.61879+00	\N	\N	\N	\N	\N	\N	t
db7fa2ff-2a76-4443-bee5-a486d32764fd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Poro	Derson	12.00	20.00	240.00	A Pagar	2025-08-05 21:31:50.861035+00	\N	\N	\N	\N	\N	\N	t
d519516e-5b1b-4a5c-a525-81a9cbdc4c80	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Coentro	Luciana	10.00	3.00	30.00	A Pagar	2025-08-05 22:41:59.005373+00	\N	\N	\N	\N	\N	\N	t
5db51c66-3122-4577-aab7-63524c09acd7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Loro	Fabio	5.00	10.00	50.00	A Pagar	2025-08-20 08:24:43.601906+00	\N	\N	\N	\N	\N	\N	t
fe5c953f-307e-4482-a7a4-42dee285ab47	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Marquinho cebola	26.00	1.90	49.40	A Pagar	2025-08-19 20:05:59.672365+00	\N	\N	\N	\N	\N	\N	t
d5815522-5cd8-40a0-8b22-9848bb5543f5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Alecrim	Marli	30.00	1.20	36.00	A Pagar	2025-08-20 15:23:11.194803+00	\N	\N	\N	\N	\N	\N	t
e296f180-7f8e-470f-a853-3209f45484cf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Guarilha	9.00	12.00	108.00	A Pagar	2025-08-20 15:26:26.955872+00	\N	\N	\N	\N	\N	\N	t
d751ed4d-a638-49da-8393-6df7ab241c83	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-15 08:51:16.542566+00	\N	\N	\N	\N	\N	\N	t
c7dbd8d2-a68b-4084-ac92-116e9cdce13f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Luz	Caio dispesas	1.00	60.00	60.00	A Pagar	2025-08-15 21:53:30.730755+00	\N	\N	\N	\N	\N	\N	t
11be736a-9774-43ac-888a-2af93b16137b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-16 22:04:22.099973+00	\N	\N	\N	\N	\N	\N	t
9a893c67-453e-4129-9cd6-ee6995536512	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Alexandre	15.00	2.00	30.00	A Pagar	2025-08-17 14:02:30.051084+00	\N	\N	\N	\N	\N	\N	t
259bf3f7-07ec-494a-91ce-5ab2bdab78aa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-17 14:02:38.688918+00	\N	\N	\N	\N	\N	\N	t
2924fa27-6078-424a-909d-283c9cc3de82	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-01	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:17:40.609059+00	\N	\N	\N	\N	\N	\N	t
8a932d94-5451-4b4c-9e28-238914402959	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-01	Acelga	Rodrigo	40.00	1.50	60.00	A Pagar	2025-07-29 17:18:05.65308+00	\N	\N	\N	\N	\N	\N	t
fcd8d54d-3fd1-4b30-8a4f-42825bdae169	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-02	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:18:51.183539+00	\N	\N	\N	\N	\N	\N	t
a9a69b80-37c6-44a9-93c3-eab318c79a7f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-02	Acelga	Rodrigo	40.00	1.50	60.00	A Pagar	2025-07-29 17:19:18.301074+00	\N	\N	\N	\N	\N	\N	t
97286cd7-0ad7-4483-82cb-f2b70b4ab110	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-03	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:20:10.589755+00	\N	\N	\N	\N	\N	\N	t
070be062-a73c-4366-995c-33514c5b79d2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-03	Acelga	Rodrigo	70.00	1.50	105.00	A Pagar	2025-07-29 17:20:48.429884+00	\N	\N	\N	\N	\N	\N	t
16e974be-cc4e-4a7f-b113-ba34f4127100	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-05	Acelga	Rodrigo	60.00	1.50	90.00	A Pagar	2025-07-29 17:21:50.081814+00	\N	\N	\N	\N	\N	\N	t
3e094e4e-9900-494f-bb43-f9d45755d69e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-07	Acelga	Rodrigo	40.00	1.50	60.00	A Pagar	2025-07-29 17:22:20.3006+00	\N	\N	\N	\N	\N	\N	t
41e65456-ccbc-4e04-9bf4-f2d82755b2bf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-08	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:22:50.591118+00	\N	\N	\N	\N	\N	\N	t
7b3c6f51-fe45-4817-92c1-7418aca08eb7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-08	Acelga	Rodrigo	20.00	1.50	30.00	A Pagar	2025-07-29 17:23:16.294616+00	\N	\N	\N	\N	\N	\N	t
aea2b100-edd6-43e9-affe-9951cfc23c7e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-09	Acelga	Rodrigo	40.00	1.50	60.00	A Pagar	2025-07-29 17:23:41.13538+00	\N	\N	\N	\N	\N	\N	t
8613f338-21a1-4e13-997c-89bfaacd91b5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-10	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:24:09.788422+00	\N	\N	\N	\N	\N	\N	t
c1bbdf70-2bba-46a9-bfb9-aa91a07fb6e8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-11	Acelga	Rodrigo	20.00	1.50	30.00	A Pagar	2025-07-29 17:24:37.031283+00	\N	\N	\N	\N	\N	\N	t
1f14859e-e2a9-4d41-a991-6ca5acd445f9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-13	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:25:07.153219+00	\N	\N	\N	\N	\N	\N	t
690e9220-e5ac-45cf-ac94-e73bcc15345c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-15	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:25:39.241051+00	\N	\N	\N	\N	\N	\N	t
55db862e-52f4-4aac-b5ad-b6d911b619eb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-17	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:26:17.69742+00	\N	\N	\N	\N	\N	\N	t
43046865-1c61-4d85-b67c-ccb2af746d1a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-17	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:26:37.724249+00	\N	\N	\N	\N	\N	\N	t
69c4ebe9-e886-4c6c-af42-ecae6adbaa42	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-20	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:27:15.948256+00	\N	\N	\N	\N	\N	\N	t
f17aac91-15ed-4ded-865f-f18a1b40fd87	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-22	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:27:54.55929+00	\N	\N	\N	\N	\N	\N	t
7223687b-5a9a-4189-a6ab-a676b948a317	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-22	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:28:23.190925+00	\N	\N	\N	\N	\N	\N	t
5654ec6f-ee2b-4758-bb4b-9ccc86fef7ac	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-24	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:28:47.023274+00	\N	\N	\N	\N	\N	\N	t
1982d605-4b19-44f4-8cda-d17c23378161	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-24	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:29:05.887354+00	\N	\N	\N	\N	\N	\N	t
ebf9565f-4484-47d5-9ab6-e8966af6be3b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-26	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:29:37.224279+00	\N	\N	\N	\N	\N	\N	t
0cdf7b43-9487-403e-a2fe-8015271ca557	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-28	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:30:08.78507+00	\N	\N	\N	\N	\N	\N	t
17477140-f5b4-4d2c-9c49-83504450bd77	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-29	Mostarda 	Rodrigo	20.00	0.60	12.00	A Pagar	2025-07-29 17:30:39.71114+00	\N	\N	\N	\N	\N	\N	t
979d05ed-4041-4699-adff-e95b87f6b8c0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-29	Aipo	Rodrigo	10.00	8.00	80.00	A Pagar	2025-07-29 17:30:57.739225+00	\N	\N	\N	\N	\N	\N	t
0d68c329-fb92-4301-a6c2-abcae0a52606	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Queiroz e guarilha 	350.00	0.50	175.00	A Pagar	2025-08-06 23:44:18.816821+00	\N	\N	\N	\N	\N	\N	t
bf498a6e-f95d-4ee1-8fb3-28b5aefd0a65	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	2 irmão 	220.00	0.50	110.00	A Pagar	2025-08-07 00:08:19.493559+00	\N	\N	\N	\N	\N	\N	t
3b394175-e5b5-4c5f-aee1-2c4a4aad3e06	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Salsa crespa	Lorinha	10.00	1.00	10.00	A Pagar	2025-08-07 17:23:28.733063+00	\N	\N	\N	\N	\N	\N	t
895f4f90-efa1-4900-9f50-a39fccb027cd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-07 20:51:44.28975+00	\N	\N	\N	\N	\N	\N	t
a399073f-424a-414d-a7eb-a21a6ba9e845	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-07 21:06:06.797428+00	\N	\N	\N	\N	\N	\N	t
ef68c977-ec96-4a25-9589-501152e87000	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Caixotao 	Casarão	6.00	5.00	30.00	A Pagar	2025-08-08 18:42:00.367324+00	\N	\N	\N	\N	\N	\N	t
f13fa515-2cf4-40f0-9ec5-574eb6905914	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-09 15:53:44.105981+00	\N	\N	\N	\N	\N	\N	t
1da6890c-9d31-45ed-ace2-61a3f397de6d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-10 17:20:42.411214+00	\N	\N	\N	\N	\N	\N	t
816f6edd-b46b-4b4e-8ffe-efcffb130e00	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-08-10 17:33:23.602341+00	\N	\N	\N	\N	\N	\N	t
9afcfd0b-bc9b-4ae4-8f00-c5f1f32b6f66	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Mostarda 	Lorinha	20.00	0.60	12.00	A Pagar	2025-08-10 17:48:34.101493+00	\N	\N	\N	\N	\N	\N	t
c2bab4cd-8c4f-4270-b171-db49c8f4e68d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-06-27	Pix	Aroldo pix 	1.00	2000.00	2000.00	A Pagar	2025-08-11 08:25:23.597648+00	\N	\N	\N	\N	\N	\N	t
f3930ef2-f1e1-4222-a3a5-0e038b0de282	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-11 21:18:11.409946+00	\N	\N	\N	\N	\N	\N	t
39472439-e79d-4a52-9814-c278727ce868	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-11	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-12 14:36:35.169729+00	\N	\N	\N	\N	\N	\N	t
2d5fcd94-39e4-4fe4-acb7-b66962cbf871	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Poro	Derson	12.00	18.00	216.00	A Pagar	2025-08-12 21:38:02.476865+00	\N	\N	\N	\N	\N	\N	t
26dfcae3-a37d-460d-9567-146d77913755	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Acelga	Luciana	40.00	1.50	60.00	A Pagar	2025-08-12 21:48:35.443167+00	\N	\N	\N	\N	\N	\N	t
72e208f4-a5a0-49a4-b5a5-19afcd104d1e	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-13	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-13 22:18:42.862873+00	\N	\N	\N	\N	\N	\N	t
90707b56-e0e5-4c04-9f65-23fa649287aa	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Queiroz e guarilha 	470.00	0.50	235.00	A Pagar	2025-08-14 18:04:14.283669+00	\N	\N	\N	\N	\N	\N	t
8efed9b9-1bd0-4565-b674-b0c2fb03fb9f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-03 19:42:35.902752+00	\N	\N	\N	\N	\N	\N	t
f69b89f8-43a1-4eb7-b91c-45ba128fdd38	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Marquinho cebola	12.00	2.00	24.00	A Pagar	2025-08-03 19:52:46.258062+00	\N	\N	\N	\N	\N	\N	t
c3cfc0d7-02d4-4c4c-8455-3cd841f39116	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-05 21:24:22.352214+00	\N	\N	\N	\N	\N	\N	t
e2191878-753f-4957-a62b-2f44d805ae12	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Loro	Derson	8.00	10.00	80.00	A Pagar	2025-08-05 21:32:03.503928+00	\N	\N	\N	\N	\N	\N	t
12ddea15-e89c-41b7-8259-1d98e562270b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-05 22:42:13.813526+00	\N	\N	\N	\N	\N	\N	t
2e04ae78-601b-4857-9143-a8d6258e8b9d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Acelga	Rodrigo  fazenda 	20.00	1.50	30.00	A Pagar	2025-08-14 19:11:52.720743+00	\N	\N	\N	\N	\N	\N	t
985d4588-92e2-40f5-afbc-32433047b274	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-14 19:24:18.274578+00	\N	\N	\N	\N	\N	\N	t
4fa77477-b863-4eb1-9bbf-c0ec8d766fef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-14 19:24:30.670086+00	\N	\N	\N	\N	\N	\N	t
21da4b21-3f97-4bc1-94ad-db78d667170f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-14 19:24:41.00698+00	\N	\N	\N	\N	\N	\N	t
ddc7ec42-6792-49a1-92d7-f5155e8e8967	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-03 19:42:54.383164+00	\N	\N	\N	\N	\N	\N	t
f6e765ec-ae42-4cbb-9d96-6105b2538e53	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-03 19:43:05.480933+00	\N	\N	\N	\N	\N	\N	t
319cb215-014d-4afc-94b4-142cbe16ef2a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-15 08:51:31.776887+00	\N	\N	\N	\N	\N	\N	t
9a5ab850-cf83-4e48-a081-447f2a4150b2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Internet 	Caio dispesas	1.00	50.00	50.00	A Pagar	2025-08-15 21:53:55.271948+00	\N	\N	\N	\N	\N	\N	t
77ddd4b7-e136-4dda-b1a0-8b58341283e0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Moca alecrim	Ozia	20.00	3.00	60.00	A Pagar	2025-08-16 22:04:42.259934+00	\N	\N	\N	\N	\N	\N	t
b8b1ac91-d6db-431c-8eaf-9fb8fcd2f117	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Acelga	Multi folhas	130.00	2.00	260.00	A Pagar	2025-08-05 21:24:39.574382+00	\N	\N	\N	\N	\N	\N	t
33f8ff6f-1d2e-4f8b-9822-d14aaa41d032	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Moca alecrim	Derson	10.00	5.00	50.00	A Pagar	2025-08-05 21:32:19.650963+00	\N	\N	\N	\N	\N	\N	t
c6a3915d-291c-4ad1-aad0-a9570c008dd4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Serra agrícola	3.00	16.00	48.00	A Pagar	2025-08-17 14:03:04.365196+00	\N	\N	\N	\N	\N	\N	t
d8bb0367-81e1-45ce-ad27-2f709dd1417a	091e21fb-4715-4fe8-b006-36e88642b0b2	80aacb38-7287-486d-b82f-86ecec82888a	venda	2025-08-04	Mostarda 	Queiroz e guarilha 	120.00	0.50	60.00	A Pagar	2025-08-06 23:47:44.866121+00	\N	\N	\N	\N	\N	\N	t
ae55f3b2-9b1a-4ebd-85e1-54ee91c6cd7e	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-04	Mostarda 	Queiroz e guarilha 	120.00	0.50	60.00	A Pagar	2025-08-07 00:09:03.969562+00	\N	\N	\N	\N	\N	\N	t
4a8bd95d-8a26-475c-b71b-ed65996810f5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-07 17:24:08.532712+00	\N	\N	\N	\N	\N	\N	t
0b51ad85-20cf-491f-9a58-ff7ac98f6ed2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-07 20:52:13.679155+00	\N	\N	\N	\N	\N	\N	t
e2eaf35c-6451-418c-b1b7-cd50bca95206	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Folhas da serra 	200.00	0.60	120.00	A Pagar	2025-08-07 21:06:32.290256+00	\N	\N	\N	\N	\N	\N	t
b0b4085e-7569-4c6d-8008-ab4a2378890e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Poro	Lindomar	10.00	13.00	130.00	A Pagar	2025-08-09 15:54:18.005945+00	\N	\N	\N	\N	\N	\N	t
de3fe7df-c0cc-40d4-b630-9f8feb75b789	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-10 17:21:19.616338+00	\N	\N	\N	\N	\N	\N	t
4a946826-f45d-4b0f-8f2c-4232955f9e12	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Almeirão	Tuyane	20.00	1.30	26.00	A Pagar	2025-08-10 17:33:43.600448+00	\N	\N	\N	\N	\N	\N	t
bef95fae-25b8-4bc8-80cc-315df43b5316	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Derson	4.00	16.00	64.00	A Pagar	2025-08-10 17:33:57.383033+00	\N	\N	\N	\N	\N	\N	t
546faa37-0484-4cf1-85c8-f5112d8c1ed3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Almeirão	Lorinha	20.00	0.80	16.00	A Pagar	2025-08-10 17:48:51.422759+00	\N	\N	\N	\N	\N	\N	t
a722efbf-fdaf-4920-9466-a4c2fbb48f28	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-16	Pix	Aroldo pix 	1.00	1000.00	1000.00	A Pagar	2025-08-11 08:25:53.036874+00	\N	\N	\N	\N	\N	\N	t
c4a8586d-688c-463a-a328-09f54f5c3de8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-11 21:18:30.749644+00	\N	\N	\N	\N	\N	\N	t
fb7e3412-9df0-4d83-8458-bc29cf17d940	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-12	Mostarda 	Queiroz e guarilha 	90.00	0.50	45.00	A Pagar	2025-08-12 14:37:31.053945+00	\N	\N	\N	\N	\N	\N	t
30933db8-ee1c-41eb-a820-4cd60ec4c830	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Moca alecrim	Derson	10.00	5.00	50.00	A Pagar	2025-08-12 21:38:16.434035+00	\N	\N	\N	\N	\N	\N	t
d02fa87c-deca-4df0-9c5a-10993411ac9c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Moca tomilho 	Derson	2.00	4.00	8.00	A Pagar	2025-08-12 21:38:29.477332+00	\N	\N	\N	\N	\N	\N	t
96efe34a-bf7b-4198-8ccc-15b548729a4f	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-12	Mostarda 	Thiago chencher 	50.00	0.80	40.00	A Pagar	2025-08-12 21:48:58.838154+00	\N	\N	\N	\N	\N	\N	t
34bbfe9d-890b-428a-92e8-07c74c5d8d96	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-13	Mostarda 	Sandro	70.00	0.80	56.00	A Pagar	2025-08-13 22:19:05.213362+00	\N	\N	\N	\N	\N	\N	t
37cbdd59-d10e-4734-a85f-370a0bfc605b	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-14 18:04:31.403167+00	\N	\N	\N	\N	\N	\N	t
94bec341-fa94-4f33-ad25-2a97cec0580e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Mostarda 	Rodrigo  fazenda 	20.00	0.60	12.00	A Pagar	2025-08-14 19:12:33.628073+00	\N	\N	\N	\N	\N	\N	t
7ebb4c59-75af-4cf6-a4f1-f2e2fb2d5685	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-14 19:25:02.673493+00	\N	\N	\N	\N	\N	\N	t
d668ea1f-132b-4fe8-a299-1c089ab53afa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-14 19:25:14.047884+00	\N	\N	\N	\N	\N	\N	t
0ae2c6a3-1195-47a4-925e-7c405b13234a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-14 19:25:32.392023+00	\N	\N	\N	\N	\N	\N	t
e0cdfc9f-eacc-46d5-a01a-bb2a2a1203d7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-17 18:19:02.453455+00	\N	\N	\N	\N	\N	\N	t
46740af9-f30f-4075-aba6-9375736db1d5	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-17	Mostarda 	Queiroz e guarilha 	240.00	0.50	120.00	A Pagar	2025-08-17 21:32:23.797076+00	\N	\N	\N	\N	\N	\N	t
f4384e68-0211-4aa0-91fe-d473fed58ad8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Moca alecrim	Ozia	20.00	3.00	60.00	A Pagar	2025-08-18 17:37:24.988894+00	\N	\N	\N	\N	\N	\N	t
97865855-0579-4899-8921-99cdfe0bee91	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-18 17:43:20.953816+00	\N	\N	\N	\N	\N	\N	t
8ffed347-7143-4c6a-b780-e14490e15c57	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Neuza e filho	70.00	2.00	140.00	A Pagar	2025-08-18 17:43:33.043716+00	\N	\N	\N	\N	\N	\N	t
eadb7b34-4aeb-4290-8cb5-5b4245f8d9f0	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	18526a3b-e7a3-4375-b574-b278afb83c2b	venda	2025-08-19	pimentão	Abc	55.00	50.00	2750.00	A Pagar	2025-08-19 12:21:59.768413+00	\N	\N	\N	\N	f60122e4-4fb6-4308-8348-3edabe418c59	Venda - Abc - 1 itens	t
fca96a11-de1f-4834-8a1e-cc6e15a1e1a0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Aipo	Dudu	10.00	9.00	90.00	A Pagar	2025-08-19 18:30:17.941248+00	\N	\N	\N	\N	\N	\N	t
e2b4af07-6903-4b0c-b1c6-620652fd58ee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Neuza e filho	70.00	2.00	140.00	A Pagar	2025-08-19 18:41:31.584105+00	\N	\N	\N	\N	\N	\N	t
9de3d97c-d7c0-47f3-ae5a-ae4853186d1f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-19 19:58:43.601106+00	\N	\N	\N	\N	\N	\N	t
54b77123-0ebf-4d04-8e03-7a9a1586bf67	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Derson	2.00	16.00	32.00	A Pagar	2025-08-19 20:02:30.133702+00	\N	\N	\N	\N	\N	\N	t
54c2d6b2-bcca-4b3f-8609-516b4c5d2982	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Caixotao 	Casarão	4.00	5.00	20.00	A Pagar	2025-08-19 20:08:12.230424+00	\N	\N	\N	\N	\N	\N	t
08da8f8b-baf0-40a1-8558-0fae45c35da5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Rony bethel	24.00	2.00	48.00	A Pagar	2025-08-20 15:17:00.553152+00	\N	\N	\N	\N	\N	\N	t
09a76336-7c46-4912-b7c1-a42c2508f4c9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-20 15:23:24.77063+00	\N	\N	\N	\N	\N	\N	t
90449381-ff38-487b-a8cf-4ae36b8cd56e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Acelga	Miguel	80.00	1.50	120.00	A Pagar	2025-08-20 15:23:39.618568+00	\N	\N	\N	\N	\N	\N	t
54e39954-76f9-4b39-890c-5f923f8677e3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-20 15:23:49.856701+00	\N	\N	\N	\N	\N	\N	t
6947e17e-35f3-4071-83b1-6d995ea8583a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Acelga	Getulin	50.00	1.50	75.00	A Pagar	2025-08-20 15:23:59.211662+00	\N	\N	\N	\N	\N	\N	t
4c7f6593-0f4e-4650-98b8-088f17f3b170	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-20 15:24:12.466886+00	\N	\N	\N	\N	\N	\N	t
2371287d-4857-4cfb-8608-38f90d57eeb6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Aipo	Waguinho	5.00	13.00	65.00	A Pagar	2025-08-20 15:26:38.934211+00	\N	\N	\N	\N	\N	\N	t
d59db89d-6843-4b83-8c32-a36edbc6e56c	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-08-20	Alface americana 	JFC	1.00	20.00	20.00	A Pagar	2025-08-20 19:36:41.887359+00	\N	\N	\N	\N	\N	\N	t
53021b2f-d03d-4ad0-8c7d-5861879aff16	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-20	Brocolis americano 	Sitio esperança 	200.00	2.50	500.00	A Pagar	2025-08-20 20:20:38.288956+00	\N	\N	\N	\N	\N	\N	t
f0fd62f6-e24f-4a5a-a3c9-d5333858cf0d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-20	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-20 21:12:55.900097+00	\N	\N	\N	\N	\N	\N	t
b60b0e5e-9871-4e97-9099-ccbdfafe7d87	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-26	Alecrin	Lucas	50.00	1.20	60.00	A Pagar	2025-07-29 19:11:16.98163+00	\N	\N	\N	\N	\N	\N	t
dce79516-1231-4bb4-b8fc-bad484e448f1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-27	Alecrin	Lucas	50.00	1.20	60.00	A Pagar	2025-07-29 19:11:44.350472+00	\N	\N	\N	\N	\N	\N	t
6327740c-d989-471e-9ad1-60f7efe01e76	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-29	Alecrin	Lucas	50.00	1.20	60.00	A Pagar	2025-07-29 19:12:26.229381+00	\N	\N	\N	\N	\N	\N	t
aad8217b-17f3-481d-84b6-5cf6aab70b3e	091e21fb-4715-4fe8-b006-36e88642b0b2	80aacb38-7287-486d-b82f-86ecec82888a	venda	2025-08-05	Mostarda 	Queiroz e guarilha 	480.00	0.50	240.00	A Pagar	2025-08-06 23:48:19.58139+00	\N	\N	\N	\N	\N	\N	t
793a9009-7188-44b9-9cc8-61c59e49b7ae	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	Queiroz e guarilha 	480.00	0.50	240.00	A Pagar	2025-08-07 00:09:39.16711+00	\N	\N	\N	\N	\N	\N	t
49efe1fe-4585-4486-a391-63960e2c12d2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Tomilho	Aline casa	10.00	1.00	10.00	A Pagar	2025-08-07 17:24:37.226303+00	\N	\N	\N	\N	\N	\N	t
c3e2fdc8-7275-423d-b21a-70691d115d41	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-07 20:52:45.438099+00	\N	\N	\N	\N	\N	\N	t
2e327b1c-79db-4fbd-9a9c-94561be59b05	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-07 21:06:54.716587+00	\N	\N	\N	\N	\N	\N	t
5ca0be3e-fc78-4ae3-9042-b8c536dc048f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Waguinho	4.00	13.00	52.00	A Pagar	2025-08-08 18:42:36.176962+00	\N	\N	\N	\N	\N	\N	t
971ed1e6-c8f1-499f-932f-07e24e5a2496	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-09 15:54:51.675842+00	\N	\N	\N	\N	\N	\N	t
e3f3df1f-eaf4-4010-9adc-1126cbcac03b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Alecrin	Marli	30.00	1.20	36.00	A Pagar	2025-08-09 15:55:02.9056+00	\N	\N	\N	\N	\N	\N	t
a740c4b7-9529-4ed7-9a3f-27cd915a8eb2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-03 19:43:19.278971+00	\N	\N	\N	\N	\N	\N	t
bab0e8a3-6438-4610-b2ec-09ac67b36fc1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Albidair	40.00	1.70	68.00	A Pagar	2025-08-03 19:43:33.169951+00	\N	\N	\N	\N	\N	\N	t
6f1ac06c-cfd6-4e82-8a7f-d93638c115b8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Aipo	Caio	32.00	11.00	352.00	A Pagar	2025-08-03 19:57:27.338826+00	\N	\N	\N	\N	\N	\N	t
35dff83d-5ded-4b80-acde-915b20b883d0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Serra agrícola	3.00	16.00	48.00	A Pagar	2025-08-10 17:21:35.68599+00	\N	\N	\N	\N	\N	\N	t
d55940ae-20fd-4ee2-b66b-d8e7a1acfbc4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-10 17:21:49.078433+00	\N	\N	\N	\N	\N	\N	t
4556a9ed-238a-4f87-a723-d9b774e68ddc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Poro	Mateus	4.00	15.00	60.00	A Pagar	2025-08-04 21:35:04.151827+00	\N	\N	\N	\N	\N	\N	t
1bcf27ef-0483-4b66-9e2d-7ebb80437f1d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-05 21:24:58.584786+00	\N	\N	\N	\N	\N	\N	t
b8f9f4b9-b6a2-4d5c-a5e5-ada6c2e0101b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Waguinho	4.00	13.00	52.00	A Pagar	2025-08-15 21:06:27.706935+00	\N	\N	\N	\N	\N	\N	t
07415208-b32b-485c-84ff-9a7d8517e76b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Camera	Caio dispesas	1.00	80.00	80.00	A Pagar	2025-08-15 21:54:23.135068+00	\N	\N	\N	\N	\N	\N	t
04c188d9-8ef6-49a3-9ba3-d70f3620f30f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Alecrim	Ozia	50.00	1.20	60.00	A Pagar	2025-08-16 22:08:04.621114+00	\N	\N	\N	\N	\N	\N	t
df4d1d20-eac6-47cc-9643-f4c6bae101f1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Acelga	Rodrigo 	60.00	2.00	120.00	A Pagar	2025-07-29 22:30:37.800914+00	\N	\N	\N	\N	\N	\N	t
87dfb3ee-3d21-496c-8a0d-1aceabab3f18	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-01	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:39:55.797693+00	\N	\N	\N	\N	\N	\N	t
8b4ae85f-90da-45ae-ac2b-a50ab8703b8b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-03	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:40:31.491224+00	\N	\N	\N	\N	\N	\N	t
3bb6ef54-70c1-402a-a574-5bc85f60d566	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-06	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:41:03.998156+00	\N	\N	\N	\N	\N	\N	t
26c8648a-3c1c-474a-876c-39b739604fbe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-08	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:41:45.972905+00	\N	\N	\N	\N	\N	\N	t
31398c60-5130-46d8-9b45-07de1a429499	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-10	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:42:07.449079+00	\N	\N	\N	\N	\N	\N	t
49248690-7960-4c21-8625-92668e6cd114	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-13	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:42:34.677104+00	\N	\N	\N	\N	\N	\N	t
6014d273-ee39-4513-b869-a42fd8566659	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-15	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:43:01.04973+00	\N	\N	\N	\N	\N	\N	t
434f58d3-d15e-4bb5-9941-2984f4803add	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-17	Acelga	Rodrigo  água quente 	60.00	2.00	120.00	A Pagar	2025-07-29 22:43:21.840611+00	\N	\N	\N	\N	\N	\N	t
b20ed7cc-5dfa-4d39-a8d0-62d460fed08e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-05 21:35:42.734541+00	\N	\N	\N	\N	\N	\N	t
158a62c4-1002-449b-84dd-896a70e04f56	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-17 14:03:32.267983+00	\N	\N	\N	\N	\N	\N	t
2b52a54f-f266-42e5-8993-b145d0325980	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-10 17:22:03.396633+00	\N	\N	\N	\N	\N	\N	t
fbc27954-2fdc-4b32-909b-f3706995f3d5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-10 17:22:16.328635+00	\N	\N	\N	\N	\N	\N	t
5fb70681-3f6b-46dd-b9f1-c7b3deba6df0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Poro	Derson	12.00	18.00	216.00	A Pagar	2025-08-10 17:34:20.769434+00	\N	\N	\N	\N	\N	\N	t
45ba0928-491e-4144-82d1-6693d5214823	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Acelga	Rodrigo  fazenda 	20.00	1.50	30.00	A Pagar	2025-08-10 17:49:20.747097+00	\N	\N	\N	\N	\N	\N	t
e7572e7d-b694-4603-97ad-b01b6653305e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-25	Pix	Aroldo pix 	1.00	1000.00	1000.00	A Pagar	2025-08-11 08:26:15.538292+00	\N	\N	\N	\N	\N	\N	t
e9761de7-5c5d-4c3a-8c90-542193ea8399	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-12	Mostarda 	Sandro	80.00	0.80	64.00	A Pagar	2025-08-12 14:37:59.890222+00	\N	\N	\N	\N	\N	\N	t
799c946a-a20e-47dd-b380-714b27a17af4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Loro	Derson	10.00	10.00	100.00	A Pagar	2025-08-12 21:38:42.682174+00	\N	\N	\N	\N	\N	\N	t
e62d8a08-f0ec-4920-a16a-aebf232f9c8c	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-12	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-12 21:49:31.994878+00	\N	\N	\N	\N	\N	\N	t
26367a07-ce6b-471c-ab9d-a5ff2917e9e1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-12 21:49:34.031828+00	\N	\N	\N	\N	\N	\N	t
57813d08-4b17-4df9-b914-22938f183599	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-13	Mostarda 	Queiroz e guarilha 	150.00	0.50	75.00	A Pagar	2025-08-13 22:19:32.34425+00	\N	\N	\N	\N	\N	\N	t
c17cbb99-ad74-4677-b75a-eff40657f35f	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	2 irmão 	150.00	0.50	75.00	A Pagar	2025-08-14 18:04:51.837801+00	\N	\N	\N	\N	\N	\N	t
5562fd81-7005-4e75-9fb2-69a116a67b59	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Coentro	Rodrigo  fazenda 	10.00	3.00	30.00	A Pagar	2025-08-14 19:12:55.900336+00	\N	\N	\N	\N	\N	\N	t
e68278f3-f5ad-4dd4-b951-60f712551f33	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-14 19:25:59.860515+00	\N	\N	\N	\N	\N	\N	t
671033e8-6f5b-4f8e-9fbc-333a1f1aa47f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Felipe tunin	30.00	15.00	450.00	A Pagar	2025-08-17 18:19:37.810221+00	\N	\N	\N	\N	\N	\N	t
e992608d-3ab9-4bc3-905a-bea78d5a9761	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Alecrim	Ozia	50.00	1.20	60.00	A Pagar	2025-08-18 17:37:49.371907+00	\N	\N	\N	\N	\N	\N	t
17c22db2-b08a-4869-a93d-4564e8024e7a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-18 17:44:31.647084+00	\N	\N	\N	\N	\N	\N	t
434953b5-7435-4958-abd0-4297e8dd89b1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Alexandre	20.00	2.00	40.00	A Pagar	2025-08-18 17:44:43.498044+00	\N	\N	\N	\N	\N	\N	t
d81ce781-87cd-4e60-b330-796eb0d91e94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-18 17:44:52.965466+00	\N	\N	\N	\N	\N	\N	t
a3aa74d6-76d0-4746-b1a9-f924f3918358	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	Queiroz e guarilha 	130.00	0.40	52.00	A Pagar	2025-08-19 12:48:24.457361+00	\N	\N	\N	\N	\N	\N	t
729bcb8d-f19f-43eb-8781-1167a05e83c4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Alecrim	Weliton	30.00	1.20	36.00	A Pagar	2025-08-19 18:30:37.726723+00	\N	\N	\N	\N	\N	\N	t
11564e1c-f815-4eb6-85bb-0fcc2013f262	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-19 18:42:01.610899+00	\N	\N	\N	\N	\N	\N	t
22ee0a22-7e7a-4627-b512-18c98eee9571	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-19 18:42:10.921821+00	\N	\N	\N	\N	\N	\N	t
bc4f2cb0-fe1f-408e-938c-d5c0ebae664d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Paquy	10.00	2.00	20.00	A Pagar	2025-08-19 18:42:21.409608+00	\N	\N	\N	\N	\N	\N	t
a99a1c72-3564-49a1-83a4-a862b7035aab	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-19 19:59:04.570211+00	\N	\N	\N	\N	\N	\N	t
b4daa120-4722-4f8f-9cb1-cb0a74d6c399	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Moca alecrim	Derson	11.00	5.00	55.00	A Pagar	2025-08-19 20:02:48.394313+00	\N	\N	\N	\N	\N	\N	t
83b636d8-d8d9-4c49-ae67-4c1fd460e835	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-03 19:43:50.096458+00	\N	\N	\N	\N	\N	\N	t
adb17360-8b25-48fd-b845-62e1bc14de27	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Poro	Waguinho	1.00	18.00	18.00	A Pagar	2025-08-15 21:06:41.328652+00	\N	\N	\N	\N	\N	\N	t
25f23864-fde9-45a8-a1c5-8d2de1088b39	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-07-29 23:05:06.620386+00	\N	\N	\N	\N	\N	\N	t
1a6c2f51-e9f5-4c98-98e5-495c5e712720	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-07-29 23:05:26.844962+00	\N	\N	\N	\N	\N	\N	t
1f4bc90b-e9b5-4a73-9973-e8cd4f846ef1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-07-29 23:05:43.751382+00	\N	\N	\N	\N	\N	\N	t
3f376d83-eca3-4ecd-9c0f-1545b2accae0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Livaldo	Caio dispesas	1.00	500.00	500.00	A Pagar	2025-08-15 21:54:45.102757+00	\N	\N	\N	\N	\N	\N	t
5fa38f84-1c04-4e8f-9665-0304c97d94be	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-07-29 23:06:16.977431+00	\N	\N	\N	\N	\N	\N	t
cdb20bd0-e191-4d10-bcc7-06eeb8156682	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Acelga	Multi folhas	113.00	2.00	226.00	A Pagar	2025-07-29 23:06:56.520156+00	\N	\N	\N	\N	\N	\N	t
ea6e9863-8d94-4224-b01c-6887baadbfc7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-07-29 23:07:14.20522+00	\N	\N	\N	\N	\N	\N	t
7bc616b2-fc7b-45bb-921d-3b7b435c92a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-07-29 23:07:36.860224+00	\N	\N	\N	\N	\N	\N	t
8ee24a6e-a133-4484-98e3-bdd5ec264ea9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Vica	2.00	16.00	32.00	A Pagar	2025-07-29 23:08:34.44606+00	\N	\N	\N	\N	\N	\N	t
9c1ac2cd-e47b-4774-aaeb-93e0e99e2269	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-07-29 23:09:31.451911+00	\N	\N	\N	\N	\N	\N	t
e0fff1c1-129f-4b90-87ae-fe6c1adb2ac2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Loro	Vica	30.00	1.00	30.00	A Pagar	2025-07-29 23:09:32.093067+00	\N	\N	\N	\N	\N	\N	t
9c03e0a1-d1c0-401b-8493-0da09141321e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Alecrim	Weliton	30.00	1.20	36.00	A Pagar	2025-08-16 22:09:08.612148+00	\N	\N	\N	\N	\N	\N	t
cb303e27-b115-4b09-a0a3-23f7e9d608ff	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Moca alecrim	Greide	5.00	5.00	25.00	A Pagar	2025-07-29 23:12:31.633925+00	\N	\N	\N	\N	\N	\N	t
c6b0a2e7-9fdc-4ec9-9aff-bff21c0d21f2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-07-29 23:13:01.730917+00	\N	\N	\N	\N	\N	\N	t
0f4c7eff-9bc7-4478-b487-8a79ed3bf18a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-07-29 23:13:18.325585+00	\N	\N	\N	\N	\N	\N	t
f57e7c31-a07b-4fb1-ae4f-be4df8bb3861	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-07-29 23:13:42.89489+00	\N	\N	\N	\N	\N	\N	t
8dd0e41e-f497-4840-9b8b-601d86de9df4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-07-29 23:13:57.851493+00	\N	\N	\N	\N	\N	\N	t
bc32491e-551e-4a20-b42c-071c8763c3a4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Loro	Alessandro	10.00	10.00	100.00	A Pagar	2025-08-17 14:03:58.178408+00	\N	\N	\N	\N	\N	\N	t
9b7831f4-671e-4f5f-beef-7976cd698077	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-07-29 23:14:37.874574+00	\N	\N	\N	\N	\N	\N	t
401edc3f-0a8d-4118-a56d-d4926af67d74	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-07-29 23:14:51.573992+00	\N	\N	\N	\N	\N	\N	t
9251dfef-d217-4627-9b85-cb58a96c5220	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-07-29 23:15:07.708594+00	\N	\N	\N	\N	\N	\N	t
3f314041-6727-4bf9-a4c7-3a8d9936eb6e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Acelga	Fabiane	4.00	2.50	10.00	A Pagar	2025-07-29 23:15:26.445412+00	\N	\N	\N	\N	\N	\N	t
bb4edfd5-a7a7-43d5-9848-c0434777e053	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-07-29 23:15:45.842417+00	\N	\N	\N	\N	\N	\N	t
18980cf7-0f6c-4661-bb8e-39a9d8b9b14b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Tomilho	Fabiane	10.00	1.50	15.00	A Pagar	2025-07-29 23:16:02.309278+00	\N	\N	\N	\N	\N	\N	t
16069107-13bb-480e-a770-f1e4e61175fe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Jajá e junior	2.00	15.00	30.00	A Pagar	2025-07-29 23:16:22.753197+00	\N	\N	\N	\N	\N	\N	t
6401fa50-f404-421a-abdb-2781c72a95c1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Tuyane	4.00	16.00	64.00	A Pagar	2025-07-29 23:16:47.370831+00	\N	\N	\N	\N	\N	\N	t
b5cab811-cf26-4c8c-bce2-b7d916789755	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-07-29 23:17:03.589278+00	\N	\N	\N	\N	\N	\N	t
44f82c2d-7c7c-4929-8f5f-339a2bd7b673	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-07-29 23:17:21.428763+00	\N	\N	\N	\N	\N	\N	t
1e4ae35f-5a86-46b2-8894-8633e68b6afb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-07-29 23:17:41.693403+00	\N	\N	\N	\N	\N	\N	t
6748468a-8443-4f46-ae55-aadd7f943d90	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-07-29 23:17:58.704298+00	\N	\N	\N	\N	\N	\N	t
ec1f5761-8dd3-419d-84bf-d236d69b15ec	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Almeirão	Tuyane	20.00	1.30	26.00	A Pagar	2025-07-29 23:18:20.354168+00	\N	\N	\N	\N	\N	\N	t
aab36705-d4aa-4b2f-9985-de0911475f16	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-17 18:20:11.565048+00	\N	\N	\N	\N	\N	\N	t
604fc341-14db-4be8-9e00-eae8c307a5a1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-17	Moca alecrim	Ozia	20.00	3.00	60.00	A Pagar	2025-08-18 00:32:46.739779+00	\N	\N	\N	\N	\N	\N	t
1a0ced0c-45e8-4101-91c4-ca2c4bd78848	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Alecrim	Marli	30.00	1.20	36.00	A Pagar	2025-08-18 17:38:04.925522+00	\N	\N	\N	\N	\N	\N	t
9715110b-6db5-4466-956e-79801a6e25c8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Caixotao 	Casarão	5.00	5.00	25.00	A Pagar	2025-08-18 18:03:27.156996+00	\N	\N	\N	\N	\N	\N	t
240faad9-73e4-4a33-a335-def9f0243565	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-07-29 23:19:42.637216+00	\N	\N	\N	\N	\N	\N	t
93959bcd-295c-4d66-b243-b312ce5819d4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-07-29 23:20:06.165876+00	\N	\N	\N	\N	\N	\N	t
73af7999-f3fb-4d9a-9fa1-984b0febd1ec	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	2 irmão 	100.00	0.50	50.00	A Pagar	2025-08-19 12:48:44.046254+00	\N	\N	\N	\N	\N	\N	t
b806609d-641e-4a1c-9f58-d7791b5470f9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-07-29 23:20:52.253482+00	\N	\N	\N	\N	\N	\N	t
ff8883a0-3698-471d-8bb0-fad33b08decc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Salsa crespa	Jakeline	45.00	1.20	54.00	A Pagar	2025-07-29 23:21:18.376858+00	\N	\N	\N	\N	\N	\N	t
83857d1a-7020-4f9b-a746-a3a719ca1942	091e21fb-4715-4fe8-b006-36e88642b0b2	80aacb38-7287-486d-b82f-86ecec82888a	venda	2025-08-01	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-06 23:49:05.363736+00	\N	\N	\N	\N	\N	\N	t
23a07908-7a81-4f22-991f-aa7c882c8b08	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Coentro	Rodrigo  fazenda 	10.00	3.00	30.00	A Pagar	2025-08-19 18:31:01.711838+00	\N	\N	\N	\N	\N	\N	t
1fa442f1-7f7b-497e-a3bd-d465d698a51f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Agro costa	10.00	2.00	20.00	A Pagar	2025-07-29 23:22:39.570726+00	\N	\N	\N	\N	\N	\N	t
f6c64864-36ee-4c27-bc37-630480390be6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Aipo	Rony bethel	24.00	2.00	48.00	A Pagar	2025-07-29 23:23:43.663956+00	\N	\N	\N	\N	\N	\N	t
a278a795-7833-4a19-9471-6de609430dcc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-29	Acelga	Rony bethel	15.00	1.80	27.00	A Pagar	2025-07-29 23:24:03.033295+00	\N	\N	\N	\N	\N	\N	t
f33d1565-aa1e-4db5-93a2-9054fb56198f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-19 18:42:49.557439+00	\N	\N	\N	\N	\N	\N	t
e778a91e-fed3-4133-8054-f4e049cb1cde	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Thiago chencher 	36.00	0.80	28.80	A Pagar	2025-08-07 00:12:05.1668+00	\N	\N	\N	\N	\N	\N	t
a17445a6-d79f-4dac-83c7-59038b3a0b04	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-03 19:57:42.717442+00	\N	\N	\N	\N	\N	\N	t
fffdc872-33b3-4ea1-b774-a1d969ea4371	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrin	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-19 19:59:26.524366+00	\N	\N	\N	\N	\N	\N	t
e8222eff-d801-4480-94af-eabafbf670ba	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Moca tomilho 	Derson	2.00	4.00	8.00	A Pagar	2025-08-19 20:03:05.323938+00	\N	\N	\N	\N	\N	\N	t
679ebc50-4474-4d8b-81c4-a7980cb80bfe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-05 21:25:14.786226+00	\N	\N	\N	\N	\N	\N	t
c89181e7-2002-4600-8fbc-78bfe1b280f3	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-04	Mostarda 	Thiago chencher 	25.00	0.80	20.00	Pago	2025-08-07 00:12:04.818553+00	\N	\N	\N	\N	\N	\N	t
e7113a1d-1597-4f74-965f-b5605df6b95e	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	Thiago chencher 	55.00	0.80	44.00	Pago	2025-08-07 00:12:05.25301+00	\N	\N	\N	\N	\N	\N	t
51305828-1246-4dea-b456-63f6286e0f6e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-07	Caixotao 	Casarão	6.00	5.00	30.00	A Pagar	2025-08-07 20:40:53.62249+00	\N	\N	\N	\N	\N	\N	t
a8b3ea72-ca20-4cd8-a87c-b0da28e747f4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-08-03 19:44:07.890552+00	\N	\N	\N	\N	\N	\N	t
506e15de-4e1b-4299-94b5-e3f9d08f6330	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-15 21:07:23.464833+00	\N	\N	\N	\N	\N	\N	t
6de6f608-b42a-476b-8bb9-29a0a9963f55	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-15 21:07:32.573693+00	\N	\N	\N	\N	\N	\N	t
323c66ec-ea96-45f8-809e-396c67e90633	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-12	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-12 14:38:28.868549+00	\N	\N	\N	\N	\N	\N	t
135ed603-6acb-42d0-8166-5dbae74d5a70	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-03 19:57:56.418996+00	\N	\N	\N	\N	\N	\N	t
11641288-aa3a-4f3d-abcf-7724a3a32381	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-03	Mostarda 	Maravilha da serra 	130.00	0.60	78.00	A Pagar	2025-08-06 23:49:40.192808+00	\N	\N	\N	\N	\N	\N	t
c73a9ad6-cacd-412c-b698-f2210efd6ca9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Waguinho	4.00	13.00	52.00	A Pagar	2025-08-07 20:43:20.473452+00	\N	\N	\N	\N	\N	\N	t
36aa9219-f581-4100-8ce9-6daf786ffa16	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Sandro	150.00	0.80	120.00	A Pagar	2025-08-07 21:07:20.92679+00	\N	\N	\N	\N	\N	\N	t
77caa676-d4bd-4c02-bcec-5f9b015c0416	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Poro	Waguinho	1.00	18.00	18.00	A Pagar	2025-08-08 18:42:48.296907+00	\N	\N	\N	\N	\N	\N	t
deb3ecd5-f9f3-4a07-82b5-df0b2589b81a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-30	Alecrin	Helena 	42.00	1.20	50.40	A Pagar	2025-07-30 16:08:29.489057+00	\N	\N	\N	\N	\N	\N	t
96560871-f63f-40dc-8af1-d3c047b332b9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-12	Moca alecrim	Helena 	11.00	3.00	33.00	A Pagar	2025-07-30 16:26:04.534912+00	\N	\N	\N	\N	\N	\N	t
21afb7e2-adfd-4f2b-9896-2592a770c0ba	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-17	Moca alecrim	Helena 	33.00	3.00	99.00	A Pagar	2025-07-30 16:26:35.505296+00	\N	\N	\N	\N	\N	\N	t
cc5cc302-0068-42c2-9d1e-3157ebf2a8b7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-30	Aipo	Gleiciel	2.00	13.00	26.00	A Pagar	2025-07-30 19:29:24.340816+00	\N	\N	\N	\N	\N	\N	t
0ce2c4be-1a6c-4f60-bb36-94d0bff99f25	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Agro Terê	3.00	14.00	42.00	A Pagar	2025-08-08 18:43:06.307234+00	\N	\N	\N	\N	\N	\N	t
b6de9a76-29cd-40d8-8055-24604316fc92	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Acelga	Getulin	50.00	1.50	75.00	A Pagar	2025-08-16 22:09:36.061645+00	\N	\N	\N	\N	\N	\N	t
0378385b-56bf-418a-8c75-f6c242b863d1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-16 22:09:49.148315+00	\N	\N	\N	\N	\N	\N	t
8b4451ef-87a3-4ffc-8a12-339aa122a9fa	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-30	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-07-30 19:31:32.876232+00	\N	\N	\N	\N	\N	\N	t
1a41b7fb-abb5-4a85-a668-a584e8ee28df	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-30	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-07-30 19:31:44.641057+00	\N	\N	\N	\N	\N	\N	t
d1d7e87c-d903-4d08-b651-92b84219945d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Acelga	Miguel	80.00	1.50	120.00	A Pagar	2025-08-16 22:10:02.8546+00	\N	\N	\N	\N	\N	\N	t
037a9cdd-6b9f-48be-9527-ea2a71f19a1c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Moca alecrim	Greide	10.00	5.00	50.00	A Pagar	2025-08-17 14:04:16.416481+00	\N	\N	\N	\N	\N	\N	t
0dcdc934-49ed-4698-a8c3-8e37dfdf8e94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-30	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-07-30 19:32:58.357445+00	\N	\N	\N	\N	\N	\N	t
ff69d217-4230-453c-8999-d8963c5a2599	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-30	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-07-30 19:33:21.301004+00	\N	\N	\N	\N	\N	\N	t
3ea0988e-316b-436e-a598-33a968c59501	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-08 18:43:18.004515+00	\N	\N	\N	\N	\N	\N	t
7dd3e9fe-4425-49ef-8c5a-48c516987a53	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Loro	Vica	20.00	1.00	20.00	A Pagar	2025-08-17 18:22:09.412962+00	\N	\N	\N	\N	\N	\N	t
71667f43-51f2-41dc-88e2-93aa5a5f7118	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-30	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-07-30 19:34:51.609453+00	\N	\N	\N	\N	\N	\N	t
2d8f85d7-4bb3-4009-9e47-c07d818e0072	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Acelga	Alexandre	10.00	1.80	18.00	A Pagar	2025-08-18 08:07:21.665887+00	\N	\N	\N	\N	\N	\N	t
3091f502-b953-4bda-b7ff-fbc1c7caea52	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-09	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-09 15:55:25.619407+00	\N	\N	\N	\N	\N	\N	t
3a517f8e-4312-4899-bb1b-ce98cb755dbe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Acelga	Multi folhas	144.00	2.00	288.00	A Pagar	2025-08-10 17:22:29.499013+00	\N	\N	\N	\N	\N	\N	t
c5120e9f-db97-4067-8bf5-d4247d1d992e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Aipo	Waguinho	8.00	13.00	104.00	A Pagar	2025-08-04 21:21:14.084044+00	\N	\N	\N	\N	\N	\N	t
b0779abe-7a88-45f2-8d03-8ab038731761	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Moca alecrim	Derson	11.00	5.00	55.00	A Pagar	2025-08-10 17:34:35.751216+00	\N	\N	\N	\N	\N	\N	t
6272beb2-2189-4295-81e8-bede979d433c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Acelga	Aline	40.00	1.50	60.00	A Pagar	2025-08-10 17:49:45.820394+00	\N	\N	\N	\N	\N	\N	t
81fde86f-69a7-400a-95d3-d1652dbd708f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Troco	Fabio	1.00	20.00	20.00	A Pagar	2025-07-30 15:59:48.320943+00	\N	\N	\N	\N	\N	\N	t
75c77e8c-844d-4f56-af2f-e220b4f58204	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-08	Pix	Aroldo pix 	1.00	1000.00	1000.00	A Pagar	2025-08-11 08:28:01.892936+00	\N	\N	\N	\N	\N	\N	t
4026bcce-2afe-4acd-a35f-858b6d3de881	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-04 21:35:22.749065+00	\N	\N	\N	\N	\N	\N	t
3c06b4be-1651-4620-bb71-dee16b0f6e64	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Loro	Vica	40.00	1.00	40.00	A Pagar	2025-08-05 21:25:28.233561+00	\N	\N	\N	\N	\N	\N	t
2ee642f2-de1e-431e-abc7-c3d6466e3d00	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-05 21:36:04.83909+00	\N	\N	\N	\N	\N	\N	t
fb910804-afdf-4757-ae06-b91ced2e1fea	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-05 22:43:00.86439+00	\N	\N	\N	\N	\N	\N	t
745a1f5e-3db4-4bc1-bdeb-e9e12553f8c3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Acelga	Vegetable	135.00	2.00	270.00	A Pagar	2025-08-12 21:39:03.599775+00	\N	\N	\N	\N	\N	\N	t
eb512a1f-897f-42cc-9a38-403418e96a59	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-07-30	Alecrin	Lucas	50.00	1.20	60.00	A Pagar	2025-07-30 20:18:25.18189+00	\N	\N	\N	\N	\N	\N	t
9bd52b2e-1e5a-49d0-9d42-785217716902	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-18 17:38:20.052661+00	\N	\N	\N	\N	\N	\N	t
95ea2b91-9421-4800-957b-f96fdd02c35e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-18	Aipo	Paquy	10.00	2.00	20.00	A Pagar	2025-08-18 18:07:43.659376+00	\N	\N	\N	\N	\N	\N	t
478f2f18-87cd-4faa-9eeb-d2368e6b6d88	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Alface americana	Lorenço	15.00	18.00	270.00	A Pagar	2025-08-12 21:39:17.723043+00	\N	\N	\N	\N	\N	\N	t
46c73ed9-65b5-47a3-9825-57ac7dc48402	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-12	Alecrin	Lucas	80.00	1.20	96.00	A Pagar	2025-08-12 21:49:54.854872+00	\N	\N	\N	\N	\N	\N	t
2264325f-5547-4df6-9d56-d6363940ed54	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-13	Mostarda 	Vinicius Vila 	20.00	0.60	12.00	A Pagar	2025-08-13 22:20:18.382929+00	\N	\N	\N	\N	\N	\N	t
e46704be-d741-4464-ad14-c0e6532f5f98	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-14 18:06:05.643001+00	\N	\N	\N	\N	\N	\N	t
a078473b-5272-447e-8872-b00c62129765	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Acelga	Thiago	30.00	1.50	45.00	A Pagar	2025-08-14 19:13:21.349536+00	\N	\N	\N	\N	\N	\N	t
d102ee08-2594-470f-ade8-66e1827db7c8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-14 19:26:57.710744+00	\N	\N	\N	\N	\N	\N	t
d3527659-2c6c-49f5-993b-120d7fd26675	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Acelga	Fabiane	3.00	2.50	7.50	A Pagar	2025-08-14 19:27:08.9445+00	\N	\N	\N	\N	\N	\N	t
b78d61e4-7e96-4823-853a-1f533a3c548c	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-19 12:49:12.879661+00	\N	\N	\N	\N	\N	\N	t
8fd00d9f-a7f8-47e6-af55-744a20bd70e0	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-19 12:49:13.043225+00	\N	\N	\N	\N	\N	\N	t
6387a40b-d7ee-47f9-8f03-0ccded594410	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-19 18:32:55.901338+00	\N	\N	\N	\N	\N	\N	t
a72dbab0-df12-4f33-b8a7-c74925548c68	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-19 19:54:17.353903+00	\N	\N	\N	\N	\N	\N	t
8bedfb94-0fb7-4e33-adaa-78570810b8a7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-19 19:59:41.131063+00	\N	\N	\N	\N	\N	\N	t
7e6112ae-6eac-4946-a7dc-83b42635ea07	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Poro	Derson	12.00	18.00	216.00	A Pagar	2025-08-19 20:03:22.46116+00	\N	\N	\N	\N	\N	\N	t
b59f49cb-329c-4410-be31-c5a69e1c1965	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Agro costa	60.00	2.00	120.00	A Pagar	2025-08-19 18:41:44.272703+00	\N	\N	\N	\N	\N	\N	t
a54d7446-075a-4c75-b2b6-fd11dca5805e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-03 19:44:23.509622+00	\N	\N	\N	\N	\N	\N	t
bcff4f67-9866-4a33-b0d1-dd4b90919408	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Loro	Thiago chencher 	50.00	0.90	45.00	A Pagar	2025-08-15 21:07:54.900072+00	\N	\N	\N	\N	\N	\N	t
4558e4d1-d350-4b47-b946-1a7b28a43a35	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Aipo	Pai	20.00	11.00	220.00	A Pagar	2025-08-03 19:58:14.755161+00	\N	\N	\N	\N	\N	\N	t
eb2c8cac-d014-4443-9c55-c72210aecb85	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-04	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-06 23:50:18.519534+00	\N	\N	\N	\N	\N	\N	t
c7c319d8-8458-42c2-afb9-052a1f9c085a	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-07 00:15:21.778401+00	\N	\N	\N	\N	\N	\N	t
4fa70031-1033-42c0-8393-e74248602ad2	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-07-31	Alface americana 	JFC	50.00	18.00	900.00	A Pagar	2025-07-31 22:04:38.735872+00	\N	\N	\N	\N	\N	\N	t
2b71331d-3e81-48bc-afa5-2bc9e9f193bc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-04	Poro	Waguinho	2.00	18.00	36.00	A Pagar	2025-08-04 21:21:39.800991+00	\N	\N	\N	\N	\N	\N	t
24ca2ced-f6d5-46c8-bce5-b03ddb39b4f0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Acelmo	60.00	2.00	120.00	A Pagar	2025-08-15 21:08:06.652221+00	\N	\N	\N	\N	\N	\N	t
14bf319e-ea85-4927-b40f-e232a6ad5e47	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Jakeline	3.50	24.00	84.00	A Pagar	2025-08-15 21:08:19.255056+00	\N	\N	\N	\N	\N	\N	t
7bf734e1-f96f-4a27-a7ad-933c3434971a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-07 20:44:05.724251+00	\N	\N	\N	\N	\N	\N	t
6dc90a88-5d27-4204-bd09-114758a7babe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	BR	60.00	1.70	102.00	A Pagar	2025-08-07 20:53:43.297233+00	\N	\N	\N	\N	\N	\N	t
617df3fe-7517-4c3c-a4d3-3d880bc0575f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-04	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-04 21:35:38.564147+00	\N	\N	\N	\N	\N	\N	t
202e59cd-1d58-45e8-845e-7e83e1fbe516	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-05 21:25:47.153616+00	\N	\N	\N	\N	\N	\N	t
c4d1087f-5008-41fc-8584-c6b6176dc931	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Queiroz e guarilha 	180.00	0.50	90.00	A Pagar	2025-08-07 21:08:21.34014+00	\N	\N	\N	\N	\N	\N	t
52008920-f988-4178-a38f-4caf63ad99dd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Aipo	Vegetable	10.00	15.00	150.00	A Pagar	2025-08-05 21:36:58.735086+00	\N	\N	\N	\N	\N	\N	t
853e713e-2458-4bc2-bd2b-d11620444b94	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Acelga	Vegetable	130.00	2.00	260.00	A Pagar	2025-08-05 21:37:13.92591+00	\N	\N	\N	\N	\N	\N	t
90609fe6-50af-4f99-9392-6e738feda0cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-08-09 16:01:22.66831+00	\N	\N	\N	\N	\N	\N	t
3031af77-ef86-44de-ad3b-a3ccd681198d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-10 17:22:45.045591+00	\N	\N	\N	\N	\N	\N	t
fe4ea006-0954-4bdb-9eaa-f2ef8fe00fe3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Loro	Derson	9.00	10.00	90.00	A Pagar	2025-08-10 17:34:51.295216+00	\N	\N	\N	\N	\N	\N	t
05489f5b-3a3c-4b12-b465-bf9817d197c0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Poro	Mateus	3.00	15.00	45.00	A Pagar	2025-08-10 17:50:20.984624+00	\N	\N	\N	\N	\N	\N	t
bd05eb75-9a5b-40d4-92f6-04f51a03b6b2	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-08	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-11 12:06:56.096905+00	\N	\N	\N	\N	\N	\N	t
e564511b-ef3b-47dd-8526-3accd5b78019	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-01 09:26:29.542458+00	\N	\N	\N	\N	\N	\N	t
29d0bf89-ba26-4b54-a9f6-dab588af5a55	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-01 09:26:46.766663+00	\N	\N	\N	\N	\N	\N	t
623778cb-d8a1-42f8-bb4e-14132b03e5f2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-01 09:27:10.237992+00	\N	\N	\N	\N	\N	\N	t
96f3d7b7-6e13-4aa0-a33f-9596986dd66d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-01 09:27:52.119959+00	\N	\N	\N	\N	\N	\N	t
dd52dfb6-73e3-45ac-ab42-6e24e4b88b71	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-01 09:28:09.540273+00	\N	\N	\N	\N	\N	\N	t
35ac9f81-e245-438a-a2fe-ebe5ec1762a2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Acelga	Multi folhas	142.00	2.00	284.00	A Pagar	2025-08-01 09:28:30.405971+00	\N	\N	\N	\N	\N	\N	t
c995b23d-5f0a-41d1-b3a1-fc4c1c084bab	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alface crespa	Multi folhas	10.00	12.00	120.00	A Pagar	2025-08-01 09:28:48.542567+00	\N	\N	\N	\N	\N	\N	t
c002c724-8bf7-4f9d-87fd-ccd1e9f39df7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-01 09:29:17.100161+00	\N	\N	\N	\N	\N	\N	t
62d1a607-7c4c-4b2c-9871-2d35b5b0c945	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Loro	Vica	30.00	1.00	30.00	A Pagar	2025-08-01 09:29:39.781927+00	\N	\N	\N	\N	\N	\N	t
2b8585b9-3532-49f1-95ff-1ea86bbe7ac1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Tomilho	Vica	10.00	1.00	10.00	A Pagar	2025-08-01 09:30:00.55061+00	\N	\N	\N	\N	\N	\N	t
aa7b6fa4-e9f6-465a-862b-d7625872159b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-01 09:30:52.661195+00	\N	\N	\N	\N	\N	\N	t
1848fbbf-3f4c-44f2-8efa-f29fdcf731b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-01 09:32:49.233248+00	\N	\N	\N	\N	\N	\N	t
c1d5ad4e-bbbc-4b26-a661-32533a5d6065	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-01 09:33:10.104954+00	\N	\N	\N	\N	\N	\N	t
60666693-8c48-4e6c-8a0f-f6c73e94ef69	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-11 21:19:20.284894+00	\N	\N	\N	\N	\N	\N	t
21c66e47-a750-4915-91b1-af479c0a3490	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-01 21:57:42.355079+00	\N	\N	\N	\N	\N	\N	t
5540df5f-f39d-4f9c-bcfa-ecaddc5d7720	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-01 21:58:10.838506+00	\N	\N	\N	\N	\N	\N	t
ccebfd91-e10a-4569-b416-237c793c0989	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-01 21:58:57.406104+00	\N	\N	\N	\N	\N	\N	t
7a647bf8-54d8-46a4-8065-27e459aa771e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Acelga	Geovane	40.00	2.00	80.00	A Pagar	2025-08-01 21:59:18.327235+00	\N	\N	\N	\N	\N	\N	t
dbd9d3bb-ac53-40d0-9395-90f706306dcb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-01 22:01:34.757232+00	\N	\N	\N	\N	\N	\N	t
efd61402-aebd-4942-a8ba-c4714b1ef81d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Tomilho	Fabiane	10.00	1.50	15.00	A Pagar	2025-08-01 22:01:56.19967+00	\N	\N	\N	\N	\N	\N	t
42bca31d-4fd6-475a-ab10-4aa4cfc3d3ba	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-08-01 22:02:16.924226+00	\N	\N	\N	\N	\N	\N	t
56bd814d-2396-454b-8ed4-923ea601bf53	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Loro	Fabiane	1.00	10.00	10.00	A Pagar	2025-08-01 22:02:36.042219+00	\N	\N	\N	\N	\N	\N	t
6bb17e75-9916-4f08-90e8-9b8a18677991	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Jajá e junior	20.00	15.00	300.00	A Pagar	2025-08-01 22:03:01.784003+00	\N	\N	\N	\N	\N	\N	t
c96d9b33-6506-42c1-8114-e1b28c97cda9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Tuyane	4.00	16.00	64.00	A Pagar	2025-08-01 22:07:25.709334+00	\N	\N	\N	\N	\N	\N	t
5f0d8998-d2f6-455f-a1b5-0fb03f79b6bb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-01 22:08:06.091896+00	\N	\N	\N	\N	\N	\N	t
ae6a5aca-8412-453f-b031-91d9779eab8a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Tomilho	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-01 22:08:26.102231+00	\N	\N	\N	\N	\N	\N	t
fa24ead5-47b4-4b23-8a50-8e45791aca11	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-01 22:09:19.359844+00	\N	\N	\N	\N	\N	\N	t
31af6942-535e-4300-8d04-24814e51a942	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-12	Mostarda 	Folhas da serra 	190.00	0.60	114.00	A Pagar	2025-08-12 14:38:46.904209+00	\N	\N	\N	\N	\N	\N	t
6acdc24d-b15a-4496-ac25-a20eb8b2ba81	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-13	Alecrin	Lucas	50.00	1.20	60.00	A Pagar	2025-08-14 00:54:20.541253+00	\N	\N	\N	\N	\N	\N	t
d66ab4d2-accd-4bd6-89ee-f6bc45c5db84	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-14 18:06:26.716077+00	\N	\N	\N	\N	\N	\N	t
0828e7d5-d16f-4c35-8587-1dab004a379b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-14	Salsa crespa	Lorinha	40.00	1.00	40.00	A Pagar	2025-08-14 19:13:48.131659+00	\N	\N	\N	\N	\N	\N	t
0fff7451-69f4-4a28-b580-830b6c4b36a6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Alecrim	Fabiane	5.00	1.70	8.50	A Pagar	2025-08-14 19:27:21.18974+00	\N	\N	\N	\N	\N	\N	t
49ea9469-8906-478a-beac-fa3c2220eea2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Mostarda	Tuyane	20.00	0.90	18.00	A Pagar	2025-08-01 22:09:55.805597+00	\N	\N	\N	\N	\N	\N	t
2879bd09-8f87-4c35-927e-7139553ef28f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Almeirão	Tuyane	10.00	1.30	13.00	A Pagar	2025-08-01 22:10:13.689241+00	\N	\N	\N	\N	\N	\N	t
025187c1-b97a-4ac4-97ac-e26109285699	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Loro	Tuyane	7.00	12.00	84.00	A Pagar	2025-08-01 22:10:55.312939+00	\N	\N	\N	\N	\N	\N	t
68743d37-d581-45bb-b68f-904f4540a3c9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-15 21:08:39.074404+00	\N	\N	\N	\N	\N	\N	t
ebb795f7-9b2d-4ff7-8bdd-1914ea06848f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Alecrim	Marli	30.00	1.20	36.00	A Pagar	2025-08-16 22:10:29.684911+00	\N	\N	\N	\N	\N	\N	t
4838e0d9-ba3a-4321-aaa2-d535a5a505f7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-08-01 22:13:29.175022+00	\N	\N	\N	\N	\N	\N	t
01fbd70c-872e-44b0-bc0b-229b38d5e6d6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-07-31	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-01 22:13:44.070811+00	\N	\N	\N	\N	\N	\N	t
2cafd031-3c46-4067-8a29-962bddef5bb2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Loro	Greide	10.00	10.00	100.00	A Pagar	2025-08-17 14:04:28.76973+00	\N	\N	\N	\N	\N	\N	t
151a2c62-8dbf-4459-be6d-bfce7c061f8f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Acelmo	40.00	2.00	80.00	A Pagar	2025-08-01 22:20:34.874613+00	\N	\N	\N	\N	\N	\N	t
86feafdb-d2c5-4a92-9d53-e6b920a8d774	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-05	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-06 23:50:45.492917+00	\N	\N	\N	\N	\N	\N	t
0d3050a7-3150-4b98-a10b-ffbf58087aca	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-02	Mostarda 	Thiago chencher 	73.00	0.80	58.40	Pago	2025-08-07 00:12:05.210118+00	\N	\N	\N	\N	\N	\N	t
e16e7508-ca73-445d-a833-d872dbdabdee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-08-01 22:21:35.240613+00	\N	\N	\N	\N	\N	\N	t
dd870418-72a7-4554-bdce-f2cc83ed03ee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-01 22:22:03.940252+00	\N	\N	\N	\N	\N	\N	t
752daff7-a666-40e7-8652-7aa708982169	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-07 20:44:28.760265+00	\N	\N	\N	\N	\N	\N	t
9660a5a0-f2be-4868-877d-56cc3c7f44af	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Tomilho	BR	10.00	2.00	20.00	A Pagar	2025-08-07 20:54:12.001692+00	\N	\N	\N	\N	\N	\N	t
20059fc2-0ded-4039-92e6-899ff2b35f85	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Thiago chencher 	30.00	0.80	24.00	A Pagar	2025-08-07 21:08:43.896203+00	\N	\N	\N	\N	\N	\N	t
bb53ae1f-4d8c-4273-b01b-abe0b6959bbe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Neuza e filho	40.00	2.00	80.00	A Pagar	2025-08-01 22:24:11.028872+00	\N	\N	\N	\N	\N	\N	t
7a8340b2-5cab-4cbb-82a7-c5113b36be46	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Rony bethel	24.00	2.00	48.00	A Pagar	2025-08-08 18:44:26.943244+00	\N	\N	\N	\N	\N	\N	t
e38cb5a8-a5d8-4b3f-a47e-d65316af2ff3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-01 22:26:18.725652+00	\N	\N	\N	\N	\N	\N	t
ffc802aa-5cf0-4588-869a-3bce37546092	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Acelga	Rony bethel	15.00	1.80	27.00	A Pagar	2025-08-08 18:44:39.969753+00	\N	\N	\N	\N	\N	\N	t
5a547cdb-cd91-44b6-9fea-dee31be5ecef	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-09 16:01:40.255365+00	\N	\N	\N	\N	\N	\N	t
f7f518f0-7962-48f8-9e1c-229b8dc09f26	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-01 22:27:52.122903+00	\N	\N	\N	\N	\N	\N	t
304de98a-66cc-4b33-bd24-bae27dfeb6f0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-01 22:28:04.398004+00	\N	\N	\N	\N	\N	\N	t
9486df01-4ab7-4e66-ac08-4dd621aa9e1a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-10 17:23:39.11964+00	\N	\N	\N	\N	\N	\N	t
c31eabf1-3246-42fb-a7cd-4cf6d69455c2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Paquy	7.00	2.00	14.00	A Pagar	2025-08-01 22:28:54.296725+00	\N	\N	\N	\N	\N	\N	t
c91ddcce-33df-446e-9240-a819d5114d14	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Moca tomilho 	Derson	2.00	4.00	8.00	A Pagar	2025-08-10 17:35:45.276225+00	\N	\N	\N	\N	\N	\N	t
628e27d2-b674-4f4c-8ec3-c6dd99e6b4b4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Marquinho cebola	31.00	2.00	62.00	A Pagar	2025-08-01 22:30:06.865209+00	\N	\N	\N	\N	\N	\N	t
68406ee5-279f-4a55-81fd-7dd103066621	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Aipo	Vegetable	5.00	15.00	75.00	A Pagar	2025-08-10 17:36:00.315379+00	\N	\N	\N	\N	\N	\N	t
303b6b07-8019-4e83-ba45-634e1c7b101a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Moca alecrim	Derson	12.00	5.00	60.00	A Pagar	2025-08-17 18:24:48.873318+00	\N	\N	\N	\N	\N	\N	t
174fb73e-e59c-407c-9fef-8a5265ac7592	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Acelga	Lizete	30.00	1.50	45.00	A Pagar	2025-08-10 17:50:40.946864+00	\N	\N	\N	\N	\N	\N	t
b039ce4d-2193-4173-aec3-2faf91c5ad72	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Acelga	Fabiane	5.00	2.50	12.50	A Pagar	2025-08-03 19:44:45.189428+00	\N	\N	\N	\N	\N	\N	t
db58884c-3d9e-4984-b808-21c2b5934ca3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Waguinho	4.00	13.00	52.00	A Pagar	2025-08-01 22:34:42.998682+00	\N	\N	\N	\N	\N	\N	t
ae96f2e9-fcf6-4756-81a2-d8f18a099278	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Poro	Waguinho	2.00	18.00	36.00	A Pagar	2025-08-01 22:34:59.646117+00	\N	\N	\N	\N	\N	\N	t
4a161da5-950e-4964-bc39-618d2daebb58	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Gleiciel	1.00	13.00	13.00	A Pagar	2025-08-01 22:35:15.956608+00	\N	\N	\N	\N	\N	\N	t
2b6e6f0d-9efb-4749-875c-59e9e4c35417	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Agro Terê	3.00	14.00	42.00	A Pagar	2025-08-01 22:38:36.719616+00	\N	\N	\N	\N	\N	\N	t
5542d91c-961a-4d6a-88a8-4088051b759e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-01 22:38:51.485678+00	\N	\N	\N	\N	\N	\N	t
5098e8d6-0dc1-4206-a63a-659b337689e1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-01	Caixotao 	Casarão	5.00	5.00	25.00	A Pagar	2025-08-01 22:39:51.641007+00	\N	\N	\N	\N	\N	\N	t
1fbcf7d6-6db3-45ea-9471-a7a6035750dc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-01	Aipo	Caio	30.00	11.00	330.00	A Pagar	2025-08-01 22:40:16.778695+00	\N	\N	\N	\N	\N	\N	t
769d5640-6369-4a55-885e-f59e08d285cb	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-08	Mostarda 	Folhas da serra 	290.00	0.60	174.00	A Pagar	2025-08-11 12:07:22.250572+00	\N	\N	\N	\N	\N	\N	t
3c7288d6-4be3-4b11-ad23-5d049ef4e06e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-01	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-01 22:41:05.533028+00	\N	\N	\N	\N	\N	\N	t
3def5bef-b1ba-4278-8c94-5d0e07992b2f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-01	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-01 22:41:24.122155+00	\N	\N	\N	\N	\N	\N	t
14498095-b917-4d88-88e6-a1635d419aa5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-01	Acelga	Miguel	40.00	1.50	60.00	A Pagar	2025-08-01 22:41:42.335576+00	\N	\N	\N	\N	\N	\N	t
b55bbc70-e425-40bf-adcd-0495982427ed	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-01	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-01 22:42:09.524833+00	\N	\N	\N	\N	\N	\N	t
b3220e01-7737-4bce-a1f2-b494dd50c8d1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-08-03 19:44:58.211739+00	\N	\N	\N	\N	\N	\N	t
068d8f75-8d9d-49aa-bb89-500272ab1948	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Aipo	Rony bethel	24.00	2.00	48.00	A Pagar	2025-08-01 23:19:13.572869+00	\N	\N	\N	\N	\N	\N	t
fbec3218-6f2c-406f-96de-b0fea81b000b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-01	Acelga	Rony bethel	15.00	1.80	27.00	A Pagar	2025-08-01 23:19:28.066405+00	\N	\N	\N	\N	\N	\N	t
f988aee8-978e-455b-ace2-b6ea795b8530	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-01	Alface Americana	Neuza e Filhos	40.00	18.00	720.00	Pago	2025-08-02 00:35:31.269561+00	\N	\N	\N	\N	\N	\N	t
50d4c0e1-9edf-49ab-a7f2-e94b859ca51d	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-03	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:41:14.261271+00	\N	\N	\N	\N	\N	\N	t
2b918502-263f-4dec-8c6b-a5b549414f83	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Aipo	Rodrigo  fazenda 	10.00	8.00	80.00	A Pagar	2025-08-03 19:59:08.032405+00	\N	\N	\N	\N	\N	\N	t
4c219b3a-4148-485d-8e08-9c7892ab34ac	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-02	Alho Poro	Neuza e Filhos	10.00	20.00	200.00	Pago	2025-08-02 00:41:14.294271+00	\N	\N	\N	\N	\N	\N	t
5324a88e-a298-4dae-a137-790871044c76	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-02	Alface Roxa	Neuza e Filhos	14.00	10.00	140.00	Pago	2025-08-02 00:36:09.205637+00	\N	\N	\N	\N	\N	\N	t
b9a4ca1e-a3e0-41d1-862a-22210b56f0ea	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-04	Alface Roxa	Neuza e Filhos	20.00	10.00	200.00	Pago	2025-08-02 00:41:14.565905+00	\N	\N	\N	\N	\N	\N	t
bb597f4e-3317-41c7-b6d6-1b9dab990548	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-04	Alface Americana	Neuza e Filhos	40.00	13.00	520.00	Pago	2025-08-02 00:41:14.395172+00	\N	\N	\N	\N	\N	\N	t
dd0cc338-a1ad-4c80-8a52-84456e74892b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-11 21:19:37.99651+00	\N	\N	\N	\N	\N	\N	t
0afef08d-381d-4dd7-8db7-807fc9137f63	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-03	Alface Americana	Neuza e Filhos	30.00	13.00	390.00	Pago	2025-08-02 00:41:14.578205+00	\N	\N	\N	\N	\N	\N	t
d05b8078-69cb-461e-a525-fe9d94c66ceb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Marquinho cebola	22.00	2.00	44.00	A Pagar	2025-08-18 08:07:40.986088+00	\N	\N	\N	\N	\N	\N	t
f6e384e7-78fa-4b56-9534-22a2529f56cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Poro	Nando	12.00	13.00	156.00	A Pagar	2025-08-18 17:38:54.547288+00	\N	\N	\N	\N	\N	\N	t
489b767c-477f-4abe-96d7-1062c69a5172	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Marquinho cebola	28.00	2.00	56.00	A Pagar	2025-08-15 21:09:23.065224+00	\N	\N	\N	\N	\N	\N	t
05bafd4a-21fd-483f-8332-7c9680198b0d	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-02	Alface Americana	Neuza e Filhos	40.00	13.00	520.00	Pago	2025-08-02 00:41:14.61779+00	\N	\N	\N	\N	\N	\N	t
c1895c55-d540-42ba-bfa9-45997fc97481	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-06	Alface Americana	Neuza e Filhos	40.00	13.00	520.00	Pago	2025-08-02 00:51:29.189707+00	\N	\N	\N	\N	\N	\N	t
f387d77d-beae-4a5d-8637-fb97edf26c0b	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-05	Alface Roxa	Neuza e Filhos	20.00	10.00	200.00	Pago	2025-08-02 00:51:29.461048+00	\N	\N	\N	\N	\N	\N	t
6373d34a-395c-44b8-b53c-bb3fa29a7f05	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-05	Alface Americana	Neuza e Filhos	40.00	13.00	520.00	Pago	2025-08-02 00:51:29.474564+00	\N	\N	\N	\N	\N	\N	t
ff54fe88-b711-4842-adec-97fe471b6b18	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-05	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:51:28.911974+00	\N	\N	\N	\N	\N	\N	t
adc23a55-4465-46e6-9c54-23e1e59a8838	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-04	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:41:14.628992+00	\N	\N	\N	\N	\N	\N	t
e9ea8a4b-6171-4221-8368-65276f5eda41	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-03	Alface Roxa	Neuza e Filhos	20.00	10.00	200.00	Pago	2025-08-02 00:41:14.589222+00	\N	\N	\N	\N	\N	\N	t
d3719a54-1d3a-48e0-a082-64f31cf9f39d	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-06	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:51:29.001885+00	\N	\N	\N	\N	\N	\N	t
a4c7e281-dda5-46c9-a050-26f1e8ed1f8d	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-06	Alface Roxa	Neuza e Filhos	24.00	10.00	240.00	Pago	2025-08-02 00:51:29.512911+00	\N	\N	\N	\N	\N	\N	t
26871ba7-c616-4d33-9b99-79bfe400fd49	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-07	Alface Americana	Neuza e Filhos	20.00	13.00	260.00	Pago	2025-08-02 00:51:29.263007+00	\N	\N	\N	\N	\N	\N	t
5a0815a3-2f86-40a1-b7f2-0d45241f2fef	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-07	Alface Roxa	Neuza e Filhos	8.00	7.00	56.00	Pago	2025-08-02 00:51:29.597484+00	\N	\N	\N	\N	\N	\N	t
438194a4-820c-4b95-979e-e580edd561e8	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-07	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:51:29.204367+00	\N	\N	\N	\N	\N	\N	t
fd8a601c-4d8b-42d2-ba40-bee836c61637	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-08	Alface Roxa	Neuza e Filhos	30.00	7.00	210.00	Pago	2025-08-02 00:51:28.84897+00	\N	\N	\N	\N	\N	\N	t
52ff05bd-bd82-4c89-8db4-f946a570f35b	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-08	Alface Americana	Neuza e Filhos	40.00	13.00	520.00	Pago	2025-08-02 00:51:29.367597+00	\N	\N	\N	\N	\N	\N	t
5e7b6d68-6acd-457d-8ce9-bca064afab3a	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-08	Alho Poro	Neuza e Filhos	10.00	20.00	200.00	Pago	2025-08-02 00:51:28.998584+00	\N	\N	\N	\N	\N	\N	t
1a39ce76-5be7-4842-bbf6-1d928889bff7	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-09	Alface Americana	Neuza e Filhos	40.00	11.50	460.00	Pago	2025-08-02 00:51:29.369656+00	\N	\N	\N	\N	\N	\N	t
772909c3-77f4-4489-874a-df2c69052df6	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-10	Alface Roxa	Neuza e Filhos	10.00	7.00	70.00	Pago	2025-08-02 00:51:29.358541+00	\N	\N	\N	\N	\N	\N	t
52f53400-b17e-4cc9-bcbd-07c916ebc720	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-09	Alho Poro	Neuza e Filhos	10.00	20.00	200.00	Pago	2025-08-02 00:51:29.102726+00	\N	\N	\N	\N	\N	\N	t
c9e69116-fb7f-4202-98dd-145e73512686	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-09	Alface Crespa	Neuza e Filhos	100.00	7.50	750.00	Pago	2025-08-02 00:51:29.20406+00	\N	\N	\N	\N	\N	\N	t
2e79a3a7-af6b-40cb-ade1-55b79c474459	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-10	Alface Americana	Neuza e Filhos	30.00	11.50	345.00	Pago	2025-08-02 00:51:29.264697+00	\N	\N	\N	\N	\N	\N	t
25ae1e2c-f21c-48c7-a2f2-679a9ea4ba7b	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-10	Alface Crespa	Neuza e Filhos	60.00	6.50	390.00	Pago	2025-08-02 00:51:29.211252+00	\N	\N	\N	\N	\N	\N	t
31804630-9cd5-438e-a069-2870a994e3f1	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-10	Alface Roxa	Neuza e Filhos	14.00	7.00	98.00	Pago	2025-08-02 00:51:29.162148+00	\N	\N	\N	\N	\N	\N	t
e817c254-09b1-4184-a903-e24b057715b5	40d3bbd4-15d7-47c8-9501-564210881b96	4b447297-e546-4803-8599-e23c864bb099	venda	2025-06-09	Alface Roxa	Neuza e Filhos	24.00	7.00	168.00	Pago	2025-08-02 00:51:29.361633+00	\N	\N	\N	\N	\N	\N	t
3d6a75da-c5d3-4dc2-a923-996c1dc5db15	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-10	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:51:29.19507+00	\N	\N	\N	\N	\N	\N	t
8eb32248-56af-4665-9f32-5b8a1c200dd8	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-11	Alface Roxa	Neuza e Filhos	18.00	7.00	126.00	Pago	2025-08-02 00:51:29.197833+00	\N	\N	\N	\N	\N	\N	t
266cd82f-9aaa-462d-9d43-1119e7f21424	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-11	Alho Poro	Neuza e Filhos	5.00	20.00	100.00	Pago	2025-08-02 00:51:28.833262+00	\N	\N	\N	\N	\N	\N	t
c4589a47-2156-4a72-b6b9-3e1f3ca23f01	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-11	Alface Americana	Neuza e Filhos	30.00	11.50	345.00	Pago	2025-08-02 00:51:29.597249+00	\N	\N	\N	\N	\N	\N	t
1c37025e-24eb-4814-bf9c-9a1245acc3a5	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-12	Alface Roxa	Neuza e Filhos	18.00	7.00	126.00	Pago	2025-08-02 00:59:05.998964+00	\N	\N	\N	\N	\N	\N	t
05bc6267-a0fa-4114-9ef0-1468fd98c529	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-12	Alface Americana	Neuza e Filhos	50.00	11.50	575.00	Pago	2025-08-02 00:59:05.995252+00	\N	\N	\N	\N	\N	\N	t
69160f14-8d06-4646-a803-c0a343c73a47	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-13	Alface Americana	Neuza e Filhos	60.00	11.50	690.00	Pago	2025-08-02 00:59:06.195296+00	\N	\N	\N	\N	\N	\N	t
716f8381-370f-458a-8778-e28af090a314	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-14	Alface Americana	Neuza e Filhos	30.00	11.50	345.00	Pago	2025-08-02 00:59:06.099055+00	\N	\N	\N	\N	\N	\N	t
34506aea-e862-43b7-bdc9-cd41273b9df1	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-15	Alface Americana	Neuza e Filhos	70.00	11.50	805.00	Pago	2025-08-02 00:59:06.305229+00	\N	\N	\N	\N	\N	\N	t
a63b1d8c-8d12-4875-9219-d706ba2a782e	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-16	Alface Americana	Neuza e Filhos	20.00	11.50	230.00	Pago	2025-08-02 00:59:05.39922+00	\N	\N	\N	\N	\N	\N	t
c4b15ab3-47b7-4162-b018-1044e6960c84	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-16	Alface Americana	Neuza e Filhos	30.00	12.00	360.00	Pago	2025-08-02 00:59:05.398573+00	\N	\N	\N	\N	\N	\N	t
e87b17a1-10cc-40c7-90d0-908392ff50d3	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-17	Alface Americana	Neuza e Filhos	50.00	12.00	600.00	Pago	2025-08-02 00:59:06.196939+00	\N	\N	\N	\N	\N	\N	t
ec750d27-98b2-4982-8d77-669793970af5	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-18	Alface Roxa	Neuza e Filhos	10.00	7.00	70.00	Pago	2025-08-02 00:59:05.999302+00	\N	\N	\N	\N	\N	\N	t
62389e86-b48d-44fa-937c-39e7bd1a3df7	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-18	Alface Americana	Neuza e Filhos	40.00	12.00	480.00	Pago	2025-08-02 00:59:05.894892+00	\N	\N	\N	\N	\N	\N	t
ef0f6daf-7c1f-4130-b3d1-80edfb86ff0d	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-19	Alface Americana	Neuza e Filhos	50.00	12.00	600.00	Pago	2025-08-02 00:59:05.994795+00	\N	\N	\N	\N	\N	\N	t
66f06ee4-be17-4f75-8c83-163cb763997f	40d3bbd4-15d7-47c8-9501-564210881b96	e59fbb43-225b-45a7-9c9b-21cd453354b7	venda	2025-06-20	Alface Americana	Neuza e Filhos	60.00	12.00	720.00	Pago	2025-08-02 00:59:06.303788+00	\N	\N	\N	\N	\N	\N	t
d1061d06-a87f-45fb-a1dd-389116150d2c	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-21	Alface Americana	Neuza e Filhos	50.00	11.50	575.00	Pago	2025-08-02 00:59:06.097543+00	\N	\N	\N	\N	\N	\N	t
3bfc6df9-4134-42bf-be70-6425e7cc8e04	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-22	Alface Americana	Neuza e Filhos	50.00	11.50	575.00	Pago	2025-08-02 00:59:05.597223+00	\N	\N	\N	\N	\N	\N	t
9f3bec0e-9ce4-43d2-98f4-4f07eeaba2a4	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-23	Alface Roxa	Neuza e Filhos	10.00	7.00	70.00	Pago	2025-08-02 00:59:05.796558+00	\N	\N	\N	\N	\N	\N	t
52725373-39c0-472f-a49d-3c2a10f87d52	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-23	Alface Americana	Neuza e Filhos	80.00	11.50	920.00	Pago	2025-08-02 00:59:05.797144+00	\N	\N	\N	\N	\N	\N	t
d3f0b49a-553c-4093-8156-3c56d33d0cbd	40d3bbd4-15d7-47c8-9501-564210881b96	d7e5a640-305e-4f64-8f30-55f44597de9e	venda	2025-06-24	Alface Roxa	Neuza e Filhos	12.00	8.00	96.00	Pago	2025-08-02 00:59:06.298364+00	\N	\N	\N	\N	\N	\N	t
bb4ffb7f-c646-4b2c-bd6f-2c73b55c821a	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-24	Alface Americana	Neuza e Filhos	50.00	11.50	575.00	Pago	2025-08-02 00:59:05.801217+00	\N	\N	\N	\N	\N	\N	t
0670be60-f952-4553-afc8-f39d9645874f	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-25	Alface Americana	Neuza e Filhos	30.00	11.50	345.00	Pago	2025-08-02 00:59:05.998556+00	\N	\N	\N	\N	\N	\N	t
525da531-dfe1-4bd5-b662-3097d0f3baa5	40d3bbd4-15d7-47c8-9501-564210881b96	f2fb217c-810b-41ae-9695-d4604b9af973	venda	2025-06-26	Alface Americana	Neuza e Filhos	20.00	11.50	230.00	Pago	2025-08-02 00:59:06.197585+00	\N	\N	\N	\N	\N	\N	t
46d2bcd0-f1a2-4e21-b885-264be2e002fc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Tomilho	Fabiane	10.00	1.50	15.00	A Pagar	2025-08-03 19:45:11.372908+00	\N	\N	\N	\N	\N	\N	t
6862d52e-5a3e-4630-9033-e7419f15c5e3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-07 20:44:54.628277+00	\N	\N	\N	\N	\N	\N	t
ac55f4a9-f5da-43aa-8f20-02f605bc47ca	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Loro	BR	2.00	11.00	22.00	A Pagar	2025-08-07 20:54:30.265079+00	\N	\N	\N	\N	\N	\N	t
f7b567ca-d326-40bb-ac47-112c6b00e1e6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Aipo	Agro Terê	2.00	14.00	28.00	A Pagar	2025-08-02 21:27:21.826053+00	\N	\N	\N	\N	\N	\N	t
11c10d40-2484-4cee-9bf6-5562a93c951d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-02 21:27:34.38138+00	\N	\N	\N	\N	\N	\N	t
9b358dd6-5171-4b6d-b14a-a03780984bfd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Aipo	Acelmo	40.00	2.00	80.00	A Pagar	2025-08-02 21:27:47.059411+00	\N	\N	\N	\N	\N	\N	t
89d9b0ed-bfc8-4377-bc83-2bfc9431f30a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-08-02 21:28:05.031424+00	\N	\N	\N	\N	\N	\N	t
f06de0d6-a675-4b16-bf54-a161c1dcc4eb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Salsa crespa	Jakeline	30.00	1.20	36.00	A Pagar	2025-08-02 21:28:41.587007+00	\N	\N	\N	\N	\N	\N	t
0e10a2e7-1c04-42ee-bcab-91ee3c7b178d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Aipo	Agro costa	10.00	2.00	20.00	A Pagar	2025-08-02 21:29:32.848233+00	\N	\N	\N	\N	\N	\N	t
550e8e5d-b1de-490b-bb8a-f52695ee8300	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Aipo	Alexandre	25.00	2.00	50.00	A Pagar	2025-08-02 21:29:45.382653+00	\N	\N	\N	\N	\N	\N	t
510d693c-9839-467f-ac6a-6f3c292ca913	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-02	Alecrim	Alexandre	100.00	0.75	75.00	A Pagar	2025-08-02 21:29:58.98839+00	\N	\N	\N	\N	\N	\N	t
ca44211c-a770-42bf-8290-482663537c9a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Aipo	Caio	30.00	11.00	330.00	A Pagar	2025-08-02 21:32:50.496924+00	\N	\N	\N	\N	\N	\N	t
b64be067-95f1-4221-87b8-e98fa84b5a4a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-02 21:33:06.141801+00	\N	\N	\N	\N	\N	\N	t
65d85da0-b65e-4f00-beba-b289412dc7e4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-02 21:33:22.101971+00	\N	\N	\N	\N	\N	\N	t
4b28927a-5033-47af-8f79-7e529e860eb3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Aipo	Rodrigo  fazenda 	10.00	8.00	80.00	A Pagar	2025-08-02 21:33:40.114616+00	\N	\N	\N	\N	\N	\N	t
b37b54cf-7353-41f9-8ef9-58c6befa54a4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Salsa crespa	Lorinha	30.00	1.00	30.00	A Pagar	2025-08-02 21:34:01.949225+00	\N	\N	\N	\N	\N	\N	t
59de436d-579c-4c32-a883-ba74a6ddad4e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-02 21:34:21.399078+00	\N	\N	\N	\N	\N	\N	t
9979c420-bf49-4938-a665-2817590b72cb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-15	Aipo	Neuza e filho	70.00	2.00	140.00	A Pagar	2025-08-15 21:10:19.031618+00	\N	\N	\N	\N	\N	\N	t
0841954b-c504-4479-bbc9-8c40111397cf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Poro	Lindomar	12.00	15.00	180.00	A Pagar	2025-08-02 21:35:15.047518+00	\N	\N	\N	\N	\N	\N	t
b21b5e61-491b-424d-b929-5c2a1fb2b25d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-02 21:35:54.266615+00	\N	\N	\N	\N	\N	\N	t
360d7158-2ace-4439-a726-8832ace73a89	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Acelga	Miguel	80.00	1.50	120.00	A Pagar	2025-08-02 21:36:11.937795+00	\N	\N	\N	\N	\N	\N	t
8ec1ced7-946e-4d4c-9fc8-32fe6a6a6909	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Acelga	Lizete	50.00	1.50	75.00	A Pagar	2025-08-02 21:36:35.085973+00	\N	\N	\N	\N	\N	\N	t
81e0d613-71da-4e66-9be8-5ccaa548ab2c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-02	Alecrin	Weliton	30.00	1.20	36.00	A Pagar	2025-08-02 21:37:08.385271+00	\N	\N	\N	\N	\N	\N	t
1f0cf6b0-2a03-4306-b9d4-d7b359bd5095	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-06	Mostarda 	Maravilha da serra 	100.00	0.60	60.00	A Pagar	2025-08-06 23:55:53.596529+00	\N	\N	\N	\N	\N	\N	t
5da9b6b2-8349-42bd-bf20-2ce0f33456d0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Aipo	Tuyane	4.00	16.00	64.00	A Pagar	2025-08-03 19:45:35.071678+00	\N	\N	\N	\N	\N	\N	t
9c1265ae-8b8f-4939-a10c-358f7ab98985	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-08-16	Alface americana 	JFC	50.00	18.00	900.00	A Pagar	2025-08-16 04:51:53.074951+00	\N	\N	\N	\N	d07facea-949f-43ae-a43a-ada0d3980f04	Venda - JFC - 1 itens	t
e518e6a5-2f6b-4e22-9827-eec266e4194c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-16	Tomilho	Marli	40.00	1.00	40.00	A Pagar	2025-08-16 22:10:44.63053+00	\N	\N	\N	\N	\N	\N	t
8ae13f5a-977b-4a7c-9061-aceffac16aa1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-03	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-03 19:45:52.925045+00	\N	\N	\N	\N	\N	\N	t
644387d5-82ea-43d0-afc1-7061e8d2b599	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-03	Mostarda 	Rodrigo  fazenda 	20.00	0.60	12.00	A Pagar	2025-08-03 19:59:34.244372+00	\N	\N	\N	\N	\N	\N	t
9ac78042-8677-4c9c-9a00-fa8a5598b54d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-17 14:04:43.644271+00	\N	\N	\N	\N	\N	\N	t
8c1c37d0-1442-42d1-bb43-a3961085e5fe	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-17	Aipo	Derson	3.00	16.00	48.00	A Pagar	2025-08-17 18:24:49.004631+00	\N	\N	\N	\N	\N	\N	t
9b76e83e-e467-49e8-b631-6035ea6e7038	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Loro	Alessandro	20.00	10.00	200.00	A Pagar	2025-08-05 21:26:11.153032+00	\N	\N	\N	\N	\N	\N	t
819e8057-96f2-4c41-be32-9a467f3e2b45	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-05	Poro	Vegetable	5.00	20.00	100.00	A Pagar	2025-08-05 21:37:31.28033+00	\N	\N	\N	\N	\N	\N	t
5476d9f5-8fe8-4fcd-bc68-d9cb072b5144	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-05	Aipo	Rodrigo  fazenda 	10.00	8.00	80.00	A Pagar	2025-08-05 22:43:30.693289+00	\N	\N	\N	\N	\N	\N	t
b7e8b155-96d3-4c53-b369-a6b61a53b6b0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Elivelto	1.00	16.00	16.00	A Pagar	2025-08-07 20:45:26.807704+00	\N	\N	\N	\N	\N	\N	t
5aabe5c7-0972-464d-ab2e-25873f68e8dd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-07 20:45:43.691951+00	\N	\N	\N	\N	\N	\N	t
ba38dfbd-c713-401b-b5aa-93fef11b6515	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-07	Aipo	Derson	2.00	16.00	32.00	A Pagar	2025-08-07 20:54:57.734074+00	\N	\N	\N	\N	\N	\N	t
0f3283f9-451a-44bd-addc-7b19d0f970c6	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-07	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-07 21:09:09.468482+00	\N	\N	\N	\N	\N	\N	t
3f621934-4722-4b0b-96d5-037bb251710a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-08	Aipo	Acelmo	40.00	2.00	80.00	A Pagar	2025-08-09 01:23:21.43424+00	\N	\N	\N	\N	\N	\N	t
c2962a38-2084-4248-948b-e00d8e749f74	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-09	Aipo	Acelmo	60.00	2.00	120.00	A Pagar	2025-08-09 20:57:10.335427+00	\N	\N	\N	\N	\N	\N	t
829f934c-2306-4afb-a428-491664d5cab2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Loro	Vica	40.00	1.00	40.00	A Pagar	2025-08-10 17:23:55.900267+00	\N	\N	\N	\N	\N	\N	t
b4c310c3-b392-42af-8be8-c93051a4557a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-10	Acelga	Vegetable	135.00	2.00	270.00	A Pagar	2025-08-10 17:36:12.268122+00	\N	\N	\N	\N	\N	\N	t
73b0e454-f1e0-4d62-b4ed-221aaf4ede52	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-10	Acelga	Getulin	50.00	1.50	75.00	A Pagar	2025-08-10 17:51:00.186077+00	\N	\N	\N	\N	\N	\N	t
ee1c7642-3f3b-45e5-87bd-2290097b38df	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-09	Mostarda 	Folhas da serra 	200.00	0.60	120.00	A Pagar	2025-08-11 12:07:47.776451+00	\N	\N	\N	\N	\N	\N	t
d94ddcdf-56bb-4f6b-b0dd-0c3155335e5b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-11	Alecrin	Marli	30.00	1.20	36.00	A Pagar	2025-08-11 21:19:51.993149+00	\N	\N	\N	\N	\N	\N	t
c554b428-6072-4897-a4da-f3056c051eb6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Waguinho	4.00	13.00	52.00	A Pagar	2025-08-12 21:29:15.647321+00	\N	\N	\N	\N	\N	\N	t
71936081-efbf-4e38-bb05-54a63c0039c6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-12	Aipo	Acelmo	60.00	2.00	120.00	A Pagar	2025-08-12 21:40:13.696111+00	\N	\N	\N	\N	\N	\N	t
a124091d-2471-480c-ac67-e7bbd6694c78	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-18	Mostarda 	Queiroz e guarilha 	300.00	0.50	150.00	A Pagar	2025-08-18 12:40:03.116763+00	\N	\N	\N	\N	\N	\N	t
c81098d6-a753-4d61-980f-3bcdca662ef9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-19 19:54:37.372266+00	\N	\N	\N	\N	\N	\N	t
05a66f05-d5eb-4b7d-b1a4-dd87b2cd5fc4	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-14	Mostarda 	Vinicius Vila 	30.00	0.60	18.00	A Pagar	2025-08-14 18:21:28.829194+00	\N	\N	\N	\N	\N	\N	t
8e031f2b-8b3c-454d-a4f9-b69d04bdc8f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-14	Tomilho	Fabiane	5.00	1.50	7.50	A Pagar	2025-08-14 19:27:40.341878+00	\N	\N	\N	\N	\N	\N	t
01fae682-55f2-4b72-a347-27a7ed47e402	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-18	Alecrim	Weliton	30.00	1.20	36.00	A Pagar	2025-08-18 17:39:06.73579+00	\N	\N	\N	\N	\N	\N	t
635fdeaf-fecb-43cc-8c76-cf4cc426b19d	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-18	Mostarda 	Sandro	100.00	0.80	80.00	A Pagar	2025-08-18 23:01:08.850594+00	\N	\N	\N	\N	\N	\N	t
9a1bb81b-2f1c-4817-b70a-90057317d5df	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-19	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-19 12:49:26.189543+00	\N	\N	\N	\N	\N	\N	t
ed52060f-346c-4304-a4fb-28fbf88121e3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-19	Mostarda	Pingo 	20.00	0.60	12.00	A Pagar	2025-08-19 18:33:40.668862+00	\N	\N	\N	\N	\N	\N	t
d99f338e-53fb-4314-bd8f-7871c61fcc1b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-19 19:59:56.923346+00	\N	\N	\N	\N	\N	\N	t
0095427a-ab0a-4b4d-a2b9-2e92678d44bd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-19	Loro	Derson	8.00	10.00	80.00	A Pagar	2025-08-19 20:03:46.09529+00	\N	\N	\N	\N	\N	\N	t
31ac6b76-fe7c-40b2-93c2-f9422b1fdd47	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	18526a3b-e7a3-4375-b574-b278afb83c2b	venda	2025-08-19	tomate 	Abc	10.00	50.00	500.00	A Pagar	2025-08-19 22:24:22.762127+00	\N	\N	\N	\N	\N	\N	t
bc207bef-0321-40fb-9591-f44ce895cfc2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-20	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-20 15:20:46.945229+00	\N	\N	\N	\N	\N	\N	t
d42a45b0-a7d4-4449-8a31-51217e1f6bbf	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Brocolis americano 	2 irmão 	250.00	2.30	575.00	A Pagar	2025-08-21 15:03:40.242179+00	\N	\N	\N	\N	\N	\N	t
4e2b1531-e9ba-49a2-a453-9b0ee65adbb4	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Mostarda 	Folhas da serra 	150.00	0.60	90.00	A Pagar	2025-08-21 15:03:40.509107+00	\N	\N	\N	\N	\N	\N	t
35643308-cf6f-447e-a5eb-99067512cbec	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Mostarda 	Agro Costa 	20.00	0.50	10.00	A Pagar	2025-08-21 15:03:40.794049+00	\N	\N	\N	\N	\N	\N	t
453ba952-b5a4-42ae-839d-e83e77d1c6f7	091e21fb-4715-4fe8-b006-36e88642b0b2	70a1935a-4376-4da6-ac8e-00607fa80067	venda	2025-08-21	Brocolis americano 	Sitio esperança 	200.00	2.50	500.00	A Pagar	2025-08-21 15:03:41.068243+00	\N	\N	\N	\N	\N	\N	t
0ae67060-1343-4da2-9859-0262f63f7b4b	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	32d3530b-5fa3-4af9-8d6a-ea8f2119986e	venda	2025-08-21	Couve flor 	Dirceu 	100.00	12.00	1200.00	A Pagar	2025-08-21 16:38:34.745167+00	\N	\N	\N	\N	\N	\N	t
fc4e20ba-c625-4db6-b25e-bd1511b5fb1a	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	32d3530b-5fa3-4af9-8d6a-ea8f2119986e	venda	2025-08-17	Couve flor 	Dirceu 	100.00	12.00	1200.00	A Pagar	2025-08-21 16:32:25.899031+00	\N	\N	\N	\N	\N	\N	t
50940de4-33d3-427a-b581-0d6932706373	f17597af-3441-42a2-b6f4-1d3f03475662	efa10599-ddb3-40fc-a29e-b3d90085cafc	venda	2025-08-21	Adubo	JFC	1538.00	21.00	32298.00	A Pagar	2025-08-21 18:38:47.27933+00	\N	\N	\N	\N	\N	\N	t
fe78e89e-c478-4be3-9fb1-3dc2a425f281	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Guarilha	6.00	12.00	72.00	A Pagar	2025-08-21 20:03:45.563497+00	\N	\N	\N	\N	\N	\N	t
3b42fe57-8534-4743-9063-f7287cf34989	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Felipe tunin	30.00	15.00	450.00	A Pagar	2025-08-21 20:03:58.884783+00	\N	\N	\N	\N	\N	\N	t
061b3cff-69ae-4d1b-8ba1-05377bc93436	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Moca alecrim	Fabio	10.00	4.00	40.00	A Pagar	2025-08-21 20:04:15.055419+00	\N	\N	\N	\N	\N	\N	t
1f1c870d-c534-4ee7-a950-e8c6f9496a1c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Loro	Fabio	10.00	10.00	100.00	A Pagar	2025-08-21 20:05:07.395965+00	\N	\N	\N	\N	\N	\N	t
2aed9c39-baf6-48d1-b4d4-e633ca12684c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Wanderson v l	50.00	1.50	75.00	A Pagar	2025-08-21 20:05:07.396571+00	\N	\N	\N	\N	\N	\N	t
b3ba9219-0b8e-4905-947e-da9d0f4f6f68	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Tomilho	Wanderson v l	10.00	1.50	15.00	A Pagar	2025-08-21 20:05:19.941889+00	\N	\N	\N	\N	\N	\N	t
ed23cc30-e9b4-4ec4-85f3-4d1bda442b9a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Bibi	100.00	1.70	170.00	A Pagar	2025-08-21 20:05:32.981709+00	\N	\N	\N	\N	\N	\N	t
54c82f61-2769-4451-bd90-e2ec77b9bfe7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Elivelto	1.00	16.00	16.00	A Pagar	2025-08-21 20:05:46.814029+00	\N	\N	\N	\N	\N	\N	t
0e1562ab-ed7b-4c51-b3a3-16a7eeb070de	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Dijalma	30.00	1.70	51.00	A Pagar	2025-08-21 20:06:13.732414+00	\N	\N	\N	\N	\N	\N	t
2c460157-b1f1-45b4-8715-4cbb979f71a2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Multi folhas	5.00	16.00	80.00	A Pagar	2025-08-21 20:06:58.767503+00	\N	\N	\N	\N	\N	\N	t
c3d66a65-29f4-4f9a-893a-fe7a8a431134	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Multi folhas	60.00	1.70	102.00	A Pagar	2025-08-21 20:07:23.032109+00	\N	\N	\N	\N	\N	\N	t
17beceb5-b0a6-492f-9f54-debd297906f0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Acelga	Multi folhas	130.00	2.00	260.00	A Pagar	2025-08-21 20:07:35.650463+00	\N	\N	\N	\N	\N	\N	t
a9f1b661-efe4-4971-88df-c29f93020f98	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alface crespa	Multi folhas	11.00	12.00	132.00	A Pagar	2025-08-21 20:07:47.607206+00	\N	\N	\N	\N	\N	\N	t
a9035370-a7a1-4bca-bd7c-8e4f0593cd15	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Acelga	Rodrigo  água quente 	50.00	2.00	100.00	A Pagar	2025-08-21 20:08:02.787657+00	\N	\N	\N	\N	\N	\N	t
6ddf6219-4bed-4337-8b66-743a9394126f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Vica	60.00	1.00	60.00	A Pagar	2025-08-21 20:08:46.137719+00	\N	\N	\N	\N	\N	\N	t
56905d39-ec63-4326-937f-56383401fd31	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Loro	Vica	20.00	1.00	20.00	A Pagar	2025-08-21 20:09:10.92755+00	\N	\N	\N	\N	\N	\N	t
838a0d7b-610f-4d38-a1d9-d76f27c060c3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Mangericao pequeno 	Dudu vica	50.00	1.30	65.00	A Pagar	2025-08-21 20:09:25.203827+00	\N	\N	\N	\N	\N	\N	t
19590fbc-c84e-4181-a580-734b4ad1d708	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Fresh folhas	1.00	16.00	16.00	A Pagar	2025-08-21 20:09:37.685368+00	\N	\N	\N	\N	\N	\N	t
9996c2e0-5a3b-4da2-a3f9-9b6fa84c6ee2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Loro	Alessandro	17.00	10.00	170.00	A Pagar	2025-08-21 20:09:53.846578+00	\N	\N	\N	\N	\N	\N	t
391b078c-dc2e-40d3-9dfe-f11c5eeac1bf	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Moca alecrim	Greide	20.00	5.00	100.00	A Pagar	2025-08-21 20:10:08.433702+00	\N	\N	\N	\N	\N	\N	t
12a08bdd-953b-49f1-8dfa-2d20887f6094	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Loro	Greide	20.00	10.00	200.00	A Pagar	2025-08-21 20:10:20.359504+00	\N	\N	\N	\N	\N	\N	t
935dfb3f-8373-49d9-b3a2-4123a5a31cf1	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Mangericao pequeno 	Greide	20.00	1.30	26.00	A Pagar	2025-08-21 20:10:38.774307+00	\N	\N	\N	\N	\N	\N	t
9120fc23-9a0c-4f99-93ba-e2a8b781f634	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Coentro	Greide	10.00	4.00	40.00	A Pagar	2025-08-21 20:10:52.585564+00	\N	\N	\N	\N	\N	\N	t
8c00928d-6ac4-466c-98c5-ef7accefd4dc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Aroldo	10.00	14.00	140.00	A Pagar	2025-08-21 20:11:19.4157+00	\N	\N	\N	\N	\N	\N	t
9b4558ae-f86d-4803-bcca-38f19ee2de18	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Aroldo	30.00	1.70	51.00	A Pagar	2025-08-21 20:11:29.380656+00	\N	\N	\N	\N	\N	\N	t
a155d3ff-1643-4e83-8c43-0719c77176a4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Lucas	20.00	1.70	34.00	A Pagar	2025-08-21 20:11:41.783286+00	\N	\N	\N	\N	\N	\N	t
ab47dba4-1fe8-42cd-b1bc-bb4ab38d22c4	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Geovane	7.00	14.00	98.00	A Pagar	2025-08-21 20:11:53.906461+00	\N	\N	\N	\N	\N	\N	t
f9d758e9-b7c0-487f-989f-c00a18f8ff32	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Acelga	Geovane	20.00	2.00	40.00	A Pagar	2025-08-21 20:12:32.526252+00	\N	\N	\N	\N	\N	\N	t
aef483a3-8ee4-4e53-85ed-8d86809e7781	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Fabiane	1.00	16.00	16.00	A Pagar	2025-08-21 20:12:48.13346+00	\N	\N	\N	\N	\N	\N	t
4533c4fb-155b-4b6d-8f0d-2f4883e3d192	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Acelga	Fabiane	3.00	2.50	7.50	A Pagar	2025-08-21 20:12:58.753669+00	\N	\N	\N	\N	\N	\N	t
5e699c2e-3989-45ad-a4ff-83a938d92d3e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Fabiane	10.00	1.70	17.00	A Pagar	2025-08-21 20:13:11.108135+00	\N	\N	\N	\N	\N	\N	t
a278ad41-513a-44dd-a89b-bf68a6e56e9f	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Tuyane	6.00	16.00	96.00	A Pagar	2025-08-21 20:16:17.288448+00	\N	\N	\N	\N	\N	\N	t
61d70ce5-fa8b-4239-a7e6-d182c2d3b117	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Tuyane	20.00	1.70	34.00	A Pagar	2025-08-21 20:16:31.614091+00	\N	\N	\N	\N	\N	\N	t
d45edb06-d569-4ccb-ae71-79b6835d78c7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Tomilho	Tuyane	20.00	1.60	32.00	A Pagar	2025-08-21 20:16:44.437979+00	\N	\N	\N	\N	\N	\N	t
94723c6a-05c6-4159-aa56-3b16db6f4a4d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Mangericão	Tuyane	20.00	1.50	30.00	A Pagar	2025-08-21 20:17:55.81323+00	\N	\N	\N	\N	\N	\N	t
9a9d97cd-91e2-4be1-bb5b-0af5edd244f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Mostarda	Tuyane	30.00	0.90	27.00	A Pagar	2025-08-21 20:18:11.631668+00	\N	\N	\N	\N	\N	\N	t
a4a56379-a2bd-40bc-a207-d021bc6ab5df	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Almeirão	Tuyane	10.00	1.30	13.00	A Pagar	2025-08-21 20:18:27.600224+00	\N	\N	\N	\N	\N	\N	t
fe7d79c4-280a-4226-88d2-f27f7a8c0803	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Derson	3.00	16.00	48.00	A Pagar	2025-08-21 20:20:42.625908+00	\N	\N	\N	\N	\N	\N	t
4fc15550-4bc5-4e52-945b-dafdb0694425	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Moca alecrim	Derson	12.00	5.00	60.00	A Pagar	2025-08-21 20:20:54.798456+00	\N	\N	\N	\N	\N	\N	t
0803d78b-a8f7-4b46-b33c-2ac9ca2d4986	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Poro	Derson	13.00	18.00	234.00	A Pagar	2025-08-21 20:21:06.565165+00	\N	\N	\N	\N	\N	\N	t
236f16d0-2bef-44c1-801e-f50193d92b73	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Loro	Derson	10.00	10.00	100.00	A Pagar	2025-08-21 20:21:18.096156+00	\N	\N	\N	\N	\N	\N	t
f3893b24-0675-4d57-8cfb-a8233afc8d5b	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Moca tomilho 	Derson	2.00	4.00	8.00	A Pagar	2025-08-21 20:21:29.306863+00	\N	\N	\N	\N	\N	\N	t
42d2a363-dd55-4618-8a16-f79de8824ba2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Agro Terê	1.00	14.00	14.00	A Pagar	2025-08-21 20:21:44.80153+00	\N	\N	\N	\N	\N	\N	t
c2a2aa93-53d5-4056-98cc-4852d72a9a9e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Acelga	Agro Terê	4.00	2.00	8.00	A Pagar	2025-08-21 20:21:53.399223+00	\N	\N	\N	\N	\N	\N	t
0b272830-e454-4af4-95a3-4819db7b68c5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Vegetable	15.00	15.00	225.00	A Pagar	2025-08-21 20:22:06.598137+00	\N	\N	\N	\N	\N	\N	t
b87f35b3-86dc-4056-917b-a4f5336c39f6	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Acelga	Vegetable	130.00	2.00	260.00	A Pagar	2025-08-21 20:22:18.227162+00	\N	\N	\N	\N	\N	\N	t
f9f85bf5-0854-4116-a50e-4d83436cbfdd	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Fernando Amorim 	1.00	16.00	16.00	A Pagar	2025-08-21 20:22:50.607051+00	\N	\N	\N	\N	\N	\N	t
597873bc-f95b-4987-8106-ecfdbedde35e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	BR	30.00	1.70	51.00	A Pagar	2025-08-21 20:23:07.200201+00	\N	\N	\N	\N	\N	\N	t
6d50782f-583d-4332-b268-2be4add77bd9	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Loro	BR	2.00	11.00	22.00	A Pagar	2025-08-21 20:23:19.14203+00	\N	\N	\N	\N	\N	\N	t
f9d38bfb-831e-4775-be7d-d63dceeb6d38	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	BR	2.00	16.00	32.00	A Pagar	2025-08-21 20:23:29.711767+00	\N	\N	\N	\N	\N	\N	t
64cca809-f258-48ff-bf25-1508ec3cdf08	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Acelmo	60.00	2.00	120.00	A Pagar	2025-08-21 20:24:18.700031+00	\N	\N	\N	\N	\N	\N	t
e9463f3c-1879-4838-b393-4c70c22b3446	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Jakeline	3.00	24.00	72.00	A Pagar	2025-08-21 20:24:29.682661+00	\N	\N	\N	\N	\N	\N	t
4168d4fa-67e4-4723-bccc-8b2c19820be5	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Salsa crespa	Jakeline	20.00	1.20	24.00	A Pagar	2025-08-21 20:24:41.54772+00	\N	\N	\N	\N	\N	\N	t
246dc0ae-9c12-4d46-8484-db87e66775bc	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Neuza e filho	80.00	2.00	160.00	A Pagar	2025-08-21 20:24:54.016775+00	\N	\N	\N	\N	\N	\N	t
2bb6660e-e60e-4b1c-b04a-7552005c2028	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Hortifruti	90.00	2.20	198.00	A Pagar	2025-08-21 20:25:27.400783+00	\N	\N	\N	\N	\N	\N	t
f7d5a210-b6cd-4da9-ae80-009f1c10840a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Agro costa	40.00	2.00	80.00	A Pagar	2025-08-21 20:25:41.33204+00	\N	\N	\N	\N	\N	\N	t
8963385c-bf31-4c04-9fbc-d530f21875d8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Alexandre	15.00	2.00	30.00	A Pagar	2025-08-21 20:25:52.067135+00	\N	\N	\N	\N	\N	\N	t
bda6f1e6-b5e9-40fb-b480-dac832a36ced	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Alecrim	Alexandre	70.00	0.75	52.50	A Pagar	2025-08-21 20:26:07.588133+00	\N	\N	\N	\N	\N	\N	t
48499c0d-df22-4f05-a2e3-5c4f5c9f0608	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Marquinho cebola	25.00	1.90	47.50	A Pagar	2025-08-21 20:26:21.200612+00	\N	\N	\N	\N	\N	\N	t
1d389aa9-7598-4789-8817-a33fa8dbeef8	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	venda	2025-08-21	Aipo	Paquy	8.00	2.00	16.00	A Pagar	2025-08-21 20:26:32.4491+00	\N	\N	\N	\N	\N	\N	t
d3c3ce88-5fb1-4f06-b035-4a9aa2fcd81c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Aipo	Caio	40.00	11.00	440.00	A Pagar	2025-08-21 20:26:53.991881+00	\N	\N	\N	\N	\N	\N	t
283f15f3-fb51-4821-8b31-6808d62cffe2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Aipo	Gali	2.00	11.00	22.00	A Pagar	2025-08-21 20:27:06.885301+00	\N	\N	\N	\N	\N	\N	t
0b78f21e-d9fc-49ae-816b-0e9ef4f5b65d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Aipo	Vane	20.00	11.00	220.00	A Pagar	2025-08-21 20:27:16.314383+00	\N	\N	\N	\N	\N	\N	t
73502d7b-91c8-4bd5-8c40-5804d6b7be8d	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Aipo	Pai	10.00	11.00	110.00	A Pagar	2025-08-21 20:27:29.584852+00	\N	\N	\N	\N	\N	\N	t
7765d737-03eb-4b2e-9ea2-9aecfbd6164e	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Aipo	Dudu	10.00	9.00	90.00	A Pagar	2025-08-21 20:27:40.72452+00	\N	\N	\N	\N	\N	\N	t
b713e6ec-80da-45ee-af09-16a97695d1f2	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Aipo	Gilsin	10.00	9.00	90.00	A Pagar	2025-08-21 20:27:56.75534+00	\N	\N	\N	\N	\N	\N	t
2d161db7-81e3-415f-bc7c-8525bd114466	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Salsa crespa	Lorinha	20.00	1.00	20.00	A Pagar	2025-08-21 20:28:16.320872+00	\N	\N	\N	\N	\N	\N	t
0c4089fe-6fb4-4fc4-a57d-997a013a4ae7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Almeirão	Lorinha	10.00	0.80	8.00	A Pagar	2025-08-21 20:28:30.842398+00	\N	\N	\N	\N	\N	\N	t
a1b416cc-00f1-458e-b501-e45c77d2d2ea	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Mostarda	Lorinha	10.00	0.60	6.00	A Pagar	2025-08-21 20:28:44.865121+00	\N	\N	\N	\N	\N	\N	t
1e2dce0d-58cc-4960-a568-05d8661c7a1c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Mangericão	Maria 	20.00	1.50	30.00	A Pagar	2025-08-21 20:28:59.82629+00	\N	\N	\N	\N	\N	\N	t
3fb38484-afcf-431b-90e5-2d6c2a7f3325	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Mangericao pequeno 	Maria 	70.00	0.80	56.00	A Pagar	2025-08-21 20:29:16.998835+00	\N	\N	\N	\N	\N	\N	t
93e61e10-e8a1-417e-b746-342bf9d50683	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Caixotao 	Casarão	5.00	5.00	25.00	A Pagar	2025-08-21 20:29:29.662327+00	\N	\N	\N	\N	\N	\N	t
7d2e762f-4dcf-4f09-8165-33f1783d4b4c	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Acelga	Eloilso	30.00	1.50	45.00	A Pagar	2025-08-21 20:29:44.809227+00	\N	\N	\N	\N	\N	\N	t
1f4626c8-e635-440a-b843-6d9830358eb3	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Poro	Nando	1.00	13.00	13.00	A Pagar	2025-08-21 20:29:58.234174+00	\N	\N	\N	\N	\N	\N	t
881afe52-ffb8-42ea-9f48-4b25ea0a1adb	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Acelga	Luciana	100.00	1.50	150.00	A Pagar	2025-08-21 20:30:13.310098+00	\N	\N	\N	\N	\N	\N	t
cad58506-dda8-46ec-9606-96aeb18d0664	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Alecrim	Weliton	30.00	1.20	36.00	A Pagar	2025-08-21 20:30:27.343418+00	\N	\N	\N	\N	\N	\N	t
0f98ff40-2734-4023-aa10-3dc0b69ebcf0	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Alecrim	Ozia	50.00	1.20	60.00	A Pagar	2025-08-21 20:30:42.53826+00	\N	\N	\N	\N	\N	\N	t
8236016d-ef9a-44b2-9c0c-0254bf5ee60a	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Moca alecrim	Ozia	20.00	3.00	60.00	A Pagar	2025-08-21 20:31:00.170476+00	\N	\N	\N	\N	\N	\N	t
6781338c-400a-4401-a949-c55d99ee30ee	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Moca alecrim	Adriano	20.00	3.00	60.00	A Pagar	2025-08-21 20:31:11.677949+00	\N	\N	\N	\N	\N	\N	t
4f2137fc-1348-49e9-8f00-7dd78b9bed12	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Coentro	Rodrigo  fazenda 	10.00	3.00	30.00	A Pagar	2025-08-21 20:31:39.623529+00	\N	\N	\N	\N	\N	\N	t
cdcd7ac2-461d-4547-a071-183df989cab7	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Mostarda	Pingo 	20.00	0.60	12.00	A Pagar	2025-08-21 20:31:56.92988+00	\N	\N	\N	\N	\N	\N	t
a92c7e4f-f6bc-4610-8fd5-a683db2da360	198f888a-1376-4228-906a-5c45af912633	5b0caf6d-3c8a-481d-aa88-aa8e68fc141d	gasto	2025-08-21	Alecrim	Ivanete 	100.00	1.20	120.00	A Pagar	2025-08-21 20:32:13.598211+00	\N	\N	\N	\N	\N	\N	t
\.


--
-- Data for Name: user_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_messages (id, sender_id, recipient_id, subject, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: user_online_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_online_status (client_id, last_activity, created_at, updated_at) FROM stdin;
b53f72c4-7bdc-457e-89a4-1a636b132608	2025-08-21 21:04:23.395745	2025-08-21 21:02:33.01694	2025-08-21 21:04:23.395745
3c20d11f-7278-42c2-aae1-ee59d8e7a6da	2025-08-21 16:44:31.692231	2025-08-21 16:29:13.596258	2025-08-21 16:44:31.692231
091e21fb-4715-4fe8-b006-36e88642b0b2	2025-08-21 15:03:47.109215	2025-08-21 15:01:16.839253	2025-08-21 15:03:47.109215
f17597af-3441-42a2-b6f4-1d3f03475662	2025-08-21 21:55:32.2548	2025-08-21 16:33:32.236668	2025-08-21 21:55:32.2548
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, client_id, email, password_hash, role, created_at, password_reset_token, password_reset_expires, client_type, license_expires_at, max_clients, max_transactions, is_premium, last_login, company_name, ativo, codigo, pix, website, contact_phone, address, logo_url, updated_at) FROM stdin;
3ac10e27-34a9-483b-ab76-bf2a0b0acabd	f2e1b562-db8e-4db4-ac39-6749cf5fea40	jessicapinheiro020301@yahoo.com	$2a$10$lU25Lbi9usQr8Gu/gITYe.qD0CdhTtE1wUhSY490XrUGdIvGQztGK	funcionario	2025-07-26 15:28:41.888013+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
47608086-4ffe-4234-a87c-7154b4a8e803	\N	contato.arksistemas@gmail.com	$2a$10$NKq/vm0EsCazj1ZTA7nW5OYxoQS7HbcKLs.eaEcwVqGql/qaI1OEO	admin	2025-07-24 17:45:37.90635+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
ae29aa55-3032-4dc9-99d3-8ca0801d7275	40d3bbd4-15d7-47c8-9501-564210881b96	jorge_winicius@hotmail.com	$2a$10$.jsfGlaGewc8sGgUh2oSiOmX4WUn7wWqsURvDXldc2J9qt7ba7YDy	funcionario	2025-07-26 16:07:43.320591+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
1257cadd-d214-425d-b8bc-aba90421fb3f	b53f72c4-7bdc-457e-89a4-1a636b132608	rodolfomooreira456@gmail.com	$2a$10$Yj2URH/YlNpD9KQDuTUArOtjjYMtSspfEHeQ1AajUm3T0HNRw8COK	funcionario	2025-07-26 16:03:53.010955+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
e9e488a8-ec44-468a-90c1-8eeb9e4a5816	f17597af-3441-42a2-b6f4-1d3f03475662	rodrigomramos18@gmail.com	$2a$10$05fWd9HkcSqkwctkHC7NieKQgGXoosJLteKD4gwqw48.haDf4WSh6	funcionario	2025-07-27 18:23:24.259855+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
ee9f561f-e2fa-4cbe-ab56-53a74a3c36b3	198f888a-1376-4228-906a-5c45af912633	renatoveigaf3@gmail.com	$2a$10$TvECmKSd5O9UAom7FMJh/O0DEI9LkjPjZgHJ6wfbdckVBeZIurE5G	funcionario	2025-07-26 16:11:46.862485+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
124e5cd0-6b50-4e72-89c2-3d3f5943bf39	091e21fb-4715-4fe8-b006-36e88642b0b2	Jpedronf1002@gmail.com	$2a$10$FYCNP.E9ijmfjYX27z2M7.5lIqoQGxvvu0E99E7D8lkYS2Yoc50PS	funcionario	2025-08-06 23:22:21.203085+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
34acfd82-a2e3-423f-b047-624d013e3e74	73c0e18c-5d3a-47a4-a83c-af5ad2a40ba8	agromatoslegumes@hotmail.com	$2a$10$GeFsW1IlTQjGgjHE/buSc.VXZFq83iGxIj6cfXfTdWqgtUDbsu22K	funcionario	2025-08-09 15:11:54.816677+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 03:35:57.006847
04035fda-071c-4ae8-b152-97851d5ca367	923e9d14-e622-4a0d-aea2-56cb21d80096	rodrigomramos18@hotmail.com	$2a$10$BbSH/VMb9uhMSAz.de/YoOM/vieNB/KNKJeF4Id8ShazPeFNK505e	funcionario	2025-08-16 04:02:45.456762+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-16 04:02:45.456762
bf3ec5ba-9413-4c17-b173-501db4da9f1c	120a5304-54be-4290-b0cc-ed1de8d3b16b	teste01@gmail.com	$2a$10$8heLIcE7nQnVnHnkEPPr3exqgMu6rg8aN6HKmYA7Jckk1AGy7XTy6	funcionario	2025-08-20 01:25:41.154247+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-20 01:25:41.154247
ebc367d4-590c-4d20-bec2-bee3b1b0b351	3c20d11f-7278-42c2-aae1-ee59d8e7a6da	paloma.sds18@gmail.com	$2a$10$EaqGtAhaWjYqMPfB7HJkXO4/KknFTvAI.xTBi2hJhwGmPfXrLBOMi	funcionario	2025-08-21 16:28:35.050427+00	\N	\N	produtor	\N	100	1000	f	\N	\N	t	\N	\N	\N	\N	\N	\N	2025-08-21 16:28:35.050427
\.


--
-- Data for Name: vendedores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendedores (id, client_id, name, comissao_percentual, ativo, is_active, hire_date, notes, codigo, website, commission_rate, porcentagem, pix, endereco, telefone) FROM stdin;
a9b2d095-ab80-43fe-9cf1-8bc6e0f8c4af	\N	Barbara	0.00	t	t	\N	\N	\N	\N	0.00	10.00			
\.


--
-- Data for Name: withdrawals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.withdrawals (id, partner_id, amount, withdrawal_date, notes, created_at) FROM stdin;
\.


--
-- Name: admin_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_notifications_id_seq', 2, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.backups_id_seq', 1, false);


--
-- Name: comissoes_vendedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comissoes_vendedores_id_seq', 1, false);


--
-- Name: dismissed_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dismissed_notifications_id_seq', 15, true);


--
-- Name: email_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_templates_id_seq', 1, false);


--
-- Name: estoque_feira_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estoque_feira_id_seq', 1, false);


--
-- Name: feira_favoritos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.feira_favoritos_id_seq', 1, false);


--
-- Name: feira_produtos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.feira_produtos_id_seq', 10, true);


--
-- Name: import_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.import_logs_id_seq', 1, false);


--
-- Name: itens_nota_fiscal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.itens_nota_fiscal_id_seq', 1, false);


--
-- Name: itens_pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.itens_pedido_id_seq', 1, false);


--
-- Name: license_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.license_payments_id_seq', 1, false);


--
-- Name: licenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.licenses_id_seq', 1, false);


--
-- Name: notas_fiscais_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notas_fiscais_id_seq', 1, false);


--
-- Name: pagamentos_comissoes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pagamentos_comissoes_id_seq', 1, false);


--
-- Name: pedido_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pedido_items_id_seq', 1, false);


--
-- Name: pedidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pedidos_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 1, false);


--
-- Name: produtos_feira_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.produtos_feira_id_seq', 1, false);


--
-- Name: produtos_vitrine_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.produtos_vitrine_id_seq', 1, false);


--
-- Name: report_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.report_templates_id_seq', 1, false);


--
-- Name: system_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_notifications_id_seq', 1, false);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 1, false);


--
-- Name: user_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_messages_id_seq', 1, false);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: clients clients_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_cnpj_key UNIQUE (cnpj);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: comissoes comissoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes
    ADD CONSTRAINT comissoes_pkey PRIMARY KEY (id);


--
-- Name: comissoes_vendedores comissoes_vendedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes_vendedores
    ADD CONSTRAINT comissoes_vendedores_pkey PRIMARY KEY (id);


--
-- Name: dismissed_notifications dismissed_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_pkey PRIMARY KEY (id);


--
-- Name: dismissed_notifications dismissed_notifications_user_id_notification_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_user_id_notification_id_key UNIQUE (user_id, notification_id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: employees employees_client_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_client_id_name_key UNIQUE (client_id, name);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: estoque_feira estoque_feira_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_feira
    ADD CONSTRAINT estoque_feira_pkey PRIMARY KEY (id);


--
-- Name: feira_favoritos feira_favoritos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_favoritos
    ADD CONSTRAINT feira_favoritos_pkey PRIMARY KEY (id);


--
-- Name: feira_favoritos feira_favoritos_user_id_produto_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_favoritos
    ADD CONSTRAINT feira_favoritos_user_id_produto_id_key UNIQUE (user_id, produto_id);


--
-- Name: feira_produtos feira_produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_produtos
    ADD CONSTRAINT feira_produtos_pkey PRIMARY KEY (id);


--
-- Name: import_logs import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_pkey PRIMARY KEY (id);


--
-- Name: items items_client_id_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_client_id_type_name_key UNIQUE (client_id, type, name);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: itens_nota_fiscal itens_nota_fiscal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_nota_fiscal
    ADD CONSTRAINT itens_nota_fiscal_pkey PRIMARY KEY (id);


--
-- Name: itens_pedido itens_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido
    ADD CONSTRAINT itens_pedido_pkey PRIMARY KEY (id);


--
-- Name: license_payments license_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_payments
    ADD CONSTRAINT license_payments_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_license_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_license_key_key UNIQUE (license_key);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: notas_fiscais notas_fiscais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_pkey PRIMARY KEY (id);


--
-- Name: pagamentos_comissoes pagamentos_comissoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos_comissoes
    ADD CONSTRAINT pagamentos_comissoes_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: payment_vendors payment_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vendors
    ADD CONSTRAINT payment_vendors_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pedido_items pedido_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: produtos_feira produtos_feira_client_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_feira
    ADD CONSTRAINT produtos_feira_client_id_codigo_key UNIQUE (client_id, codigo);


--
-- Name: produtos_feira produtos_feira_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_feira
    ADD CONSTRAINT produtos_feira_pkey PRIMARY KEY (id);


--
-- Name: produtos_vitrine produtos_vitrine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_vitrine
    ADD CONSTRAINT produtos_vitrine_pkey PRIMARY KEY (id);


--
-- Name: registration_tokens registration_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT registration_tokens_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: system_notifications system_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_messages user_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_messages
    ADD CONSTRAINT user_messages_pkey PRIMARY KEY (id);


--
-- Name: user_online_status user_online_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_online_status
    ADD CONSTRAINT user_online_status_pkey PRIMARY KEY (client_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendedores vendedores_client_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_client_id_name_key UNIQUE (client_id, name);


--
-- Name: vendedores vendedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications USING btree (created_at DESC);


--
-- Name: idx_admin_notifications_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_target ON public.admin_notifications USING btree (target_audience);


--
-- Name: idx_admin_notifications_target_audience; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_target_audience ON public.admin_notifications USING btree (target_audience);


--
-- Name: idx_attachments_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_transaction_id ON public.attachments USING btree (transaction_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_clients_client_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_client_type ON public.clients USING btree (client_type);


--
-- Name: idx_dismissed_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dismissed_notifications_user_id ON public.dismissed_notifications USING btree (user_id);


--
-- Name: idx_employees_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_client_id ON public.employees USING btree (client_id);


--
-- Name: idx_feira_favoritos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feira_favoritos_user_id ON public.feira_favoritos USING btree (user_id);


--
-- Name: idx_feira_produtos_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feira_produtos_categoria ON public.feira_produtos USING btree (categoria);


--
-- Name: idx_feira_produtos_disponivel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feira_produtos_disponivel ON public.feira_produtos USING btree (disponivel);


--
-- Name: idx_feira_produtos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feira_produtos_user_id ON public.feira_produtos USING btree (user_id);


--
-- Name: idx_items_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_ativo ON public.items USING btree (ativo);


--
-- Name: idx_items_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_client_id ON public.items USING btree (client_id);


--
-- Name: idx_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_type ON public.items USING btree (type);


--
-- Name: idx_licenses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licenses_user_id ON public.licenses USING btree (user_id);


--
-- Name: idx_notas_fiscais_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_fiscais_client_id ON public.notas_fiscais USING btree (client_id);


--
-- Name: idx_notas_fiscais_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notas_fiscais_user_id ON public.notas_fiscais USING btree (user_id);


--
-- Name: idx_payment_vendors_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vendors_payment_id ON public.payment_vendors USING btree (payment_id);


--
-- Name: idx_payment_vendors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vendors_status ON public.payment_vendors USING btree (status);


--
-- Name: idx_payment_vendors_vendedor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vendors_vendedor_id ON public.payment_vendors USING btree (vendedor_id);


--
-- Name: idx_pedido_items_pedido_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedido_items_pedido_id ON public.pedido_items USING btree (pedido_id);


--
-- Name: idx_pedidos_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_client_id ON public.pedidos USING btree (client_id);


--
-- Name: idx_pedidos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_status ON public.pedidos USING btree (status);


--
-- Name: idx_pedidos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_user_id ON public.pedidos USING btree (user_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_user_id ON public.products USING btree (user_id);


--
-- Name: idx_produtos_vitrine_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produtos_vitrine_client_id ON public.produtos_vitrine USING btree (client_id);


--
-- Name: idx_system_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_notifications_user_id ON public.system_notifications USING btree (user_id);


--
-- Name: idx_transactions_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_employee_id ON public.transactions USING btree (employee_id);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_transactions_transaction_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_transaction_date ON public.transactions USING btree (transaction_date);


--
-- Name: idx_user_online_status_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_online_status_last_activity ON public.user_online_status USING btree (last_activity);


--
-- Name: idx_users_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_client_id ON public.users USING btree (client_id);


--
-- Name: idx_users_client_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_client_type ON public.users USING btree (client_type);


--
-- Name: idx_withdrawals_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_date ON public.withdrawals USING btree (withdrawal_date);


--
-- Name: idx_withdrawals_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_partner_id ON public.withdrawals USING btree (partner_id);


--
-- Name: activity_logs activity_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: admin_notifications admin_notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: attachments attachments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: attachments attachments_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: backups backups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: clients clients_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: clients clients_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE SET NULL;


--
-- Name: comissoes comissoes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes
    ADD CONSTRAINT comissoes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: comissoes comissoes_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes
    ADD CONSTRAINT comissoes_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE CASCADE;


--
-- Name: dismissed_notifications dismissed_notifications_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.admin_notifications(id);


--
-- Name: dismissed_notifications dismissed_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: email_templates email_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employees employees_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: estoque_feira estoque_feira_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_feira
    ADD CONSTRAINT estoque_feira_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: estoque_feira estoque_feira_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_feira
    ADD CONSTRAINT estoque_feira_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos_feira(id) ON DELETE CASCADE;


--
-- Name: feira_favoritos feira_favoritos_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_favoritos
    ADD CONSTRAINT feira_favoritos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.feira_produtos(id);


--
-- Name: feira_favoritos feira_favoritos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_favoritos
    ADD CONSTRAINT feira_favoritos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: feira_produtos feira_produtos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feira_produtos
    ADD CONSTRAINT feira_produtos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: import_logs import_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: items items_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: itens_nota_fiscal itens_nota_fiscal_nota_fiscal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_nota_fiscal
    ADD CONSTRAINT itens_nota_fiscal_nota_fiscal_id_fkey FOREIGN KEY (nota_fiscal_id) REFERENCES public.notas_fiscais(id) ON DELETE CASCADE;


--
-- Name: itens_pedido itens_pedido_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_pedido
    ADD CONSTRAINT itens_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: license_payments license_payments_license_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.license_payments
    ADD CONSTRAINT license_payments_license_id_fkey FOREIGN KEY (license_id) REFERENCES public.licenses(id) ON DELETE CASCADE;


--
-- Name: licenses licenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notas_fiscais notas_fiscais_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: notas_fiscais notas_fiscais_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id);


--
-- Name: notas_fiscais notas_fiscais_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_vendors payment_vendors_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vendors
    ADD CONSTRAINT payment_vendors_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payments payments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: pedido_items pedido_items_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedido_items pedido_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_items
    ADD CONSTRAINT pedido_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: pedidos pedidos_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: pedidos pedidos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pedidos pedidos_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);


--
-- Name: products products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: produtos_feira produtos_feira_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_feira
    ADD CONSTRAINT produtos_feira_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: produtos_vitrine produtos_vitrine_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos_vitrine
    ADD CONSTRAINT produtos_vitrine_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: registration_tokens registration_tokens_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_tokens
    ADD CONSTRAINT registration_tokens_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: report_templates report_templates_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: system_notifications system_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_notifications
    ADD CONSTRAINT system_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: user_messages user_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_messages
    ADD CONSTRAINT user_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: user_messages user_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_messages
    ADD CONSTRAINT user_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: user_online_status user_online_status_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_online_status
    ADD CONSTRAINT user_online_status_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: users users_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: vendedores vendedores_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: withdrawals withdrawals_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.vendedores(id) ON DELETE CASCADE;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_generate_v1() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_generate_v3(namespace uuid, name text) TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_generate_v4() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_generate_v5(namespace uuid, name text) TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_nil() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_ns_dns() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_ns_oid() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_ns_url() TO ark_pro_db_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.uuid_ns_x500() TO ark_pro_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO ark_pro_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO ark_pro_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO ark_pro_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO ark_pro_db_user;


--
-- PostgreSQL database dump complete
--

