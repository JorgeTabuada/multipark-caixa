// exporter-fixed.js - Sistema de exportação corrigido
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Carregando sistema de exportação corrigido...');

    // Elementos da interface
    const exportBtn = document.getElementById('export-btn');
    const exportProgress = document.getElementById('export-progress');
    const exportStatus = document.getElementById('export-status');

    /**
     * CORREÇÃO: Função principal de exportação
     */
    function exportToExcel() {
        console.log('📊 Iniciando exportação para Excel...');

        try {
            // Verificar se SheetJS está disponível
            if (typeof XLSX === 'undefined') {
                throw new Error('Biblioteca SheetJS não está carregada');
            }

            // Mostrar progresso
            if (exportProgress) {
                exportProgress.classList.remove('hidden');
                exportProgress.style.width = '0%';
            }

            updateExportStatus('Coletando dados...', 10);

            // CORREÇÃO: Coletar todos os dados disponíveis
            const allData = collectAllData();
            
            if (!allData || Object.keys(allData).length === 0) {
                throw new Error('Nenhum dado disponível para exportação');
            }

            updateExportStatus('Preparando planilhas...', 30);

            // CORREÇÃO: Criar workbook com múltiplas abas
            const workbook = XLSX.utils.book_new();

            // Aba 1: Resumo Geral
            if (allData.summary && allData.summary.length > 0) {
                const summarySheet = XLSX.utils.json_to_sheet(allData.summary);
                XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
                console.log('✅ Aba "Resumo" criada com', allData.summary.length, 'registros');
            }

            updateExportStatus('Processando comparações...', 50);

            // Aba 2: Comparações Odoo vs Back Office
            if (allData.comparisons && allData.comparisons.length > 0) {
                const comparisonsSheet = XLSX.utils.json_to_sheet(allData.comparisons);
                XLSX.utils.book_append_sheet(workbook, comparisonsSheet, 'Comparações');
                console.log('✅ Aba "Comparações" criada com', allData.comparisons.length, 'registros');
            }

            updateExportStatus('Processando validações...', 70);

            // Aba 3: Entregas Validadas
            if (allData.validatedDeliveries && allData.validatedDeliveries.length > 0) {
                const validatedSheet = XLSX.utils.json_to_sheet(allData.validatedDeliveries);
                XLSX.utils.book_append_sheet(workbook, validatedSheet, 'Entregas Validadas');
                console.log('✅ Aba "Entregas Validadas" criada com', allData.validatedDeliveries.length, 'registros');
            }

            updateExportStatus('Processando inconsistências...', 85);

            // Aba 4: Inconsistências
            if (allData.inconsistencies && allData.inconsistencies.length > 0) {
                const inconsistenciesSheet = XLSX.utils.json_to_sheet(allData.inconsistencies);
                XLSX.utils.book_append_sheet(workbook, inconsistenciesSheet, 'Inconsistências');
                console.log('✅ Aba "Inconsistências" criada com', allData.inconsistencies.length, 'registros');
            }

            updateExportStatus('Finalizando exportação...', 95);

            // CORREÇÃO: Gerar nome de arquivo com timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
            const filename = `Caixa_Multipark_${timestamp}.xlsx`;

            // CORREÇÃO: Exportar arquivo
            XLSX.writeFile(workbook, filename);

            updateExportStatus('Exportação concluída!', 100);

            // Mostrar notificação de sucesso
            if (window.showNotification) {
                window.showNotification(`Arquivo exportado: ${filename}`, 'success', 5000);
            }

            // CORREÇÃO: Registrar exportação no histórico
            registerExport(filename, allData);

            console.log('✅ Exportação concluída:', filename);

        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            updateExportStatus(`Erro: ${error.message}`, 0);
            
            if (window.showNotification) {
                window.showNotification(`Erro na exportação: ${error.message}`, 'error');
            }
        } finally {
            // Ocultar progresso após 3 segundos
            setTimeout(() => {
                if (exportProgress) {
                    exportProgress.classList.add('hidden');
                }
            }, 3000);
        }
    }

    /**
     * CORREÇÃO: Coletar todos os dados disponíveis
     */
    function collectAllData() {
        console.log('📂 Coletando dados de todos os módulos...');

        const data = {};

        // Dados do comparador
        if (window.comparator && window.comparator.getResults) {
            const comparisonResults = window.comparator.getResults();
            
            if (comparisonResults.all && comparisonResults.all.length > 0) {
                data.comparisons = comparisonResults.all.map(formatComparisonForExport);
                data.inconsistencies = comparisonResults.inconsistent.map(formatInconsistencyForExport);
            }
        }

        // Dados do validador
        if (window.validator) {
            const validatedDeliveries = window.validator.getValidatedDeliveries ? 
                window.validator.getValidatedDeliveries() : [];
            const pendingDeliveries = window.validator.getPendingDeliveries ? 
                window.validator.getPendingDeliveries() : [];

            if (validatedDeliveries.length > 0) {
                data.validatedDeliveries = validatedDeliveries.map(formatDeliveryForExport);
            }

            // Adicionar entregas pendentes às inconsistências se existirem
            const pendingInconsistent = pendingDeliveries.filter(d => 
                d.status === 'inconsistent' || d.permanentInconsistencies
            );
            
            if (pendingInconsistent.length > 0) {
                if (!data.inconsistencies) data.inconsistencies = [];
                data.inconsistencies.push(...pendingInconsistent.map(formatDeliveryInconsistencyForExport));
            }
        }

        // Dados do dashboard
        if (window.dashboard && window.dashboard.getStats) {
            const stats = window.dashboard.getStats();
            if (stats) {
                data.summary = formatSummaryForExport(stats);
            }
        }

        // CORREÇÃO: Se não há dados do dashboard, criar resumo básico
        if (!data.summary) {
            data.summary = createBasicSummary(data);
        }

        console.log('📊 Dados coletados:', {
            summary: data.summary?.length || 0,
            comparisons: data.comparisons?.length || 0,
            validatedDeliveries: data.validatedDeliveries?.length || 0,
            inconsistencies: data.inconsistencies?.length || 0
        });

        return data;
    }

    /**
     * CORREÇÃO: Formatar comparação para exportação
     */
    function formatComparisonForExport(comparison) {
        return {
            'Matrícula': comparison.licensePlate,
            'Status': getStatusText(comparison.status),
            'Preço Odoo': comparison.odooRecord?.bookingPrice || 'N/A',
            'Preço Back Office': comparison.boRecord?.bookingPrice || 'N/A',
            'Marca Odoo': comparison.odooRecord?.parkBrand || 'N/A',
            'Marca Back Office': comparison.boRecord?.parkBrand || 'N/A',
            'Condutor Odoo': comparison.odooRecord?.condutorEntrega || 'N/A',
            'Condutor Back Office': comparison.boRecord?.condutorEntrega || 'N/A',
            'Data Checkout Odoo': comparison.odooRecord?.checkOut ? 
                (window.DateUtils ? window.DateUtils.formatForDisplay(comparison.odooRecord.checkOut) : comparison.odooRecord.checkOut) : 'N/A',
            'Data Checkout Back Office': comparison.boRecord?.checkOut ? 
                (window.DateUtils ? window.DateUtils.formatForDisplay(comparison.boRecord.checkOut) : comparison.boRecord.checkOut) : 'N/A',
            'Inconsistências': comparison.inconsistencies.join(', ') || 'Nenhuma',
            'Data Comparação': new Date().toLocaleString('pt-PT')
        };
    }

    /**
     * CORREÇÃO: Formatar inconsistência para exportação
     */
    function formatInconsistencyForExport(inconsistency) {
        return {
            'Matrícula': inconsistency.licensePlate,
            'Tipo': getStatusText(inconsistency.status),
            'Problemas': inconsistency.inconsistencies.join(', '),
            'Preço Odoo': inconsistency.odooRecord?.bookingPrice || 'N/A',
            'Preço Back Office': inconsistency.boRecord?.bookingPrice || 'N/A',
            'Diferença Preço': inconsistency.odooRecord && inconsistency.boRecord ? 
                (parseFloat(inconsistency.odooRecord.bookingPrice || 0) - parseFloat(inconsistency.boRecord.bookingPrice || 0)).toFixed(2) + ' €' : 'N/A',
            'Marca Odoo': inconsistency.odooRecord?.parkBrand || 'N/A',
            'Marca Back Office': inconsistency.boRecord?.parkBrand || 'N/A',
            'Requer Atenção': inconsistency.status === 'missing' ? 'SIM' : 'Verificar',
            'Data Identificação': new Date().toLocaleString('pt-PT')
        };
    }

    /**
     * CORREÇÃO: Formatar entrega para exportação
     */
    function formatDeliveryForExport(delivery) {
        return {
            'Matrícula': delivery.licensePlate,
            'Alocação': delivery.alocation || 'N/A',
            'Data Checkout': delivery.checkOut,
            'Método Pagamento': delivery.paymentMethod,
            'Valor Entrega': delivery.priceOnDelivery + ' €',
            'Condutor': delivery.condutorEntrega,
            'Marca': delivery.parkBrand || 'N/A',
            'Campanha': delivery.campaign || 'N/A',
            'Tipo Campanha': delivery.campaignPay || 'N/A',
            'Status': getStatusText(delivery.status),
            'Resolução': delivery.resolution || 'N/A',
            'Notas': delivery.resolutionNotes || delivery.userNotes || 'N/A',
            'Inconsistências Permanentes': delivery.permanentInconsistencies ? 
                delivery.permanentInconsistencies.join(', ') : 'Nenhuma',
            'Data Validação': new Date().toLocaleString('pt-PT')
        };
    }

    /**
     * CORREÇÃO: Formatar inconsistência de entrega para exportação
     */
    function formatDeliveryInconsistencyForExport(delivery) {
        return {
            'Matrícula': delivery.licensePlate,
            'Condutor': delivery.condutorEntrega,
            'Valor Entrega': delivery.priceOnDelivery + ' €',
            'Método Pagamento': delivery.paymentMethod,
            'Tipo Inconsistência': delivery.permanentInconsistencies ? 'Permanente' : 'Temporária',
            'Problemas': [
                ...(delivery.inconsistencies || []),
                ...(delivery.permanentInconsistencies || [])
            ].join(', '),
            'Status': getStatusText(delivery.status),
            'Requer Correção': delivery.permanentInconsistencies ? 'NÃO (Permanente)' : 'SIM',
            'Data Identificação': new Date().toLocaleString('pt-PT')
        };
    }

    /**
     * CORREÇÃO: Formatar resumo para exportação
     */
    function formatSummaryForExport(stats) {
        return [
            {
                'Métrica': 'Total de Entregas',
                'Valor': stats.totalDeliveries || 0,
                'Descrição': 'Número total de entregas processadas'
            },
            {
                'Métrica': 'Entregas Validadas',
                'Valor': stats.validatedDeliveries || 0,
                'Descrição': 'Entregas que passaram na validação'
            },
            {
                'Métrica': 'Inconsistências Encontradas',
                'Valor': stats.inconsistencies || 0,
                'Descrição': 'Registros com problemas identificados'
            },
            {
                'Métrica': 'Valor Total',
                'Valor': (stats.totalValue || 0) + ' €',
                'Descrição': 'Soma de todos os valores de entrega'
            },
            {
                'Métrica': 'Condutores Únicos',
                'Valor': stats.uniqueDrivers || 0,
                'Descrição': 'Número de condutores diferentes'
            },
            {
                'Métrica': 'Marcas Únicas',
                'Valor': stats.uniqueBrands || 0,
                'Descrição': 'Número de marcas diferentes'
            },
            {
                'Métrica': 'Data Processamento',
                'Valor': new Date().toLocaleString('pt-PT'),
                'Descrição': 'Quando este relatório foi gerado'
            }
        ];
    }

    /**
     * CORREÇÃO: Criar resumo básico quando dashboard não está disponível
     */
    function createBasicSummary(data) {
        const summary = [];

        if (data.comparisons) {
            summary.push({
                'Métrica': 'Total Comparações',
                'Valor': data.comparisons.length,
                'Descrição': 'Registros comparados entre Odoo e Back Office'
            });
        }

        if (data.validatedDeliveries) {
            summary.push({
                'Métrica': 'Entregas Validadas',
                'Valor': data.validatedDeliveries.length,
                'Descrição': 'Entregas que passaram na validação de caixa'
            });

            const totalValue = data.validatedDeliveries.reduce((sum, delivery) => {
                const value = parseFloat(delivery['Valor Entrega']?.replace(' €', '') || 0);
                return sum + value;
            }, 0);

            summary.push({
                'Métrica': 'Valor Total Validado',
                'Valor': totalValue.toFixed(2) + ' €',
                'Descrição': 'Soma dos valores das entregas validadas'
            });
        }

        if (data.inconsistencies) {
            summary.push({
                'Métrica': 'Inconsistências',
                'Valor': data.inconsistencies.length,
                'Descrição': 'Registros com problemas identificados'
            });
        }

        summary.push({
            'Métrica': 'Data Exportação',
            'Valor': new Date().toLocaleString('pt-PT'),
            'Descrição': 'Quando este relatório foi exportado'
        });

        return summary;
    }

    /**
     * CORREÇÃO: Registrar exportação no histórico
     */
    function registerExport(filename, data) {
        try {
            const exportRecord = {
                filename: filename,
                timestamp: new Date().toISOString(),
                recordCount: {
                    summary: data.summary?.length || 0,
                    comparisons: data.comparisons?.length || 0,
                    validatedDeliveries: data.validatedDeliveries?.length || 0,
                    inconsistencies: data.inconsistencies?.length || 0
                },
                totalRecords: Object.values(data).reduce((sum, arr) => 
                    sum + (Array.isArray(arr) ? arr.length : 0), 0
                )
            };

            // Guardar no localStorage
            let exportHistory = JSON.parse(localStorage.getItem('caixa_export_history') || '[]');
            exportHistory.unshift(exportRecord); // Adicionar no início
            
            // Manter apenas os últimos 10 registros
            if (exportHistory.length > 10) {
                exportHistory = exportHistory.slice(0, 10);
            }
            
            localStorage.setItem('caixa_export_history', JSON.stringify(exportHistory));
            
            console.log('✅ Exportação registrada no histórico');

        } catch (error) {
            console.warn('⚠️ Erro ao registrar exportação:', error);
        }
    }

    /**
     * Atualizar status da exportação
     */
    function updateExportStatus(message, progress) {
        if (exportStatus) {
            exportStatus.textContent = message;
        }
        
        if (exportProgress && progress !== undefined) {
            exportProgress.style.width = progress + '%';
        }
        
        console.log(`📊 Exportação: ${message} (${progress || 0}%)`);
    }

    /**
     * Função auxiliar para texto de status
     */
    function getStatusText(status) {
        switch (status) {
            case 'valid': return 'Válido';
            case 'validated': return 'Validado';
            case 'inconsistent': return 'Inconsistente';
            case 'missing': return 'Em Falta';
            case 'pending': return 'Pendente';
            case 'ready': return 'Pronto';
            default: return status || 'Desconhecido';
        }
    }

    // CORREÇÃO: Event listener para botão de exportação
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            console.log('🖱️ Botão de exportação clicado');
            exportToExcel();
        });
    }

    // CORREÇÃO: Função para mostrar histórico de exportações
    function showExportHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('caixa_export_history') || '[]');
            
            if (history.length === 0) {
                alert('Nenhuma exportação encontrada no histórico.');
                return;
            }

            let historyText = 'Histórico de Exportações:\n\n';
            history.forEach((record, index) => {
                const date = new Date(record.timestamp).toLocaleString('pt-PT');
                historyText += `${index + 1}. ${record.filename}\n`;
                historyText += `   Data: ${date}\n`;
                historyText += `   Registros: ${record.totalRecords}\n\n`;
            });

            alert(historyText);

        } catch (error) {
            console.error('❌ Erro ao mostrar histórico:', error);
            alert('Erro ao carregar histórico de exportações.');
        }
    }

    // Exportar funções
    window.exporter = {
        exportToExcel: exportToExcel,
        showExportHistory: showExportHistory,
        collectAllData: collectAllData
    };

    console.log('✅ Sistema de exportação corrigido carregado!');
});

