// Sistema de Exportação para Excel - Caixa Multipark

class ExportSystem {
    constructor() {
        this.exportHistory = [];
        this.isExporting = false;
        
        console.log('📊 Sistema de Exportação inicializado');
        this.init();
    }

    // ===== INICIALIZAÇÃO =====
    
    init() {
        this.setupEventListeners();
        this.loadExportHistory();
    }
    
    setupEventListeners() {
        // Event listener para o botão de exportação
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
            console.log('✅ Event listener do botão de exportação configurado');
        } else {
            console.warn('⚠️ Botão de exportação não encontrado');
        }
    }

    // ===== EXPORTAÇÃO PRINCIPAL =====
    
    async exportToExcel() {
        if (this.isExporting) {
            showWarning('Exportação em Curso', 'Aguarda que a exportação atual termine.');
            return;
        }

        try {
            this.isExporting = true;
            showProcessing('A preparar exportação...', 'Exportação');
            
            // Coletar todos os dados disponíveis
            const exportData = await this.collectAllData();
            
            if (!exportData || Object.keys(exportData).length === 0) {
                hideProcessing();
                showWarning('Sem Dados', 'Não há dados disponíveis para exportar. Importa e processa os ficheiros primeiro.');
                return;
            }

            updateProcessing('A gerar ficheiro Excel...', 'Exportação');
            
            // Gerar ficheiro Excel
            const workbook = this.createWorkbook(exportData);
            
            updateProcessing('A fazer download...', 'Exportação');
            
            // Fazer download
            await this.downloadWorkbook(workbook);
            
            // Registar no histórico
            this.addToHistory(exportData);
            
            hideProcessing();
            showSuccess('Exportação Concluída', 'Ficheiro Excel gerado e transferido com sucesso!');
            
        } catch (error) {
            hideProcessing();
            console.error('Erro na exportação:', error);
            showError('Erro de Exportação', `Erro ao exportar dados: ${error.message}`);
        } finally {
            this.isExporting = false;
        }
    }

    // ===== COLETA DE DADOS =====
    
    async collectAllData() {
        const data = {};
        
        try {
            // 1. Dados da comparação (Odoo vs Back Office)
            if (window.comparator && window.comparator.getResults) {
                const comparisonData = window.comparator.getResults();
                if (comparisonData && comparisonData.all && comparisonData.all.length > 0) {
                    data.comparison = comparisonData.all;
                    console.log(`📊 Dados de comparação: ${data.comparison.length} registos`);
                }
            }

            // 2. Dados da validação de caixa
            if (window.validationSystem) {
                const validatedDeliveries = window.validationSystem.validatedDeliveries || [];
                const pendingDeliveries = window.validationSystem.pendingDeliveries || [];
                
                if (validatedDeliveries.length > 0 || pendingDeliveries.length > 0) {
                    data.validatedDeliveries = validatedDeliveries;
                    data.pendingDeliveries = pendingDeliveries;
                    console.log(`📦 Entregas validadas: ${validatedDeliveries.length}`);
                    console.log(`⏳ Entregas pendentes: ${pendingDeliveries.length}`);
                }
            }

            // 3. Dados do dashboard
            if (window.dashboard && window.dashboard.getStats) {
                const dashboardStats = window.dashboard.getStats();
                if (dashboardStats) {
                    data.statistics = dashboardStats;
                    console.log('📈 Estatísticas do dashboard coletadas');
                }
            }

            // 4. Dados do Supabase (se disponível)
            if (window.supabase) {
                try {
                    const supabaseData = await this.collectSupabaseData();
                    if (supabaseData) {
                        data.supabaseData = supabaseData;
                        console.log('🗄️ Dados do Supabase coletados');
                    }
                } catch (error) {
                    console.warn('Erro ao coletar dados do Supabase:', error);
                }
            }

            console.log('📊 Dados coletados:', Object.keys(data));
            return data;
            
        } catch (error) {
            console.error('Erro na coleta de dados:', error);
            throw new Error('Erro ao coletar dados para exportação');
        }
    }

    async collectSupabaseData() {
        try {
            const data = {};
            
            // Coletar dados das tabelas principais
            const tables = ['sales_orders', 'deliveries', 'cash_records', 'comparisons'];
            
            for (const table of tables) {
                try {
                    const { data: tableData, error } = await window.supabase
                        .from(table)
                        .select('*')
                        .limit(1000); // Limitar para evitar sobrecarga
                    
                    if (error) {
                        console.warn(`Erro ao coletar ${table}:`, error);
                    } else if (tableData && tableData.length > 0) {
                        data[table] = tableData;
                        console.log(`📋 ${table}: ${tableData.length} registos`);
                    }
                } catch (err) {
                    console.warn(`Erro na tabela ${table}:`, err);
                }
            }
            
            return Object.keys(data).length > 0 ? data : null;
            
        } catch (error) {
            console.warn('Erro geral no Supabase:', error);
            return null;
        }
    }

    // ===== CRIAÇÃO DO WORKBOOK =====
    
    createWorkbook(data) {
        // Usar a biblioteca XLSX (assumindo que está carregada)
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não encontrada. Adiciona a biblioteca para exportação Excel.');
        }

        const workbook = XLSX.utils.book_new();
        
        // 1. Folha de Comparação
        if (data.comparison && data.comparison.length > 0) {
            const comparisonSheet = this.createComparisonSheet(data.comparison);
            XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparação');
        }

        // 2. Folha de Entregas Validadas
        if (data.validatedDeliveries && data.validatedDeliveries.length > 0) {
            const validatedSheet = this.createDeliveriesSheet(data.validatedDeliveries, 'Validadas');
            XLSX.utils.book_append_sheet(workbook, validatedSheet, 'Entregas Validadas');
        }

        // 3. Folha de Entregas Pendentes
        if (data.pendingDeliveries && data.pendingDeliveries.length > 0) {
            const pendingSheet = this.createDeliveriesSheet(data.pendingDeliveries, 'Pendentes');
            XLSX.utils.book_append_sheet(workbook, pendingSheet, 'Entregas Pendentes');
        }

        // 4. Folha de Estatísticas
        if (data.statistics) {
            const statsSheet = this.createStatisticsSheet(data.statistics);
            XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estatísticas');
        }

        // 5. Folhas do Supabase
        if (data.supabaseData) {
            Object.keys(data.supabaseData).forEach(tableName => {
                const tableData = data.supabaseData[tableName];
                if (tableData && tableData.length > 0) {
                    const tableSheet = XLSX.utils.json_to_sheet(tableData);
                    XLSX.utils.book_append_sheet(workbook, tableSheet, tableName.replace('_', ' ').toUpperCase());
                }
            });
        }

        return workbook;
    }

    createComparisonSheet(data) {
        const processedData = data.map(item => ({
            'Matrícula': item.licensePlate || '',
            'Alocação': item.alocation || '',
            'Preço Booking (BO)': item.priceBookingBO || '',
            'Preço Booking (Odoo)': item.priceBookingOdoo || '',
            'Marca': item.parkBrand || '',
            'Status': item.status || '',
            'Data Booking': item.bookingDate || '',
            'Check-in': item.checkIn || '',
            'Check-out': item.checkOut || '',
            'Método Pagamento': item.paymentMethod || '',
            'Campanha': item.campaign || '',
            'Inconsistências': item.inconsistencies ? item.inconsistencies.join('; ') : ''
        }));

        return XLSX.utils.json_to_sheet(processedData);
    }

    createDeliveriesSheet(data, type) {
        const processedData = data.map(item => ({
            'Matrícula': item.licensePlate || '',
            'Alocação': item.alocation || '',
            'Data Checkout': item.checkOut || '',
            'Método Pagamento': item.paymentMethod || '',
            'Valor': item.priceOnDelivery || 0,
            'Condutor': item.condutorEntrega || '',
            'Status': item.status || '',
            'Campanha': item.campaign || '',
            'Campanha Pay': item.campaignPay || false,
            'Marca': item.parkBrand || '',
            'Inconsistências': item.inconsistencies ? item.inconsistencies.join('; ') : '',
            'Data Processamento': item.processedAt || '',
            'Data Validação': item.validatedAt || '',
            'Tipo': type
        }));

        return XLSX.utils.json_to_sheet(processedData);
    }

    createStatisticsSheet(stats) {
        const statsData = [
            { 'Métrica': 'Total da Caixa', 'Valor': `€${stats.totalCaixa || 0}` },
            { 'Métrica': 'Total em Numerário', 'Valor': `€${stats.totalNumerario || 0}` },
            { 'Métrica': 'Total em Multibanco', 'Valor': `€${stats.totalMultibanco || 0}` },
            { 'Métrica': 'Total No Pay', 'Valor': `€${stats.totalNopay || 0}` },
            { 'Métrica': 'Total Online', 'Valor': `€${stats.totalOnline || 0}` },
            { 'Métrica': 'Entregas Efetuadas', 'Valor': stats.entregasEfetuadas || 0 },
            { 'Métrica': 'Entregas Previstas', 'Valor': stats.entregasPrevistas || 0 },
            { 'Métrica': 'Percentual de Conclusão', 'Valor': `${stats.percentualConclusao || 0}%` },
            { 'Métrica': 'Data da Exportação', 'Valor': new Date().toLocaleString('pt-PT') }
        ];

        return XLSX.utils.json_to_sheet(statsData);
    }

    // ===== DOWNLOAD =====
    
    async downloadWorkbook(workbook) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `CaixaMultipark_${timestamp}.xlsx`;
        
        // Gerar buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        
        // Criar blob e fazer download
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Simular clique
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL
        window.URL.revokeObjectURL(url);
        
        console.log(`📥 Ficheiro exportado: ${filename}`);
    }

    // ===== HISTÓRICO =====
    
    addToHistory(data) {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            filename: `CaixaMultipark_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.xlsx`,
            dataTypes: Object.keys(data),
            recordCounts: {}
        };

        // Contar registos por tipo
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                historyEntry.recordCounts[key] = data[key].length;
            } else if (data[key] && typeof data[key] === 'object') {
                historyEntry.recordCounts[key] = Object.keys(data[key]).length;
            }
        });

        this.exportHistory.unshift(historyEntry);
        
        // Manter apenas os últimos 10
        if (this.exportHistory.length > 10) {
            this.exportHistory = this.exportHistory.slice(0, 10);
        }

        this.saveExportHistory();
        this.updateHistoryDisplay();
    }

    loadExportHistory() {
        try {
            const saved = localStorage.getItem('caixa_export_history');
            if (saved) {
                this.exportHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Erro ao carregar histórico de exportações:', error);
            this.exportHistory = [];
        }
        
        this.updateHistoryDisplay();
    }

    saveExportHistory() {
        try {
            localStorage.setItem('caixa_export_history', JSON.stringify(this.exportHistory));
        } catch (error) {
            console.warn('Erro ao salvar histórico de exportações:', error);
        }
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('export-history');
        if (!historyContainer) return;

        if (this.exportHistory.length === 0) {
            historyContainer.innerHTML = '<p class="text-center">Nenhuma exportação realizada ainda.</p>';
            return;
        }

        const historyHTML = this.exportHistory.map(entry => `
            <div class="export-history-item">
                <div class="export-info">
                    <strong>${entry.filename}</strong>
                    <span class="export-date">${new Date(entry.timestamp).toLocaleString('pt-PT')}</span>
                </div>
                <div class="export-details">
                    <span>Tipos: ${entry.dataTypes.join(', ')}</span>
                    <span>Registos: ${Object.values(entry.recordCounts).reduce((a, b) => a + b, 0)}</span>
                </div>
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
    }

    // ===== API PÚBLICA =====
    
    getExportHistory() {
        return this.exportHistory;
    }

    clearHistory() {
        this.exportHistory = [];
        this.saveExportHistory();
        this.updateHistoryDisplay();
        showInfo('Histórico Limpo', 'Histórico de exportações foi limpo.');
    }
}

// ===== INSTÂNCIA GLOBAL =====

const exportSystem = new ExportSystem();

// ===== COMPATIBILIDADE =====

window.exportSystem = exportSystem;

