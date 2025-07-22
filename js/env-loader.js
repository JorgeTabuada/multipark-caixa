// ===== CARREGADOR DE VARIÁVEIS DE AMBIENTE =====
// Script para carregar variáveis de ambiente do Vercel no frontend

(function() {
    'use strict';
    
    // Função para carregar variáveis de ambiente
    function loadEnvironmentVariables() {
        // Tentar diferentes métodos para obter as variáveis
        
        // Método 1: Variáveis injetadas pelo Vercel durante o build
        if (typeof process !== 'undefined' && process.env) {
            window.SUPABASE_URL = process.env.SUPABASE_URL;
            window.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
        }
        
        // Método 2: Fetch das variáveis via API (se disponível)
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            // Fallback para valores conhecidos (temporário)
            window.SUPABASE_URL = 'https://uvcmgzhwiibjcygqsjrm.supabase.co';
            window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Y21nemh3aWliamN5Z3FzanJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY1MDUzNTUsImV4cCI6MjAzMjA4MTM1NX0.1MDUzNTUslmV4cCI6MTMjA4MTM1NX0';
        }
        
        // Log para debug
        console.log('🌍 Variáveis de ambiente carregadas:', {
            hasUrl: !!window.SUPABASE_URL,
            hasKey: !!window.SUPABASE_ANON_KEY,
            url: window.SUPABASE_URL
        });
        
        // Disparar evento personalizado quando as variáveis estiverem prontas
        window.dispatchEvent(new CustomEvent('env-loaded', {
            detail: {
                SUPABASE_URL: window.SUPABASE_URL,
                SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY
            }
        }));
    }
    
    // Carregar variáveis quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadEnvironmentVariables);
    } else {
        loadEnvironmentVariables();
    }
})();

