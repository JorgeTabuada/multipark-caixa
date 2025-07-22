// ===== SISTEMA DE NOTIFICAÇÕES PARA CAIXA MULTIPARK =====
// Sistema de toast notifications, modals e alertas

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
        console.log('🔔 Sistema de notificações carregado!');
    }

    // ===== INICIALIZAÇÃO =====
    
    init() {
        this.createContainer();
        this.createStyles();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }
    
    createStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px 20px;
                min-width: 300px;
                max-width: 400px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-left: 4px solid #007bff;
                opacity: 0;
                position: relative;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.success {
                border-left-color: #28a745;
            }
            
            .notification.warning {
                border-left-color: #ffc107;
            }
            
            .notification.error {
                border-left-color: #dc3545;
            }
            
            .notification.info {
                border-left-color: #17a2b8;
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                justify-content: between;
                margin-bottom: 8px;
            }
            
            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                margin-left: 10px;
                line-height: 1;
            }
            
            .notification-close:hover {
                color: #333;
            }
            
            .notification-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
                margin: 0;
            }
            
            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .notification-btn {
                background: #007bff;
                border: none;
                border-radius: 4px;
                color: white;
                cursor: pointer;
                font-size: 12px;
                padding: 6px 12px;
                transition: background 0.2s;
            }
            
            .notification-btn:hover {
                background: #0056b3;
            }
            
            .notification-btn.secondary {
                background: #6c757d;
            }
            
            .notification-btn.secondary:hover {
                background: #5a6268;
            }
            
            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(0, 123, 255, 0.3);
                border-radius: 0 0 8px 8px;
                transition: width linear;
            }
            
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                backdrop-filter: blur(2px);
            }
            
            .loading-content {
                background: white;
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 300px;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .processing-indicator {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9998;
                backdrop-filter: blur(1px);
            }
            
            .processing-content {
                background: white;
                padding: 30px 40px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                max-width: 350px;
            }
            
            .processing-content .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            .processing-content h3 {
                margin: 0 0 10px;
                color: #333;
                font-size: 18px;
            }
            
            .processing-content p {
                margin: 0;
                color: #666;
                font-size: 14px;
            }
        `;
        
        document.head.appendChild(styles);
    }

    // ===== NOTIFICAÇÕES TOAST =====
    
    show(title, message, type = 'info', options = {}) {
        const notification = this.createNotification(title, message, type, options);
        this.container.appendChild(notification);
        
        // Mostrar com animação
        setTimeout(() => {
            notification.classList.add('show');
        }, 50);
        
        // Auto-remover se configurado
        if (options.autoRemove !== false) {
            const timeout = options.timeout || 5000;
            setTimeout(() => {
                this.remove(notification);
            }, timeout);
        }
        
        // Adicionar à lista
        this.notifications.push(notification);
        
        return notification;
    }
    
    createNotification(title, message, type, options) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Ícone baseado no tipo
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    ${icon} ${title}
                </div>
                <button class="notification-close">&times;</button>
            </div>
            <p class="notification-message">${message}</p>
            ${options.actions ? this.createActions(options.actions) : ''}
            ${options.showProgress ? '<div class="notification-progress"></div>' : ''}
        `;
        
        // Event listeners
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(notification);
        });
        
        // Click no notification
        notification.addEventListener('click', (e) => {
            if (e.target === closeBtn || e.target.classList.contains('notification-btn')) return;
            
            if (options.onClick) {
                options.onClick(notification);
            }
        });
        
        return notification;
    }
    
    createActions(actions) {
        const actionsHTML = actions.map(action => 
            `<button class="notification-btn ${action.type || ''}" data-action="${action.id}">
                ${action.text}
            </button>`
        ).join('');
        
        return `<div class="notification-actions">${actionsHTML}</div>`;
    }
    
    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle" style="color: #28a745;"></i>',
            warning: '<i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>',
            error: '<i class="fas fa-times-circle" style="color: #dc3545;"></i>',
            info: '<i class="fas fa-info-circle" style="color: #17a2b8;"></i>',
            default: '<i class="fas fa-bell" style="color: #007bff;"></i>'
        };
        
        return icons[type] || icons.default;
    }
    
    remove(notification) {
        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    // ===== MÉTODOS DE CONVENIÊNCIA =====
    
    success(title, message, options = {}) {
        return this.show(title, message, 'success', options);
    }
    
    error(title, message, options = {}) {
        return this.show(title, message, 'error', options);
    }
    
    warning(title, message, options = {}) {
        return this.show(title, message, 'warning', options);
    }
    
    info(title, message, options = {}) {
        return this.show(title, message, 'info', options);
    }

    // ===== CONFIRMAÇÃO =====
    
    confirm(title, message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        
        overlay.innerHTML = `
            <div class="loading-content">
                <h3>${title}</h3>
                <p style="margin-bottom: 20px;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="notification-btn" id="confirm-yes">Sim</button>
                    <button class="notification-btn secondary" id="confirm-no">Não</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const yesBtn = overlay.querySelector('#confirm-yes');
        const noBtn = overlay.querySelector('#confirm-no');
        
        yesBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        });
        
        noBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        });
        
        // Fechar com ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', escHandler);
                if (onCancel) onCancel();
            }
        };
        
        document.addEventListener('keydown', escHandler);
    }

    // ===== LOADING =====
    
    showLoading(message = 'A carregar...', title = 'Aguarda') {
        const overlay = document.createElement('div');
        overlay.id = 'app-loading-overlay';
        overlay.className = 'loading-overlay';
        
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }
    
    hideLoading() {
        const overlay = document.getElementById('app-loading-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }

    // ===== PROCESSING INDICATOR =====
    
    showProcessing(message, title = 'A processar') {
        let indicator = document.getElementById('processing-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'processing-indicator';
            indicator.className = 'processing-indicator';
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div class="processing-content">
                <div class="spinner"></div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
        
        indicator.style.display = 'flex';
        return indicator;
    }
    
    hideProcessing() {
        const indicator = document.getElementById('processing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    updateProcessing(message, title) {
        const indicator = document.getElementById('processing-indicator');
        if (indicator) {
            const content = indicator.querySelector('.processing-content');
            if (content) {
                content.innerHTML = `
                    <div class="spinner"></div>
                    <h3>${title || 'A processar'}</h3>
                    <p>${message}</p>
                `;
            }
        }
    }

    // ===== LIMPAR TODAS =====
    
    clearAll() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
        
        this.hideLoading();
        this.hideProcessing();
    }
}

// ===== INSTÂNCIA GLOBAL =====

const notifications = new NotificationSystem();

// Expor globalmente
window.notifications = notifications;

// ===== FUNÇÕES DE CONVENIÊNCIA GLOBAIS =====

window.showNotification = (title, message, type, options) => {
    return notifications.show(title, message, type, options);
};

window.showSuccess = (title, message, options) => {
    return notifications.success(title, message, options);
};

window.showError = (title, message, options) => {
    return notifications.error(title, message, options);
};

window.showWarning = (title, message, options) => {
    return notifications.warning(title, message, options);
};

window.showInfo = (title, message, options) => {
    return notifications.info(title, message, options);
};

window.showConfirm = (title, message, onConfirm, onCancel) => {
    return notifications.confirm(title, message, onConfirm, onCancel);
};

window.showLoading = (message, title) => {
    return notifications.showLoading(message, title);
};

window.hideLoading = () => {
    return notifications.hideLoading();
};

window.showProcessing = (message, title) => {
    return notifications.showProcessing(message, title);
};

window.hideProcessing = () => {
    return notifications.hideProcessing();
};

window.updateProcessing = (message, title) => {
    return notifications.updateProcessing(message, title);
};

// ===== INTEGRAÇÃO COM ERROS GLOBAIS =====

window.addEventListener('error', (event) => {
    console.error('Erro global capturado:', event.error);
    notifications.error(
        'Erro na Aplicação',
        'Ocorreu um erro inesperado. Verifica a consola para mais detalhes.',
        { timeout: 10000 }
    );
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejeitada:', event.reason);
    notifications.error(
        'Erro de Processamento',
        'Erro ao processar operação. Tenta novamente.',
        { timeout: 8000 }
    );
});

console.log('✅ Sistema de notificações carregado e pronto!');