// ===== DASHBOARD COM INTEGRAÇÃO SUPABASE =====
// Este arquivo substitui o dashboard.js atual

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do dashboard
    const totalCaixaElement = document.getElementById('total-caixa');
    const totalNumerarioElement = document.getElementById('total-numerario');
    const totalMultibancoElement = document.getElementById('total-multibanco');
    const totalNopayElement = document.getElementById('total-nopay');
    const totalOnlineElement = document.getElementById('total-online');
    
    const countNumerarioElement = document.getElementById('count-numerario');
    const countMultibancoElement = document.getElementById('count-multibanco');
    const countNopayElement = document.getElementById('count-nopay');
    const countOnlineElement = document.getElementById('count-online');
    const countTotalElement = document.getElementById('count-total');
    
    const previstoBOElement = document.getElementById('previsto-bo');
    const previstoOdooElement = document.getElementById('previsto-odoo');
    const efetivaCaixaElement = document.getElementById('efetiva-caixa');
    const diferencaCaixaElement = document.getElementById('diferenca-caixa');
    
    const allDeliveriesTable = document.getElementById('all-deliveries-table').querySelector('tbody');
    
    // Elementos para estatísticas adicionais
    const entregasEfetuadasElement = document.getElementById('entregas-efetuadas');
    const entregasPrevistasElement = document.getElementById('entregas-previstas');
    const percentualEntregasElement = document.getElementById('percentual-entregas');
    
    // Elemento para estatísticas por condutor
    const condutorStatsContainer = document.getElementById('condutor-stats-container');
    
    // Variáveis para armazenar dados
    let dashboardData = {
        salesOrders: [],
        deliveries: [],
        cashRecords: [],
        comparisons: [],
        validations: []
    };
    
    let dashboardStats = {
        totalCaixa: 0,
        totalNumerario: 0,
        totalMultibanco: 0,
        totalNopay: 0,
        totalOnline: 0,
        
        countNumerario: 0,
        countMultibanco: 0,
        countNopay: 0,
        countOnline: 0,
        countTotal: 0,
        
        previstoBO: 0,
        previstoOdoo: 0,
        efetivaCaixa: 0,
        
        entregasEfetuadas: 0,
        entregasPrevistas: 0,
        
        byBrand: {},
        byPaymentMethod: {},
        byDriver: {}
    };
    
    // ===== INICIALIZAÇÃO =====
    
    async function initializeDashboard() {
        try {
            // Verificar se a API está disponível
            if (!window.caixaAPI) {
                console.error('CaixaAPI não disponível');
                showMessage('Erro: Sistema não inicializado', 'error');
                return;
            }
            
            // Aguardar inicialização da API
            await window.caixaAPI.initialize();
            
            // Carregar dados do Supabase
            await loadDataFromSupabase();
            
            // Calcular estatísticas
            calculateStats();
            
            // Renderizar dashboard
            renderDashboard();
            
            // Configurar auto-refresh
            setupAutoRefresh();
            
            console.log('✅ Dashboard inicializado com sucesso!');
            
        } catch (error) {
            console.error('Erro na inicialização do dashboard:', error);
            showMessage('Erro ao carregar dados do dashboard', 'error');
        }
    }
    
    // ===== CARREGAMENTO DE DADOS =====
    
    async function loadDataFromSupabase() {
        try {
            showLoading('A carregar dados...');
            
            // Carregar dados em paralelo
            const [salesOrders, deliveries, cashRecords, comparisons] = await Promise.all([
                window.caixaAPI.getSalesOrders(),
                window.caixaAPI.getDeliveries(),
                window.caixaAPI.getCashRecords(),
                window.caixaAPI.getComparisons()
            ]);
            
            dashboardData = {
                salesOrders: salesOrders || [],
                deliveries: deliveries || [],
                cashRecords: cashRecords || [],
                comparisons: comparisons || [],
                validations: [] // TODO: Implementar se necessário
            };
            
            console.log('Dados carregados do Supabase:', {
                salesOrders: dashboardData.salesOrders.length,
                deliveries: dashboardData.deliveries.length,
                cashRecords: dashboardData.cashRecords.length,
                comparisons: dashboardData.comparisons.length
            });
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }
    
    // ===== CÁLCULO DE ESTATÍSTICAS =====
    
    function calculateStats() {
        // Reset estatísticas
        dashboardStats = {
            totalCaixa: 0,
            totalNumerario: 0,
            totalMultibanco: 0,
            totalNopay: 0,
            totalOnline: 0,
            
            countNumerario: 0,
            countMultibanco: 0,
            countNopay: 0,
            countOnline: 0,
            countTotal: 0,
            
            previstoBO: 0,
            previstoOdoo: 0,
            efetivaCaixa: 0,
            
            entregasEfetuadas: dashboardData.cashRecords.length,
            entregasPrevistas: dashboardData.salesOrders.length,
            
            byBrand: {},
            byPaymentMethod: {},
            byDriver: {}
        };
        
        // Processar registos de caixa
        dashboardData.cashRecords.forEach(cashRecord => {
            const paymentMethod = (cashRecord.payment_method || '').toLowerCase();
            const priceOnDelivery = parseFloat(cashRecord.price_on_delivery) || 0;
            const driver = cashRecord.driver || 'Desconhecido';
            
            // Totais por método de pagamento
            dashboardStats.totalCaixa += priceOnDelivery;
            
            if (paymentMethod === 'numerário' || paymentMethod === 'cash') {
                dashboardStats.totalNumerario += priceOnDelivery;
                dashboardStats.countNumerario++;
            } else if (paymentMethod === 'multibanco' || paymentMethod === 'card') {
                dashboardStats.totalMultibanco += priceOnDelivery;
                dashboardStats.countMultibanco++;
            } else if (paymentMethod === 'no pay') {
                dashboardStats.totalNopay += priceOnDelivery;
                dashboardStats.countNopay++;
            } else if (paymentMethod === 'online') {
                dashboardStats.totalOnline += priceOnDelivery;
                dashboardStats.countOnline++;
            }
            
            dashboardStats.countTotal++;
            
            // Estatísticas por condutor
            if (!dashboardStats.byDriver[driver]) {
                dashboardStats.byDriver[driver] = {
                    count: 0,
                    total: 0,
                    numerario: { count: 0, total: 0 },
                    multibanco: { count: 0, total: 0 },
                    nopay: { count: 0, total: 0 },
                    online: { count: 0, total: 0 }
                };
            }
            
            dashboardStats.byDriver[driver].count++;
            dashboardStats.byDriver[driver].total += priceOnDelivery;
            
            if (paymentMethod === 'numerário' || paymentMethod === 'cash') {
                dashboardStats.byDriver[driver].numerario.count++;
                dashboardStats.byDriver[driver].numerario.total += priceOnDelivery;
            } else if (paymentMethod === 'multibanco' || paymentMethod === 'card') {
                dashboardStats.byDriver[driver].multibanco.count++;
                dashboardStats.byDriver[driver].multibanco.total += priceOnDelivery;
            } else if (paymentMethod === 'no pay') {
                dashboardStats.byDriver[driver].nopay.count++;
                dashboardStats.byDriver[driver].nopay.total += priceOnDelivery;
            } else if (paymentMethod === 'online') {
                dashboardStats.byDriver[driver].online.count++;
                dashboardStats.byDriver[driver].online.total += priceOnDelivery;
            }
        });
        
        // Calcular valores previstos
        dashboardData.salesOrders.forEach(order => {
            dashboardStats.previstoOdoo += parseFloat(order.booking_price) || 0;
        });
        
        dashboardData.deliveries.forEach(delivery => {
            dashboardStats.previstoBOElement += parseFloat(delivery.booking_price) || 0;
        });
        
        dashboardStats.efetivaCaixa = dashboardStats.totalCaixa;
        
        // Estatísticas por marca
        [...dashboardData.salesOrders, ...dashboardData.deliveries, ...dashboardData.cashRecords].forEach(record => {
            const brand = record.park_brand || 'Desconhecido';
            const price = parseFloat(record.booking_price || record.price_on_delivery || 0);
            
            if (!dashboardStats.byBrand[brand]) {
                dashboardStats.byBrand[brand] = {
                    count: 0,
                    total: 0
                };
            }
            
            if (price > 0) {
                dashboardStats.byBrand[brand].count++;
                dashboardStats.byBrand[brand].total += price;
            }
        });
        
        // Estatísticas por método de pagamento
        Object.keys(dashboardStats.byDriver).forEach(driver => {
            const driverData = dashboardStats.byDriver[driver];
            
            ['numerario', 'multibanco', 'nopay', 'online'].forEach(method => {
                if (driverData[method] && driverData[method].total > 0) {
                    if (!dashboardStats.byPaymentMethod[method]) {
                        dashboardStats.byPaymentMethod[method] = {
                            count: 0,
                            total: 0
                        };
                    }
                    dashboardStats.byPaymentMethod[method].count += driverData[method].count;
                    dashboardStats.byPaymentMethod[method].total += driverData[method].total;
                }
            });
        });
        
        console.log('Estatísticas calculadas:', dashboardStats);
    }
    
    // ===== RENDERIZAÇÃO DO DASHBOARD =====
    
    function renderDashboard() {
        // Atualizar totais
        if (totalCaixaElement) totalCaixaElement.textContent = formatCurrency(dashboardStats.totalCaixa);
        if (totalNumerarioElement) totalNumerarioElement.textContent = formatCurrency(dashboardStats.totalNumerario);
        if (totalMultibancoElement) totalMultibancoElement.textContent = formatCurrency(dashboardStats.totalMultibanco);
        if (totalNopayElement) totalNopayElement.textContent = formatCurrency(dashboardStats.totalNopay);
        if (totalOnlineElement) totalOnlineElement.textContent = formatCurrency(dashboardStats.totalOnline);
        
        // Atualizar contagens
        if (countNumerarioElement) countNumerarioElement.textContent = dashboardStats.countNumerario;
        if (countMultibancoElement) countMultibancoElement.textContent = dashboardStats.countMultibanco;
        if (countNopayElement) countNopayElement.textContent = dashboardStats.countNopay;
        if (countOnlineElement) countOnlineElement.textContent = dashboardStats.countOnline;
        if (countTotalElement) countTotalElement.textContent = dashboardStats.countTotal;
        
        // Atualizar comparativo
        if (previstoBOElement) previstoBOElement.textContent = formatCurrency(dashboardStats.previstoBO);
        if (previstoOdooElement) previstoOdooElement.textContent = formatCurrency(dashboardStats.previstoOdoo);
        if (efetivaCaixaElement) efetivaCaixaElement.textContent = formatCurrency(dashboardStats.efetivaCaixa);
        
        // Calcular diferença
        if (diferencaCaixaElement) {
            const diferenca = dashboardStats.efetivaCaixa - dashboardStats.previstoBO;
            diferencaCaixaElement.textContent = formatCurrency(diferenca);
            diferencaCaixaElement.classList.remove('status-error', 'status-success');
            diferencaCaixaElement.classList.add(diferenca < 0 ? 'status-error' : 'status-success');
        }
        
        // Atualizar estatísticas de entregas
        if (entregasEfetuadasElement) entregasEfetuadasElement.textContent = dashboardStats.entregasEfetuadas;
        if (entregasPrevistasElement) entregasPrevistasElement.textContent = dashboardStats.entregasPrevistas;
        
        if (percentualEntregasElement) {
            const percentual = dashboardStats.entregasPrevistas > 0 
                ? (dashboardStats.entregasEfetuadas / dashboardStats.entregasPrevistas * 100).toFixed(1) 
                : 0;
            percentualEntregasElement.textContent = percentual + '%';
            percentualEntregasElement.classList.remove('status-error', 'status-warning', 'status-success');
            
            if (percentual < 70) {
                percentualEntregasElement.classList.add('status-error');
            } else if (percentual < 90) {
                percentualEntregasElement.classList.add('status-warning');
            } else {
                percentualEntregasElement.classList.add('status-success');
            }
        }
        
        // Renderizar estatísticas por condutor
        renderDriverStats();
        
        // Renderizar gráficos
        renderCharts();
        
        // Renderizar tabela de entregas
        renderAllDeliveriesTable();
    }
    
    // ===== ESTATÍSTICAS POR CONDUTOR =====
    
    function renderDriverStats() {
        if (!condutorStatsContainer) return;
        
        // Limpar container
        condutorStatsContainer.innerHTML = '';
        
        if (Object.keys(dashboardStats.byDriver).length === 0) {
            condutorStatsContainer.innerHTML = '<p class="text-center">Nenhum dado de condutor disponível.</p>';
            return;
        }
        
        // Criar tabela para cada condutor
        Object.keys(dashboardStats.byDriver).forEach(driver => {
            const driverData = dashboardStats.byDriver[driver];
            
            const driverCard = document.createElement('div');
            driverCard.className = 'card mb-20';
            
            driverCard.innerHTML = `
                <div class="card-header">
                    <h3 class="card-title">Condutor: ${driver}</h3>
                </div>
                <div class="card-body">
                    <div class="flex flex-between">
                        <div>
                            <p>Total de Entregas: <strong>${driverData.count}</strong></p>
                            <p>Total em Numerário: <strong>${driverData.numerario.count}</strong> (${formatCurrency(driverData.numerario.total)})</p>
                            <p>Total em Multibanco: <strong>${driverData.multibanco.count}</strong> (${formatCurrency(driverData.multibanco.total)})</p>
                            <p>Total No Pay: <strong>${driverData.nopay.count}</strong> (${formatCurrency(driverData.nopay.total)})</p>
                            <p>Total Online: <strong>${driverData.online.count}</strong> (${formatCurrency(driverData.online.total)})</p>
                        </div>
                        <div>
                            <p>Valor Total: <strong>${formatCurrency(driverData.total)}</strong></p>
                        </div>
                    </div>
                </div>
            `;
            
            condutorStatsContainer.appendChild(driverCard);
        });
    }
    
    // ===== GRÁFICOS =====
    
    function renderCharts() {
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js não disponível');
            return;
        }
        
        // Limpar gráficos existentes
        const brandChart = Chart.getChart('chart-brands');
        if (brandChart) brandChart.destroy();
        
        const paymentChart = Chart.getChart('chart-payments');
        if (paymentChart) paymentChart.destroy();
        
        // Gráfico por marca
        const brandCanvas = document.getElementById('chart-brands');
        if (brandCanvas && Object.keys(dashboardStats.byBrand).length > 0) {
            const brandLabels = Object.keys(dashboardStats.byBrand);
            const brandData = brandLabels.map(brand => dashboardStats.byBrand[brand].total);
            
            new Chart(brandCanvas, {
                type: 'bar',
                data: {
                    labels: brandLabels,
                    datasets: [{
                        label: 'Total por Marca (€)',
                        data: brandData,
                        backgroundColor: [
                            'rgba(26, 115, 232, 0.7)',
                            'rgba(66, 133, 244, 0.7)',
                            'rgba(13, 71, 161, 0.7)',
                            'rgba(76, 175, 80, 0.7)',
                            'rgba(255, 152, 0, 0.7)'
                        ],
                        borderColor: [
                            'rgba(26, 115, 232, 1)',
                            'rgba(66, 133, 244, 1)',
                            'rgba(13, 71, 161, 1)',
                            'rgba(76, 175, 80, 1)',
                            'rgba(255, 152, 0, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Total por Marca'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // Gráfico por método de pagamento
        const paymentCanvas = document.getElementById('chart-payments');
        if (paymentCanvas) {
            const methodLabels = ['Numerário', 'Multibanco', 'No Pay', 'Online'];
            const methodData = [
                dashboardStats.totalNumerario,
                dashboardStats.totalMultibanco,
                dashboardStats.totalNopay,
                dashboardStats.totalOnline
            ];
            
            new Chart(paymentCanvas, {
                type: 'pie',
                data: {
                    labels: methodLabels,
                    datasets: [{
                        label: 'Total por Método (€)',
                        data: methodData,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Total por Método de Pagamento'
                        }
                    }
                }
            });
        }
    }
    
    // ===== TABELA DE ENTREGAS =====
    
    function renderAllDeliveriesTable() {
        if (!allDeliveriesTable) return;
        
        // Limpar tabela
        allDeliveriesTable.innerHTML = '';
        
        if (dashboardData.cashRecords.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega disponível.</td>';
            allDeliveriesTable.appendChild(row);
            return;
        }
        
        // Renderizar cada entrega
        dashboardData.cashRecords.forEach(cashRecord => {
            const row = document.createElement('tr');
            
            // Determinar status
            let statusClass = 'status-success';
            let statusText = 'Processado';
            
            if (cashRecord.price_difference && Math.abs(cashRecord.price_difference) > 0.01) {
                statusClass = 'status-warning';
                statusText = 'Diferença de Preço';
            }
            
            row.className = statusClass;
            
            row.innerHTML = `
                <td>${cashRecord.license_plate || 'N/A'}</td>
                <td>${formatDate(cashRecord.created_at)}</td>
                <td>${cashRecord.park_brand || 'N/A'}</td>
                <td>${formatPaymentMethod(cashRecord.payment_method)}</td>
                <td>${formatCurrency(cashRecord.price_on_delivery)}</td>
                <td>${cashRecord.driver || 'N/A'}</td>
                <td>${statusText}</td>
            `;
            
            allDeliveriesTable.appendChild(row);
        });
    }
    
    // ===== AUTO-REFRESH =====
    
    function setupAutoRefresh() {
        // Refresh a cada 5 minutos
        setInterval(async () => {
            try {
                console.log('🔄 Auto-refresh do dashboard...');
                await loadDataFromSupabase();
                calculateStats();
                renderDashboard();
            } catch (error) {
                console.error('Erro no auto-refresh:', error);
            }
        }, 5 * 60 * 1000);
    }
    
    // ===== FUNÇÕES UTILITÁRIAS =====
    
    function formatCurrency(value) {
        const numValue = parseFloat(value) || 0;
        return numValue.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-PT') + ' ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return dateString;
        }
    }
    
    function formatPaymentMethod(method) {
        if (!method) return 'N/A';
        
        const methods = {
            'numerario': 'Numerário',
            'cash': 'Numerário',
            'multibanco': 'Multibanco',
            'card': 'Multibanco',
            'no pay': 'No Pay',
            'online': 'Online'
        };
        
        return methods[method.toLowerCase()] || method;
    }
    
    function showLoading(message) {
        // Criar overlay de loading
        let loader = document.getElementById('dashboard-loading');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'dashboard-loading';
            loader.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.3); display: flex; align-items: center; 
                            justify-content: center; z-index: 9999;">
                    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; 
                             border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; 
                             margin: 0 auto 10px;"></div>
                        <p style="margin: 0; color: #333;">${message}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
    }
    
    function hideLoading() {
        const loader = document.getElementById('dashboard-loading');
        if (loader) loader.remove();
    }
    
    function showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 20px; 
            border-radius: 5px; color: white; font-weight: bold; z-index: 10000;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 5000);
    }
    
    // ===== API PÚBLICA =====
    
    function setDeliveryData(data) {
        console.log('Dados recebidos via setDeliveryData:', data);
        // Esta função mantém compatibilidade com o código existente
        // mas agora os dados vêm do Supabase
        renderDashboard();
    }
    
    function refreshDashboard() {
        initializeDashboard();
    }
    
    // Expor funções para uso externo
    window.dashboard = {
        setDeliveryData: setDeliveryData,
        refreshDashboard: refreshDashboard,
        getStats: function() {
            return dashboardStats;
        }
    };
    
    // Adicionar CSS para spinner
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Inicializar dashboard quando a página carregar
    initializeDashboard();
    
    console.log('📊 Dashboard com Supabase carregado com sucesso!');
});