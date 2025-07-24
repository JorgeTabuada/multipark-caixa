// utils.js - Utilitários corrigidos com melhor gestão de datas
console.log('🔧 Carregando utilitários corrigidos...');

// ===== CORREÇÃO: SISTEMA DE FORMATAÇÃO DE DATAS =====
window.DateUtils = {
    /**
     * CORREÇÃO: Formatar data para PostgreSQL
     */
    formatForPostgreSQL(dateValue) {
        if (!dateValue) return null;
        
        try {
            let dateObj = this.parseDate(dateValue);
            if (!dateObj || isNaN(dateObj.getTime())) {
                return null;
            }
            
            return dateObj.toISOString().slice(0, 19).replace('T', ' ');
        } catch (error) {
            console.error('❌ Erro ao formatar data para PostgreSQL:', error);
            return null;
        }
    },

    /**
     * CORREÇÃO: Formatar data para exibição
     */
    formatForDisplay(dateValue) {
        if (!dateValue) return 'N/A';
        
        try {
            let dateObj = this.parseDate(dateValue);
            if (!dateObj || isNaN(dateObj.getTime())) {
                return 'Data Inválida';
            }
            
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (error) {
            console.error('❌ Erro ao formatar data:', error);
            return 'Data Inválida';
        }
    },

    /**
     * CORREÇÃO: Parse inteligente de datas
     */
    parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            // Se já é um objeto Date válido
            if (dateValue instanceof Date) {
                return isNaN(dateValue.getTime()) ? null : dateValue;
            }
            
            // Se é um timestamp (número)
            if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
                const timestamp = typeof dateValue === 'number' ? dateValue : Number(dateValue);
                // Verificar se é timestamp em segundos ou milissegundos
                const dateObj = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
                return isNaN(dateObj.getTime()) ? null : dateObj;
            }
            
            // Se é uma string
            if (typeof dateValue === 'string') {
                // CORREÇÃO: Formato português dd/mm/yyyy hh:mm:ss
                if (dateValue.includes('/')) {
                    const cleanDate = dateValue.replace(/,/g, ' ').trim();
                    const parts = cleanDate.split(/[\/\s:]/);
                    
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado
                        const year = parseInt(parts[2], 10);
                        const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
                        const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
                        const second = parts.length > 5 ? parseInt(parts[5], 10) : 0;
                        
                        const dateObj = new Date(year, month, day, hour, minute, second);
                        return isNaN(dateObj.getTime()) ? null : dateObj;
                    }
                }
                
                // Tentar parse padrão para outros formatos
                const dateObj = new Date(dateValue);
                return isNaN(dateObj.getTime()) ? null : dateObj;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao fazer parse da data:', error);
            return null;
        }
    },

    /**
     * CORREÇÃO: Verificar se data é válida
     */
    isValidDate(dateValue) {
        const parsed = this.parseDate(dateValue);
        return parsed !== null && !isNaN(parsed.getTime());
    },

    /**
     * CORREÇÃO: Comparar duas datas (ignora diferenças menores que 1 minuto)
     */
    datesMatch(date1, date2, toleranceMinutes = 1) {
        const d1 = this.parseDate(date1);
        const d2 = this.parseDate(date2);
        
        if (!d1 || !d2) return false;
        
        const diffMs = Math.abs(d1.getTime() - d2.getTime());
        const diffMinutes = diffMs / (1000 * 60);
        
        return diffMinutes <= toleranceMinutes;
    },

    /**
     * CORREÇÃO: Obter data atual formatada
     */
    getCurrentDateTime() {
        return this.formatForDisplay(new Date());
    },

    /**
     * CORREÇÃO: Converter para timestamp
     */
    toTimestamp(dateValue) {
        const dateObj = this.parseDate(dateValue);
        return dateObj ? dateObj.getTime() : null;
    }
};

// ===== CORREÇÃO: SISTEMA DE NORMALIZAÇÃO DE MARCAS =====
window.BrandUtils = {
    /**
     * CORREÇÃO: Normalizar nome de marca
     */
    normalizeBrand(brandName) {
        if (!brandName) return '';
        
        let normalized = String(brandName).toLowerCase().trim();
        
        // Remover palavras relacionadas a estacionamento
        normalized = normalized
            .replace(/\s+parking\b/gi, '')
            .replace(/\s+estacionamento\b/gi, '')
            .replace(/\s+park\b/gi, '')
            .replace(/\s+parque\b/gi, '');
        
        // Remover cidades portuguesas comuns
        const cities = [
            'lisboa', 'lisbon', 'porto', 'oporto', 'coimbra', 'braga', 
            'aveiro', 'faro', 'setúbal', 'évora', 'leiria', 'viseu',
            'santarém', 'castelo branco', 'beja', 'portalegre', 'guarda',
            'viana do castelo', 'vila real', 'bragança'
        ];
        
        for (const city of cities) {
            normalized = normalized.replace(new RegExp(`\\s+${city}$`, 'gi'), '');
            normalized = normalized.replace(new RegExp(`^${city}\\s+`, 'gi'), '');
            normalized = normalized.replace(new RegExp(`\\s+${city}\\s+`, 'gi'), ' ');
        }
        
        return normalized.trim().toUpperCase();
    },

    /**
     * CORREÇÃO: Verificar se marcas coincidem
     */
    brandsMatch(brand1, brand2) {
        const norm1 = this.normalizeBrand(brand1);
        const norm2 = this.normalizeBrand(brand2);
        
        console.log(`🔍 Comparação de marcas: "${brand1}" -> "${norm1}" vs "${brand2}" -> "${norm2}"`);
        return norm1 === norm2;
    },

    /**
     * CORREÇÃO: Obter lista de marcas únicas
     */
    getUniqueBrands(records, brandField = 'parkBrand') {
        if (!Array.isArray(records)) return [];
        
        const brands = new Set();
        records.forEach(record => {
            if (record[brandField]) {
                brands.add(this.normalizeBrand(record[brandField]));
            }
        });
        
        return Array.from(brands).sort();
    }
};

// ===== CORREÇÃO: SISTEMA DE VALIDAÇÃO DE PAGAMENTOS =====
window.PaymentValidation = {
    /**
     * CORREÇÃO: Validar método de pagamento
     */
    validatePayment(delivery, validatedRecord) {
        const errors = [];
        const method = (delivery.paymentMethod || '').toLowerCase();
        
        // CORREÇÃO: Validação "no pay"
        if (method === 'no pay') {
            const campaignPayFalse = validatedRecord?.boRecord?.campaignPay === false || 
                                    validatedRecord?.boRecord?.campaignPay === 'false';
            
            if (!campaignPayFalse) {
                errors.push({
                    type: 'permanent',
                    code: 'no_pay_without_campaign_pay_false',
                    message: 'Pagamento "No Pay" mas campaignPay não é false no Back Office'
                });
            }
        }
        
        // CORREÇÃO: Validação "online"
        if (method === 'online') {
            const hasOnlineTrue = validatedRecord?.boRecord?.hasOnlinePayment === true || 
                                 validatedRecord?.boRecord?.hasOnlinePayment === 'true';
            
            if (!hasOnlineTrue) {
                errors.push({
                    type: 'permanent',
                    code: 'online_without_online_payment_true',
                    message: 'Pagamento "Online" mas hasOnlinePayment não é true no Back Office'
                });
            }
        }
        
        // CORREÇÃO: Validação de valor
        const price = parseFloat(delivery.priceOnDelivery) || 0;
        if (price < 0) {
            errors.push({
                type: 'temporary',
                code: 'negative_price',
                message: 'Valor de entrega não pode ser negativo'
            });
        }
        
        return errors;
    },

    /**
     * CORREÇÃO: Obter métodos de pagamento válidos
     */
    getValidPaymentMethods() {
        return [
            'numerário',
            'multibanco',
            'no pay',
            'online',
            'cartão',
            'transferência'
        ];
    },

    /**
     * CORREÇÃO: Normalizar método de pagamento
     */
    normalizePaymentMethod(method) {
        if (!method) return '';
        
        const normalized = String(method).toLowerCase().trim();
        const validMethods = this.getValidPaymentMethods();
        
        // Verificar se é um método válido
        if (validMethods.includes(normalized)) {
            return normalized;
        }
        
        // Tentar mapear variações comuns
        const mappings = {
            'cash': 'numerário',
            'dinheiro': 'numerário',
            'mb': 'multibanco',
            'card': 'cartão',
            'credit': 'cartão',
            'transfer': 'transferência'
        };
        
        return mappings[normalized] || normalized;
    }
};

// ===== CORREÇÃO: SISTEMA DE NOTIFICAÇÕES MELHORADO =====
window.showNotification = function(message, type = 'success', duration = 3000) {
    // Criar container se não existir
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#dc3545' : '#ffc107'};
        color: ${type === 'warning' ? '#000' : '#fff'};
        padding: 15px 20px;
        border-radius: 5px;
        margin-bottom: 10px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
        cursor: pointer;
        max-width: 350px;
        word-wrap: break-word;
    `;
    
    // CORREÇÃO: Adicionar ícone baseado no tipo
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <span style="margin-right: 8px;">${icons[type] || icons.info}</span>
        ${message}
    `;
    
    container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover ao clicar
    notification.addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                container.removeChild(notification);
            }
        }, 300);
    });
    
    // Auto-remover
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 300);
        }
    }, duration);
};

// ===== CORREÇÃO: UTILITÁRIOS GERAIS =====
window.Utils = {
    /**
     * CORREÇÃO: Normalizar matrícula
     */
    normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
    },

    /**
     * CORREÇÃO: Formatar valor monetário
     */
    formatCurrency(value, currency = '€') {
        const numValue = parseFloat(value) || 0;
        return numValue.toFixed(2) + ' ' + currency;
    },

    /**
     * CORREÇÃO: Debounce para eventos
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * CORREÇÃO: Verificar se valor é vazio
     */
    isEmpty(value) {
        return value === null || value === undefined || value === '' || value === 'N/A';
    },

    /**
     * CORREÇÃO: Gerar ID único
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * CORREÇÃO: Comparar valores com tolerância
     */
    valuesMatch(val1, val2, tolerance = 0.01) {
        const num1 = parseFloat(val1) || 0;
        const num2 = parseFloat(val2) || 0;
        return Math.abs(num1 - num2) <= tolerance;
    }
};

// ===== CORREÇÃO: DEBUGGER MELHORADO =====
window.CaixaDebugger = {
    logState() {
        console.log('🔍 Estado atual do sistema:', {
            dateUtils: !!window.DateUtils,
            brandUtils: !!window.BrandUtils,
            paymentValidation: !!window.PaymentValidation,
            utils: !!window.Utils,
            fileProcessor: !!window.fileProcessor,
            comparator: !!window.comparator,
            validator: !!window.validator,
            dashboard: !!window.dashboard,
            exporter: !!window.exporter
        });
    },
    
    testDateParsing() {
        const testDates = [
            '24/07/2025 14:30:00',
            '2025-07-24T14:30:00Z',
            1721826600000,
            new Date(),
            '24/07/2025',
            '2025-07-24'
        ];
        
        console.log('🧪 Teste de parsing de datas:');
        testDates.forEach(date => {
            const result = window.DateUtils.formatForDisplay(date);
            const isValid = window.DateUtils.isValidDate(date);
            console.log(`  ${date} -> ${result} (válida: ${isValid})`);
        });
    },
    
    testBrandMatching() {
        const testBrands = [
            ['RedPark', 'RedPark Lisboa'],
            ['Estacionamento Central', 'Central Park'],
            ['Porto Parking', 'Porto'],
            ['Multipark Braga', 'Multipark']
        ];
        
        console.log('🧪 Teste de comparação de marcas:');
        testBrands.forEach(([brand1, brand2]) => {
            const match = window.BrandUtils.brandsMatch(brand1, brand2);
            console.log(`  "${brand1}" vs "${brand2}" -> ${match ? '✅ Coincidem' : '❌ Diferentes'}`);
        });
    },
    
    testPaymentValidation() {
        const testDeliveries = [
            { paymentMethod: 'no pay', priceOnDelivery: 0 },
            { paymentMethod: 'online', priceOnDelivery: 15.50 },
            { paymentMethod: 'numerário', priceOnDelivery: -5 }
        ];
        
        console.log('🧪 Teste de validação de pagamentos:');
        testDeliveries.forEach((delivery, index) => {
            const errors = window.PaymentValidation.validatePayment(delivery, {});
            console.log(`  Entrega ${index + 1}: ${errors.length} erros encontrados`);
            errors.forEach(error => {
                console.log(`    - ${error.message}`);
            });
        });
    }
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Utilitários corrigidos inicializados!');
    
    // Definir data atual em elementos específicos
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = window.DateUtils.getCurrentDateTime();
    }
    
    // Testes em ambiente de desenvolvimento
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        setTimeout(() => {
            window.CaixaDebugger.logState();
            console.log('🧪 Para testar o sistema, usa:');
            console.log('  - window.CaixaDebugger.testDateParsing()');
            console.log('  - window.CaixaDebugger.testBrandMatching()');
            console.log('  - window.CaixaDebugger.testPaymentValidation()');
            console.log('  - window.showNotification("Teste", "success")');
        }, 1000);
    }
});

// ===== COMPATIBILIDADE COM CÓDIGO EXISTENTE =====
// Manter funções antigas para compatibilidade
window.formatDate = window.DateUtils.formatForDisplay;
window.normalizeLicensePlate = window.Utils.normalizeLicensePlate;

console.log('🎯 Todos os utilitários corrigidos carregados!');

