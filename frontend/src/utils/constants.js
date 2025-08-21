// Constantes do sistema
export const SYSTEM_CONFIG = {
  APP_NAME: 'Sistema ARK',
  VERSION: '2.0.0',
  COMPANY: 'ARK Solutions',
  SUPPORT_EMAIL: 'suporte@arksolutions.com.br',
  SUPPORT_PHONE: '(11) 99999-9999'
};

export const TRANSACTION_TYPES = {
  VENDA: 'venda',
  GASTO: 'gasto'
};

export const TRANSACTION_STATUS = {
  PAGO: 'Pago',
  A_PAGAR: 'A Pagar',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado'
};

export const ITEM_TYPES = {
  PRODUTO: 'produto',
  COMPRA: 'compra',
  COMPRADOR: 'comprador',
  FORNECEDOR: 'fornecedor'
};

export const NOTA_FISCAL_TYPES = {
  ENTRADA: 'entrada',
  SAIDA: 'saida'
};

export const PEDIDO_TYPES = {
  VENDA: 'venda',
  COMPRA: 'compra'
};

export const KEYBOARD_SHORTCUTS = {
  SEARCH: 'Ctrl+K',
  NEW_TRANSACTION: 'Ctrl+N',
  NEW_PRODUCT: 'Ctrl+P',
  NEW_CLIENT: 'Ctrl+U',
  NEW_INVOICE: 'Ctrl+F',
  DASHBOARD: 'Ctrl+D',
  REPORTS: 'Ctrl+R',
  HELP: '? ou Ctrl+/',
  ESCAPE: 'Esc'
};

export const COLORS = {
  PRIMARY: '#4a90e2',
  SUCCESS: '#28a745',
  WARNING: '#ffc107',
  DANGER: '#dc3545',
  INFO: '#17a2b8',
  LIGHT: '#f8f9fa',
  DARK: '#343a40'
};

export const BREAKPOINTS = {
  MOBILE: '768px',
  TABLET: '992px',
  DESKTOP: '1200px'
};

export const FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
  ALL_ALLOWED: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt']
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
};

export const DATE_FORMATS = {
  BR_DATE: 'dd/MM/yyyy',
  BR_DATETIME: 'dd/MM/yyyy HH:mm',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: 'yyyy-MM-ddTHH:mm:ss'
};

export const CURRENCY_CONFIG = {
  LOCALE: 'pt-BR',
  CURRENCY: 'BRL',
  DECIMAL_PLACES: 2
};

export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_TEXT_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_SEARCH_LENGTH: 2
};

export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000
};

export const MODAL_SIZES = {
  SMALL: '400px',
  MEDIUM: '600px',
  LARGE: '800px',
  EXTRA_LARGE: '1200px'
};