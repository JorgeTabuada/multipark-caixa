// ===== SISTEMA DE VALIDAÇÃO MELHORADO =====
// Sistema robusto para validação de entregas e dados

class ValidationSystem {
    constructor() {
        this.rules = new Map();
        this.validatedDeliveries = [];
        this.pendingDeliveries = [];
        this.validationHistory = [];
        this.currentDriverDeliveries = [];
        this.drivers = [];
        
        this.initializeRules();
        this.initializeDOM();
        
        console.log('✅ Sistema de validação melhorado carregado!');
    }

    // ===== INICIALIZAÇÃO =====
    
    initializeDOM() {
        this.elements = {
            driverSelect: document.getElementById('driver-select'),
            driverSelection: document.getElementById('driver-selection'),
            driverDeliveries: document.getElementById('driver-deliveries'),
            deliveriesTable: document.getElementById('deliveries-table')?.querySelector('tbody'),
            deliveryCountElement: document.getElementById('delivery-count'),
            addCaixaBtn: document.getElementById('add-caixa-btn'),
            closeCaixaBtn: document.getElementById('close-caixa-btn')
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        if (this.elements.driverSelect) {
            this.elements.driverSelect.addEventListener('change', (e) => {
                this.onDriverSelected(e.target.value);
            });
        }
        
        if (this.elements.addCaixaBtn) {
            this.elements.addCaixaBtn.addEventListener('click', () => {
                this.addNewCaixaSheet();
            });
        }
        
        if (this.elements.closeCaixaBtn) {
            this.elements.closeCaixaBtn.addEventListener('click', () => {
                this.closeCaixa();
            });
        }
    }

    // ===== REGRAS DE VALIDAÇÃO =====
    
    initializeRules() {
        // Regra: No Pay sem campanha
        this.addRule('no_pay_without_campaign', {
            name: 'No Pay sem Campanha',
            description: 'Pagamento "no pay" deve ter campanha ativa',
            severity: 'error',
            isPermanent: true,
            check: (delivery, validatedRecord) => {
                if (delivery.paymentMethod?.toLowerCase() === 'no pay') {
                    const hasCampaign = validatedRecord?.boRecord?.campaign === 'true' || 
                                      validatedRecord?.boRecord?.campaign === true ||
                                      delivery.campaign === 'true' || 
                                      delivery.campaign === true;
                    
                    const hasCampaignPay = validatedRecord?.boRecord?.campaignPay === 'false' || 
                                          validatedRecord?.boRecord?.campaignPay === false;
                    
                    return !hasCampaign || !hasCampaignPay;
                }
                return false;
            },
            getMessage: (delivery) => 'Cliente com método "no pay" sem campanha válida'
        });
        
        // Regra: Online sem confirmação
        this.addRule('online_without_confirmation', {
            name: 'Online sem Confirmação',
            description: 'Pagamento online deve ter confirmação',
            severity: 'error',
            isPermanent: true,
            check: (delivery, validatedRecord) => {
                if (delivery.paymentMethod?.toLowerCase() === 'online') {
                    const hasOnlinePayment = validatedRecord?.boRecord?.hasOnlinePayment === 'true' || 
                                           validatedRecord?.boRecord?.hasOnlinePayment === true;
                    return !hasOnlinePayment;
                }
                return false;
            },
            getMessage: (delivery) => 'Pagamento online sem confirmação no sistema'
        });
        
        // Regra: Diferença de preços
        this.addRule('price_difference', {
            name: 'Diferença de Preços',
            description: 'Preços diferentes entre sistemas',
            severity: 'warning',
            isPermanent: false,
            check: (delivery, validatedRecord) => {
                if (!validatedRecord) return false;
                
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.bookingPriceBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.bookingPriceOdoo) || 0;
                
                return deliveryPrice !== bookingPriceBO || deliveryPrice !== bookingPriceOdoo;
            },
            getMessage: (delivery, validatedRecord) => {
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.bookingPriceBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.bookingPriceOdoo) || 0;
                
                return `Preço entrega: €${deliveryPrice.toFixed(2)} | BO: €${bookingPriceBO.toFixed(2)} | Odoo: €${bookingPriceOdoo.toFixed(2)}`;
            }
        });
        
        // Regra: Registro ausente
        this.addRule('missing_record', {
            name: 'Registro Ausente',
            description: 'Entrega sem registro correspondente',
            severity: 'error',
            isPermanent: false,
            check: (delivery, validatedRecord) => {
                return !validatedRecord;
            },
            getMessage: (delivery) => 'Entrega sem registro correspondente nos sistemas'
        });
    }
    
    addRule(id, rule) {
        this.rules.set(id, {
            id,
            ...rule,
            createdAt: new Date()
        });
    }

    // ===== PROCESSAMENTO DE VALIDAÇÃO =====
    
    async initCaixaValidation(caixaData) {
        try {
            showProcessing('A processar dados da caixa...', 'Validação de Caixa');
            
            if (!caixaData || caixaData.length === 0) {
                hideProcessing();
                showWarning('Sem Dados', 'Nenhum dado de caixa disponível. Importa o ficheiro de caixa primeiro.');
                return;
            }
            
            // Obter dados validados da comparação
            const comparisonResults = window.comparator ? window.comparator.getResults() : null;
            const validatedData = comparisonResults ? comparisonResults.all : [];
            
            if (!validatedData || validatedData.length === 0) {
                console.warn("Dados de comparação não disponíveis. Validação limitada.");
                showWarning('Dados Limitados', 'Dados de comparação não disponíveis. A validação pode ser limitada.');
            }
            
            // Extrair condutores únicos
            this.drivers = [...new Set(caixaData
                .map(item => item.condutorEntrega || item.driver)
                .filter(Boolean)
            )];
            
            console.log("🚗 Condutores encontrados:", this.drivers);
            
            // Preencher select de condutores
            this.populateDriverSelect();
            
            // Processar entregas
            await this.processDeliveries(caixaData, validatedData);
            
            // Mostrar interface
            this.showValidationInterface();
            
            hideProcessing();
            showSuccess('Validação Iniciada', `${this.pendingDeliveries.length} entregas processadas para validação`);
            
        } catch (error) {
            hideProcessing();
            console.error('Erro na inicialização da validação:', error);
            showError('Erro de Validação', 'Erro ao iniciar validação da caixa');
        }
    }
    
    async processDeliveries(caixaData, validatedData) {
        updateProcessing('A processar entregas...', 'Validação de Caixa');
        
        // Criar mapa de registros validados
        const validatedMap = new Map();
        if (validatedData && validatedData.length > 0) {
            validatedData.forEach(record => {
                if (record.licensePlate) {
                    const normalizedPlate = this.normalizeLicensePlate(record.licensePlate);
                    validatedMap.set(normalizedPlate, record);
                }
            });
        }
        
        // Processar cada entrega
        this.pendingDeliveries = [];
        
        for (let i = 0; i < caixaData.length; i++) {
            const delivery = caixaData[i];
            if (!delivery.licensePlate) continue;
            
            updateProcessing(`A processar entrega ${i + 1} de ${caixaData.length}...`, 'Validação de Caixa');
            
            const licensePlateNormalized = this.normalizeLicensePlate(delivery.licensePlate);
            const validatedRecord = validatedMap.get(licensePlateNormalized);
            
            // Aplicar regras de validação
            const validationResult = await this.validateDelivery(delivery, validatedRecord);
            
            // Criar objeto de entrega processado
            const processedDelivery = {
                licensePlate: delivery.licensePlate,
                alocation: delivery.alocation || this.generateAlocation(delivery.licensePlate),
                checkOut: delivery.checkOut || delivery.dataCheckout || new Date().toISOString(),
                paymentMethod: delivery.paymentMethod || 'N/A',
                priceOnDelivery: parseFloat(delivery.priceOnDelivery) || parseFloat(delivery.valorEntrega) || 0,
                condutorEntrega: delivery.condutorEntrega || delivery.driver || 'N/A',
                campaign: delivery.campaign || 'false',
                campaignPay: delivery.campaignPay || false,
                parkBrand: delivery.parkBrand || 'DESCONHECIDO',
                
                // Dados de validação
                status: validationResult.status,
                inconsistencies: validationResult.inconsistencies,
                validatedRecord: validatedRecord,
                originalDelivery: delivery,
                resolution: null,
                permanentInconsistency: validationResult.permanentInconsistency,
                validationErrors: validationResult.errors,
                validationWarnings: validationResult.warnings,
                
                // Timestamps
                processedAt: new Date().toISOString(),
                validatedAt: null
            };
            
            this.pendingDeliveries.push(processedDelivery);
        }
        
        console.log(`📝 ${this.pendingDeliveries.length} entregas processadas para validação`);
    }
    
    async validateDelivery(delivery, validatedRecord) {
        const result = {
            status: 'ready',
            inconsistencies: [],
            errors: [],
            warnings: [],
            permanentInconsistency: null
        };
        
        // Aplicar todas as regras
        for (const [ruleId, rule] of this.rules) {
            try {
                const hasIssue = rule.check(delivery, validatedRecord);
                
                if (hasIssue) {
                    const issue = {
                        ruleId,
                        ruleName: rule.name,
                        message: rule.getMessage(delivery, validatedRecord),
                        severity: rule.severity,
                        isPermanent: rule.isPermanent
                    };
                    
                    result.inconsistencies.push(ruleId);
                    
                    if (rule.severity === 'error') {
                        result.errors.push(issue);
                    } else if (rule.severity === 'warning') {
                        result.warnings.push(issue);
                    }
                    
                    if (rule.isPermanent) {
                        result.permanentInconsistency = ruleId;
                    }
                }
            } catch (error) {
                console.error(`Erro na regra ${ruleId}:`, error);
            }
        }
        
        // Determinar status final
        if (result.errors.length > 0) {
            result.status = 'inconsistent';
        } else if (result.warnings.length > 0) {
            result.status = 'warning';
        } else {
            result.status = 'ready';
        }
        
        return result;
    }

    // ===== INTERFACE E INTERAÇÃO =====
    
    populateDriverSelect() {
        if (!this.elements.driverSelect) return;
        
        this.elements.driverSelect.innerHTML = '<option value="">Seleciona um condutor</option>';
        
        this.drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver;
            option.textContent = driver;
            this.elements.driverSelect.appendChild(option);
        });
    }
    
    showValidationInterface() {
        if (this.elements.driverSelection) {
            this.elements.driverSelection.classList.remove('hidden');
        }
        
        if (this.elements.addCaixaBtn) {
            this.elements.addCaixaBtn.classList.remove('hidden');
        }
        
        if (this.elements.closeCaixaBtn) {
            this.elements.closeCaixaBtn.classList.remove('hidden');
        }
    }
    
    onDriverSelected(selectedDriver) {
        if (!selectedDriver) {
            this.hideDriverDeliveries();
            return;
        }
        
        // Filtrar entregas do condutor
        this.currentDriverDeliveries = this.pendingDeliveries.filter(delivery => 
            delivery.condutorEntrega === selectedDriver && 
            !this.validatedDeliveries.some(vd => vd.alocation === delivery.alocation)
        );
        
        console.log(`🚗 Entregas para ${selectedDriver}:`, this.currentDriverDeliveries.length);
        
        // Mostrar seção e atualizar contador
        this.showDriverDeliveries();
        this.updateDeliveryCount();
        this.renderDeliveriesTable();
    }
    
    showDriverDeliveries() {
        if (this.elements.driverDeliveries) {
            this.elements.driverDeliveries.classList.remove('hidden');
        }
    }
    
    hideDriverDeliveries() {
        if (this.elements.driverDeliveries) {
            this.elements.driverDeliveries.classList.add('hidden');
        }
    }
    
    updateDeliveryCount() {
        if (this.elements.deliveryCountElement) {
            this.elements.deliveryCountElement.textContent = this.currentDriverDeliveries.length;
        }
    }
    
    renderDeliveriesTable() {
        if (!this.elements.deliveriesTable) return;
        
        this.elements.deliveriesTable.innerHTML = '';
        
        if (this.currentDriverDeliveries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Sem entregas pendentes para este condutor.</td>';
            this.elements.deliveriesTable.appendChild(row);
            return;
        }
        
        this.currentDriverDeliveries.forEach(delivery => {
            const row = this.createDeliveryRow(delivery);
            this.elements.deliveriesTable.appendChild(row);
        });
        
        this.attachTableEventListeners();
    }
    
    createDeliveryRow(delivery) {
        const row = document.createElement('tr');
        
        // Classes baseadas no status
        const statusClasses = {
            'inconsistent': 'status-error',
            'warning': 'status-warning', 
            'ready': 'status-success',
            'validated': 'status-success'
        };
        
        if (statusClasses[delivery.status]) {
            row.classList.add(statusClasses[delivery.status]);
        }
        
        // Criar badge de status
        const statusBadge = this.createStatusBadge(delivery);
        
        row.innerHTML = `
            <td>${delivery.alocation}</td>
            <td>${delivery.licensePlate}</td>
            <td>${this.formatDate(delivery.checkOut)}</td>
            <td>${delivery.paymentMethod}</td>
            <td>€${parseFloat(delivery.priceOnDelivery).toFixed(2)}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="delivery-actions">
                    <button class="btn btn-secondary btn-sm view-delivery-details" 
                            data-alocation="${delivery.alocation}" 
                            title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn ${this.getValidateButtonClass(delivery)} btn-sm validate-delivery" 
                            data-alocation="${delivery.alocation}"
                            title="Validar entrega">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    createStatusBadge(delivery) {
        const badges = {
            'inconsistent': '<span class="badge badge-error">Inconsistente</span>',
            'warning': '<span class="badge badge-warning">Aviso</span>',
            'ready': '<span class="badge badge-success">Pronto</span>',
            'validated': '<span class="badge badge-success">Validado</span>'
        };
        
        let badge = badges[delivery.status] || '<span class="badge">Desconhecido</span>';
        
        // Adicionar indicador de inconsistência permanente
        if (delivery.permanentInconsistency) {
            badge += ' <i class="fas fa-exclamation-triangle" style="color: #dc3545;" title="Inconsistência Permanente"></i>';
        }
        
        return badge;
    }
    
    getValidateButtonClass(delivery) {
        if (delivery.status === 'ready') return 'btn-success';
        if (delivery.status === 'warning') return 'btn-warning';
        return 'btn-primary';
    }

    // ===== VALIDAÇÃO DE ENTREGAS =====
    
    async validateDeliveryAction(alocation) {
        const delivery = this.currentDriverDeliveries.find(d => d.alocation === alocation);
        
        if (!delivery) {
            showError('Erro', 'Entrega não encontrada');
            return;
        }
        
        try {
            // Mostrar modal de validação
            await this.showValidationModal(delivery);
            
        } catch (error) {
            console.error('Erro na validação:', error);
            showError('Erro de Validação', 'Erro ao validar a entrega');
        }
    }
    
    async showValidationModal(delivery) {
        return new Promise((resolve, reject) => {
            const modal = this.createValidationModal(delivery);
            document.body.appendChild(modal);
            
            // Event listeners do modal
            const form = modal.querySelector('#validation-form');
            const cancelBtn = modal.querySelector('#cancel-validation');
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    const formData = new FormData(form);
                    const validationData = this.extractValidationData(formData, delivery);
                    
                    await this.processValidation(delivery, validationData);
                    
                    document.body.removeChild(modal);
                    resolve(validationData);
                    
                } catch (error) {
                    console.error('Erro no processamento:', error);
                    showError('Erro', 'Erro ao processar validação');
                    reject(error);
                }
            });
            
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });
        });
    }
    
    createValidationModal(delivery) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        
        const errorsHTML = delivery.validationErrors?.length > 0 
            ? `<div class="validation-errors">
                <h4>⚠️ Erros Encontrados:</h4>
                <ul>
                    ${delivery.validationErrors.map(error => `<li>${error.message}</li>`).join('')}
                </ul>
               </div>` 
            : '';
        
        const warningsHTML = delivery.validationWarnings?.length > 0 
            ? `<div class="validation-warnings">
                <h4>⚠️ Avisos:</h4>
                <ul>
                    ${delivery.validationWarnings.map(warning => `<li>${warning.message}</li>`).join('')}
                </ul>
               </div>` 
            : '';
        
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Validar Entrega: ${delivery.alocation}</h3>
                </div>
                <div class="modal-body">
                    <div class="delivery-summary">
                        <p><strong>Matrícula:</strong> ${delivery.licensePlate}</p>
                        <p><strong>Condutor:</strong> ${delivery.condutorEntrega}</p>
                        <p><strong>Método:</strong> ${delivery.paymentMethod}</p>
                        <p><strong>Valor:</strong> €${parseFloat(delivery.priceOnDelivery).toFixed(2)}</p>
                    </div>
                    
                    ${errorsHTML}
                    ${warningsHTML}
                    
                    <form id="validation-form">
                        <div class="form-group">
                            <label>Ação de Validação:</label>
                            <select name="action" class="form-control" required>
                                <option value="">Seleciona uma ação</option>
                                <option value="validate">Validar sem alterações</option>
                                <option value="correct">Validar com correções</option>
                                <option value="reject">Rejeitar entrega</option>
                            </select>
                        </div>
                        
                        <div id="correction-fields" class="hidden">
                            <div class="form-group">
                                <label>Valor Corrigido:</label>
                                <input type="number" name="corrected_price" class="form-control" 
                                       step="0.01" value="${delivery.priceOnDelivery}">
                            </div>
                            
                            <div class="form-group">
                                <label>Método de Pagamento Corrigido:</label>
                                <select name="corrected_method" class="form-control">
                                    <option value="${delivery.paymentMethod}" selected>${delivery.paymentMethod}</option>
                                    <option value="numerário">Numerário</option>
                                    <option value="multibanco">Multibanco</option>
                                    <option value="no pay">No Pay</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Notas:</label>
                            <textarea name="notes" class="form-control" rows="3" 
                                      placeholder="Adiciona notas sobre a validação..."></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">Confirmar</button>
                            <button type="button" id="cancel-validation" class="btn btn-secondary">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Setup form behavior
        const actionSelect = modal.querySelector('select[name="action"]');
        const correctionFields = modal.querySelector('#correction-fields');
        
        actionSelect.addEventListener('change', (e) => {
            if (e.target.value === 'correct') {
                correctionFields.classList.remove('hidden');
            } else {
                correctionFields.classList.add('hidden');
            }
        });
        
        return modal;
    }
    
    extractValidationData(formData, delivery) {
        return {
            action: formData.get('action'),
            correctedPrice: parseFloat(formData.get('corrected_price')) || delivery.priceOnDelivery,
            correctedMethod: formData.get('corrected_method') || delivery.paymentMethod,
            notes: formData.get('notes') || '',
            originalDelivery: delivery,
            validatedAt: new Date().toISOString(),
            validatedBy: window.caixaAPI?.currentUser?.email || 'unknown'
        };
    }
    
    async processValidation(delivery, validationData) {
        showProcessing('A processar validação...', 'Validação');
        
        // Aplicar correções se necessário
        if (validationData.action === 'correct') {
            delivery.originalPrice = delivery.priceOnDelivery;
            delivery.originalPaymentMethod = delivery.paymentMethod;
            delivery.priceOnDelivery = validationData.correctedPrice;
            delivery.paymentMethod = validationData.correctedMethod;
            delivery.correctionNotes = validationData.notes;
        }
        
        // Atualizar status
        delivery.status = validationData.action === 'reject' ? 'rejected' : 'validated';
        delivery.resolution = validationData.action;
        delivery.validatedAt = validationData.validatedAt;
        delivery.validationNotes = validationData.notes;
        
        // Remover da lista pendente e adicionar à validada
        const index = this.currentDriverDeliveries.indexOf(delivery);
        if (index !== -1) {
            this.currentDriverDeliveries.splice(index, 1);
        }
        
        this.validatedDeliveries.push(delivery);
        this.validationHistory.push({
            delivery,
            validationData,
            timestamp: new Date().toISOString()
        });
        
        // Salvar no Supabase se disponível
        if (window.caixaAPI) {
            try {
                await window.caixaAPI.saveValidation({
                    licensePlate: delivery.licensePlate,
                    status: delivery.status,
                    originalPrice: delivery.originalPrice,
                    correctedPrice: validationData.correctedPrice,
                    originalPaymentMethod: delivery.originalPaymentMethod,
                    correctedPaymentMethod: validationData.correctedMethod,
                    notes: validationData.notes
                });
            } catch (error) {
                console.error('Erro ao salvar validação:', error);
            }
        }
        
        // Atualizar interface
        this.updateDeliveryCount();
        this.renderDeliveriesTable();
        
        hideProcessing();
        showSuccess(
            'Entrega Validada', 
            `Entrega ${delivery.alocation} ${validationData.action === 'reject' ? 'rejeitada' : 'validada'} com sucesso`
        );
    }

    // ===== UTILITÁRIOS =====
    
    normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate)
            .replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '')
            .toLowerCase();
    }
    
    generateAlocation(licensePlate) {
        return `AUTO_${licensePlate.slice(-4).toUpperCase()}_${Date.now()}`;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-PT') + ' ' + 
                   date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateString;
        }
    }
    
    attachTableEventListeners() {
        // Botões de detalhes
        document.querySelectorAll('.view-delivery-details').forEach(button => {
            button.addEventListener('click', (e) => {
                const alocation = e.currentTarget.getAttribute('data-alocation');
                this.showDeliveryDetails(alocation);
            });
        });
        
        // Botões de validação
        document.querySelectorAll('.validate-delivery').forEach(button => {
            button.addEventListener('click', (e) => {
                const alocation = e.currentTarget.getAttribute('data-alocation');
                this.validateDeliveryAction(alocation);
            });
        });
    }
    
    showDeliveryDetails(alocation) {
        const delivery = this.currentDriverDeliveries.find(d => d.alocation === alocation) ||
                        this.validatedDeliveries.find(d => d.alocation === alocation);
        
        if (!delivery) {
            showError('Erro', 'Entrega não encontrada');
            return;
        }
        
        // Implementar modal de detalhes se necessário
        console.log('Detalhes da entrega:', delivery);
        showInfo('Detalhes', `Matrícula: ${delivery.licensePlate}\nStatus: ${delivery.status}\nInconsistências: ${delivery.inconsistencies.length}`);
    }

    // ===== AÇÕES GERAIS =====
    
    addNewCaixaSheet() {
        showConfirm(
            'Nova Folha de Caixa',
            'Queres adicionar uma nova folha de caixa? Isto irá limpar as validações atuais.',
            () => {
                // Reset state
                this.validatedDeliveries = [];
                this.pendingDeliveries = [];
                this.currentDriverDeliveries = [];
                
                // Reset interface
                if (this.elements.driverSelect) {
                    this.elements.driverSelect.value = '';
                }
                this.hideDriverDeliveries();
                
                showInfo('Nova Folha', 'Podes agora importar um novo ficheiro de caixa.');
            }
        );
    }
    
    async closeCaixa() {
        const pendingCount = this.pendingDeliveries.filter(d => 
            d.status !== 'validated' && d.status !== 'rejected'
        ).length;
        
        if (pendingCount > 0) {
            showConfirm(
                'Encerrar Caixa',
                `Ainda tens ${pendingCount} entregas por validar. Queres mesmo encerrar a caixa?`,
                async () => {
                    await this.finalizeCaixa();
                }
            );
        } else {
            await this.finalizeCaixa();
        }
    }
    
    async finalizeCaixa() {
        try {
            showProcessing('A finalizar caixa...', 'Encerramento');
            
            // Preparar dados para dashboard
            const allDeliveries = [
                ...this.validatedDeliveries,
                ...this.pendingDeliveries
            ];
            
            // Exportar para dashboard
            if (window.dashboard && window.dashboard.setDeliveryData) {
                window.dashboard.setDeliveryData(allDeliveries);
            }
            
            // Mudar para aba dashboard
            const dashboardTab = document.querySelector('.nav-tab[data-tab="dashboard"]');
            if (dashboardTab && window.changeTab) {
                window.changeTab(dashboardTab);
            }
            
            hideProcessing();
            showSuccess(
                'Caixa Encerrada',
                `Caixa encerrada com ${this.validatedDeliveries.length} entregas validadas`
            );
            
        } catch (error) {
            hideProcessing();
            console.error('Erro ao encerrar caixa:', error);
            showError('Erro', 'Erro ao encerrar a caixa');
        }
    }

    // ===== API PÚBLICA =====
    
    getValidationStats() {
        return {
            total: this.validatedDeliveries.length + this.pendingDeliveries.length,
            validated: this.validatedDeliveries.length,
            pending: this.pendingDeliveries.length,
            errors: this.pendingDeliveries.filter(d => d.status === 'inconsistent').length,
            warnings: this.pendingDeliveries.filter(d => d.status === 'warning').length,
            ready: this.pendingDeliveries.filter(d => d.status === 'ready').length
        };
    }
    
    exportValidationReport() {
        return {
            validatedDeliveries: this.validatedDeliveries,
            pendingDeliveries: this.pendingDeliveries,
            validationHistory: this.validationHistory,
            rules: Array.from(this.rules.values()),
            stats: this.getValidationStats(),
            exportedAt: new Date().toISOString()
        };
    }
}

// ===== INSTÂNCIA GLOBAL =====

const validationSystem = new ValidationSystem();

// ===== COMPATIBILIDADE COM CÓDIGO EXISTENTE =====

window.validator = {
    initCaixaValidation: (caixaData) => validationSystem.initCaixaValidation(caixaData),
    getValidatedDeliveries: () => validationSystem.validatedDeliveries,
    getPendingDeliveries: () => validationSystem.pendingDeliveries,
    getValidationStats: () => validationSystem.getValidationStats(),
    exportReport: () => validationSystem.exportValidationReport()
};

window.validationSystem = validationSystem;

console.log('✅ Sistema de validação melhorado carregado!');