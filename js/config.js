// ===== CONFIGURAÇÃO CENTRALIZADA =====
// Configurações da aplicação Caixa Multipark

// Configuração regional
const APP_CONFIG = {
    // Localização
    locale: 'pt-PT',
    timezone: 'Europe/Lisbon',
    currency: 'EUR',
    
    // Formatação
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm:ss',
    dateTimeFormat: 'dd/MM/yyyy HH:mm:ss',
    
    // Números
    decimalSeparator: ',',
    thousandsSeparator: '.',
    currencySymbol: '€',
    
    // Aplicação
    name: 'Caixa Multipark',
    version: '1.0.0',
    
    // Limites
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRecords: 10000,
    
    // Timeouts
    requestTimeout: 30000, // 30 segundos
    retryAttempts: 3
};

// Função para obter data atual formatada
function getCurrentDate() {
    return new Date().toLocaleDateString('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Função para obter data e hora atual formatada
function getCurrentDateTime() {
    return new Date().toLocaleString('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Função para formatar valores monetários
function formatCurrency(value) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    
    return value.toLocaleString('pt-PT', {
        style: 'currency',
        currency: APP_CONFIG.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Função para formatar números
function formatNumber(value, decimals = 0) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    
    return value.toLocaleString('pt-PT', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APP_CONFIG,
        getCurrentDate,
        getCurrentDateTime,
        formatCurrency,
        formatNumber
    };
}

