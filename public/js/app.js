// ===== APLICAÇÃO PRINCIPAL CAIXA MULTIPARK =====
// Este ficheiro coordena todos os módulos da aplicação

class CaixaMultiparkApp {
    constructor() {
        this.currentTab = 'import';
        this.modules = {};
        this.isInitialized = false;
        this.currentUser = null;
        
        console.log('🚀 Caixa Multipark App inicializando...');
    }

    // ===== INICIALIZAÇÃO =====
    
    async init() {
        try {
            // Aguardar carregamento do Supabase
            await this.waitForSupabase();
            
            // Inicializar autenticação
            await this.initAuth();
            
            // Configurar navegação
            this.setupNavigation();
            
            // Configurar eventos globais
            this.setupGlobalEvents();
            
            // Inicializar módulos
            await this.initModules();
            
            // Mostrar aplicação
            this.showApp();
            
            this.isInitialized = true;
            console.log('✅ Aplicação inicializada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showError(error.message);
        }
    }
    
    async waitForSupabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkSupabase = () => {
                attempts++;
                
                if (window.supabase && window.caixaAPI) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Timeout: Supabase não carregou'));
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            
            checkSupabase();
        });
    }
    
    async initAuth() {
        if (!window.caixaAPI) {
            throw new Error('CaixaAPI não disponível');
        }
        
        // Inicializar autenticação
        this.currentUser = await window.caixaAPI.initAuth();
        
        if (!this.currentUser) {
            // Redirecionar para login se não estiver autenticado
            window.location.href = 'login.html';
            return;
        }
        
        // Atualizar interface com dados do utilizador
        this.updateUserInterface();
    }
    
    updateUserInterface() {
        const userEmailElement = document.getElementById('user-email');
        const currentDateElement = document.getElementById('current-date');
        const lastSyncElement = document.getElementById('last-sync');
        
        if (userEmailElement && this.currentUser) {
            userEmailElement.textContent = this.currentUser.email;
        }
        
        if (currentDateElement) {
            const today = new Date();
            currentDateElement.textContent = today.toLocaleDateString('pt-PT');
        }
        
        if (lastSyncElement) {
            const now = new Date();
            lastSyncElement.textContent = `Última sincronização: ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
        }
    }
    
    // ===== NAVEGAÇÃO =====
    
    setupNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        const contentSections = document.querySelectorAll('.content-section');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }
    
    switchTab(tabName) {
        // Atualizar tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Atualizar conteúdo
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-section`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Executar ações específicas do tab
        this.onTabSwitch(tabName);
    }
    
    onTabSwitch(tabName) {
        switch (tabName) {
            case 'dashboard':
                if (this.modules.dashboard && this.modules.dashboard.refreshDashboard) {
                    this.modules.dashboard.refreshDashboard();
                }
                break;
            case 'validate':
                if (this.modules.validation && this.modules.validation.refreshDrivers) {
                    this.modules.validation.refreshDrivers();
                }
                break;
        }
    }
    
    // ===== EVENTOS GLOBAIS =====
    
    setupGlobalEvents() {
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await window.caixaAPI.logout();
                } catch (error) {
                    console.error('Erro no logout:', error);
                }
            });
        }
        
        // Refresh dashboard
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.refreshData();
            });
        }
        
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            // Ctrl+R para refresh
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
            
            // Escape para fechar modais
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Eventos de conexão
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
        });
    }
    
    async refreshData() {
        const refreshBtn = document.getElementById('refresh-dashboard');
        const lastSyncElement = document.getElementById('last-sync');
        
        try {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
            
            // Refresh dos módulos
            if (this.modules.dashboard && this.modules.dashboard.refreshDashboard) {
                await this.modules.dashboard.refreshDashboard();
            }
            
            // Atualizar timestamp
            if (lastSyncElement) {
                const now = new Date();
                lastSyncElement.textContent = `Última sincronização: ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
            }
            
            this.showNotification('Dados atualizados com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro no refresh:', error);
            this.showNotification('Erro ao atualizar dados', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            }
        }
    }
    
    // ===== MÓDULOS =====
    
    async initModules() {
        // Aguardar que todos os módulos estejam carregados
        await this.waitForModules();
        
        // Inicializar cada módulo
        if (window.validationSystem) {
            this.modules.validation = window.validationSystem;
        }
        
        if (window.dashboard) {
            this.modules.dashboard = window.dashboard;
        }
        
        if (window.fileProcessor) {
            this.modules.fileProcessor = window.fileProcessor;
        }
        
        if (window.notifications) {
            this.modules.notifications = window.notifications;
        }
        
        console.log('📦 Módulos carregados:', Object.keys(this.modules));
    }
    
    async waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 30;
            
            const checkModules = () => {
                attempts++;
                
                // Verificar se os módulos principais estão carregados
                const modulesLoaded = (
                    window.validationSystem &&
                    window.caixaAPI
                );
                
                if (modulesLoaded || attempts >= maxAttempts) {
                    resolve();
                } else {
                    setTimeout(checkModules, 100);
                }
            };
            
            checkModules();
        });
    }
    
    // ===== INTERFACE =====
    
    showApp() {
        const appLoading = document.getElementById('app-loading');
        const mainApp = document.getElementById('main-app');
        
        if (appLoading) {
            appLoading.classList.add('hidden');
        }
        
        if (mainApp) {
            mainApp.classList.remove('hidden');
        }
        
        this.updateConnectionStatus(true);
    }
    
    showError(message) {
        const appLoading = document.getElementById('app-loading');
        const loadingContent = document.querySelector('.loading-content');
        
        if (loadingContent) {
            loadingContent.innerHTML = `
                <div style="color: #dc3545;">
                    <i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 15px;"></i>
                    <h3>Erro de Inicialização</h3>
                    <p>${message}</p>
                    <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top: 15px;">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
        
        this.updateConnectionStatus(false);
    }
    
    updateConnectionStatus(connected) {
        const connectionStatus = document.getElementById('connection-status');
        
        if (connectionStatus) {
            if (connected) {
                connectionStatus.className = 'connection-status connected';
                connectionStatus.innerHTML = '<i class="fas fa-wifi"></i> Conectado ao Supabase';
            } else {
                connectionStatus.className = 'connection-status disconnected';
                connectionStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> Erro de conexão';
            }
        }
    }
    
    // ===== NOTIFICAÇÕES =====
    
    showNotification(message, type = 'info', duration = 3000) {
        if (this.modules.notifications && this.modules.notifications.show) {
            this.modules.notifications.show(message, type, duration);
        } else {
            // Fallback para console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // ===== MODAIS =====
    
    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    // ===== UTILITÁRIOS =====
    
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value || 0);
    }
    
    formatDate(date) {
        if (!date) return '--';
        return new Date(date).toLocaleDateString('pt-PT');
    }
    
    formatDateTime(date) {
        if (!date) return '--';
        return new Date(date).toLocaleString('pt-PT');
    }
    
    // ===== API PÚBLICA =====
    
    getModule(name) {
        return this.modules[name];
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getCurrentTab() {
        return this.currentTab;
    }
    
    isReady() {
        return this.isInitialized;
    }
}

// ===== INICIALIZAÇÃO GLOBAL =====

// Criar instância global da aplicação
window.caixaApp = new CaixaMultiparkApp();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.caixaApp.init();
    } catch (error) {
        console.error('Erro fatal na inicialização:', error);
    }
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaixaMultiparkApp;
}

console.log('📱 App.js carregado!');

