// comparator-fixed.js - Correção da comparação com marcas e resolução de problemas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Carregando comparador corrigido...');
    
    // Elementos da interface
    const odooCountElement = document.getElementById('odoo-count');
    const backofficeCountElement = document.getElementById('backoffice-count');
    const inconsistencyCountElement = document.getElementById('inconsistency-count');
    const missingCountElement = document.getElementById('missing-count');
    const comparisonTable = document.getElementById('comparison-table')?.querySelector('tbody');
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
        
        let normalized = String(value).trim();
        normalized = normalized.replace(/€/g, '').trim();
        
        if (!isNaN(normalized)) {
            return Number(normalized);
        }
        
        return normalized.toLowerCase();
    }

    /**
     * CORREÇÃO: Função principal de comparação
     */
    window.compareOdooBackOffice = function(odooData, backOfficeData) {
        console.log('🚀 Iniciando comparação com lógica corrigida...');
        
        // Limpar resultados anteriores
        comparisonResults = {
            all: [],
            inconsistent: [],
            missing: [],
            valid: []
        };
        
        // Atualizar contadores
        if (odooCountElement) odooCountElement.textContent = odooData.length;
        if (backofficeCountElement) backofficeCountElement.textContent = backOfficeData.length;
        
        // Criar mapas por matrícula normalizada
        const odooMap = new Map();
        odooData.forEach(record => {
            if (record.licensePlate) {
                const normalizedPlate = window.normalizeLicensePlate(record.licensePlate);
                odooMap.set(normalizedPlate, record);
            }
        });
        
        const backOfficeMap = new Map();
        backOfficeData.forEach(record => {
            if (record.licensePlate) {
                const normalizedPlate = window.normalizeLicensePlate(record.licensePlate);
                backOfficeMap.set(normalizedPlate, record);
            }
        });

        // Verificar registros do Back Office
        backOfficeData.forEach(boRecord => {
            if (!boRecord.licensePlate) return;
            
            const licensePlate = boRecord.licensePlate;
            const normalizedPlate = window.normalizeLicensePlate(licensePlate);
            const odooRecord = odooMap.get(normalizedPlate);
            
            if (!odooRecord) {
                // Registro ausente no Odoo
                comparisonResults.missing.push({
                    source: 'backoffice',
                    licensePlate: licensePlate,
                    alocation: boRecord.alocation || 'N/A',
                    bookingPriceBO: boRecord.bookingPrice || 0,
                    bookingPriceOdoo: 'N/A',
                    parkBrand: boRecord.parkBrand || 'N/A',
                    status: 'missing_in_odoo',
                    boRecord: boRecord,
                    odooRecord: null,
                    resolution: null
                });
            } else {
                // Verificar inconsistências
                const inconsistencies = [];
                
                // CORREÇÃO: Verificar preço
                if (normalizeValue(boRecord.bookingPrice) !== normalizeValue(odooRecord.bookingPrice)) {
                    inconsistencies.push('bookingPrice');
                }
                
                // CORREÇÃO: Verificar marca usando nova lógica (ignora cidades)
                if (window.BrandUtils && !window.BrandUtils.brandsMatch(boRecord.parkBrand, odooRecord.parkBrand)) {
                    inconsistencies.push('parkBrand');
                    console.log(`⚠️ Marca diferente: BO="${boRecord.parkBrand}" vs Odoo="${odooRecord.parkBrand}"`);
                } else {
                    console.log(`✅ Marcas compatíveis: BO="${boRecord.parkBrand}" vs Odoo="${odooRecord.parkBrand}"`);
                }
                
                if (inconsistencies.length > 0) {
                    // Registro inconsistente
                    comparisonResults.inconsistent.push({
                        source: 'both',
                        licensePlate: licensePlate,
                        alocation: boRecord.alocation || 'N/A',
                        bookingPriceBO: boRecord.bookingPrice || 0,
                        bookingPriceOdoo: odooRecord.bookingPrice || 0,
                        parkBrand: boRecord.parkBrand || 'N/A',
                        parkBrandOdoo: odooRecord.parkBrand || 'N/A',
                        status: 'inconsistent',
                        inconsistencies: inconsistencies,
                        boRecord: boRecord,
                        odooRecord: odooRecord,
                        resolution: null
                    });
                } else {
                    // Registro válido
                    comparisonResults.valid.push({
                        source: 'both',
                        licensePlate: licensePlate,
                        alocation: boRecord.alocation || 'N/A',
                        bookingPriceBO: boRecord.bookingPrice || 0,
                        bookingPriceOdoo: odooRecord.bookingPrice || 0,
                        parkBrand: boRecord.parkBrand || 'N/A',
                        status: 'valid',
                        boRecord: boRecord,
                        odooRecord: odooRecord,
                        resolution: 'valid'
                    });
                }
            }
        });
        
        // Verificar registros ausentes no Back Office
        odooData.forEach(odooRecord => {
            if (!odooRecord.licensePlate) return;
            
            const licensePlate = odooRecord.licensePlate;
            const normalizedPlate = window.normalizeLicensePlate(licensePlate);
            const boRecord = backOfficeMap.get(normalizedPlate);
            
            if (!boRecord) {
                comparisonResults.missing.push({
                    source: 'odoo',
                    licensePlate: licensePlate,
                    alocation: 'N/A',
                    bookingPriceBO: 'N/A',
                    bookingPriceOdoo: odooRecord.bookingPrice || 0,
                    parkBrand: odooRecord.parkBrand || 'N/A',
                    status: 'missing_in_backoffice',
                    boRecord: null,
                    odooRecord: odooRecord,
                    resolution: null
                });
            }
        });
        
        // Combinar todos os resultados
        comparisonResults.all = [
            ...comparisonResults.valid,
            ...comparisonResults.inconsistent,
            ...comparisonResults.missing
        ];
        
        // Atualizar interface
        if (inconsistencyCountElement) inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        if (missingCountElement) missingCountElement.textContent = comparisonResults.missing.length;
        
        console.log('📊 Resultados da comparação:', {
            total: comparisonResults.all.length,
            valid: comparisonResults.valid.length,
            inconsistent: comparisonResults.inconsistent.length,
            missing: comparisonResults.missing.length
        });
        
        renderComparisonTable(comparisonResults.all);
        updateValidateButton();
        
        // Mostrar notificação de sucesso
        if (window.showNotification) {
            window.showNotification(`Comparação concluída! ${comparisonResults.valid.length} válidos, ${comparisonResults.inconsistent.length} inconsistentes, ${comparisonResults.missing.length} ausentes.`, 'success');
        }
    };

    /**
     * CORREÇÃO: Renderizar tabela de comparação
     */
    function renderComparisonTable(records) {
        if (!comparisonTable) {
            console.error('❌ Tabela de comparação não encontrada');
            return;
        }
        
        comparisonTable.innerHTML = '';
        
        if (records.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum registro encontrado.</td>';
            comparisonTable.appendChild(row);
            return;
        }
        
        records.forEach(record => {
            const row = document.createElement('tr');
            
            if (record.status === 'inconsistent') {
                row.classList.add('status-error');
            } else if (record.status.includes('missing')) {
                row.classList.add('status-warning');
            } else if (record.status === 'valid') {
                row.classList.add('status-success');
            }
            
            row.innerHTML = `
                <td>${record.licensePlate}</td>
                <td>${record.alocation}</td>
                <td>${record.bookingPriceBO} €</td>
                <td>${record.bookingPriceOdoo} €</td>
                <td>${record.parkBrand}</td>
                <td>${getStatusText(record.status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-details" data-license="${record.licensePlate}">Detalhes</button>
                    ${record.status !== 'valid' ? `<button class="btn btn-primary btn-sm resolve-issue" data-license="${record.licensePlate}">Resolver</button>` : ''}
                </td>
            `;
            
            comparisonTable.appendChild(row);
        });
        
        addTableButtonEvents();
    }

    /**
     * CORREÇÃO: Adicionar eventos aos botões
     */
    function addTableButtonEvents() {
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const licensePlate = this.getAttribute('data-license');
                showDetailsModal(licensePlate);
            });
        });
        
        document.querySelectorAll('.resolve-issue').forEach(button => {
            button.addEventListener('click', function() {
                const licensePlate = this.getAttribute('data-license');
                showResolveModal(licensePlate);
            });
        });
    }

    /**
     * CORREÇÃO: Mostrar modal de detalhes
     */
    function showDetailsModal(licensePlate) {
        const record = comparisonResults.all.find(r => 
            r.licensePlate.toString().toLowerCase() === licensePlate.toString().toLowerCase()
        );
        
        if (!record) {
            console.error('❌ Registro não encontrado:', licensePlate);
            return;
        }
        
        const modalBody = document.getElementById('details-modal-body');
        if (!modalBody) {
            console.error('❌ Modal de detalhes não encontrado');
            return;
        }
        
        modalBody.innerHTML = `
            <h4>Matrícula: ${record.licensePlate}</h4>
            <p><strong>Status:</strong> ${getStatusText(record.status)}</p>
            ${record.resolution ? `<p><strong>Resolução:</strong> ${record.resolution}</p>` : ''}
            
            ${record.boRecord ? `
                <h4 class="mt-20">Detalhes do Back Office</h4>
                <table class="table">
                    <tr><th>Alocação</th><td>${record.boRecord.alocation || 'N/A'}</td></tr>
                    <tr><th>Preço Booking</th><td>${record.boRecord.bookingPrice || 'N/A'} €</td></tr>
                    <tr><th>Marca</th><td>${record.boRecord.parkBrand || 'N/A'}</td></tr>
                </table>
            ` : ''}
            
            ${record.odooRecord ? `
                <h4 class="mt-20">Detalhes do Odoo</h4>
                <table class="table">
                    <tr><th>Preço Booking</th><td>${record.odooRecord.bookingPrice || 'N/A'} €</td></tr>
                    <tr><th>Marca</th><td>${record.odooRecord.parkBrand || 'N/A'}</td></tr>
                </table>
            ` : ''}
            
            ${record.inconsistencies && record.inconsistencies.length > 0 ? `
                <h4 class="mt-20">Inconsistências</h4>
                <ul>
                    ${record.inconsistencies.map(inc => {
                        if (inc === 'bookingPrice') {
                            return `<li>Preço de Booking: ${record.bookingPriceBO} € (BO) vs ${record.bookingPriceOdoo} € (Odoo)</li>`;
                        } else if (inc === 'parkBrand') {
                            return `<li>Marca: ${record.parkBrand} (BO) vs ${record.parkBrandOdoo} (Odoo)</li>`;
                        }
                        return `<li>${inc}</li>`;
                    }).join('')}
                </ul>
            ` : ''}
        `;
        
        document.getElementById('details-modal-overlay').style.display = 'flex';
    }

    /**
     * CORREÇÃO: Mostrar modal de resolução
     */
    function showResolveModal(licensePlate) {
        const record = comparisonResults.all.find(r => 
            r.licensePlate.toString().toLowerCase() === licensePlate.toString().toLowerCase()
        );
        
        if (!record) {
            console.error('❌ Registro não encontrado para resolução:', licensePlate);
            return;
        }
        
        const modalBody = document.getElementById('edit-modal-body');
        if (!modalBody) {
            console.error('❌ Modal de resolução não encontrado');
            return;
        }
        
        modalBody.innerHTML = '';
        
        const form = document.createElement('form');
        form.id = 'resolve-form';
        
        if (record.status === 'inconsistent') {
            form.innerHTML = `
                <p>Resolve as inconsistências para <strong>${record.licensePlate}</strong>:</p>
                
                <div class="form-group">
                    <label class="form-label">Escolhe a fonte de dados:</label>
                    <div>
                        <input type="radio" id="prefer-backoffice" name="data-source" value="backoffice" checked>
                        <label for="prefer-backoffice">Usar dados do Back Office</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-odoo" name="data-source" value="odoo">
                        <label for="prefer-odoo">Usar dados do Odoo</label>
                    </div>
                    <div>
                        <input type="radio" id="prefer-custom" name="data-source" value="custom">
                        <label for="prefer-custom">Personalizar</label>
                    </div>
                </div>
                
                <div id="custom-fields" class="hidden">
                    ${record.inconsistencies.includes('bookingPrice') ? `
                        <div class="form-group">
                            <label class="form-label">Preço de Booking:</label>
                            <input type="number" class="form-control" id="custom-booking-price" value="${record.bookingPriceBO}" step="0.01">
                        </div>
                    ` : ''}
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações:</label>
                    <textarea class="form-control" id="resolution-notes" rows="3"></textarea>
                </div>
            `;
        } else if (record.status.includes('missing')) {
            form.innerHTML = `
                <p>Resolve o problema para <strong>${record.licensePlate}</strong> ${record.status === 'missing_in_odoo' ? 'ausente no Odoo' : 'ausente no Back Office'}:</p>
                
                <div class="form-group">
                    <label class="form-label">Escolhe uma ação:</label>
                    <div>
                        <input type="radio" id="action-include" name="missing-action" value="include" checked>
                        <label for="action-include">Incluir o registro</label>
                    </div>
                    <div>
                        <input type="radio" id="action-ignore" name="missing-action" value="ignore">
                        <label for="action-ignore">Ignorar</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observações:</label>
                    <textarea class="form-control" id="resolution-notes" rows="3"></textarea>
                </div>
            `;
        }
        
        modalBody.appendChild(form);
        
        // Eventos para campos personalizados
        const radioButtons = form.querySelectorAll('input[name="data-source"]');
        const customFields = form.querySelector('#custom-fields');
        
        if (radioButtons.length > 0 && customFields) {
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'custom') {
                        customFields.classList.remove('hidden');
                    } else {
                        customFields.classList.add('hidden');
                    }
                });
            });
        }
        
        // Configurar botão de salvar
        const saveButton = document.getElementById('save-resolution-btn');
        if (saveButton) {
            saveButton.onclick = function() {
                resolveIssue(record);
            };
        }
        
        document.getElementById('edit-modal-overlay').style.display = 'flex';
    }

    /**
     * CORREÇÃO: Resolver inconsistência
     */
    async function resolveIssue(record) {
        try {
            console.log('🔧 Resolvendo inconsistência:', record.licensePlate);
            
            if (record.status === 'inconsistent') {
                const dataSource = document.querySelector('input[name="data-source"]:checked')?.value;
                const notes = document.getElementById('resolution-notes')?.value || '';
                
                if (!dataSource) {
                    if (window.showNotification) {
                        window.showNotification('Por favor, seleciona uma fonte de dados.', 'warning');
                    }
                    return;
                }
                
                if (dataSource === 'backoffice') {
                    record.resolution = 'use_backoffice';
                    record.resolutionNotes = notes;
                    
                    if (record.inconsistencies.includes('bookingPrice')) {
                        record.odooRecord.bookingPrice = record.boRecord.bookingPrice;
                        record.bookingPriceOdoo = record.boRecord.bookingPrice;
                    }
                    
                    if (record.inconsistencies.includes('parkBrand')) {
                        record.odooRecord.parkBrand = record.boRecord.parkBrand;
                        record.parkBrandOdoo = record.boRecord.parkBrand;
                    }
                    
                } else if (dataSource === 'odoo') {
                    record.resolution = 'use_odoo';
                    record.resolutionNotes = notes;
                    
                    if (record.inconsistencies.includes('bookingPrice')) {
                        record.boRecord.bookingPrice = record.odooRecord.bookingPrice;
                        record.bookingPriceBO = record.odooRecord.bookingPrice;
                    }
                    
                    if (record.inconsistencies.includes('parkBrand')) {
                        record.boRecord.parkBrand = record.odooRecord.parkBrand;
                        record.parkBrand = record.odooRecord.parkBrand;
                    }
                    
                } else if (dataSource === 'custom') {
                    record.resolution = 'use_custom';
                    record.resolutionNotes = notes;
                    
                    if (record.inconsistencies.includes('bookingPrice')) {
                        const customPrice = parseFloat(document.getElementById('custom-booking-price')?.value || 0);
                        record.boRecord.bookingPrice = customPrice;
                        record.odooRecord.bookingPrice = customPrice;
                        record.bookingPriceBO = customPrice;
                        record.bookingPriceOdoo = customPrice;
                    }
                }
                
                moveRecordToValid(record);
                
            } else if (record.status.includes('missing')) {
                const action = document.querySelector('input[name="missing-action"]:checked')?.value;
                const notes = document.getElementById('resolution-notes')?.value || '';
                
                if (!action) {
                    if (window.showNotification) {
                        window.showNotification('Por favor, seleciona uma ação.', 'warning');
                    }
                    return;
                }
                
                if (action === 'include') {
                    record.resolution = 'include';
                    record.resolutionNotes = notes;
                    
                    if (record.status === 'missing_in_odoo') {
                        record.odooRecord = {
                            ID: 'AUTO_' + Date.now(),
                            licensePlate: record.licensePlate,
                            bookingPrice: record.boRecord.bookingPrice,
                            parkBrand: record.boRecord.parkBrand,
                            status: 'Auto-created'
                        };
                        record.bookingPriceOdoo = record.boRecord.bookingPrice;
                    } else {
                        record.boRecord = {
                            licensePlate: record.licensePlate,
                            alocation: 'AUTO_' + Date.now(),
                            bookingPrice: record.odooRecord.bookingPrice,
                            parkBrand: record.odooRecord.parkBrand,
                            status: 'Auto-created'
                        };
                        record.alocation = record.boRecord.alocation;
                        record.bookingPriceBO = record.odooRecord.bookingPrice;
                    }
                    
                    moveRecordToValid(record);
                    
                } else if (action === 'ignore') {
                    record.resolution = 'ignore';
                    record.resolutionNotes = notes;
                    moveRecordToValid(record);
                }
            }
            
            // Fechar modal
            document.getElementById('edit-modal-overlay').style.display = 'none';
            
            // Atualizar interface
            renderComparisonTable(comparisonResults.all);
            updateCounters();
            updateValidateButton();
            
            if (window.showNotification) {
                window.showNotification('Inconsistência resolvida com sucesso!', 'success');
            }
            
        } catch (error) {
            console.error('❌ Erro ao resolver inconsistência:', error);
            if (window.showNotification) {
                window.showNotification('Erro ao resolver inconsistência: ' + error.message, 'error');
            }
        }
    }

    /**
     * Mover registro para válidos
     */
    function moveRecordToValid(record) {
        if (record.status === 'inconsistent') {
            comparisonResults.inconsistent = comparisonResults.inconsistent.filter(r => 
                r.licensePlate.toString().toLowerCase() !== record.licensePlate.toString().toLowerCase()
            );
        } else if (record.status.includes('missing')) {
            comparisonResults.missing = comparisonResults.missing.filter(r => 
                r.licensePlate.toString().toLowerCase() !== record.licensePlate.toString().toLowerCase()
            );
        }
        
        record.status = 'valid';
        
        if (!comparisonResults.valid.some(r => 
            r.licensePlate.toString().toLowerCase() === record.licensePlate.toString().toLowerCase()
        )) {
            comparisonResults.valid.push(record);
        }
    }

    function updateCounters() {
        if (inconsistencyCountElement) inconsistencyCountElement.textContent = comparisonResults.inconsistent.length;
        if (missingCountElement) missingCountElement.textContent = comparisonResults.missing.length;
    }

    function updateValidateButton() {
        const allResolved = comparisonResults.inconsistent.length === 0 && 
                           comparisonResults.missing.length === 0;
        
        if (validateComparisonBtn) {
            validateComparisonBtn.disabled = !allResolved;
        }
    }

    function getStatusText(status) {
        switch (status) {
            case 'valid': return 'Válido';
            case 'inconsistent': return 'Inconsistente';
            case 'missing_in_odoo': return 'Ausente no Odoo';
            case 'missing_in_backoffice': return 'Ausente no Back Office';
            default: return status;
        }
    }

    // Eventos para botões de filtro
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.all);
        });
    }

    if (showMissingBtn) {
        showMissingBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.missing);
        });
    }

    if (showInconsistentBtn) {
        showInconsistentBtn.addEventListener('click', function() {
            renderComparisonTable(comparisonResults.inconsistent);
        });
    }

    // Evento para botão de validação
    if (validateComparisonBtn) {
        validateComparisonBtn.addEventListener('click', function() {
            // Atualizar dados globais
            if (window.fileProcessor) {
                window.fileProcessor.setOdooData(comparisonResults.all.map(r => r.odooRecord).filter(Boolean));
                window.fileProcessor.setBackOfficeData(comparisonResults.all.map(r => r.boRecord).filter(Boolean));
            }
            
            // Mudar para aba de validação
            const validateTab = document.querySelector('.nav-tab[data-tab="validate"]');
            if (validateTab && window.changeTab) {
                window.changeTab(validateTab);
            }
            
            if (window.showNotification) {
                window.showNotification('Dados sincronizados! Procede para a validação de caixa.', 'success');
            }
        });
    }

    // Eventos para modais
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(element => {
        element.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Exportar para uso global
    window.comparator = {
        getResults: () => comparisonResults,
        resolveIssue: resolveIssue
    };

    console.log('✅ Comparator corrigido carregado!');
});