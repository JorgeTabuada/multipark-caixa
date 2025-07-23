// utils.js - Utilitários e correção de datas para Caixa Multipark
// CORREÇÃO: Problema das datas no formato português para PostgreSQL

console.log('🔧 Utils.js carregado - Correções de data implementadas');

/**
 * Sistema de formatação de datas corrigido
 * Resolve o problema: "date/time field value out of range: '14/07/2025, 07:16'"
 */
window.DateUtils = {
    
    /**
     * CORREÇÃO: Formatar data para PostgreSQL (formato ISO)
     * Converte datas portuguesas para formato aceite pelo Supabase
     */
    formatForPostgreSQL(dateValue) {
        if (!dateValue) return null;
        
        try {
            let dateObj = this.parseDate(dateValue);
            if (!dateObj || isNaN(dateObj.getTime())) {
                console.warn('⚠️ Data inválida para PostgreSQL:', dateValue);
                return null;
            }
            
            // Formato ISO para PostgreSQL: YYYY-MM-DD HH:MM:SS
            return dateObj.toISOString().slice(0, 19).replace('T', ' ');
        } catch (error) {
            console.error('❌ Erro ao formatar data para PostgreSQL:', error, 'Valor:', dateValue);
            return null;
        }
    },

    /**
     * CORREÇÃO: Formatar data para exibição (formato PT)
     * Resolve o problema de "Invalid Date Invalid Date" na interface
     */
    formatForDisplay(dateValue) {
        if (!dateValue) return 'N/A';
        
        try {
            let dateObj = this.parseDate(dateValue);
            if (!dateObj || isNaN(dateObj.getTime())) {
                console.warn('⚠️ Data inválida para exibição:', dateValue);
                return 'Data Inválida';
            }
            
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (error) {
            console.error('❌ Erro ao formatar data para exibição:', error, 'Valor:', dateValue);
            return 'Erro na Data';
        }
    },

    /**
     * CORREÇÃO: Parse inteligente de datas
     * Suporta múltiplos formatos de entrada
     */
    parseDate(dateValue) {
        if (!dateValue) return null;
        
        try {
            // Se já é um objeto Date válido
            if (dateValue instanceof Date) {
                return isNaN(dateValue.getTime()) ? null : dateValue;
            }
            
            // Se é timestamp numérico
            if (typeof dateValue === 'number' || !isNaN(Number(dateValue))) {
                const timestamp = typeof dateValue === 'number' ? dateValue : Number(dateValue);
                // Verificar se é segundos ou milissegundos
                const dateObj = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
                return isNaN(dateObj.getTime()) ? null : dateObj;
            }
            
            // Se é string
            if (typeof dateValue === 'string') {
                // CORREÇÃO: Formato dd/mm/yyyy hh:mm:ss (formato português)
                if (dateValue.includes('/')) {
                    // Remover vírgulas problemáticas: "14/07/2025, 07:16" -> "14/07/2025 07:16"
                    const cleanDate = dateValue.replace(/,/g, ' ').trim();
                    const parts = cleanDate.split(/[\/\s:]/);
                    
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1; // JS months são 0-indexed
                        const year = parseInt(parts[2], 10);
                        const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
                        const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
                        const second = parts.length > 5 ? parseInt(parts[5], 10) : 0;
                        
                        const dateObj = new Date(year, month, day, hour, minute, second);
                        return isNaN(dateObj.getTime()) ? null : dateObj;
                    }
                }
                
                // Formato ISO ou outros padrões
                const dateObj = new Date(dateValue);
                return isNaN(dateObj.getTime()) ? null : dateObj;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao fazer parse da data:', error, 'Valor:', dateValue);
            return null;
        }
    },

    /**
     * Verificar se data é válida
     */
    isValidDate(dateValue) {
        const parsed = this.parseDate(dateValue);
        return parsed !== null && !isNaN(parsed.getTime());
    },

    /**
     * CORREÇÃO: Normalizar data para comparações
     * Converte para timestamp para comparar datas independentemente do formato
     */
    normalizeForComparison(dateValue) {
        const parsed = this.parseDate(dateValue);
        return parsed ? parsed.getTime() : 0;
    }
};

/**
 * CORREÇÃO: Normalização de marcas de parque
 * Resolve problema: "RedPark" vs "RedPark Lisboa" considerados diferentes
 */
window.ParkUtils = {
    
    /**
     * CORREÇÃO: Normalizar nome da marca ignorando cidade
     */
    normalizeParkBrand(brandName) {
        if (!brandName) return '';
        
        let normalized = String(brandName).toLowerCase().trim();
        
        // Remover palavras relacionadas a estacionamento
        normalized = normalized
            .replace(/\s+parking\b/gi, '')
            .replace(/\s+estacionamento\b/gi, '')
            .replace(/\s+park\b/gi, '')
            .replace(/\s+parque\b/gi, '');
        
        // CORREÇÃO: Remover cidades comuns de Portugal
        const citiesToRemove = [
            'lisboa', 'lisbon', 'porto', 'oporto', 'coimbra', 'braga', 
            'aveiro', 'faro', 'setúbal', 'évora', 'leiria', 'viseu',
            'santarém', 'castelo branco', 'beja', 'portalegre', 'guarda',
            'viana do castelo', 'vila real', 'bragança', 'funchal', 'angra'
        ];
        
        for (const city of citiesToRemove) {
            // Remover cidade no final (ex: "redpark lisboa" -> "redpark")
            normalized = normalized.replace(new RegExp(`\\s+${city}$`, 'gi'), '');
            // Remover cidade no início (ex: "lisboa redpark" -> "redpark")  
            normalized = normalized.replace(new RegExp(`^${city}\\s+`, 'gi'), '');
            // Remover cidade no meio (ex: "red lisboa park" -> "red park")
            normalized = normalized.replace(new RegExp(`\\s+${city}\\s+`, 'gi'), ' ');
        }
        
        // Limpar espaços extras e retornar em maiúsculas
        return normalized.replace(/\s+/g, ' ').trim().toUpperCase();
    },

    /**
     * CORREÇÃO: Comparar marcas ignorando diferenças de cidade
     */
    brandsMatch(brand1, brand2) {
        const normalized1 = this.normalizeParkBrand(brand1);
        const normalized2 = this.normalizeParkBrand(brand2);
        
        console.log(`🔍 Comparação de marcas: "${brand1}" -> "${normalized1}" vs "${brand2}" -> "${normalized2}"`);
        
        return normalized1 === normalized2;
    }
};

/**
 * CORREÇÃO: Utilitários para validação de entregas
 * Resolve problema de inconsistências permanentes
 */
window.ValidationUtils = {
    
    /**
     * CORREÇÃO: Verificar inconsistências permanentes
     * No Pay deve ter campaignPay = false
     * Online deve ter hasOnlinePayment = true
     */
    checkPermanentInconsistencies(delivery, validatedRecord) {
        const issues = [];
        
        // CORREÇÃO: No Pay sem campaignPay = false
        if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'no pay') {
            const campaignPayFalse = validatedRecord?.boRecord?.campaignPay === false || 
                                   validatedRecord?.boRecord?.campaignPay === 'false';
            
            if (!campaignPayFalse) {
                issues.push({
                    type: 'no_pay_without_campaign_pay_false',
                    message: 'Pagamento "No Pay" mas campaignPay não é false no Back Office',
                    permanent: true
                });
            }
        }
        
        // CORREÇÃO: Online sem hasOnlinePayment = true
        if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'online') {
            const hasOnlinePaymentTrue = validatedRecord?.boRecord?.hasOnlinePayment === true || 
                                       validatedRecord?.boRecord?.hasOnlinePayment === 'true';
            
            if (!hasOnlinePaymentTrue) {
                issues.push({
                    type: 'online_without_has_online_payment_true',
                    message: 'Pagamento "Online" mas hasOnlinePayment não é true no Back Office',
                    permanent: true
                });
            }
        }
        
        return issues;
    },

    /**
     * Gerar ID único para entregas
     */
    generateDeliveryId(delivery) {
        const timestamp = Date.now();
        const licensePlate = delivery.licensePlate || 'unknown';
        const driver = delivery.condutorEntrega || 'unknown';
        return `${licensePlate}_${driver}_${timestamp}`.toLowerCase();
    }
};

/**
 * CORREÇÃO: Compatibilidade com código existente
 * Sobrescrever função global formatDate com versão corrigida
 */
window.formatDate = window.DateUtils.formatForDisplay;

console.log('✅ Utils.js carregado com todas as correções implementadas!');
console.log('📋 Correções disponíveis:');
console.log('   - DateUtils.formatForPostgreSQL() - Resolve erro Supabase');
console.log('   - DateUtils.formatForDisplay() - Resolve "Invalid Date"');
console.log('   - ParkUtils.normalizeParkBrand() - Resolve comparação marcas');
console.log('   - ValidationUtils.checkPermanentInconsistencies() - Regras de negócio');
