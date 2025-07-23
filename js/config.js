// ===== CONFIGURAÇÃO GLOBAL DA APLICAÇÃO =====

// Configuração da aplicação
const APP_CONFIG = {
    name: 'Caixa Multipark',
    version: '1.0.0',
    environment: 'production',
    
    // Formatação de dados
    dateFormat: 'pt-PT',
    currency: 'EUR',
    locale: 'pt-PT',
    
    // Configurações de upload
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.xlsx', '.xls'],
    
    // Configurações de UI
    theme: 'default',
    itemsPerPage: 25,
    autoRefresh: false,
    autoRefreshInterval: 30000, // 30 segundos
    
    // Configurações de validação
    validation: {
        licensePlatePattern: /^[A-Z0-9\-]{6,12}$/i,
        priceMin: 0,
        priceMax: 999999.99
    },
    
    // Métodos de pagamento aceites
    paymentMethods: [
        'numerário',
        'multibanco', 
        'online',
        'no pay'
    ],
    
    // Status possíveis
    status: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        ERROR: 'error',
        VALIDATED: 'validated',
        INCONSISTENT: 'inconsistent',
        MISSING: 'missing'
    }
};

// Utilitários globais
const APP_UTILS = {
    // Formatar data para PT
    formatDate: (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
    },
    
    // Formatar data e hora
    formatDateTime: (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Formatar moeda
    formatCurrency: (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },
    
    // Validar matrícula
    validateLicensePlate: (plate) => {
        if (!plate) return false;
        return APP_CONFIG.validation.licensePlatePattern.test(plate.trim());
    },
    
    // Validar preço
    validatePrice: (price) => {
        const num = parseFloat(price);
        return !isNaN(num) && 
               num >= APP_CONFIG.validation.priceMin && 
               num <= APP_CONFIG.validation.priceMax;
    },
    
    // Capitalizar primeira letra
    capitalize: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    // Gerar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Verificar se ficheiro é válido
    validateFile: (file) => {
        if (!file) return { valid: false, error: 'Nenhum ficheiro selecionado' };
        
        // Verificar tamanho
        if (file.size > APP_CONFIG.maxFileSize) {
            return { 
                valid: false, 
                error: `Ficheiro muito grande. Máximo: ${(APP_CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB` 
            };
        }
        
        // Verificar extensão
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (!APP_CONFIG.allowedFileTypes.includes(extension)) {
            return { 
                valid: false, 
                error: `Tipo de ficheiro não permitido. Permitidos: ${APP_CONFIG.allowedFileTypes.join(', ')}` 
            };
        }
        
        return { valid: true };
    },
    
    // Debounce para evitar múltiplas chamadas
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Inicializar dados dinâmicos na página
document.addEventListener('DOMContentLoaded', () => {
    // Definir data atual
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        currentDateEl.textContent = APP_UTILS.formatDate(new Date());
    }
    
    // Definir título da página
    document.title = APP_CONFIG.name;
    
    console.log(`📋 ${APP_CONFIG.name} v${APP_CONFIG.version} - Configuração carregada`);
});

// Expor globalmente
window.APP_CONFIG = APP_CONFIG;
window.APP_UTILS = APP_UTILS;
