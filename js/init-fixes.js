// init-fixes.js - Script de inicialização com correções principais
console.log('🚀 Iniciando correções principais do sistema...');

/**
 * CORREÇÃO: Sistema de inicialização melhorado
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Aplicando correções de inicialização...');

    // CORREÇÃO 1: Garantir que todos os módulos estão carregados
    const requiredModules = ['DateUtils', 'BrandUtils', 'PaymentValidation', 'Utils'];
    const missingModules = requiredModules.filter(module => !window[module]);
    
    if (missingModules.length > 0) {
        console.warn('⚠️ Módulos em falta:', missingModules);
    } else {
        console.log('✅ Todos os módulos utilitários carregados');
    }

    // CORREÇÃO 2: Inicializar sistema de notificações
    if (!window.showNotification) {
        console.warn('⚠️ Sistema de notificações não encontrado, criando versão básica...');
        window.showNotification = function(message, type = 'info') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        };
    }

    // CORREÇÃO 3: Verificar e corrigir elementos da interface
    fixInterfaceElements();

    // CORREÇÃO 4: Aplicar correções específicas de cada módulo
    setTimeout(() => {
        applyModuleSpecificFixes();
    }, 500);

    // CORREÇÃO 5: Configurar handlers globais de erro
    setupGlobalErrorHandlers();

    // CORREÇÃO 6: Verificar conectividade com Supabase
    checkSupabaseConnection();

    console.log('✅ Correções de inicialização aplicadas!');
});

/**
 * CORREÇÃO: Corrigir elementos da interface
 */
function fixInterfaceElements() {
    console.log('🔧 Verificando elementos da interface...');

    // CORREÇÃO: Garantir que botões críticos existem e são visíveis
    const criticalButtons = [
        'validate-comparison-btn',
        'export-btn',
        'add-caixa-btn',
        'close-caixa-btn'
    ];

    criticalButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            // Remover classe hidden se existir
            button.classList.remove('hidden');
            
            // CORREÇÃO: Botão "Validar e Avançar" sempre visível quando há dados
            if (buttonId === 'validate-comparison-btn') {
                button.style.display = 'inline-block';
                console.log('✅ Botão "Validar e Avançar" corrigido');
            }
        } else {
            console.warn(`⚠️ Botão crítico não encontrado: ${buttonId}`);
        }
    });

    // CORREÇÃO: Verificar tabelas críticas
    const criticalTables = [
        'comparison-table',
        'deliveries-table'
    ];

    criticalTables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (!table) {
            console.warn(`⚠️ Tabela crítica não encontrada: ${tableId}`);
        } else {
            // Garantir que tbody existe
            if (!table.querySelector('tbody')) {
                const tbody = document.createElement('tbody');
                table.appendChild(tbody);
                console.log(`✅ Tbody adicionado à tabela ${tableId}`);
            }
        }
    });

    // CORREÇÃO: Verificar contadores
    const counters = [
        'odoo-count',
        'backoffice-count',
        'inconsistency-count',
        'missing-count',
        'delivery-count'
    ];

    counters.forEach(counterId => {
        const counter = document.getElementById(counterId);
        if (counter && counter.textContent === '') {
            counter.textContent = '0';
        }
    });
}

/**
 * CORREÇÃO: Aplicar correções específicas de cada módulo
 */
function applyModuleSpecificFixes() {
    console.log('🔧 Aplicando correções específicas dos módulos...');

    // CORREÇÃO: File Processor - Verificação de duplicados
    if (window.fileProcessor) {
        console.log('✅ File Processor encontrado, aplicando correções...');
        
        // Sobrescrever função de verificação de duplicados se necessário
        const originalCheckDuplicates = window.fileProcessor.checkForDuplicates;
        if (originalCheckDuplicates) {
            window.fileProcessor.checkForDuplicates = function(newData, existingData) {
                console.log('🔍 Verificando duplicados com correção...');
                
                if (!Array.isArray(newData) || !Array.isArray(existingData)) {
                    return { duplicates: [], unique: newData || [] };
                }

                const duplicates = [];
                const unique = [];

                newData.forEach(newRecord => {
                    const isDuplicate = existingData.some(existing => {
                        const plateMatch = window.Utils ? 
                            window.Utils.normalizeLicensePlate(newRecord.licensePlate) === 
                            window.Utils.normalizeLicensePlate(existing.licensePlate) :
                            newRecord.licensePlate === existing.licensePlate;
                        
                        const driverMatch = (newRecord.condutorEntrega || '').toLowerCase() === 
                                          (existing.condutorEntrega || '').toLowerCase();
                        
                        return plateMatch && driverMatch;
                    });

                    if (isDuplicate) {
                        duplicates.push(newRecord);
                    } else {
                        unique.push(newRecord);
                    }
                });

                console.log(`✅ Verificação de duplicados: ${duplicates.length} duplicados, ${unique.length} únicos`);
                return { duplicates, unique };
            };
        }
    }

    // CORREÇÃO: Comparator - Normalização de marcas
    if (window.comparator && window.BrandUtils) {
        console.log('✅ Comparator encontrado, aplicando correções de marcas...');
        
        // Garantir que usa a função corrigida de normalização
        if (window.comparator.normalizeBrand !== window.BrandUtils.normalizeBrand) {
            window.comparator.normalizeBrand = window.BrandUtils.normalizeBrand;
            window.comparator.brandsMatch = window.BrandUtils.brandsMatch;
            console.log('✅ Funções de marca atualizadas no comparator');
        }
    }

    // CORREÇÃO: Validator - Sistema de IDs e inconsistências permanentes
    if (window.validator) {
        console.log('✅ Validator encontrado, aplicando correções...');
        
        // Verificar se tem função de validação de pagamentos
        if (!window.validator.validatePayment && window.PaymentValidation) {
            window.validator.validatePayment = window.PaymentValidation.validatePayment;
            console.log('✅ Validação de pagamentos adicionada ao validator');
        }
    }

    // CORREÇÃO: Dashboard - Formatação de datas
    if (window.dashboard && window.DateUtils) {
        console.log('✅ Dashboard encontrado, aplicando correções de data...');
        
        // Atualizar data atual se elemento existe
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
            currentDateElement.textContent = window.DateUtils.getCurrentDateTime();
        }
    }
}

/**
 * CORREÇÃO: Configurar handlers globais de erro
 */
function setupGlobalErrorHandlers() {
    console.log('🛡️ Configurando handlers globais de erro...');

    // Handler para erros JavaScript não capturados
    window.addEventListener('error', function(event) {
        console.error('❌ Erro JavaScript:', event.error);
        
        if (window.showNotification) {
            window.showNotification(
                'Erro inesperado detectado. Verifique o console para detalhes.',
                'error'
            );
        }
    });

    // Handler para promises rejeitadas não capturadas
    window.addEventListener('unhandledrejection', function(event) {
        console.error('❌ Promise rejeitada:', event.reason);
        
        if (window.showNotification) {
            window.showNotification(
                'Erro de operação assíncrona. Verifique o console para detalhes.',
                'error'
            );
        }
    });

    // CORREÇÃO: Handler específico para erros do Supabase
    const originalSupabaseError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        
        if (message.includes('supabase') || message.includes('postgresql')) {
            console.warn('🔍 Erro relacionado ao Supabase detectado:', message);
            
            if (window.showNotification && message.includes('authentication')) {
                window.showNotification(
                    'Erro de autenticação com base de dados. Verifique a configuração.',
                    'error'
                );
            }
        }
        
        originalSupabaseError.apply(console, args);
    };
}

/**
 * CORREÇÃO: Verificar conectividade com Supabase
 */
function checkSupabaseConnection() {
    console.log('🔗 Verificando conectividade com Supabase...');

    if (typeof supabase !== 'undefined' && supabase) {
        // Teste simples de conectividade
        supabase
            .from('cash_records')
            .select('count', { count: 'exact', head: true })
            .then(response => {
                if (response.error) {
                    console.warn('⚠️ Erro ao conectar com Supabase:', response.error.message);
                    
                    if (window.showNotification) {
                        window.showNotification(
                            'Problema de conectividade com a base de dados',
                            'warning'
                        );
                    }
                } else {
                    console.log('✅ Conectividade com Supabase confirmada');
                }
            })
            .catch(error => {
                console.error('❌ Erro na verificação do Supabase:', error);
            });
    } else {
        console.warn('⚠️ Cliente Supabase não encontrado');
        
        if (window.showNotification) {
            window.showNotification(
                'Cliente de base de dados não inicializado',
                'warning'
            );
        }
    }
}

/**
 * CORREÇÃO: Função para reinicializar sistema se necessário
 */
function reinitializeSystem() {
    console.log('🔄 Reinicializando sistema...');
    
    // Limpar caches se existirem
    if (window.localStorage) {
        const cacheKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('caixa_') || key.startsWith('multipark_')
        );
        
        if (cacheKeys.length > 0) {
            console.log('🗑️ Limpando cache:', cacheKeys);
            cacheKeys.forEach(key => localStorage.removeItem(key));
        }
    }
    
    // Recarregar página se necessário
    if (confirm('Reinicializar sistema? Isto irá recarregar a página.')) {
        window.location.reload();
    }
}

/**
 * CORREÇÃO: Função de diagnóstico do sistema
 */
function runSystemDiagnostics() {
    console.log('🔍 Executando diagnósticos do sistema...');
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        modules: {
            dateUtils: !!window.DateUtils,
            brandUtils: !!window.BrandUtils,
            paymentValidation: !!window.PaymentValidation,
            utils: !!window.Utils,
            fileProcessor: !!window.fileProcessor,
            comparator: !!window.comparator,
            validator: !!window.validator,
            dashboard: !!window.dashboard,
            exporter: !!window.exporter,
            supabase: !!window.supabase
        },
        interface: {
            validateButton: !!document.getElementById('validate-comparison-btn'),
            exportButton: !!document.getElementById('export-btn'),
            comparisonTable: !!document.getElementById('comparison-table'),
            deliveriesTable: !!document.getElementById('deliveries-table')
        },
        errors: []
    };
    
    // Verificar erros comuns
    if (!diagnostics.modules.supabase) {
        diagnostics.errors.push('Cliente Supabase não inicializado');
    }
    
    if (!diagnostics.interface.validateButton) {
        diagnostics.errors.push('Botão "Validar e Avançar" não encontrado');
    }
    
    console.table(diagnostics.modules);
    console.table(diagnostics.interface);
    
    if (diagnostics.errors.length > 0) {
        console.warn('⚠️ Problemas encontrados:', diagnostics.errors);
    } else {
        console.log('✅ Todos os diagnósticos passaram');
    }
    
    return diagnostics;
}

// CORREÇÃO: Exportar funções para uso global
window.CaixaInitFixes = {
    reinitializeSystem,
    runSystemDiagnostics,
    fixInterfaceElements,
    applyModuleSpecificFixes,
    checkSupabaseConnection
};

// CORREÇÃO: Auto-executar diagnósticos em ambiente de desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
    setTimeout(() => {
        console.log('🧪 Ambiente de desenvolvimento detectado');
        console.log('💡 Funções disponíveis:');
        console.log('  - window.CaixaInitFixes.runSystemDiagnostics()');
        console.log('  - window.CaixaInitFixes.reinitializeSystem()');
        console.log('  - window.CaixaDebugger.logState() (se utils carregado)');
    }, 2000);
}

console.log('🎯 Sistema de correções de inicialização carregado!');

