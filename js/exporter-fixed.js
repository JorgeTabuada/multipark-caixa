// exporter-fixed.js - Sistema de exportação corrigido
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Carregando exportador corrigido...');
    
    // Verificar dependência XLSX
    if (typeof XLSX === 'undefined') {
        console.error('❌ XLSX library não encontrada!');
        if (window.showNotification) {
            window.showNotification('Erro: Biblioteca XLSX não carregada!', 'error');
        }
        return;
    }
    
    const exportExcelBtn = document.getElementById('export-btn');
    
    // Variáveis para dados
    let exportData = [];
    let dashboardStats = {};
    let isExporting = false;

    /**
     * CORREÇÃO: Definir dados para exportação
     */
    function setExportData(data, stats) {
        console.log('📝 Definindo dados para exportação:', {
            entregas: data?.length || 0,
            stats: !!stats
        });
        
        exportData = data || [];
        dashboardStats = stats || {};
        
        // Habilitar/desabilitar botão
        if (exportExcelBtn) {
            exportExcelBtn.disabled = exportData.length === 0;
            
            if (exportData.length === 0) {
                exportExcelBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Sem dados para exportar';
            } else {
                exportExcelBtn.innerHTML = `<i class="fas fa-download"></i> Exportar ${exportData.length} entregas`;
            }
        }
    }

    /**
     * CORREÇÃO: Função principal de exportação
     */
    async function exportToExcel() {
        if (isExporting) {
            console.log('⏳ Exportação já em andamento...');
            return;
        }
        
        if (!exportData || exportData.length === 0) {
            if (window.showNotification) {
                window.showNotification('Não há dados para exportar. Processa primeiro os ficheiros.', 'warning');
            }
            return;
        }
        
        try {
            isExporting = true;
            console.log('🚀 Iniciando exportação para Excel...');
            
            // Atualizar botão
            if (exportExcelBtn) {
                exportExcelBtn.disabled = true;
                exportExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A exportar...';
            }
            
            // Mostrar notificação de início
            if (window.showNotification) {
                window.showNotification('Iniciando exportação...', 'info', 2000);
            }
            
            // Criar workbook
            const wb = XLSX.utils.book_new();
            
            // Criar planilhas
            console.log('📋 A criar planilha de entregas...');
            const entregasSheet = createEntregasSheet();
            XLSX.utils.book_append_sheet(wb, entregasSheet, "Entregas Validadas");
            
            console.log('📋 A criar planilha de estatísticas...');
            const statsSheet = createStatsSheet();
            XLSX.utils.book_append_sheet(wb, statsSheet, "Estatísticas");
            
            console.log('📋 A criar planilha de inconsistências...');
            const inconsistenciesSheet = createInconsistenciesSheet();
            XLSX.utils.book_append_sheet(wb, inconsistenciesSheet, "Inconsistências");
            
            console.log('📋 A criar planilha por condutor...');
            const driversSheet = createDriversSheet();
            XLSX.utils.book_append_sheet(wb, driversSheet, "Por Condutor");
            
            // Gerar nome do arquivo
            const date = new Date();
            const dateStr = date.toLocaleDateString('pt-PT').replace(/\//g, '-');
            const timeStr = date.toLocaleTimeString('pt-PT').replace(/:/g, '-');
            const fileName = `Caixa_Multipark_${dateStr}_${timeStr}.xlsx`;
            
            // Exportar arquivo
            console.log('💾 A guardar ficheiro:', fileName);
            XLSX.writeFile(wb, fileName);
            
            console.log('✅ Exportação concluída!');
            
            // Mostrar notificação de sucesso
            if (window.showNotification) {
                window.showNotification(`Ficheiro exportado: ${fileName}`, 'success', 5000);
            }
            
        } catch (error) {
            console.error('❌ Erro durante a exportação:', error);
            
            if (window.showNotification) {
                window.showNotification('Erro ao exportar: ' + error.message, 'error');
            } else {
                alert('Erro ao exportar ficheiro: ' + error.message);
            }
        } finally {
            isExporting = false;
            
            // Restaurar botão
            if (exportExcelBtn) {
                exportExcelBtn.disabled = exportData.length === 0;
                exportExcelBtn.innerHTML = exportData.length === 0 ? 
                    '<i class="fas fa-exclamation-triangle"></i> Sem dados' : 
                    '<i class="fas fa-download"></i> Exportar para Excel';
            }
        }
    }

    /**
     * CORREÇÃO: Criar planilha de entregas
     */
    function createEntregasSheet() {
        console.log('📝 A processar entregas para exportação...');
        
        const sheetData = exportData.map(delivery => {
            const inconsistencias = getInconsistenciasTexto(delivery);
            const isValidated = delivery.status === 'validated' || delivery.resolution;
            
            return {
                "Alocação": delivery.alocation || 'N/A',
                "Matrícula": delivery.licensePlate,
                "Data Checkout": delivery.checkOut || 'N/A',
                "Marca": delivery.parkBrand || 'N/A',
                "Método Pagamento": delivery.paymentMethod,
                "Valor na Entrega": parseFloat(delivery.priceOnDelivery) || 0,
                "Booking Price (BO)": delivery.validatedRecord?.bookingPriceBO || 'N/A',
                "Booking Price (Odoo)": delivery.validatedRecord?.bookingPriceOdoo || 'N/A',
                "Campanha": delivery.campaign || 'N/A',
                "Tipo Campanha": delivery.campaignPay || 'N/A',
                "Condutor": delivery.condutorEntrega || 'N/A',
                "Status": getStatusText(delivery),
                "Validado": isValidated ? 'Sim' : 'Não',
                "Inconsistências": inconsistencias,
                "Resolução": getResolutionText(delivery.resolution) || 'N/A',
                "Observações": delivery.resolutionNotes || delivery.userNotes || '',
                "Alterações": delivery.resolution === 'corrected' ? getAlteracoes(delivery) : 'N/A',
                "Inconsistência Permanente": delivery.permanentInconsistency ? 'Sim' : 'Não'
            };
        });
        
        // Criar planilha
        const ws = XLSX.utils.json_to_sheet(sheetData);
        
        // Definir larguras de coluna
        ws['!cols'] = [
            { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
            { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 },
            { wch: 30 }, { wch: 40 }, { wch: 20 }
        ];
        
        // CORREÇÃO: Aplicar formatação condicional
        addConditionalFormatting(ws, sheetData);
        
        return ws;
    }

    /**
     * CORREÇÃO: Criar planilha de estatísticas
     */
    function createStatsSheet() {
        const statsData = [];
        
        // Estatísticas gerais
        statsData.push({ "Categoria": "=== ESTATÍSTICAS GERAIS ===", "Valor": "" });
        statsData.push({ "Categoria": "Total da Caixa", "Valor": dashboardStats.totalCaixa || 0 });
        statsData.push({ "Categoria": "Total em Numerário", "Valor": dashboardStats.totalNumerario || 0 });
        statsData.push({ "Categoria": "Total em Multibanco", "Valor": dashboardStats.totalMultibanco || 0 });
        statsData.push({ "Categoria": "Total No Pay", "Valor": dashboardStats.totalNopay || 0 });
        statsData.push({ "Categoria": "Total Online", "Valor": dashboardStats.totalOnline || 0 });
        statsData.push({ "Categoria": "", "Valor": "" });
        
        // Contagens
        statsData.push({ "Categoria": "=== CONTAGENS ===", "Valor": "" });
        statsData.push({ "Categoria": "Entregas Numerário", "Valor": dashboardStats.countNumerario || 0 });
        statsData.push({ "Categoria": "Entregas Multibanco", "Valor": dashboardStats.countMultibanco || 0 });
        statsData.push({ "Categoria": "Entregas No Pay", "Valor": dashboardStats.countNopay || 0 });
        statsData.push({ "Categoria": "Entregas Online", "Valor": dashboardStats.countOnline || 0 });
        statsData.push({ "Categoria": "Total de Entregas", "Valor": dashboardStats.countTotal || 0 });
        statsData.push({ "Categoria": "", "Valor": "" });
        
        // Performance
        statsData.push({ "Categoria": "=== PERFORMANCE ===", "Valor": "" });
        statsData.push({ "Categoria": "Entregas Efetuadas", "Valor": dashboardStats.entregasEfetuadas || 0 });
        statsData.push({ "Categoria": "Entregas Previstas", "Valor": dashboardStats.entregasPrevistas || 0 });
        
        const percentual = dashboardStats.entregasPrevistas > 0 
            ? (dashboardStats.entregasEfetuadas / dashboardStats.entregasPrevistas * 100).toFixed(1) 
            : 0;
        statsData.push({ "Categoria": "Percentual de Conclusão", "Valor": percentual + '%' });
        
        const ws = XLSX.utils.json_to_sheet(statsData);
        ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
        
        return ws;
    }

    /**
     * CORREÇÃO: Criar planilha de inconsistências
     */
    function createInconsistenciesSheet() {
        const inconsistentDeliveries = exportData.filter(delivery => 
            delivery.status === 'inconsistent' || 
            delivery.permanentInconsistency ||
            (delivery.inconsistencies && delivery.inconsistencies.length > 0) ||
            (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0)
        );
        
        if (inconsistentDeliveries.length === 0) {
            const emptyData = [{ "Mensagem": "Não há inconsistências registadas." }];
            return XLSX.utils.json_to_sheet(emptyData);
        }
        
        const sheetData = inconsistentDeliveries.map(delivery => ({
            "Matrícula": delivery.licensePlate,
            "Condutor": delivery.condutorEntrega,
            "Método Pagamento": delivery.paymentMethod,
            "Valor Entrega": delivery.priceOnDelivery,
            "Inconsistências": getInconsistenciasTexto(delivery),
            "Permanente": delivery.permanentInconsistency ? 'Sim' : 'Não',
            "Status": getStatusText(delivery),
            "Resolução": getResolutionText(delivery.resolution) || 'Pendente'
        }));
        
        const ws = XLSX.utils.json_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
        
        return ws;
    }

    /**
     * CORREÇÃO: Criar planilha por condutor
     */
    function createDriversSheet() {
        if (!dashboardStats.byDriver || Object.keys(dashboardStats.byDriver).length === 0) {
            const emptyData = [{ "Mensagem": "Não há estatísticas por condutor disponíveis." }];
            return XLSX.utils.json_to_sheet(emptyData);
        }
        
        const sheetData = [];
        
        // Cabeçalho
        sheetData.push({
            "Condutor": "=== ESTATÍSTICAS POR CONDUTOR ===",
            "Total Entregas": "",
            "Total Valor": "",
            "Numerário": "",
            "Multibanco": "",
            "No Pay": "",
            "Online": ""
        });
        sheetData.push({
            "Condutor": "",
            "Total Entregas": "",
            "Total Valor": "",
            "Numerário": "",
            "Multibanco": "",
            "No Pay": "",
            "Online": ""
        });
        
        // Dados por condutor
        Object.entries(dashboardStats.byDriver).forEach(([driver, data]) => {
            sheetData.push({
                "Condutor": driver,
                "Total Entregas": data.count || 0,
                "Total Valor": data.total || 0,
                "Numerário": `${data.numerario?.count || 0} (${(data.numerario?.total || 0).toFixed(2)}€)`,
                "Multibanco": `${data.multibanco?.count || 0} (${(data.multibanco?.total || 0).toFixed(2)}€)`,
                "No Pay": `${data.nopay?.count || 0} (${(data.nopay?.total || 0).toFixed(2)}€)`,
                "Online": `${data.online?.count || 0} (${(data.online?.total || 0).toFixed(2)}€)`
            });
        });
        
        const ws = XLSX.utils.json_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
        
        return ws;
    }

    /**
     * CORREÇÃO: Aplicar formatação condicional
     */
    function addConditionalFormatting(ws, data) {
        for (let i = 0; i < data.length; i++) {
            const rowIndex = i + 2; // +1 para header, +1 para 1-based
            const delivery = exportData[i];
            
            if (!delivery) continue;
            
            let fillColor = 'FFFFFF'; // Branco padrão
            
            if (delivery.permanentInconsistency) {
                fillColor = 'FFE6E6'; // Vermelho claro
            } else if (delivery.status === 'inconsistent') {
                fillColor = 'FFF2CC'; // Amarelo claro
            } else if (delivery.status === 'validated' || delivery.resolution) {
                fillColor = 'E6F7E6'; // Verde claro
            }
            
            // Aplicar cor a toda a linha
            for (let col = 0; col < 18; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: rowIndex - 1, c: col });
                if (!ws[cellRef]) continue;
                
                if (!ws[cellRef].s) ws[cellRef].s = {};
                ws[cellRef].s.fill = { fgColor: { rgb: fillColor } };
            }
        }
    }

    /**
     * CORREÇÃO: Funções auxiliares melhoradas
     */
    function getInconsistenciasTexto(delivery) {
        const inconsistencias = [];
        
        // Inconsistências permanentes
        if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
            delivery.permanentInconsistencies.forEach(error => {
                inconsistencias.push(error.message || error.code || error);
            });
        }
        
        // Inconsistências normais
        if (delivery.inconsistencies && delivery.inconsistencies.length > 0) {
            delivery.inconsistencies.forEach(inc => {
                if (inc === 'bookingPriceBO') {
                    inconsistencias.push(`Preço diferente do BO (${delivery.priceOnDelivery}€ vs ${delivery.validatedRecord?.bookingPriceBO}€)`);
                } else if (inc === 'bookingPriceOdoo') {
                    inconsistencias.push(`Preço diferente do Odoo (${delivery.priceOnDelivery}€ vs ${delivery.validatedRecord?.bookingPriceOdoo}€)`);
                } else if (inc === 'missing_record') {
                    inconsistencias.push('Registro não encontrado na comparação');
                } else {
                    inconsistencias.push(inc);
                }
            });
        }
        
        return inconsistencias.join('; ');
    }

    function getStatusText(delivery) {
        if (delivery.permanentInconsistency) {
            return 'Inconsistência Permanente';
        }
        
        switch (delivery.status) {
            case 'validated': return 'Validado';
            case 'inconsistent': return 'Inconsistente';
            case 'ready': return 'Pronto';
            case 'pending': return 'Pendente';
            default: return delivery.status || 'N/A';
        }
    }

    function getResolutionText(resolution) {
        switch (resolution) {
            case 'confirmed': return 'Confirmado';
            case 'corrected': return 'Corrigido';
            case 'auto_validated': return 'Auto-validado';
            default: return resolution;
        }
    }

    function getAlteracoes(delivery) {
        const alteracoes = [];
        
        if (delivery.originalPrice !== undefined && delivery.originalPrice !== delivery.priceOnDelivery) {
            alteracoes.push(`Preço: ${delivery.originalPrice}€ → ${delivery.priceOnDelivery}€`);
        }
        
        if (delivery.originalPaymentMethod && delivery.originalPaymentMethod !== delivery.paymentMethod) {
            alteracoes.push(`Pagamento: ${delivery.originalPaymentMethod} → ${delivery.paymentMethod}`);
        }
        
        if (delivery.resolutionNotes) {
            alteracoes.push(`Notas: ${delivery.resolutionNotes}`);
        }
        
        return alteracoes.join('; ') || 'Sem alterações registadas';
    }

    // CORREÇÃO: Evento do botão de exportação
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportToExcel();
        });
        
        console.log('✅ Botão de exportação configurado');
    } else {
        console.warn('⚠️ Botão de exportação não encontrado');
    }

    // CORREÇÃO: Auto-conectar com dashboard quando dados estiverem disponíveis
    const originalSetDeliveryData = window.dashboard?.setDeliveryData;
    if (originalSetDeliveryData) {
        window.dashboard.setDeliveryData = function(data) {
            // Chamar função original
            originalSetDeliveryData.call(this, data);
            
            // Auto-configurar exportação
            const stats = window.dashboard.getStats ? window.dashboard.getStats() : {};
            setExportData(data, stats);
        };
    }

    // Exportar funções
    window.exporter = {
        setExportData: setExportData,
        exportToExcel: exportToExcel,
        isReady: () => exportData.length > 0
    };

    console.log('✅ Exportador corrigido carregado!');
    
    // Verificar se já há dados para exportar
    if (window.dashboard && window.dashboard.getStats) {
        const stats = window.dashboard.getStats();
        if (stats && Object.keys(stats).length > 0) {
            console.log('📊 Dados de dashboard encontrados, configurando exportação...');
            // Tentar obter dados de entregas das outras funções
            const deliveryData = window.validator ? window.validator.getValidatedDeliveries() : [];
            if (deliveryData.length > 0) {
                setExportData(deliveryData, stats);
            }
        }
    }
});