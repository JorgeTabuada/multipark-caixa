// ===== SUPABASE INTEGRATION - VERSÃO CORRIGIDA =====
// Configuração direta sem variáveis de ambiente

// 🔧 INSTRUÇÕES PARA CORRIGIR O TOKEN:
// 1. Vai ao teu dashboard Supabase: https://supabase.com/dashboard
// 2. Seleciona o projeto: uvcmgzhwiibjcygqsjrm  
// 3. Settings > API
// 4. Copia a "anon public" key
// 5. Substitui na linha abaixo

// Configuração do Supabase
const SUPABASE_URL = 'https://uvcmgzhwiibjcygqsjrm.supabase.co';

// ⚠️ ATENÇÃO: SUBSTITUI ESTE TOKEN PELO TOKEN REAL DO DASHBOARD!
// Este é um placeholder - o token real tem +200 caracteres
const SUPABASE_ANON_KEY = 'SUBSTITUI_PELO_TOKEN_REAL_DO_DASHBOARD_SUPABASE';

// Validação básica do token
if (SUPABASE_ANON_KEY === 'SUBSTITUI_PELO_TOKEN_REAL_DO_DASHBOARD_SUPABASE') {
    console.error('🚨 ERRO: Token do Supabase não configurado!');
    console.error('🔧 VAI AO DASHBOARD DO SUPABASE E COPIA O TOKEN!');
    alert('🔑 Token do Supabase não configurado!\n\nVai ao dashboard do Supabase > Settings > API\ne substitui o token no ficheiro js/supabase-integration.js');
}

// Log para debug
console.log('🔧 Configuração Supabase:', {
    url: SUPABASE_URL,
    hasKey: SUPABASE_ANON_KEY !== 'SUBSTITUI_PELO_TOKEN_REAL_DO_DASHBOARD_SUPABASE',
    keyLength: SUPABASE_ANON_KEY.length
});

// Inicializar cliente Supabase
let supabaseClient;
try {
    if (SUPABASE_ANON_KEY !== 'SUBSTITUI_PELO_TOKEN_REAL_DO_DASHBOARD_SUPABASE') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Cliente Supabase inicializado com sucesso');
    } else {
        console.error('❌ Não é possível inicializar - token em falta');
        throw new Error('Token do Supabase não configurado');
    }
} catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error);
    throw error;
}

// Classe principal para gerir todos os dados
class CaixaMultiparkAPI {
    constructor() {
        this.client = supabaseClient;
        this.currentBatchId = null;
        this.currentUser = null;
        this.isInitialized = false;
    }

    // ===== AUTENTICAÇÃO =====
    async initAuth() {
        if (!this.client) {
            throw new Error('Cliente Supabase não inicializado - verifica o token!');
        }

        const { data: { user } } = await this.client.auth.getUser();
        this.currentUser = user;
        
        if (user) {
            console.log('✅ Utilizador autenticado:', user.email);
            return user;
        }
        
        // Se não estiver logado, redirecionar para login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }

    async login(email, password) {
        if (!this.client) {
            throw new Error('Cliente Supabase não inicializado - verifica o token!');
        }

        console.log('🔐 Tentando login com:', email);
        
        const { data, error } = await this.client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('❌ Erro de login:', error);
            throw new Error(error.message);
        }

        this.currentUser = data.user;
        console.log('✅ Login bem-sucedido:', data.user.email);
        return data.user;
    }

    async logout() {
        if (!this.client) return;
        
        const { error } = await this.client.auth.signOut();
        if (error) console.error('Erro no logout:', error);
        this.currentUser = null;
        window.location.href = 'login.html';
    }

    // ===== GESTÃO DE LOTES =====
    async createImportBatch(batchInfo) {
        if (!this.currentUser) throw new Error('Utilizador não autenticado');

        const { data, error } = await this.client
            .from('import_batches')
            .insert({
                batch_date: batchInfo.batchDate || new Date().toISOString().split('T')[0],
                sales_filename: batchInfo.salesFilename || null,
                deliveries_filename: batchInfo.deliveriesFilename || null,
                cash_filename: batchInfo.cashFilename || null,
                status: 'pending',
                created_by: this.currentUser.id
            })
            .select()
            .single();

        if (error) throw error;

        this.currentBatchId = data.id;
        console.log('Lote criado:', data.id);
        return data;
    }

    async getCurrentBatch() {
        if (this.currentBatchId) return this.currentBatchId;

        // Buscar o lote mais recente
        const { data, error } = await this.client
            .from('import_batches')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            this.currentBatchId = data[0].id;
            return this.currentBatchId;
        }

        // Criar novo lote se não existir
        const newBatch = await this.createImportBatch({});
        return newBatch.id;
    }

    // ===== IMPORTAÇÃO DE DADOS =====
    async importSalesOrders(salesData) {
        if (!salesData || salesData.length === 0) return { count: 0 };

        const batchId = await this.getCurrentBatch();
        
        // Preparar dados para inserção
        const formattedData = salesData.map(record => ({
            license_plate: record.licensePlate || '',
            booking_price: parseFloat(record.bookingPrice) || 0,
            park_brand: record.parkBrand || '',
            share: parseFloat(record.share) || 0,
            booking_date: record.bookingDate || null,
            check_in: record.checkIn || null,
            check_out: record.checkOut || null,
            price_on_delivery: parseFloat(record.priceOnDelivery) || 0,
            payment_method: record.paymentMethod ? record.paymentMethod.toLowerCase() : '',
            driver: record.driver || '',
            campaign: record.campaign || '',
            campaign_pay: record.campaignPay === 'true' || record.campaignPay === true,
            has_online_payment: record.hasOnlinePayment === 'true' || record.hasOnlinePayment === true,
            original_data: record,
            import_batch_id: batchId,
            created_by: this.currentUser.id
        }));

        const { data, error } = await this.client
            .from('sales_orders')
            .insert(formattedData)
            .select('id');

        if (error) throw error;

        // Atualizar contagem no lote
        await this.client
            .from('import_batches')
            .update({ sales_count: formattedData.length })
            .eq('id', batchId);

        console.log('Sales orders importados:', data.length);
        return { count: data.length };
    }

    async importDeliveries(deliveriesData) {
        if (!deliveriesData || deliveriesData.length === 0) return { count: 0 };

        const batchId = await this.getCurrentBatch();
        
        const formattedData = deliveriesData.map(record => ({
            license_plate: record.licensePlate || '',
            alocation: record.alocation || '',
            booking_price: parseFloat(record.bookingPrice) || 0,
            park_brand: record.parkBrand || '',
            campaign: record.campaign || '',
            check_in: record.checkIn || null,
            driver: record.driver || '',
            campaign_pay: record.campaignPay === 'true' || record.campaignPay === true,
            has_online_payment: record.hasOnlinePayment === 'true' || record.hasOnlinePayment === true,
            original_data: record,
            import_batch_id: batchId,
            created_by: this.currentUser.id
        }));

        const { data, error } = await this.client
            .from('deliveries')
            .insert(formattedData)
            .select('id');

        if (error) throw error;

        await this.client
            .from('import_batches')
            .update({ deliveries_count: formattedData.length })
            .eq('id', batchId);

        console.log('Deliveries importadas:', data.length);
        return { count: data.length };
    }

    async importCashRecords(cashData) {
        if (!cashData || cashData.length === 0) return { count: 0 };

        const batchId = await this.getCurrentBatch();
        
        const formattedData = cashData.map(record => ({
            license_plate: record.licensePlate || '',
            driver: record.condutorEntrega || record.driver || '',
            payment_method: record.paymentMethod ? record.paymentMethod.toLowerCase() : '',
            booking_price: parseFloat(record.bookingPrice) || 0,
            price_on_delivery: parseFloat(record.priceOnDelivery) || 0,
            price_difference: (parseFloat(record.priceOnDelivery) || 0) - (parseFloat(record.bookingPrice) || 0),
            campaign: record.campaign || '',
            import_batch_id: batchId,
            created_by: this.currentUser.id
        }));

        const { data, error } = await this.client
            .from('cash_records')
            .insert(formattedData)
            .select('id');

        if (error) throw error;

        await this.client
            .from('import_batches')
            .update({ 
                cash_count: formattedData.length,
                status: 'completed'
            })
            .eq('id', batchId);

        console.log('Cash records importados:', data.length);
        return { count: data.length };
    }

    // ===== OBTENÇÃO DE DADOS =====
    async getSalesOrders(batchId = null) {
        const batch = batchId || await this.getCurrentBatch();
        
        const { data, error } = await this.client
            .from('sales_orders')
            .select('*')
            .eq('import_batch_id', batch)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async getDeliveries(batchId = null) {
        const batch = batchId || await this.getCurrentBatch();
        
        const { data, error } = await this.client
            .from('deliveries')
            .select('*')
            .eq('import_batch_id', batch)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async getCashRecords(batchId = null) {
        const batch = batchId || await this.getCurrentBatch();
        
        const { data, error } = await this.client
            .from('cash_records')
            .select('*')
            .eq('import_batch_id', batch)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    // ===== COMPARAÇÕES =====
    async saveComparison(comparisonResult) {
        const batchId = await this.getCurrentBatch();
        
        const { data, error } = await this.client
            .from('comparisons')
            .insert({
                license_plate: comparisonResult.licensePlate,
                status: comparisonResult.status,
                sales_order_id: comparisonResult.salesOrderId || null,
                delivery_id: comparisonResult.deliveryId || null,
                inconsistencies: comparisonResult.inconsistencies || null,
                resolution: comparisonResult.resolution || null,
                resolution_notes: comparisonResult.resolutionNotes || null
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getComparisons(batchId = null) {
        const { data, error } = await this.client
            .from('comparisons')
            .select(`
                *,
                sales_order:sales_orders(*),
                delivery:deliveries(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    // ===== VALIDAÇÕES =====
    async saveValidation(validationData) {
        const { data, error } = await this.client
            .from('validations')
            .insert({
                license_plate: validationData.licensePlate,
                comparison_id: validationData.comparisonId || null,
                cash_record_id: validationData.cashRecordId || null,
                status: validationData.status,
                inconsistency_type: validationData.inconsistencyType || null,
                original_payment_method: validationData.originalPaymentMethod || null,
                corrected_payment_method: validationData.correctedPaymentMethod || null,
                original_price: validationData.originalPrice || null,
                corrected_price: validationData.correctedPrice || null,
                notes: validationData.notes || null,
                validated_by: this.currentUser.id,
                validated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ===== ESTATÍSTICAS DASHBOARD =====
    async getDashboardStats(batchId = null) {
        const batch = batchId || await this.getCurrentBatch();
        
        // Usar a função RPC criada no schema
        const { data, error } = await this.client
            .rpc('get_dashboard_stats_rpc', { batch_id: batch });

        if (error) {
            console.warn('Erro na função RPC, usando query manual:', error);
            return await this.getDashboardStatsManual(batch);
        }

        return data;
    }

    async getDashboardStatsManual(batchId) {
        // Fallback manual se a função RPC não funcionar
        const [salesData, deliveriesData, cashData] = await Promise.all([
            this.getSalesOrders(batchId),
            this.getDeliveries(batchId),
            this.getCashRecords(batchId)
        ]);

        const stats = {
            sales_count: salesData.length,
            deliveries_count: deliveriesData.length,
            cash_count: cashData.length,
            total_cash: cashData.filter(c => c.payment_method === 'numerário').reduce((sum, c) => sum + parseFloat(c.price_on_delivery || 0), 0),
            total_multibanco: cashData.filter(c => c.payment_method === 'multibanco').reduce((sum, c) => sum + parseFloat(c.price_on_delivery || 0), 0),
            total_online: cashData.filter(c => c.payment_method === 'online').reduce((sum, c) => sum + parseFloat(c.price_on_delivery || 0), 0),
            total_no_pay: cashData.filter(c => c.payment_method === 'no pay').reduce((sum, c) => sum + parseFloat(c.price_on_delivery || 0), 0)
        };

        return stats;
    }

    // ===== EXPORTAÇÕES =====
    async saveExport(exportData) {
        const { data, error } = await this.client
            .from('exports')
            .insert({
                filename: exportData.filename,
                record_count: exportData.recordCount,
                export_data: exportData.data,
                created_by: this.currentUser.id
            })
            .select()
            .single();

        if (error) throw error;
        console.log('Exportação salva na BD:', data.id);
        return data;
    }

    async getExports() {
        const { data, error } = await this.client
            .from('exports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    // ===== INICIALIZAÇÃO =====
    async initialize() {
        if (this.isInitialized) return;

        try {
            if (!this.client) {
                throw new Error('Cliente Supabase não inicializado - verifica o token!');
            }
            
            await this.initAuth();
            this.isInitialized = true;
            console.log('✅ CaixaMultiparkAPI inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }
}

// Instância global da API
const caixaAPI = new CaixaMultiparkAPI();

// Expor globalmente para compatibilidade
window.caixaAPI = caixaAPI;
window.supabaseClient = supabaseClient;

// Auto-inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await caixaAPI.initialize();
    } catch (error) {
        console.error('❌ Erro na inicialização automática:', error);
        
        // Mostrar alerta se o token estiver em falta
        if (error.message.includes('Token do Supabase não configurado') || 
            error.message.includes('verifica o token')) {
            setTimeout(() => {
                alert('🔑 Token do Supabase não configurado!\n\n' +
                      '📋 Para corrigir:\n' +
                      '1. Vai ao dashboard do Supabase\n' +
                      '2. Settings > API\n' +
                      '3. Copia a "anon public" key\n' +
                      '4. Substitui no ficheiro js/supabase-integration.js');
            }, 1000);
        }
    }
});

console.log('📊 Caixa Multipark API carregada - Necessário configurar token!');
