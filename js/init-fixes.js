// init-fixes.js - Script de inicialização com todas as correções
console.log('🔧 Aplicando todas as correções do sistema...');

// ===== CORREÇÃO 1: FORMATAÇÃO DE DATAS =====
window.DateUtils = {
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

    parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            if (dateValue instanceof Date) {
                return isNaN(dateValue.getTime()) ? null : dateValue;
            }
            
            if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
                const timestamp = typeof dateValue === 'number' ? dateValue : Number(dateValue);
                const dateObj = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
                return isNaN(dateObj.getTime()) ? null : dateObj;
            }
            
            if (typeof dateValue === 'string') {
                if (dateValue.includes('/')) {
                    const cleanDate = dateValue.replace(/,/g, ' ').trim();
                    const parts = cleanDate.split(/[\/\s:]/);
                    
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
                        const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
                        const second = parts.length > 5 ? parseInt(parts[5], 10) : 0;
                        
                        const dateObj = new Date(year, month, day, hour, minute, second);
                        return isNaN(dateObj.getTime()) ? null : dateObj;
                    }
                }
                
                const dateObj = new Date(dateValue);
                return isNaN(dateObj.getTime()) ? null : dateObj;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao fazer parse da data:', error);
            return null;
        }
    },

    isValidDate(dateValue) {
        const parsed = this.parseDate(dateValue);
        return parsed !== null && !isNaN(parsed.getTime());
    }
};

// ===== CORREÇÃO 2: NORMALIZAÇÃO DE MARCAS =====
window.BrandUtils = {
    normalizeBrand(brandName) {
        if (!brandName) return '';
        
        let normalized = String(brandName).toLowerCase().trim();
        
        // Remover palavras relacionadas a estacionamento
        normalized = normalized
            .replace(/\s+parking\b/gi, '')
            .replace(/\s+estacionamento\b/gi, '')
            .replace(/\s+park\b/gi, '')
            .replace(/\s+parque\b/gi, '');
        
        // Remover cidades portuguesas
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

    brandsMatch(brand1, brand2) {
        const norm1 = this.normalizeBrand(brand1);
        const norm2 = this.normalizeBrand(brand2);
        
        console.log(`🔍 Comparação: "${brand1}" -> "${norm1}" vs "${brand2}" -> "${norm2}"`);
        return norm1 === norm2;
    }
};

// ===== CORREÇÃO 3: VALIDAÇÕES DE PAGAMENTO =====
window.PaymentValidation = {
    validatePayment(delivery, validatedRecord) {
        const errors = [];
        const method = (delivery.paymentMethod || '').toLowerCase();
        
        // Validação "no pay"
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
        
        // Validação "online"
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
        
        return errors;
    }
};

// ===== CORREÇÃO 4: GESTÃO DE NOTIFICAÇÕES =====
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
    `;
    notification.textContent = message;
    
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
        setTimeout(() => container.removeChild(notification), 300);
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

// ===== CORREÇÃO 5: DEBUGGER MELHORADO =====
window.CaixaDebugger = {
    logState() {
        console.log('🔍 Estado atual do sistema:', {
            dateUtils: !!window.DateUtils,
            brandUtils: !!window.BrandUtils,
            paymentValidation: !!window.PaymentValidation,
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
            new Date()
        ];
        
        console.log('🧪 Teste de parsing de datas:');
        testDates.forEach(date => {
            const result = window.DateUtils.formatForDisplay(date);
            console.log(`  ${date} -> ${result}`);
        });
    },
    
    testBrandMatching() {
        const testBrands = [
            ['RedPark', 'RedPark Lisboa'],
            ['Estacionamento Central', 'Central Park'],
            ['Porto Parking', 'Porto']
        ];
        
        console.log('🧪 Teste de marcas:');
        testBrands.forEach(([brand1, brand2]) => {
            const match = window.BrandUtils.brandsMatch(brand1, brand2);
            console.log(`  "${brand1}" vs "${brand2}" -> ${match ? '✅' : '❌'}`);
        });
    }
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de correções inicializado!');
    
    // Definir data atual
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const today = new Date();
        currentDateElement.textContent = today.toLocaleDateString('pt-PT');
    }
    
    // Testes rápidos
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        setTimeout(() => {
            window.CaixaDebugger.logState();
            console.log('🧪 Para testar o sistema, usa:');
            console.log('  - window.CaixaDebugger.testDateParsing()');
            console.log('  - window.CaixaDebugger.testBrandMatching()');
            console.log('  - window.showNotification("Teste", "success")');
        }, 1000);
    }
});

// Compatibilidade com código existente
window.formatDate = window.DateUtils.formatForDisplay;
window.normalizeLicensePlate = function(plate) {
    if (!plate) return '';
    return String(plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
};

console.log('🎯 Todas as correções aplicadas!');