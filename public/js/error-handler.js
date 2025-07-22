// ===== SISTEMA DE TRATAMENTO DE ERROS =====
// Tratamento consistente de erros para a aplicação Caixa Multipark

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.setupGlobalHandlers();
    }

    // Configurar handlers globais
    setupGlobalHandlers() {
        // Capturar erros JavaScript não tratados
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', event.error || event.message, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Capturar promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', event.reason, {
                promise: event.promise
            });
        });
    }

    // Registar erro
    logError(type, message, details = {}) {
        const error = {
            id: this.generateId(),
            type,
            message: String(message),
            details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errors.push(error);
        
        // Limitar número de erros armazenados
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log no console para desenvolvimento
        console.error(`[${type}]`, message, details);

        // Mostrar notificação ao utilizador se for erro crítico
        if (this.isCriticalError(type)) {
            this.showUserNotification(message);
        }

        return error.id;
    }

    // Verificar se é erro crítico
    isCriticalError(type) {
        const criticalTypes = [
            'Authentication Error',
            'Database Error',
            'File Processing Error',
            'Network Error'
        ];
        return criticalTypes.includes(type);
    }

    // Mostrar notificação ao utilizador
    showUserNotification(message) {
        // Usar sistema de notificações existente se disponível
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            // Fallback para alert
            alert(`Erro: ${message}`);
        }
    }

    // Gerar ID único
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Obter erros por tipo
    getErrorsByType(type) {
        return this.errors.filter(error => error.type === type);
    }

    // Obter erros recentes
    getRecentErrors(minutes = 10) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.errors.filter(error => new Date(error.timestamp) > cutoff);
    }

    // Limpar erros
    clearErrors() {
        this.errors = [];
    }

    // Exportar erros para análise
    exportErrors() {
        return {
            errors: this.errors,
            summary: this.getErrorSummary(),
            exportedAt: new Date().toISOString()
        };
    }

    // Resumo de erros
    getErrorSummary() {
        const summary = {};
        this.errors.forEach(error => {
            summary[error.type] = (summary[error.type] || 0) + 1;
        });
        return summary;
    }

    // Métodos de conveniência para diferentes tipos de erro
    authError(message, details) {
        return this.logError('Authentication Error', message, details);
    }

    dbError(message, details) {
        return this.logError('Database Error', message, details);
    }

    fileError(message, details) {
        return this.logError('File Processing Error', message, details);
    }

    networkError(message, details) {
        return this.logError('Network Error', message, details);
    }

    validationError(message, details) {
        return this.logError('Validation Error', message, details);
    }

    userError(message, details) {
        return this.logError('User Error', message, details);
    }
}

// Instância global
const errorHandler = new ErrorHandler();

// Função de conveniência para registar erros
function logError(type, message, details) {
    return errorHandler.logError(type, message, details);
}

// Wrapper para funções assíncronas
function asyncWrapper(fn) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            errorHandler.logError('Async Function Error', error.message, {
                functionName: fn.name,
                arguments: args,
                stack: error.stack
            });
            throw error;
        }
    };
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.errorHandler = errorHandler;
    window.logError = logError;
    window.asyncWrapper = asyncWrapper;
}

