// comparator-fixed.js - Correção da comparação com marcas e resolução de problemas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Carregando comparador corrigido...');

    // Elementos da interface
    const odooCountElement = document.getElementById('odoo-count');
    const backofficeCountElement = document.getElementById('backoffice-count');
    const inconsistencyCountElement = document.getElementById('inconsistency-count');
    const missingCountElement = document.getElementById('missing-count');
    const comparisonTable = document.getElementById('comparison-table').querySelector('tbody');
    const validateComparisonBtn = document.getElementById('validate-comparison-btn');

    // Botões de filtro
    const showAllBtn = document.getElementById('show-all-btn');
    const showMissingBtn = document.getElementById('show-missing-btn');
    const showInconsistentBtn = document.getElementById('show-inconsistent-btn');

    // Variáveis para armazenar resultados
    let comparisonResults = {
        all: [],
        inconsistent: [],
        missing: [],
        valid: []
    };

    /**
     * CORREÇÃO: Normalizar valor para comparação
     */
    function normalizeValue(value) {
        if (value === null || value === undefined || value === 'N/A') {
            return '';
        }
        return String(value).trim();
    }

    /**
     * CORREÇÃO: Normalizar marca com regras específicas
     */
    function normalizeBrand(brandName) {
        if (!brandName) return '';
        
        let normalized = String(brandName).toLowerCase().trim();
        
        // Remover palavras relacionadas a estacionamento
        normalized = normalized
            .replace(/\s+parking\b/gi, '')
            .replace(/\s+estacionamento\b/gi, '')
            .replace(/\s+park\b/gi, '')
            .replace(/\s+parque\b/gi, '');
        
        // Remover cidades portuguesas comuns
        const cities = [
            'lisboa', 'lisbon', 'porto', 'oporto', 'coimbra', 'braga', 
            'aveiro', 'faro', 'setúbal', 'évora', 'leiria', 'viseu',
            'santarém', 'castelo branco', 'beja', 'portalegre', 'guarda',
            'viana do castelo', 'vila real', 'bragança'
        ];
        
        for (const city of cities) {
            normalized = normalized.replace(new RegExp(`\\s+${city}$`, 'gi'), '');
            normalized = normalized.replace(new RegExp(`^${city}\\s+`, 'gi'), '');
            normalized = normalized.replace(new RegExp(`\\s+${city}\\s+`, 'gi'), ' ');
        }
        
        return normalized.trim().toUpperCase();
    }

    /**
     * CORREÇÃO: Verificar se marcas coincidem
     */
    function brandsMatch(brand1, brand2) {
        const norm1 = normalizeBrand(brand1);
        const norm2 = normalizeBrand(brand2);
        
        console.log(`🔍 Comparação de marcas: "${brand1}" -> "${norm1}" vs "${brand2}" -> "${norm2}"`);
        return norm1 === norm2;
    }

    /**
     * CORREÇÃO: Normalizar matrícula
     */
    function normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate).replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '').toLowerCase();
    }

    /**
     * CORREÇÃO: Comparar dados do Odoo com Back Office
     */
    function compareData(odooData, backofficeData) {
        console.log('🔄 Iniciando comparação de dados...');
        console.log('📊 Dados Odoo:', odooData?.length || 0);
        console.log('📊 Dados Back Office:', backofficeData?.length || 0);

        if (!odooData || !backofficeData) {
            console.error('❌ Dados insuficientes para comparação');
            return;
        }

        // Resetar resultados
        comparisonResults = {
            all: [],
            inconsistent: [],
            missing: [],
            valid: []
        };

        // Criar mapas para busca rápida
        const odooMap = new Map();
        const backofficeMap = new Map();

        // Processar dados do Odoo
        odooData.forEach(record => {
            if (record.licensePlate) {
                const normalizedPlate = normalizeLicensePlate(record.licensePlate);
                odooMap.set(normalizedPlate, record);
            }
        });

        // Processar dados do Back Office
        backofficeData.forEach(record => {
            if (record.licensePlate) {
                const normalizedPlate = normalizeLicensePlate(record.licensePlate);
                backofficeMap.set(normalizedPlate, record);
            }
        });

        console.log('🗺️ Mapas criados - Odoo:', odooMap.size, 'Back Office:', backofficeMap.size);

        // Comparar registros
        const allPlates = new Set([...odooMap.keys(), ...backofficeMap.keys()]);
        
        allPlates.forEach(plate => {
            const odooRecord = odooMap.get(plate);
            const boRecord = backofficeMap.get(plate);

            const comparison = {
                licensePlate: odooRecord?.licensePlate || boRecord?.licensePlate,
                odooRecord: odooRecord || null,
                boRecord: boRecord || null,
                inconsistencies: [],
                status: 'valid'
            };

            // Verificar se existe em ambos os sistemas
            if (!odooRecord) {
                comparison.inconsistencies.push('missing_in_odoo');
                comparison.status = 'missing';
            } else if (!boRecord) {
                comparison.inconsistencies.push('missing_in_backoffice');
                comparison.status = 'missing';
            } else {
                // Comparar campos específicos
                const inconsistencies = [];

                // CORREÇÃO: Comparação de preços com tolerância
                const odooPrice = parseFloat(odooRecord.bookingPrice) || 0;
                const boPrice = parseFloat(boRecord.bookingPrice) || 0;
                
                if (Math.abs(odooPrice - boPrice) > 0.01) {
                    inconsistencies.push('booking_price');
                }

                // CORREÇÃO: Comparação de marcas usando função melhorada
                if (!brandsMatch(odooRecord.parkBrand, boRecord.parkBrand)) {
                    inconsistencies.push('park_brand');
                }

                // Comparação de condutor
                const odooDriver = normalizeValue(odooRecord.condutorEntrega);
                const boDriver = normalizeValue(boRecord.condutorEntrega);
                
                if (odooDriver !== boDriver) {
                    inconsistencies.push('condutor_entrega');
                }

                // CORREÇÃO: Comparação de datas com formatação
                if (odooRecord.checkOut && boRecord.checkOut) {
                    const odooDate = window.DateUtils ? 
                        window.DateUtils.formatForPostgreSQL(odooRecord.checkOut) : 
                        odooRecord.checkOut;
                    const boDate = window.DateUtils ? 
                        window.DateUtils.formatForPostgreSQL(boRecord.checkOut) : 
                        boRecord.checkOut;
                    
                    if (odooDate !== boDate) {
                        inconsistencies.push('check_out');
                    }
                }

                if (inconsistencies.length > 0) {
                    comparison.inconsistencies = inconsistencies;
                    comparison.status = 'inconsistent';
                }
            }

            // Adicionar preços para referência
            comparison.bookingPriceOdoo = odooRecord?.bookingPrice || 0;
            comparison.bookingPriceBO = boRecord?.bookingPrice || 0;

            // Adicionar aos resultados apropriados
            comparisonResults.all.push(comparison);

            if (comparison.status === 'inconsistent') {
                comparisonResults.inconsistent.push(comparison);
            } else if (comparison.status === 'missing') {
                comparisonResults.missing.push(comparison);
            } else {
                comparisonResults.valid.push(comparison);
            }
        });

        console.log('✅ Comparação concluída:', {
            total: comparisonResults.all.length,
            valid: comparisonResults.valid.length,
            inconsistent: comparisonResults.inconsistent.length,
            missing: comparisonResults.missing.length
        });

        // Atualizar interface
        updateComparisonCounts();
        renderComparisonTable(comparisonResults.all);

        // CORREÇÃO: Mostrar botão "Validar e Avançar" sempre que há dados
        if (comparisonResults.all.length > 0) {
            validateComparisonBtn.classList.remove('hidden');
            console.log('✅ Botão "Validar e Avançar" ativado');
        }
    }

    /**
     * CORREÇÃO: Atualizar contadores
     */
    function updateComparisonCounts() {
        if (odooCountElement) {
            const odooCount = comparisonResults.all.filter(r => r.odooRecord).length;
            odooCountElement.textContent = odooCount;
        }

        if (backofficeCountElement) {
            const boCount = comparisonResults.all.filter(r => r.boRecord).length;
            backofficeCountElement.textContent = boCount;
        }

        if (inconsistencyCountElement) {
            inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        }

        if (missingCountElement) {
            missingCountElement.textContent = comparisonResults.missing.length;
        }
    }

    /**
     * CORREÇÃO: Renderizar tabela de comparação
     */
    function renderComparisonTable(data) {
        if (!comparisonTable) {
            console.error('❌ Tabela de comparação não encontrada');
            return;
        }

        comparisonTable.innerHTML = '';

        if (data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="text-center">Nenhum resultado para mostrar</td>';
            comparisonTable.appendChild(row);
            return;
        }

        data.forEach(comparison => {
            const row = document.createElement('tr');
            
            // Aplicar classes de status
            if (comparison.status === 'inconsistent') {
                row.classList.add('status-warning');
            } else if (comparison.status === 'missing') {
                row.classList.add('status-error');
            } else {
                row.classList.add('status-success');
            }

            const odooPrice = comparison.odooRecord?.bookingPrice || 'N/A';
            const boPrice = comparison.boRecord?.bookingPrice || 'N/A';
            const oodooBrand = comparison.odooRecord?.parkBrand || 'N/A';
            const boBrand = comparison.boRecord?.parkBrand || 'N/A';

            row.innerHTML = `
                <td>${comparison.licensePlate}</td>
                <td>${odooPrice} € / ${boPrice} €</td>
                <td>${oodooBrand} / ${boBrand}</td>
                <td>${getStatusText(comparison.status)}</td>
                <td>${getInconsistenciesText(comparison.inconsistencies)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-comparison-details" data-plate="${comparison.licensePlate}">
                        Detalhes
                    </button>
                    ${comparison.status !== 'valid' ? 
                        `<button class="btn btn-primary btn-sm resolve-comparison" data-plate="${comparison.licensePlate}">
                            Resolver
                        </button>` : ''
                    }
                </td>
            `;

            comparisonTable.appendChild(row);
        });

        // Adicionar eventos aos botões
        addComparisonTableEvents();
    }

    /**
     * CORREÇÃO: Adicionar eventos aos botões da tabela
     */
    function addComparisonTableEvents() {
        document.querySelectorAll('.view-comparison-details').forEach(button => {
            button.addEventListener('click', function() {
                const plate = this.getAttribute('data-plate');
                showComparisonDetailsModal(plate);
            });
        });

        document.querySelectorAll('.resolve-comparison').forEach(button => {
            button.addEventListener('click', function() {
                const plate = this.getAttribute('data-plate');
                showResolveComparisonModal(plate);
            });
        });
    }

    /**
     * CORREÇÃO: Mostrar modal de detalhes
     */
    function showComparisonDetailsModal(licensePlate) {
        const comparison = comparisonResults.all.find(c => c.licensePlate === licensePlate);
        
        if (!comparison) {
            alert('Comparação não encontrada!');
            return;
        }

        const modalBody = document.getElementById('comparison-details-modal-body');
        if (!modalBody) {
            console.error('❌ Modal de detalhes não encontrado');
            return;
        }

        modalBody.innerHTML = '';

        const content = document.createElement('div');
        content.innerHTML = `
            <h4>Comparação: ${comparison.licensePlate}</h4>
            <p><strong>Status:</strong> ${getStatusText(comparison.status)}</p>
            
            <div class="comparison-details">
                <div class="row">
                    <div class="col-md-6">
                        <h5>Dados Odoo</h5>
                        ${comparison.odooRecord ? `
                            <table class="table table-sm">
                                <tr><th>Preço Booking</th><td>${comparison.odooRecord.bookingPrice} €</td></tr>
                                <tr><th>Marca</th><td>${comparison.odooRecord.parkBrand}</td></tr>
                                <tr><th>Condutor</th><td>${comparison.odooRecord.condutorEntrega || 'N/A'}</td></tr>
                                <tr><th>Check Out</th><td>${window.DateUtils ? window.DateUtils.formatForDisplay(comparison.odooRecord.checkOut) : comparison.odooRecord.checkOut}</td></tr>
                            </table>
                        ` : '<p class="text-muted">Não encontrado no Odoo</p>'}
                    </div>
                    
                    <div class="col-md-6">
                        <h5>Dados Back Office</h5>
                        ${comparison.boRecord ? `
                            <table class="table table-sm">
                                <tr><th>Preço Booking</th><td>${comparison.boRecord.bookingPrice} €</td></tr>
                                <tr><th>Marca</th><td>${comparison.boRecord.parkBrand}</td></tr>
                                <tr><th>Condutor</th><td>${comparison.boRecord.condutorEntrega || 'N/A'}</td></tr>
                                <tr><th>Check Out</th><td>${window.DateUtils ? window.DateUtils.formatForDisplay(comparison.boRecord.checkOut) : comparison.boRecord.checkOut}</td></tr>
                            </table>
                        ` : '<p class="text-muted">Não encontrado no Back Office</p>'}
                    </div>
                </div>
            </div>
            
            ${comparison.inconsistencies.length > 0 ? `
                <div class="mt-20">
                    <h5>Inconsistências Encontradas</h5>
                    <ul>
                        ${comparison.inconsistencies.map(inc => `<li>${getInconsistencyDescription(inc)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        modalBody.appendChild(content);
        document.getElementById('comparison-details-modal-overlay').style.display = 'flex';
    }

    /**
     * Funções auxiliares
     */
    function getStatusText(status) {
        switch (status) {
            case 'valid': return 'Válido';
            case 'inconsistent': return 'Inconsistente';
            case 'missing': return 'Em Falta';
            default: return status;
        }
    }

    function getInconsistenciesText(inconsistencies) {
        if (inconsistencies.length === 0) return 'Nenhuma';
        return inconsistencies.map(inc => getInconsistencyDescription(inc)).join(', ');
    }

    function getInconsistencyDescription(inconsistency) {
        switch (inconsistency) {
            case 'booking_price': return 'Preço diferente';
            case 'park_brand': return 'Marca diferente';
            case 'condutor_entrega': return 'Condutor diferente';
            case 'check_out': return 'Data checkout diferente';
            case 'missing_in_odoo': return 'Ausente no Odoo';
            case 'missing_in_backoffice': return 'Ausente no Back Office';
            default: return inconsistency;
        }
    }

    // Eventos de filtros
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.all);
            updateFilterButtons(this);
        });
    }

    if (showMissingBtn) {
        showMissingBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.missing);
            updateFilterButtons(this);
        });
    }

    if (showInconsistentBtn) {
        showInconsistentBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.inconsistent);
            updateFilterButtons(this);
        });
    }

    function updateFilterButtons(activeButton) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    // CORREÇÃO: Botão "Validar e Avançar"
    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', function() {
            console.log('🚀 Validando comparação e avançando...');
            
            if (comparisonResults.all.length === 0) {
                alert('Nenhum dado para validar!');
                return;
            }

            // Preparar dados para validação de caixa
            if (window.validator && window.validator.initCaixaValidation) {
                console.log('✅ Passando dados para validação de caixa');
                
                // Mostrar notificação
                if (window.showNotification) {
                    window.showNotification('Dados validados! Prosseguindo para validação de caixa...', 'success');
                }
                
                // Mudar para aba de validação
                const validationTab = document.querySelector('.nav-tab[data-tab="validation"]');
                if (validationTab && window.changeTab) {
                    window.changeTab(validationTab);
                }
            } else {
                console.warn('⚠️ Sistema de validação não disponível');
                alert('Sistema de validação não está disponível. Verifique se todos os módulos foram carregados.');
            }
        });
    }

    // Fechar modais
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal-overlay').style.display = 'none';
        });
    });

    // Exportar funções
    window.comparator = {
        compareData: compareData,
        getResults: () => comparisonResults,
        normalizeBrand: normalizeBrand,
        brandsMatch: brandsMatch
    };

    console.log('✅ Comparador corrigido carregado!');
});

