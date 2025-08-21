import { toast } from 'react-toastify';

// Configuração personalizada para toasts
export const toastConfig = {
  position: "top-right",
  autoClose: 5000, // Aumentado para 5 segundos
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
};

// Funções utilitárias para toasts
export const showSuccess = (message, options = {}) => {
  toast.success(message, { ...toastConfig, ...options });
};

export const showError = (message, options = {}) => {
  toast.error(message, { ...toastConfig, autoClose: 7000, ...options });
};

export const showWarning = (message, options = {}) => {
  toast.warning(message, { ...toastConfig, ...options });
};

export const showInfo = (message, options = {}) => {
  toast.info(message, { ...toastConfig, ...options });
};

// Toast para operações de loading
export const showLoadingToast = (message) => {
  return toast.loading(message, { ...toastConfig });
};

export const updateLoadingToast = (toastId, message, type = 'success') => {
  toast.update(toastId, {
    render: message,
    type: type,
    isLoading: false,
    ...toastConfig
  });
};

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoadingToast,
  updateLoadingToast
};