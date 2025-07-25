// ===== SISTEMA DE DEBUG E DIAGNÓSTICO =====
// Este ficheiro verifica o estado de todos os módulos e identifica problemas

class CaixaDebugger {
    constructor() {
        this.checks = [];
        this.errors = [];
        this.warnings = [];
        this.moduleStatus = {};
        
        console.log('🔍 CaixaDebugger inicializando...');
    }

    // ===== VERIFICAÇÕES DE MÓDULOS =====
    
    checkSupabaseConnection() {
        try {
            if (!window.supabase) {
                this.addError('Supabase library não carregada', 'critical');
                return false;
            }

            if (!window.supabaseClient) {
                this.addError('Cliente Supabase não inicializado', 'critical');
                return false;
            }

            if (!window.caixaAPI) {
                this.addError('CaixaAPI não disponível', 'critical');
                return false;
            }

            this.addCheck('✅ Supabase configurado corretamente');
            return true;
        } catch (error) {
            this.addError(`Erro na verificação Supabase: ${error.message}`, 'critical');
            return false;
        }
    }

    checkRequiredModules() {
        const requiredModules = [
            { name: 'window.caixaApp', label: 'App Principal' },
            { name: 'window.caixaAPI', label: 'API Supabase' },
            { name: 'window.fileProcessor', label: 'Processador de Ficheiros' },
            { name: 'window.validationSystem', label: 'Sistema de Validação' },
            { name: 'window.dashboard', label: 'Dashboard' },
            { name: 'window.BrandUtils', label: 'Utilitários de Marca' },
            { name: 'window.notifications', label: 'Sistema de Notificações' }
        ];

        let loadedModules = 0;

        for (const module of requiredModules) {
            try {
                const moduleExists = this.getNestedProperty(window, module.name.replace('window.', ''));
                
                if (moduleExists) {
                    this.addCheck(`✅ ${module.label} carregado`);
                    this.moduleStatus[module.name] = 'loaded';
                    loadedModules++;
                } else {
                    this.addWarning(`⚠️ ${module.label} não encontrado`, 'module');
                    this.moduleStatus[module.name] = 'missing';
                }
            } catch (error) {
                this.addError(`❌ Erro ao verificar ${module.label}: ${error.message}`, 'module');
                this.moduleStatus[module.name] = 'error';
            }
        }

        console.log(`📊 Módulos carregados: ${loadedModules}/${requiredModules.length}`);
        return loadedModules === requiredModules.length;
    }

    checkDOMElements() {
        const requiredElements = [
            'app-loading',
            'main-app', 
            'user-email',
            'current-date',
            'odoo-file',
            'backoffice-file',
            'caixa-file',
            'process-files-btn',
            'comparison-table',
            'dashboard-section'
        ];

        let foundElements = 0;

        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (element) {
                foundElements++;
            } else {
                this.addWarning(`⚠️ Elemento DOM em falta: #${elementId}`, 'dom');
            }
        }

        console.log(`🎨 Elementos DOM encontrados: ${foundElements}/${requiredElements.length}`);
        return foundElements === requiredElements.length;
    }

    checkEventListeners() {
        const elementsWithEvents = [
            { id: 'logout-btn', event: 'click' },
            { id: 'refresh-dashboard', event: 'click' },
            { id: 'process-files-btn', event: 'click' },
            { id: 'odoo-file', event: 'change' },
            { id: 'backoffice-file', event: 'change' },
            { id: 'caixa-file', event: 'change' }
        ];

        let workingEvents = 0;

        for (const item of elementsWithEvents) {
            const element = document.getElementById(item.id);
            if (element) {
                // Verificar se tem event listeners (método aproximado)
                if (this.hasEventListener(element, item.event)) {
                    workingEvents++;
                } else {
                    this.addWarning(`⚠️ Event listener em falta: #${item.id} (${item.event})`, 'events');
                }
            }
        }

        console.log(`🎭 Event listeners funcionais: ${workingEvents}/${elementsWithEvents.length}`);
        return workingEvents === elementsWithEvents.length;
    }

    // ===== TESTES FUNCIONAIS =====

    async testSupabaseAuth() {
        try {
            if (!window.caixaAPI) {
                this.addError('CaixaAPI não disponível para teste', 'test');
                return false;
            }

            const user = await window.caixaAPI.initAuth();
            
            if (user) {
                this.addCheck('✅ Autenticação Supabase funcional');
                return true;
            } else {
                this.addWarning('⚠️ Utilizador não autenticado (esperado se não fez login)', 'test');
                return false;
            }
        } catch (error) {
            this.addError(`❌ Erro no teste de autenticação: ${error.message}`, 'test');
            return false;
        }
    }

    testFileUpload() {
        const fileInputs = ['odoo-file', 'backoffice-file', 'caixa-file'];
        let workingInputs = 0;

        for (const inputId of fileInputs) {
            const input = document.getElementById(inputId);
            if (input && input.type === 'file' && input.accept.includes('.xlsx')) {
                workingInputs++;
            } else {
                this.addWarning(`⚠️ Input de ficheiro mal configurado: #${inputId}`, 'test');
            }
        }

        console.log(`📁 Inputs de ficheiro funcionais: ${workingInputs}/${fileInputs.length}`);
        return workingInputs === fileInputs.length;
    }

    testBrandMatching() {
        if (!window.BrandUtils || !window.BrandUtils.brandsMatch) {
            this.addError('❌ BrandUtils não disponível para teste', 'test');
            return false;
        }

        const testCases = [
            { brand1: 'Redpark Lisbon', brand2: 'Redpark', expected: true },
            { brand1: 'Airpark Lisboa', brand2: 'Airpark', expected: true },
            { brand1: 'Skypark Porto', brand2: 'Skypark', expected: true },
            { brand1: 'Different Brand', brand2: 'Another Brand', expected: false }
        ];

        let passedTests = 0;

        for (const test of testCases) {
            try {
                const result = window.BrandUtils.brandsMatch(test.brand1, test.brand2);
                if (result === test.expected) {
                    passedTests++;
                } else {
                    this.addError(`❌ Teste de marca falhou: "${test.brand1}" vs "${test.brand2}" - esperado ${test.expected}, obtido ${result}`, 'test');
                }
            } catch (error) {
                this.addError(`❌ Erro no teste de marca: ${error.message}`, 'test');
            }
        }

        console.log(`🏷️ Testes de marca passaram: ${passedTests}/${testCases.length}`);
        return passedTests === testCases.length;
    }

    // ===== DIAGNÓSTICO COMPLETO =====

    async runFullDiagnosis() {
        console.log('🚀 Iniciando diagnóstico completo...');
        
        this.checks = [];
        this.errors = [];
        this.warnings = [];

        // Verificações estruturais
        const supabaseOk = this.checkSupabaseConnection();
        const modulesOk = this.checkRequiredModules();
        const domOk = this.checkDOMElements();
        const eventsOk = this.checkEventListeners();

        // Testes funcionais
        const authOk = await this.testSupabaseAuth();
        const fileUploadOk = this.testFileUpload();
        const brandMatchingOk = this.testBrandMatching();

        // Gerar relatório
        this.generateReport();

        const allOk = supabaseOk && modulesOk && domOk && eventsOk && fileUploadOk && brandMatchingOk;
        
        if (allOk) {
            console.log('🎉 Todos os testes passaram! Sistema funcional.');
        } else {
            console.log('⚠️ Alguns problemas encontrados. Ver relatório detalhado.');
        }

        return {
            overall: allOk,
            supabase: supabaseOk,
            modules: modulesOk,
            dom: domOk,
            events: eventsOk,
            auth: authOk,
            fileUpload: fileUploadOk,
            brandMatching: brandMatchingOk
        };
    }

    generateReport() {
        console.log('\n📋 === RELATÓRIO DE DIAGNÓSTICO ===');
        
        if (this.checks.length > 0) {
            console.log('\n✅ VERIFICAÇÕES PASSARAM:');
            this.checks.forEach(check => console.log(`  ${check}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️ AVISOS:');
            this.warnings.forEach(warning => console.log(`  ${warning.message} (${warning.type})`));
        }

        if (this.errors.length > 0) {
            console.log('\n❌ ERROS CRÍTICOS:');
            this.errors.forEach(error => console.log(`  ${error.message} (${error.type})`));
        }

        // Estatísticas
        console.log('\n📊 ESTATÍSTICAS:');
        console.log(`  Verificações: ${this.checks.length}`);
        console.log(`  Avisos: ${this.warnings.length}`);
        console.log(`  Erros: ${this.errors.length}`);
        
        // Estado dos módulos
        console.log('\n📦 ESTADO DOS MÓDULOS:');
        Object.entries(this.moduleStatus).forEach(([module, status]) => {
            const icon = status === 'loaded' ? '✅' : status === 'missing' ? '⚠️' : '❌';
            console.log(`  ${icon} ${module}: ${status}`);
        });

        console.log('\n🔚 === FIM DO RELATÓRIO ===\n');
    }

    // ===== FUNÇÕES RÁPIDAS DE TESTE =====

    quickHealthCheck() {
        console.log('🏥 Quick Health Check...');
        
        const results = {
            supabase: !!window.supabaseClient,
            api: !!window.caixaAPI,
            app: !!window.caixaApp,
            fileProcessor: !!window.fileProcessor,
            brandUtils: !!window.BrandUtils
        };

        const healthScore = Object.values(results).filter(Boolean).length;
        const totalChecks = Object.keys(results).length;

        console.log(`💚 Saúde do sistema: ${healthScore}/${totalChecks} (${Math.round(healthScore/totalChecks*100)}%)`);
        console.log('📊 Detalhes:', results);

        return results;
    }

    // ===== UTILITÁRIOS PRIVADOS =====

    addCheck(message) {
        this.checks.push(message);
    }

    addWarning(message, type = 'general') {
        this.warnings.push({ message, type });
    }

    addError(message, type = 'general') {
        this.errors.push({ message, type });
    }

    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    hasEventListener(element, eventType) {
        // Método aproximado - verificar se o elemento tem event listeners
        // Não é 100% preciso mas dá uma indicação
        return element.onclick !== null || 
               element.onchange !== null || 
               element.hasAttribute('onclick') ||
               element.hasAttribute('onchange');
    }
}

// ===== INICIALIZAÇÃO GLOBAL =====

// Criar instância global
window.CaixaDebugger = new CaixaDebugger();

// Expor funções úteis para console
window.testSystem = () => window.CaixaDebugger.runFullDiagnosis();
window.quickCheck = () => {
    if (window.CaixaDebugger && typeof window.CaixaDebugger.quickHealthCheck === 'function') {
        return window.CaixaDebugger.quickHealthCheck();
    } else {
        console.warn('🔍 CaixaDebugger.quickHealthCheck não está disponível via quickCheck()');
        return null;
    }
};
window.testBrands = () => window.CaixaDebugger.testBrandMatching();

// Auto-executar verificação após carregamento
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Verificação de segurança antes de chamar o método
        if (window.CaixaDebugger && typeof window.CaixaDebugger.quickHealthCheck === 'function') {
            window.CaixaDebugger.quickHealthCheck();
        } else {
            console.warn('🔍 CaixaDebugger.quickHealthCheck não está disponível - sistema de debug limitado');
            // Fazer uma verificação básica alternativa
            console.log('🔍 Verificação básica: CaixaDebugger existe?', !!window.CaixaDebugger);
            if (window.CaixaDebugger) {
                console.log('🔍 Métodos disponíveis:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.CaixaDebugger)));
            }
        }
    }, 2000); // Aguardar 2s para todos os módulos carregarem
});

console.log('🔍 Sistema de debug carregado! Use testSystem() ou quickCheck() no console.');

