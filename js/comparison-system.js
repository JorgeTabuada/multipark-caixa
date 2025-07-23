// ===== SISTEMA DE COMPARAÇÃO ODOO VS BACK OFFICE =====
// Sistema para comparar dados e mostrar diferenças ao utilizador

class ComparisonSystem {
    constructor() {
        this.odooData = [];
        this.backofficeData = [];
        this.comparisonResults = [];
        this.currentFilter = 'all';
        
        this.initializeDOM();
        console.log('🔍 Sistema de Comparação inicializado!');
    }

    // ===== INICIALIZAÇÃO =====
    
    initializeDOM() {
        this.elements = {
            validateBtn: document.getElementById('validate-comparison-btn'),
            showAllBtn: document.getElementById('show-all-btn'),
            showMissingBtn: document.getElementById('show-missing-btn'),
            showInconsistentBtn: document.getElementById('show-inconsistent-btn'),
            comparisonTable: document.getElementById('comparison-table')?.querySelector('tbody'),
            odooCount: document.getElementById('odoo-count'),
            backofficeCount: document.getElementById('backoffice-count'),
            inconsistencyCount: document.getElementById('inconsistency-count'),
            missingCount: document.getElementById('missing-count')
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Botão "Validar e Avançar" - PRINCIPAL CORREÇÃO!
        if (this.elements.validateBtn) {
            this.elements.validateBtn.addEventListener('click', () => {
                this.validateAndAdvance();
            });
        }
        
        // Filtros da tabela
        if (this.elements.showAllBtn) {
            this.elements.showAllBtn.addEventListener('click', () => {
                this.filterResults('all');
            });
        }
        
        if (this.elements.showMissingBtn) {
            this.elements.showMissingBtn.addEventListener('click', () => {
                this.filterResults('missing');
            });
        }
        
        if (this.elements.showInconsistentBtn) {
            this.elements.showInconsistentBtn.addEventListener('click', () => {
                this.filterResults('inconsistent');
            });
        }
    }

    // ===== PROCESSAMENTO DE COMPARAÇÃO =====
    
    async compareData(odooData, backofficeData) {
        try {
            console.log('🔄 Iniciando comparação...', {
                odoo: odooData?.length || 0,
                backoffice: backofficeData?.length || 0
            });
            
            this.odooData = odooData || [];
            this.backofficeData = backofficeData || [];
            
            // Normalizar dados
            const normalizedOdoo = this.normalizeData(this.odooData, 'odoo');
            const normalizedBackoffice = this.normalizeData(this.backofficeData, 'backoffice');
            
            // Criar mapas para comparação
            const odooMap = new Map();
            const backofficeMap = new Map();
            
            normalizedOdoo.forEach(record => {
                if (record.licensePlate) {
                    odooMap.set(record.licensePlate, record);
                }
            });
            
            normalizedBackoffice.forEach(record => {
                if (record.licensePlate) {
                    backofficeMap.set(record.licensePlate, record);
                }
            });
            
            // Realizar comparação
            this.comparisonResults = [];
            const allPlates = new Set([...odooMap.keys(), ...backofficeMap.keys()]);
            
            allPlates.forEach(plate => {
                const odooRecord = odooMap.get(plate);
                const backofficeRecord = backofficeMap.get(plate);
                
                const comparison = this.compareRecords(plate, odooRecord, backofficeRecord);
                this.comparisonResults.push(comparison);
            });
            
            // Salvar comparações no Supabase
            await this.saveComparisons();
            
            // Atualizar interface
            this.updateInterface();
            
            console.log('✅ Comparação concluída:', {
                total: this.comparisonResults.length,
                inconsistent: this.comparisonResults.filter(r => r.status === 'inconsistent').length,
                missing: this.comparisonResults.filter(r => r.status.includes('missing')).length
            });
            
        } catch (error) {
            console.error('❌ Erro na comparação:', error);
            throw error;
        }
    }
    
    normalizeData(data, source) {
        return data.map(record => ({
            licensePlate: this.normalizeLicensePlate(record.licensePlate || record.imma || ''),
            bookingPrice: parseFloat(record.bookingPrice || record.price || 0),
            parkBrand: (record.parkBrand || record.parking_name || '').toUpperCase(),
            driver: record.driver || record.condutor || '',
            paymentMethod: (record.paymentMethod || '').toLowerCase(),
            campaign: record.campaign || '',
            source: source,
            originalRecord: record
        }));
    }
    
    compareRecords(licensePlate, odooRecord, backofficeRecord) {
        const comparison = {
            licensePlate: licensePlate,
            odooRecord: odooRecord,
            backofficeRecord: backofficeRecord,
            status: 'valid',
            inconsistencies: [],
            bookingPriceOdoo: odooRecord?.bookingPrice || 0,
            bookingPriceBO: backofficeRecord?.bookingPrice || 0,
            parkBrand: odooRecord?.parkBrand || backofficeRecord?.parkBrand || '',
            alocation: backofficeRecord?.originalRecord?.alocation || `AUTO_${licensePlate.slice(-4)}`
        };
        
        // Verificar registros ausentes
        if (!odooRecord && backofficeRecord) {
            comparison.status = 'missing_in_odoo';
            comparison.inconsistencies.push('Registro ausente no Odoo');
        } else if (odooRecord && !backofficeRecord) {
            comparison.status = 'missing_in_backoffice';
            comparison.inconsistencies.push('Registro ausente no Back Office');
        } else if (odooRecord && backofficeRecord) {
            // Comparar campos importantes
            this.compareFields(comparison, odooRecord, backofficeRecord);
        }
        
        return comparison;
    }
    
    compareFields(comparison, odooRecord, backofficeRecord) {
        // Diferença de preços
        const priceDiff = Math.abs(odooRecord.bookingPrice - backofficeRecord.bookingPrice);
        if (priceDiff > 0.01) {
            comparison.status = 'inconsistent';
            comparison.inconsistencies.push(`Preço diferente: Odoo €${odooRecord.bookingPrice.toFixed(2)} vs BO €${backofficeRecord.bookingPrice.toFixed(2)}`);
        }
        
        // Marca do parque
        if (odooRecord.parkBrand !== backofficeRecord.parkBrand) {
            comparison.status = 'inconsistent';
            comparison.inconsistencies.push(`Marca diferente: Odoo "${odooRecord.parkBrand}" vs BO "${backofficeRecord.parkBrand}"`);
        }
        
        // Condutor
        if (odooRecord.driver && backofficeRecord.driver && 
            odooRecord.driver.toLowerCase() !== backofficeRecord.driver.toLowerCase()) {
            comparison.status = 'inconsistent';
            comparison.inconsistencies.push(`Condutor diferente: Odoo "${odooRecord.driver}" vs BO "${backofficeRecord.driver}"`);
        }
    }

    // ===== SALVAR NO SUPABASE =====
    
    async saveComparisons() {
        if (!window.caixaAPI) return;
        
        try {
            for (const comparison of this.comparisonResults) {
                await window.caixaAPI.saveComparison({
                    licensePlate: comparison.licensePlate,
                    status: comparison.status,
                    salesOrderId: comparison.odooRecord?.originalRecord?.id || null,
                    deliveryId: comparison.backofficeRecord?.originalRecord?.id || null,
                    inconsistencies: comparison.inconsistencies
                });
            }
        } catch (error) {
            console.error('Erro ao salvar comparações:', error);
        }
    }

    // ===== INTERFACE =====
    
    updateInterface() {
        this.updateCounters();
        this.renderTable();
        this.enableValidationButton();
    }
    
    updateCounters() {
        if (this.elements.odooCount) {
            this.elements.odooCount.textContent = this.odooData.length;
        }
        
        if (this.elements.backofficeCount) {
            this.elements.backofficeCount.textContent = this.backofficeData.length;
        }
        
        const inconsistentCount = this.comparisonResults.filter(r => 
            r.status === 'inconsistent'
        ).length;
        
        if (this.elements.inconsistencyCount) {
            this.elements.inconsistencyCount.textContent = inconsistentCount;
        }
        
        const missingCount = this.comparisonResults.filter(r => 
            r.status.includes('missing')
        ).length;
        
        if (this.elements.missingCount) {
            this.elements.missingCount.textContent = missingCount;
        }
    }
    
    enableValidationButton() {
        if (this.elements.validateBtn) {
            this.elements.validateBtn.disabled = false;
            this.elements.validateBtn.textContent = 'Validar e Avançar ✅';
        }
    }
    
    renderTable() {
        if (!this.elements.comparisonTable) return;
        
        const filteredResults = this.getFilteredResults();
        
        this.elements.comparisonTable.innerHTML = '';
        
        if (filteredResults.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhum resultado encontrado.</td>';
            this.elements.comparisonTable.appendChild(row);
            return;
        }
        
        filteredResults.forEach(result => {
            const row = this.createTableRow(result);
            this.elements.comparisonTable.appendChild(row);
        });
        
        this.attachTableEventListeners();
    }
    
    createTableRow(result) {
        const row = document.createElement('tr');
        
        // Classes de status
        const statusClasses = {
            'inconsistent': 'status-error',
            'missing_in_odoo': 'status-warning',
            'missing_in_backoffice': 'status-warning',
            'valid': 'status-success'
        };
        
        if (statusClasses[result.status]) {
            row.classList.add(statusClasses[result.status]);
        }
        
        // Badge de status
        const statusBadge = this.createStatusBadge(result);
        
        row.innerHTML = `
            <td>${result.licensePlate}</td>
            <td>${result.alocation}</td>
            <td>€${result.bookingPriceBO.toFixed(2)}</td>
            <td>€${result.bookingPriceOdoo.toFixed(2)}</td>
            <td>${result.parkBrand}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="comparison-actions">
                    <button class="btn btn-secondary btn-sm view-details" 
                            data-plate="${result.licensePlate}" 
                            title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${result.status === 'inconsistent' ? `
                        <button class="btn btn-primary btn-sm resolve-conflict" 
                                data-plate="${result.licensePlate}"
                                title="Resolver conflito">
                            <i class="fas fa-wrench"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        return row;
    }
    
    createStatusBadge(result) {
        const badges = {
            'inconsistent': '<span class="badge badge-error">Inconsistente</span>',
            'missing_in_odoo': '<span class="badge badge-warning">Ausente no Odoo</span>',
            'missing_in_backoffice': '<span class="badge badge-warning">Ausente no BO</span>',
            'valid': '<span class="badge badge-success">Válido</span>'
        };
        
        return badges[result.status] || '<span class="badge">Desconhecido</span>';
    }

    // ===== FILTROS =====
    
    filterResults(filter) {
        this.currentFilter = filter;
        
        // Atualizar botões ativos
        document.querySelectorAll('.card-header button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (filter === 'all' && this.elements.showAllBtn) {
            this.elements.showAllBtn.classList.add('active');
        } else if (filter === 'missing' && this.elements.showMissingBtn) {
            this.elements.showMissingBtn.classList.add('active');
        } else if (filter === 'inconsistent' && this.elements.showInconsistentBtn) {
            this.elements.showInconsistentBtn.classList.add('active');
        }
        
        this.renderTable();
    }
    
    getFilteredResults() {
        if (this.currentFilter === 'all') {
            return this.comparisonResults;
        } else if (this.currentFilter === 'missing') {
            return this.comparisonResults.filter(r => r.status.includes('missing'));
        } else if (this.currentFilter === 'inconsistent') {
            return this.comparisonResults.filter(r => r.status === 'inconsistent');
        }
        return this.comparisonResults;
    }

    // ===== AÇÕES =====
    
    validateAndAdvance() {
        const inconsistentCount = this.comparisonResults.filter(r => 
            r.status === 'inconsistent'
        ).length;
        
        if (inconsistentCount > 0) {
            this.showValidationModal(inconsistentCount);
        } else {
            this.proceedToValidation();
        }
    }
    
    showValidationModal(inconsistentCount) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>⚠️ Inconsistências Encontradas</h3>
                </div>
                <div class="modal-body">
                    <p>Foram encontradas <strong>${inconsistentCount} inconsistências</strong> entre os dados do Odoo e Back Office.</p>
                    
                    <p>Podes:</p>
                    <ul>
                        <li><strong>Continuar assim mesmo</strong> - as inconsistências serão marcadas para revisão posterior</li>
                        <li><strong>Resolver agora</strong> - corrigir os conflitos antes de avançar</li>
                    </ul>
                    
                    <div class="modal-actions" style="margin-top: 20px;">
                        <button id="continue-anyway" class="btn btn-warning">
                            <i class="fas fa-arrow-right"></i> Continuar Assim Mesmo
                        </button>
                        <button id="resolve-first" class="btn btn-primary">
                            <i class="fas fa-wrench"></i> Resolver Primeiro
                        </button>
                        <button id="cancel-validation" class="btn btn-secondary">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#continue-anyway').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.proceedToValidation();
        });
        
        modal.querySelector('#resolve-first').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.filterResults('inconsistent');
            this.showNotification('Filtrando apenas registos inconsistentes para resolução', 'info');
        });
        
        modal.querySelector('#cancel-validation').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
    
    proceedToValidation() {
        // Mudar para tab de validação de caixa
        const validateTab = document.querySelector('.nav-tab[data-tab="validate"]');
        if (validateTab && window.caixaApp) {
            window.caixaApp.switchTab('validate');
            this.showNotification('Dados validados! Agora podes importar o ficheiro de caixa.', 'success');
        }
    }

    // ===== EVENT LISTENERS DA TABELA =====
    
    attachTableEventListeners() {
        // Botões de detalhes
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', (e) => {
                const plate = e.currentTarget.getAttribute('data-plate');
                this.showDetails(plate);
            });
        });
        
        // Botões de resolução
        document.querySelectorAll('.resolve-conflict').forEach(button => {
            button.addEventListener('click', (e) => {
                const plate = e.currentTarget.getAttribute('data-plate');
                this.resolveConflict(plate);
            });
        });
    }
    
    showDetails(licensePlate) {
        const result = this.comparisonResults.find(r => r.licensePlate === licensePlate);
        
        if (!result) {
            this.showNotification('Registro não encontrado', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Detalhes: ${licensePlate}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <h4>Status: ${result.status}</h4>
                    
                    ${result.inconsistencies.length > 0 ? `
                        <h4>Inconsistências:</h4>
                        <ul>
                            ${result.inconsistencies.map(inc => `<li>${inc}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    <div class="comparison-details">
                        <div class="detail-section">
                            <h4>Dados Odoo:</h4>
                            ${result.odooRecord ? `
                                <p><strong>Preço:</strong> €${result.odooRecord.bookingPrice.toFixed(2)}</p>
                                <p><strong>Marca:</strong> ${result.odooRecord.parkBrand}</p>
                                <p><strong>Condutor:</strong> ${result.odooRecord.driver || 'N/A'}</p>
                            ` : '<p class="text-muted">Registro não encontrado no Odoo</p>'}
                        </div>
                        
                        <div class="detail-section">
                            <h4>Dados Back Office:</h4>
                            ${result.backofficeRecord ? `
                                <p><strong>Preço:</strong> €${result.backofficeRecord.bookingPrice.toFixed(2)}</p>
                                <p><strong>Marca:</strong> ${result.backofficeRecord.parkBrand}</p>
                                <p><strong>Condutor:</strong> ${result.backofficeRecord.driver || 'N/A'}</p>
                                <p><strong>Alocação:</strong> ${result.alocation}</p>
                            ` : '<p class="text-muted">Registro não encontrado no Back Office</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    resolveConflict(licensePlate) {
        const result = this.comparisonResults.find(r => r.licensePlate === licensePlate);
        
        if (!result || result.status !== 'inconsistent') {
            this.showNotification('Conflito não encontrado', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Resolver Conflito: ${licensePlate}</h3>
                </div>
                <div class="modal-body">
                    <p>Escolhe qual sistema está correto:</p>
                    
                    <div class="conflict-options">
                        <div class="option-card">
                            <h4><i class="fas fa-shopping-cart"></i> Odoo (Sistema de Vendas)</h4>
                            <p><strong>Preço:</strong> €${result.bookingPriceOdoo.toFixed(2)}</p>
                            <p><strong>Marca:</strong> ${result.odooRecord?.parkBrand || 'N/A'}</p>
                            <button class="btn btn-primary choose-option" data-choice="odoo">
                                Odoo Está Correto
                            </button>
                        </div>
                        
                        <div class="option-card">
                            <h4><i class="fas fa-building"></i> Back Office (Sistema de Entregas)</h4>
                            <p><strong>Preço:</strong> €${result.bookingPriceBO.toFixed(2)}</p>
                            <p><strong>Marca:</strong> ${result.backofficeRecord?.parkBrand || 'N/A'}</p>
                            <button class="btn btn-primary choose-option" data-choice="backoffice">
                                Back Office Está Correto
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label>Notas da Resolução:</label>
                        <textarea id="resolution-notes" class="form-control" rows="3" 
                                  placeholder="Adiciona notas sobre por que este sistema está correto..."></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancel-resolution" class="btn btn-secondary">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelectorAll('.choose-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const choice = e.currentTarget.getAttribute('data-choice');
                const notes = modal.querySelector('#resolution-notes').value;
                this.applyResolution(result, choice, notes);
                document.body.removeChild(modal);
            });
        });
        
        modal.querySelector('#cancel-resolution').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
    
    async applyResolution(result, choice, notes) {
        // Aplicar resolução
        result.resolution = choice;
        result.resolutionNotes = notes;
        result.status = 'resolved';
        result.resolvedAt = new Date().toISOString();
        
        // Salvar no Supabase
        if (window.caixaAPI) {
            try {
                await window.caixaAPI.saveComparison({
                    licensePlate: result.licensePlate,
                    status: result.status,
                    resolution: choice,
                    resolutionNotes: notes
                });
            } catch (error) {
                console.error('Erro ao salvar resolução:', error);
            }
        }
        
        // Atualizar interface
        this.updateInterface();
        
        this.showNotification(`Conflito resolvido: ${choice === 'odoo' ? 'Odoo' : 'Back Office'} foi escolhido como correto`, 'success');
    }

    // ===== UTILITÁRIOS =====
    
    normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate)
            .replace(/[\\s\\-\\.\\,\\/\\\\\\(\\)\\[\\]\\{\\}\\+\\*\\?\\^\\$\\|]/g, '')
            .toLowerCase();
    }
    
    showNotification(message, type = 'info') {
        if (window.caixaApp && window.caixaApp.showNotification) {
            window.caixaApp.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // ===== API PÚBLICA =====
    
    getResults() {
        return {
            all: this.comparisonResults,
            valid: this.comparisonResults.filter(r => r.status === 'valid'),
            inconsistent: this.comparisonResults.filter(r => r.status === 'inconsistent'),
            missing: this.comparisonResults.filter(r => r.status.includes('missing')),
            resolved: this.comparisonResults.filter(r => r.status === 'resolved')
        };
    }
    
    getStats() {
        return {
            total: this.comparisonResults.length,
            valid: this.comparisonResults.filter(r => r.status === 'valid').length,
            inconsistent: this.comparisonResults.filter(r => r.status === 'inconsistent').length,
            missing: this.comparisonResults.filter(r => r.status.includes('missing')).length,
            resolved: this.comparisonResults.filter(r => r.status === 'resolved').length
        };
    }
}

// ===== INSTÂNCIA GLOBAL =====

const comparisonSystem = new ComparisonSystem();

// ===== COMPATIBILIDADE COM CÓDIGO EXISTENTE =====

// Função global para comparação (chamada pelo file-processor.js)
window.compareOdooBackOffice = (odooData, backofficeData) => {
    return comparisonSystem.compareData(odooData, backofficeData);
};

// Função global para mudar tab (usada no file-processor.js)
window.changeTab = (tabElement) => {
    if (window.caixaApp && window.caixaApp.switchTab) {
        const tabName = tabElement.getAttribute('data-tab');
        window.caixaApp.switchTab(tabName);
    }
};

// Objeto global para compatibilidade
window.comparator = {
    compare: (odooData, backofficeData) => comparisonSystem.compareData(odooData, backofficeData),
    getResults: () => comparisonSystem.getResults(),
    getStats: () => comparisonSystem.getStats()
};

window.comparisonSystem = comparisonSystem;

console.log('🔍 Sistema de Comparação carregado - Botão "Validar e Avançar" corrigido!');
