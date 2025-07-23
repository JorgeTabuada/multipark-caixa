// ===== SISTEMA DE TRATAMENTO DE ERROS =====

// Tipos de erro
const ERROR_TYPES = {
    NETWORK: 'network',
    SUPABASE: 'supabase', 
    VALIDATION: 'validation',
    FILE: 'file',
    AUTH: 'auth',
    GENERIC: 'generic'
};

// Severidade dos erros
const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100; // Máximo de erros a manter no histórico
        this.init();
    }

    init() {
        // Capturar erros globais de JavaScript
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });

        // Capturar promissões rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledRejection(event);
        });

        console.log('✅ Error Handler inicializado');
    }

    // Registar erro
    logError(error, type = ERROR_TYPES.GENERIC, severity = ERROR_SEVERITY.MEDIUM, context = {}) {
        const errorInfo = {
            id: APP_UTILS.generateId(),
            timestamp: new Date().toISOString(),
            type,
            severity,
            message: error.message || String(error),
            stack: error.stack || null,
            context,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        // Adicionar ao histórico
        this.errors.unshift(errorInfo);
        
        // Manter apenas os últimos erros
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Log no console
        this.logToConsole(errorInfo);

        // Mostrar notificação ao utilizador
        this.showUserNotification(errorInfo);

        // Enviar para tracking (se configurado)
        this.trackError(errorInfo);

        return errorInfo.id;
    }

    // Log para console com formatação
    logToConsole(errorInfo) {
        const { type, severity, message, context } = errorInfo;
        
        const style = this.getConsoleStyle(severity);
        const prefix = `[${type.toUpperCase()}]`;
        
        console.group(`%c${prefix} ${message}`, style);
        console.log('Severidade:', severity);
        console.log('Timestamp:', new Date(errorInfo.timestamp).toLocaleString('pt-PT'));
        
        if (Object.keys(context).length > 0) {
            console.log('Contexto:', context);
        }
        
        if (errorInfo.stack) {
            console.log('Stack:', errorInfo.stack);
        }
        
        console.groupEnd();
    }

    // Estilos para console
    getConsoleStyle(severity) {
        const styles = {
            [ERROR_SEVERITY.LOW]: 'color: #666; background: #f0f0f0; padding: 2px 6px; border-radius: 3px;',
            [ERROR_SEVERITY.MEDIUM]: 'color: #d68910; background: #fef9e7; padding: 2px 6px; border-radius: 3px;',
            [ERROR_SEVERITY.HIGH]: 'color: #d84315; background: #ffebee; padding: 2px 6px; border-radius: 3px;',
            [ERROR_SEVERITY.CRITICAL]: 'color: #fff; background: #d32f2f; padding: 2px 6px; border-radius: 3px;'
        };
        return styles[severity] || styles[ERROR_SEVERITY.MEDIUM];
    }

    // Mostrar notificação ao utilizador
    showUserNotification(errorInfo) {
        const { severity, message, type } = errorInfo;
        
        // Não mostrar erros de baixa severidade ao utilizador
        if (severity === ERROR_SEVERITY.LOW) return;

        const userMessage = this.getUserFriendlyMessage(type, message);
        
        // Usar sistema de notificações se existir
        if (window.NotificationSystem) {
            const notificationType = severity === ERROR_SEVERITY.CRITICAL ? 'error' : 'warning';
            window.NotificationSystem.show(userMessage, notificationType);
        } else {
            // Fallback para alert em casos críticos
            if (severity === ERROR_SEVERITY.CRITICAL) {
                alert(`Erro crítico: ${userMessage}`);
            }
        }
    }

    // Converter erro técnico em mensagem amigável
    getUserFriendlyMessage(type, message) {
        const friendlyMessages = {
            [ERROR_TYPES.NETWORK]: 'Erro de conexão. Verifique a sua ligação à internet.',
            [ERROR_TYPES.SUPABASE]: 'Erro na base de dados. Tente novamente em alguns momentos.',
            [ERROR_TYPES.AUTH]: 'Erro de autenticação. Por favor, faça login novamente.',
            [ERROR_TYPES.FILE]: 'Erro no processamento do ficheiro. Verifique o formato.',
            [ERROR_TYPES.VALIDATION]: 'Dados inválidos. Verifique os campos preenchidos.'
        };

        return friendlyMessages[type] || 'Ocorreu um erro inesperado. Tente novamente.';
    }

    // Tratamento de erros globais
    handleGlobalError(event) {
        this.logError(
            new Error(event.message), 
            ERROR_TYPES.GENERIC, 
            ERROR_SEVERITY.HIGH,
            {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            }
        );
    }

    // Tratamento de promissões rejeitadas
    handleUnhandledRejection(event) {
        this.logError(
            new Error(event.reason), 
            ERROR_TYPES.GENERIC, 
            ERROR_SEVERITY.HIGH,
            { type: 'unhandled_promise_rejection' }
        );
        
        // Prevenir que apareça no console do browser
        event.preventDefault();
    }

    // Métodos de conveniência para diferentes tipos de erro
    networkError(error, context = {}) {
        return this.logError(error, ERROR_TYPES.NETWORK, ERROR_SEVERITY.HIGH, context);
    }

    supabaseError(error, context = {}) {
        return this.logError(error, ERROR_TYPES.SUPABASE, ERROR_SEVERITY.HIGH, context);
    }

    authError(error, context = {}) {
        return this.logError(error, ERROR_TYPES.AUTH, ERROR_SEVERITY.CRITICAL, context);
    }

    validationError(error, context = {}) {
        return this.logError(error, ERROR_TYPES.VALIDATION, ERROR_SEVERITY.MEDIUM, context);
    }

    fileError(error, context = {}) {
        return this.logError(error, ERROR_TYPES.FILE, ERROR_SEVERITY.MEDIUM, context);
    }

    // Tracking de erros (placeholder para analytics)
    trackError(errorInfo) {
        // Aqui podes integrar com serviços como Sentry, LogRocket, etc.
        
        // Por enquanto, apenas armazenar localmente
        try {
            const stored = localStorage.getItem('multipark_errors') || '[]';
            const errors = JSON.parse(stored);
            errors.unshift({
                id: errorInfo.id,
                type: errorInfo.type,
                severity: errorInfo.severity,
                message: errorInfo.message,
                timestamp: errorInfo.timestamp
            });
            
            // Manter apenas os últimos 20 erros
            const trimmed = errors.slice(0, 20);
            localStorage.setItem('multipark_errors', JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Não foi possível armazenar erro:', e);
        }
    }

    // Obter histórico de erros
    getErrorHistory() {
        return this.errors;
    }

    // Limpar histórico
    clearErrors() {
        this.errors = [];
        try {
            localStorage.removeItem('multipark_errors');
        } catch (e) {
            console.warn('Não foi possível limpar histórico:', e);
        }
    }

    // Obter stats de erros
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            byType: {},
            bySeverity: {},
            last24h: 0
        };

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        this.errors.forEach(error => {
            // Por tipo
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            
            // Por severidade
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
            
            // Últimas 24h
            if (new Date(error.timestamp) > yesterday) {
                stats.last24h++;
            }
        });

        return stats;
    }
}

// Instância global
const errorHandler = new ErrorHandler();

// Helper functions globais
window.logError = (error, type, severity, context) => {
    return errorHandler.logError(error, type, severity, context);
};

window.logNetworkError = (error, context) => {
    return errorHandler.networkError(error, context);
};

window.logSupabaseError = (error, context) => {
    return errorHandler.supabaseError(error, context);
};

window.logAuthError = (error, context) => {
    return errorHandler.authError(error, context);
};

window.logValidationError = (error, context) => {
    return errorHandler.validationError(error, context);
};

window.logFileError = (error, context) => {
    return errorHandler.fileError(error, context);
};

// Expor globalmente
window.ErrorHandler = ErrorHandler;
window.ERROR_TYPES = ERROR_TYPES;
window.ERROR_SEVERITY = ERROR_SEVERITY;
window.errorHandler = errorHandler;

console.log('🛡️ Sistema de tratamento de erros carregado');
