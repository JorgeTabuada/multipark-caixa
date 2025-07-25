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
        // REGRA CRÍTICA: NO PAY - Inconsistência Permanente
        this.addRule('no_pay_campaign_validation', {
            name: 'NO PAY - Validação de Campanha',
            description: 'Pagamento "NO PAY" deve ter campaign_pay = false',
            severity: 'critical',
            isPermanent: true,
            requiresApproval: true,
            check: (delivery, validatedRecord) => {
                // Verificar se é pagamento NO PAY
                const isNoPay = delivery.paymentMethod?.toLowerCase().includes('no pay') || 
                               delivery.paymentMethod?.toLowerCase() === 'nopay';
                
                if (isNoPay) {
                    console.log('🔍 Verificando NO PAY:', {
                        licensePlate: delivery.licensePlate,
                        paymentMethod: delivery.paymentMethod,
                        validatedRecord: validatedRecord
                    });
                    
                    // Verificar campaign_pay no Back Office
                    const campaignPayBO = validatedRecord?.boRecord?.campaign_pay || 
                                         validatedRecord?.boRecord?.campaignPay ||
                                         validatedRecord?.campaign_pay ||
                                         validatedRecord?.campaignPay;
                    
                    // Para NO PAY, campaign_pay deve ser false
                    const isValidCampaignPay = campaignPayBO === 'false' || 
                                              campaignPayBO === false || 
                                              campaignPayBO === 'False' ||
                                              campaignPayBO === 'FALSE';
                    
                    console.log('🔍 Campaign Pay Check:', {
                        campaignPayBO,
                        isValidCampaignPay,
                        shouldBeFalse: true
                    });
                    
                    // Se campaign_pay não for false, é inconsistência permanente
                    return !isValidCampaignPay;
                }
                return false;
            },
            getMessage: (delivery, validatedRecord) => {
                const campaignPayBO = validatedRecord?.boRecord?.campaign_pay || 
                                     validatedRecord?.boRecord?.campaignPay ||
                                     validatedRecord?.campaign_pay ||
                                     validatedRecord?.campaignPay || 'indefinido';
                
                return `⚠️ INCONSISTÊNCIA PERMANENTE: Pagamento "NO PAY" com campaign_pay = "${campaignPayBO}" (deve ser "false")`;
            },
            getApprovalMessage: (delivery) => {
                return `🚨 ATENÇÃO: Inconsistência permanente detectada!\n\n` +
                       `Matrícula: ${delivery.licensePlate}\n` +
                       `Método: ${delivery.paymentMethod}\n` +
                       `Problema: campaign_pay não é "false"\n\n` +
                       `Esta inconsistência NÃO desaparecerá mesmo após aprovação.\n` +
                       `Desejas aprovar e continuar?`;
            }
        });
        
        // REGRA CRÍTICA: ONLINE - Inconsistência Permanente
        this.addRule('online_payment_validation', {
            name: 'ONLINE - Validação de Pagamento',
            description: 'Pagamento "ONLINE" deve ter online_pay = true',
            severity: 'critical',
            isPermanent: true,
            requiresApproval: true,
            check: (delivery, validatedRecord) => {
                // Verificar se é pagamento ONLINE
                const isOnline = delivery.paymentMethod?.toLowerCase().includes('online') ||
                                delivery.paymentMethod?.toLowerCase() === 'cartão' ||
                                delivery.paymentMethod?.toLowerCase() === 'card';
                
                if (isOnline) {
                    console.log('🔍 Verificando ONLINE:', {
                        licensePlate: delivery.licensePlate,
                        paymentMethod: delivery.paymentMethod,
                        validatedRecord: validatedRecord
                    });
                    
                    // Verificar online_pay no Back Office
                    const onlinePayBO = validatedRecord?.boRecord?.online_pay || 
                                       validatedRecord?.boRecord?.onlinePay ||
                                       validatedRecord?.online_pay ||
                                       validatedRecord?.onlinePay;
                    
                    // Para ONLINE, online_pay deve ser true
                    const isValidOnlinePay = onlinePayBO === 'true' || 
                                            onlinePayBO === true || 
                                            onlinePayBO === 'True' ||
                                            onlinePayBO === 'TRUE';
                    
                    console.log('🔍 Online Pay Check:', {
                        onlinePayBO,
                        isValidOnlinePay,
                        shouldBeTrue: true
                    });
                    
                    // Se online_pay não for true, é inconsistência permanente
                    return !isValidOnlinePay;
                }
                return false;
            },
            getMessage: (delivery, validatedRecord) => {
                const onlinePayBO = validatedRecord?.boRecord?.online_pay || 
                                   validatedRecord?.boRecord?.onlinePay ||
                                   validatedRecord?.online_pay ||
                                   validatedRecord?.onlinePay || 'indefinido';
                
                return `⚠️ INCONSISTÊNCIA PERMANENTE: Pagamento "ONLINE" com online_pay = "${onlinePayBO}" (deve ser "true")`;
            },
            getApprovalMessage: (delivery) => {
                return `🚨 ATENÇÃO: Inconsistência permanente detectada!\n\n` +
                       `Matrícula: ${delivery.licensePlate}\n` +
                       `Método: ${delivery.paymentMethod}\n` +
                       `Problema: online_pay não é "true"\n\n` +
                       `Esta inconsistência NÃO desaparecerá mesmo após aprovação.\n` +
                       `Desejas aprovar e continuar?`;
            }
        });
        
        // Regra: Diferença de preços
        this.addRule('price_difference', {
            name: 'Diferença de Preços',
            description: 'Preços diferentes entre sistemas',
            severity: 'warning',
            isPermanent: false,
            requiresApproval: false,
            check: (delivery, validatedRecord) => {
                if (!validatedRecord) return false;
                
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.priceBookingBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.priceBookingOdoo) || 0;
                
                return deliveryPrice !== bookingPriceBO || deliveryPrice !== bookingPriceOdoo;
            },
            getMessage: (delivery, validatedRecord) => {
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.priceBookingBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.priceBookingOdoo) || 0;
                
                return `Preço entrega: €${deliveryPrice.toFixed(2)} | BO: €${bookingPriceBO.toFixed(2)} | Odoo: €${bookingPriceOdoo.toFixed(2)}`;
            }
        });
        
        // Regra: Registro ausente
        this.addRule('missing_record', {
            name: 'Registro Ausente',
            description: 'Entrega sem registro correspondente',
            severity: 'error',
            isPermanent: false,
            requiresApproval: false,
            check: (delivery, validatedRecord) => {
                return !validatedRecord;
            },
            getMessage: (delivery) => 'Entrega sem registro correspondente nos sistemas'
        });
        
        // Regra: Método de pagamento inconsistente
        this.addRule('payment_method_mismatch', {
            name: 'Método de Pagamento Inconsistente',
            description: 'Método de pagamento diferente entre sistemas',
            severity: 'warning',
            isPermanent: false,
            requiresApproval: false,
            check: (delivery, validatedRecord) => {
                if (!validatedRecord) return false;
                
                const deliveryMethod = delivery.paymentMethod?.toLowerCase() || '';
                const boMethod = validatedRecord.paymentMethod?.toLowerCase() || '';
                
                // Normalizar métodos para comparação
                const normalizeMethod = (method) => {
                    if (method.includes('no pay') || method === 'nopay') return 'nopay';
                    if (method.includes('online') || method.includes('cartão') || method.includes('card')) return 'online';
                    if (method.includes('numerário') || method.includes('cash')) return 'numerario';
                    if (method.includes('multibanco') || method.includes('mb')) return 'multibanco';
                    return method;
                };
                
                return normalizeMethod(deliveryMethod) !== normalizeMethod(boMethod);
            },
            getMessage: (delivery, validatedRecord) => {
                return `Método caixa: "${delivery.paymentMethod}" | Método BO: "${validatedRecord.paymentMethod}"`;
            }
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
            
            updateProcessing('A implementar fluxo correto...', 'Fluxo BD');
            
            // FLUXO CORRETO: Ler dados da BD em vez de depender dos ficheiros
            console.log('🔄 Implementando fluxo correto: Caixa lê diretamente da BD');
            
            let validatedData = [];
            
            // 1. Tentar ler dados da BD primeiro (fluxo correto)
            if (this.useDatabase || this.databaseReady) {
                console.log('📋 Lendo dados da base de dados...');
                updateProcessing('A ler dados da base de dados...', 'Base de Dados');
                
                validatedData = await this.loadValidatedDataFromDB();
                
                if (validatedData && validatedData.length > 0) {
                    console.log(`✅ ${validatedData.length} registos carregados da BD`);
                    showInfo('Fluxo Correto Ativo', 
                        `✅ Dados carregados da BD: ${validatedData.length} registos\n` +
                        `🔄 Fluxo: BD → Caixa (independente de ficheiros)`
                    );
                } else {
                    console.log('⚠️ Nenhum dado encontrado na BD');
                }
            }
            
            // 2. Fallback: usar dados da comparação se BD não disponível
            if (!validatedData || validatedData.length === 0) {
                console.log('📁 Usando dados da comparação como fallback...');
                updateProcessing('A usar dados da comparação...', 'Fallback');
                
                const comparisonResults = window.comparator ? window.comparator.getResults() : null;
                validatedData = comparisonResults ? comparisonResults.all : [];
                
                if (!validatedData || validatedData.length === 0) {
                    console.warn("Dados de comparação não disponíveis. Validação limitada.");
                    showWarning('Dados Limitados', 
                        'Dados de comparação não disponíveis.\n' +
                        'Para usar o fluxo correto, processa primeiro os ficheiros Odoo e Back Office.'
                    );
                }
            }
            
            updateProcessing('A processar condutores...', 'Condutores');
            
            // Extrair condutores únicos
            this.drivers = [...new Set(caixaData
                .map(item => item.condutorEntrega || item.driver)
                .filter(Boolean)
            )];
            
            console.log("🚗 Condutores encontrados:", this.drivers);
            
            // Preencher select de condutores
            this.populateDriverSelect();
            
            updateProcessing('A validar entregas...', 'Validação');
            
            // Processar entregas com dados da BD ou comparação
            await this.processDeliveries(caixaData, validatedData);
            
            updateProcessing('A preparar interface...', 'Interface');
            
            // Mostrar interface
            this.showValidationInterface();
            
            hideProcessing();
            
            // Mostrar resultado baseado na fonte dos dados
            if (this.useDatabase && validatedData.length > 0) {
                showSuccess('Fluxo Correto Ativo!', 
                    `✅ ${this.pendingDeliveries.length} entregas processadas\n` +
                    `🔄 Dados carregados da BD: ${validatedData.length} registos\n` +
                    `📋 Fluxo: Odoo+BackOffice → BD → Caixa\n` +
                    `⚡ Independente de ficheiros carregados`
                );
            } else {
                showSuccess('Validação Iniciada', 
                    `${this.pendingDeliveries.length} entregas processadas para validação\n` +
                    `💡 Para usar o fluxo correto, processa primeiro Odoo+BackOffice`
                );
            }
            
        } catch (error) {
            hideProcessing();
            console.error('Erro na inicialização da validação:', error);
            showError('Erro de Validação', 'Erro ao iniciar validação da caixa');
        }
    }

    async loadValidatedDataFromDB() {
        try {
            if (!window.supabase) {
                console.log('⚠️ Supabase não disponível');
                return [];
            }

            console.log('🗄️ Carregando dados validados da BD...');
            
            // Carregar dados das comparações
            const { data: comparisons, error: compError } = await window.supabase
                .from('comparisons')
                .select('*')
                .order('processed_at', { ascending: false });

            if (compError) {
                console.warn('Erro ao carregar comparações:', compError);
                return [];
            }

            // Carregar dados do Odoo
            const { data: odooData, error: odooError } = await window.supabase
                .from('sales_orders')
                .select('*')
                .order('imported_at', { ascending: false });

            if (odooError) {
                console.warn('Erro ao carregar dados Odoo:', odooError);
            }

            // Carregar dados do Back Office
            const { data: boData, error: boError } = await window.supabase
                .from('deliveries')
                .select('*')
                .order('imported_at', { ascending: false });

            if (boError) {
                console.warn('Erro ao carregar dados Back Office:', boError);
            }

            // Combinar dados para formato esperado
            const validatedData = [];

            if (comparisons && comparisons.length > 0) {
                comparisons.forEach(comp => {
                    // Encontrar dados originais correspondentes
                    const odooRecord = odooData?.find(o => o.license_plate === comp.license_plate);
                    const boRecord = boData?.find(b => b.license_plate === comp.license_plate);

                    validatedData.push({
                        licensePlate: comp.license_plate,
                        alocation: comp.alocation,
                        priceBookingOdoo: comp.booking_price_odoo,
                        priceBookingBO: comp.booking_price_bo,
                        parkBrandOdoo: comp.park_brand_odoo,
                        parkBrandBO: comp.park_brand_bo,
                        bookingDate: comp.booking_date,
                        checkIn: comp.check_in,
                        checkOut: comp.check_out,
                        paymentMethod: comp.payment_method,
                        campaign: comp.campaign,
                        status: comp.status,
                        inconsistencies: comp.inconsistencies || [],
                        driverOdoo: comp.driver_odoo,
                        driverBO: comp.driver_bo,
                        processedAt: comp.processed_at,
                        source: 'database',
                        // Dados originais para validações detalhadas
                        odooRecord: odooRecord,
                        boRecord: boRecord
                    });
                });
            }

            console.log(`📊 Dados carregados da BD: ${validatedData.length} registos`);
            return validatedData;

        } catch (error) {
            console.error('Erro ao carregar dados da BD:', error);
            return [];
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
        
        // SISTEMA INCREMENTAL: NÃO limpar pendingDeliveries existentes
        // Manter dados existentes e adicionar novos
        const existingDeliveries = this.pendingDeliveries || [];
        const newDeliveries = [];
        
        // Criar mapa de entregas existentes para evitar duplicados
        const existingPlatesMap = new Map();
        existingDeliveries.forEach(delivery => {
            const normalizedPlate = this.normalizeLicensePlate(delivery.licensePlate);
            existingPlatesMap.set(normalizedPlate, delivery);
        });
        
        console.log(`🔄 Sistema incremental: ${existingDeliveries.length} entregas existentes`);
        
        for (let i = 0; i < caixaData.length; i++) {
            const delivery = caixaData[i];
            if (!delivery.licensePlate) continue;
            
            updateProcessing(`A processar entrega ${i + 1} de ${caixaData.length}...`, 'Validação de Caixa');
            
            const licensePlateNormalized = this.normalizeLicensePlate(delivery.licensePlate);
            
            // Verificar se já existe (evitar duplicados)
            if (existingPlatesMap.has(licensePlateNormalized)) {
                console.log(`⚠️ Entrega duplicada ignorada: ${delivery.licensePlate}`);
                continue;
            }
            
            const validatedRecord = validatedMap.get(licensePlateNormalized);
            
            // Aplicar regras de validação
            const validationResult = await this.validateDelivery(delivery, validatedRecord);
            
            // Criar objeto de entrega processado
            const processedDelivery = {
                licensePlate: delivery.licensePlate,
                alocation: delivery.alocation || this.generateAlocation(delivery.licensePlate),
                checkOut: this.formatDate(delivery.checkOut || delivery.dataCheckout || new Date()),
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
            
            newDeliveries.push(processedDelivery);
        }
        
        // Combinar entregas existentes com novas
        this.pendingDeliveries = [...existingDeliveries, ...newDeliveries];
        
        console.log(`📝 Sistema incremental: ${newDeliveries.length} novas entregas adicionadas`);
        console.log(`📊 Total de entregas: ${this.pendingDeliveries.length}`);
        
        // Atualizar lista de condutores (combinar existentes com novos)
        const newDrivers = [...new Set(caixaData
            .map(item => item.condutorEntrega || item.driver)
            .filter(Boolean)
        )];
        
        // Combinar condutores existentes com novos (sem duplicados)
        const allDrivers = [...new Set([...this.drivers, ...newDrivers])];
        this.drivers = allDrivers;
        
        console.log(`🚗 Condutores atualizados: ${this.drivers.length} total (${newDrivers.length} novos)`);
        
        // Atualizar select de condutores
        this.populateDriverSelect();
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
        // Procurar em todos os arrays possíveis
        let delivery = this.currentDriverDeliveries.find(d => d.alocation === alocation) ||
                      this.pendingDeliveries.find(d => d.alocation === alocation);
        
        // Se não encontrar por alocação, tentar por matrícula
        if (!delivery) {
            delivery = this.currentDriverDeliveries.find(d => d.licensePlate === alocation) ||
                      this.pendingDeliveries.find(d => d.licensePlate === alocation);
        }
        
        if (!delivery) {
            console.warn('Entrega não encontrada para validação:', alocation);
            console.log('Arrays disponíveis para validação:', {
                currentDriverDeliveries: this.currentDriverDeliveries.length,
                pendingDeliveries: this.pendingDeliveries.length
            });
            showError('Erro', 'Entrega não encontrada para validação. Verifica se os dados foram carregados corretamente.');
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
        
        try {
            // VERIFICAR INCONSISTÊNCIAS PERMANENTES PRIMEIRO
            const permanentInconsistencies = await this.checkPermanentInconsistencies(delivery);
            
            if (permanentInconsistencies.length > 0) {
                hideProcessing();
                
                // Mostrar modal de aprovação para inconsistências permanentes
                const approved = await this.showPermanentInconsistencyApproval(delivery, permanentInconsistencies);
                
                if (!approved) {
                    showInfo('Validação Cancelada', 'Validação cancelada pelo utilizador.');
                    return;
                }
                
                // Marcar inconsistências como aprovadas mas permanentes
                delivery.permanentInconsistencies = permanentInconsistencies;
                delivery.permanentInconsistenciesApproved = true;
                delivery.permanentInconsistenciesApprovedAt = new Date().toISOString();
                
                showProcessing('A continuar validação...', 'Validação');
            }
            
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
            
            // IMPORTANTE: Manter inconsistências permanentes mesmo após validação
            if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
                delivery.status = 'validated_with_permanent_issues';
                console.log('⚠️ Entrega validada mas mantém inconsistências permanentes:', {
                    licensePlate: delivery.licensePlate,
                    permanentInconsistencies: delivery.permanentInconsistencies
                });
            }
            
            // Remover da lista pendente e adicionar à validada
            const index = this.currentDriverDeliveries.indexOf(delivery);
            if (index !== -1) {
                this.currentDriverDeliveries.splice(index, 1);
            }
            
            this.validatedDeliveries.push(delivery);
            this.validationHistory.push({
                delivery,
                validationData,
                permanentInconsistencies: delivery.permanentInconsistencies || [],
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
                        notes: validationData.notes,
                        permanentInconsistencies: delivery.permanentInconsistencies || [],
                        permanentInconsistenciesApproved: delivery.permanentInconsistenciesApproved || false
                    });
                } catch (error) {
                    console.error('Erro ao salvar validação:', error);
                }
            }
            
            // Atualizar interface
            this.updateDeliveryCount();
            this.renderDeliveriesTable();
            
            hideProcessing();
            
            // Mostrar resultado baseado no tipo de validação
            if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
                showWarning(
                    'Entrega Validada com Inconsistências', 
                    `✅ Entrega ${delivery.alocation} validada\n` +
                    `⚠️ ${delivery.permanentInconsistencies.length} inconsistência(s) permanente(s) aprovada(s)\n` +
                    `🔒 Estas inconsistências NÃO desaparecerão`
                );
            } else {
                showSuccess(
                    'Entrega Validada', 
                    `Entrega ${delivery.alocation} ${validationData.action === 'reject' ? 'rejeitada' : 'validada'} com sucesso`
                );
            }
            
        } catch (error) {
            hideProcessing();
            console.error('Erro no processamento da validação:', error);
            showError('Erro de Validação', `Erro ao processar validação: ${error.message}`);
        }
    }

    async checkPermanentInconsistencies(delivery) {
        const inconsistencies = [];
        
        try {
            // Encontrar dados validados correspondentes
            const validatedRecord = this.findValidatedRecord(delivery);
            
            // Verificar cada regra crítica
            for (const [ruleId, rule] of this.rules.entries()) {
                if (rule.severity === 'critical' && rule.isPermanent && rule.requiresApproval) {
                    const hasInconsistency = rule.check(delivery, validatedRecord);
                    
                    if (hasInconsistency) {
                        inconsistencies.push({
                            ruleId: ruleId,
                            ruleName: rule.name,
                            message: rule.getMessage(delivery, validatedRecord),
                            approvalMessage: rule.getApprovalMessage ? rule.getApprovalMessage(delivery) : rule.getMessage(delivery, validatedRecord),
                            severity: rule.severity,
                            isPermanent: rule.isPermanent
                        });
                        
                        console.log('🚨 Inconsistência permanente detectada:', {
                            rule: rule.name,
                            licensePlate: delivery.licensePlate,
                            message: rule.getMessage(delivery, validatedRecord)
                        });
                    }
                }
            }
            
            return inconsistencies;
            
        } catch (error) {
            console.error('Erro ao verificar inconsistências permanentes:', error);
            return [];
        }
    }

    async showPermanentInconsistencyApproval(delivery, inconsistencies) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';
            
            const inconsistencyList = inconsistencies.map(inc => 
                `<div class="inconsistency-item">
                    <h4>🚨 ${inc.ruleName}</h4>
                    <p>${inc.message}</p>
                </div>`
            ).join('');
            
            modal.innerHTML = `
                <div class="modal permanent-inconsistency-modal">
                    <div class="modal-header">
                        <h3>⚠️ INCONSISTÊNCIAS PERMANENTES DETECTADAS</h3>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <strong>ATENÇÃO:</strong> Foram detectadas ${inconsistencies.length} inconsistência(s) permanente(s) 
                            que NÃO desaparecerão mesmo após aprovação.
                        </div>
                        
                        <div class="delivery-info">
                            <h4>📋 Entrega: ${delivery.alocation}</h4>
                            <p><strong>Matrícula:</strong> ${delivery.licensePlate}</p>
                            <p><strong>Método:</strong> ${delivery.paymentMethod}</p>
                            <p><strong>Valor:</strong> €${delivery.priceOnDelivery}</p>
                        </div>
                        
                        <div class="inconsistencies-list">
                            <h4>🚨 Inconsistências Detectadas:</h4>
                            ${inconsistencyList}
                        </div>
                        
                        <div class="approval-warning">
                            <h4>⚠️ IMPORTANTE:</h4>
                            <ul>
                                <li>Estas inconsistências são <strong>PERMANENTES</strong></li>
                                <li>NÃO desaparecerão após aprovação</li>
                                <li>Ficarão registadas no sistema</li>
                                <li>Aparecerão em relatórios e exportações</li>
                            </ul>
                        </div>
                        
                        <div class="approval-question">
                            <h4>❓ Desejas aprovar e continuar mesmo assim?</h4>
                        </div>
                        
                        <div class="modal-actions">
                            <button id="approve-permanent" class="btn btn-warning">
                                ✅ Aprovar e Continuar
                            </button>
                            <button id="cancel-permanent" class="btn btn-secondary">
                                ❌ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            modal.querySelector('#approve-permanent').addEventListener('click', () => {
                document.body.removeChild(modal);
                console.log('✅ Inconsistências permanentes aprovadas pelo utilizador');
                resolve(true);
            });
            
            modal.querySelector('#cancel-permanent').addEventListener('click', () => {
                document.body.removeChild(modal);
                console.log('❌ Aprovação de inconsistências permanentes cancelada');
                resolve(false);
            });
        });
    }

    findValidatedRecord(delivery) {
        // Procurar nos dados validados da BD ou comparação
        if (window.validationSystem && window.validationSystem.validatedDataFromDB) {
            return window.validationSystem.validatedDataFromDB.find(record => 
                this.normalizeLicensePlate(record.licensePlate) === this.normalizeLicensePlate(delivery.licensePlate)
            );
        }
        
        // Fallback: procurar nos dados da comparação
        if (window.comparator) {
            const comparisonResults = window.comparator.getResults();
            if (comparisonResults && comparisonResults.all) {
                return comparisonResults.all.find(record => 
                    this.normalizeLicensePlate(record.licensePlate) === this.normalizeLicensePlate(delivery.licensePlate)
                );
            }
        }
        
        return null;
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
        if (!dateString) return 'Sem data';
        
        try {
            let dateObj;
            
            // Se já é uma string formatada corretamente, retornar
            if (typeof dateString === 'string' && dateString.includes('/') && !dateString.includes('Invalid')) {
                return dateString;
            }
            
            // Tentar diferentes formatos de parsing
            if (typeof dateString === 'number') {
                // Timestamp Unix (segundos ou milissegundos)
                dateObj = dateString > 10000000000 ? new Date(dateString) : new Date(dateString * 1000);
            } else if (typeof dateString === 'string') {
                // Formato ISO ou outros formatos padrão
                if (dateString.includes('T') || dateString.includes('-')) {
                    dateObj = new Date(dateString);
                } else if (dateString.includes('/')) {
                    // Formato dd/mm/yyyy ou similar
                    const parts = dateString.split(/[\\/\\s:]/);
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado
                        const year = parseInt(parts[2], 10);
                        const hour = parts[3] ? parseInt(parts[3], 10) : 0;
                        const minute = parts[4] ? parseInt(parts[4], 10) : 0;
                        dateObj = new Date(year, month, day, hour, minute);
                    } else {
                        dateObj = new Date(dateString);
                    }
                } else {
                    dateObj = new Date(dateString);
                }
            } else {
                dateObj = new Date(dateString);
            }
            
            // Verificar se a data é válida
            if (isNaN(dateObj.getTime())) {
                console.warn('Data inválida recebida:', dateString);
                return 'Data inválida';
            }
            
            // Formatar para o padrão português
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${day}/${month}/${year} ${hours}:${minutes}`;
            
        } catch (error) {
            console.warn('Erro ao formatar data:', error, 'Data original:', dateString);
            return 'Erro na data';
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
        // Procurar em todos os arrays possíveis
        let delivery = this.currentDriverDeliveries.find(d => d.alocation === alocation) ||
                      this.validatedDeliveries.find(d => d.alocation === alocation) ||
                      this.pendingDeliveries.find(d => d.alocation === alocation);
        
        // Se não encontrar por alocação, tentar por matrícula
        if (!delivery) {
            delivery = this.currentDriverDeliveries.find(d => d.licensePlate === alocation) ||
                      this.validatedDeliveries.find(d => d.licensePlate === alocation) ||
                      this.pendingDeliveries.find(d => d.licensePlate === alocation);
        }
        
        if (!delivery) {
            console.warn('Entrega não encontrada para alocação:', alocation);
            console.log('Arrays disponíveis:', {
                currentDriverDeliveries: this.currentDriverDeliveries.length,
                validatedDeliveries: this.validatedDeliveries.length,
                pendingDeliveries: this.pendingDeliveries.length
            });
            showError('Erro', 'Entrega não encontrada. Verifica se os dados foram carregados corretamente.');
            return;
        }
        
        // Criar modal de detalhes mais informativo
        const detailsModal = this.createDeliveryDetailsModal(delivery);
        document.body.appendChild(detailsModal);
        
        console.log('Detalhes da entrega:', delivery);
    }
    
    createDeliveryDetailsModal(delivery) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content delivery-details-modal">
                <div class="modal-header">
                    <h3>Detalhes da Entrega</h3>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="delivery-info-grid">
                        <div class="info-group">
                            <label>Alocação:</label>
                            <span>${delivery.alocation}</span>
                        </div>
                        <div class="info-group">
                            <label>Matrícula:</label>
                            <span>${delivery.licensePlate}</span>
                        </div>
                        <div class="info-group">
                            <label>Data Checkout:</label>
                            <span>${delivery.checkOut}</span>
                        </div>
                        <div class="info-group">
                            <label>Método Pagamento:</label>
                            <span>${delivery.paymentMethod}</span>
                        </div>
                        <div class="info-group">
                            <label>Valor:</label>
                            <span>€${parseFloat(delivery.priceOnDelivery || 0).toFixed(2)}</span>
                        </div>
                        <div class="info-group">
                            <label>Condutor:</label>
                            <span>${delivery.condutorEntrega || 'N/A'}</span>
                        </div>
                        <div class="info-group">
                            <label>Status:</label>
                            <span class="status-badge status-${delivery.status}">${delivery.status}</span>
                        </div>
                        <div class="info-group">
                            <label>Inconsistências:</label>
                            <span>${delivery.inconsistencies ? delivery.inconsistencies.length : 0}</span>
                        </div>
                    </div>
                    ${delivery.inconsistencies && delivery.inconsistencies.length > 0 ? `
                        <div class="inconsistencies-section">
                            <h4>Inconsistências Encontradas:</h4>
                            <ul>
                                ${delivery.inconsistencies.map(inc => `<li>${inc}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
                </div>
            </div>
        `;
        return modal;
    }

    // ===== AÇÕES GERAIS =====
    
    addNewCaixaSheet() {
        const currentStats = this.getValidationStats();
        
        showConfirm(
            'Nova Folha de Caixa',
            `Sistema Incremental Ativo!\n\n` +
            `Dados atuais:\n` +
            `• Entregas validadas: ${currentStats.validated}\n` +
            `• Entregas pendentes: ${currentStats.pending}\n` +
            `• Total de condutores: ${this.drivers.length}\n\n` +
            `A nova folha será ADICIONADA aos dados existentes.\n` +
            `Os registos atuais serão PRESERVADOS.\n\n` +
            `Queres continuar?`,
            () => {
                // NÃO limpar dados existentes - sistema incremental
                // Apenas resetar a interface para nova importação
                
                // Reset apenas da interface de seleção de condutor
                if (this.elements.driverSelect) {
                    this.elements.driverSelect.value = '';
                }
                this.hideDriverDeliveries();
                
                // Limpar apenas a visualização atual, não os dados
                this.currentDriverDeliveries = [];
                
                // Preparar para nova importação incremental
                console.log('🔄 Sistema incremental ativo - dados preservados');
                console.log('📊 Estado atual:', {
                    validatedDeliveries: this.validatedDeliveries.length,
                    pendingDeliveries: this.pendingDeliveries.length,
                    drivers: this.drivers.length
                });
                
                showInfo(
                    'Sistema Incremental', 
                    `✅ Pronto para nova folha!\n\n` +
                    `• Dados existentes preservados\n` +
                    `• Novos registos serão adicionados\n` +
                    `• Condutores serão combinados\n\n` +
                    `Podes agora importar o novo ficheiro de caixa.`
                );
            },
            () => {
                // Opção alternativa: Limpar tudo (comportamento antigo)
                showConfirm(
                    'Limpar Dados',
                    'Queres limpar TODOS os dados existentes e começar do zero?',
                    () => {
                        // Reset completo (comportamento antigo)
                        this.validatedDeliveries = [];
                        this.pendingDeliveries = [];
                        this.currentDriverDeliveries = [];
                        this.drivers = [];
                        this.validationHistory = [];
                        
                        // Reset interface
                        if (this.elements.driverSelect) {
                            this.elements.driverSelect.value = '';
                            this.elements.driverSelect.innerHTML = '<option value="">Seleciona um condutor...</option>';
                        }
                        this.hideDriverDeliveries();
                        
                        console.log('🗑️ Todos os dados foram limpos');
                        showInfo('Dados Limpos', 'Todos os dados foram removidos. Podes importar um novo ficheiro.');
                    }
                );
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