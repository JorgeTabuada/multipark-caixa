// validator-fixed.js - Sistema de validação corrigido
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Carregando validador corrigido...');
    
    // Elementos da interface
    const driverSelect = document.getElementById('driver-select');
    const driverSelection = document.getElementById('driver-selection');
    const driverDeliveries = document.getElementById('driver-deliveries');
    const deliveriesTable = document.getElementById('deliveries-table')?.querySelector('tbody');
    const deliveryCountElement = document.getElementById('delivery-count');
    const addCaixaBtn = document.getElementById('add-caixa-btn');
    const closeCaixaBtn = document.getElementById('close-caixa-btn');
    
    // Variáveis globais
    let validatedDeliveries = [];
    let pendingDeliveries = [];
    let currentDriverDeliveries = [];
    let drivers = [];
    let allCaixaRecords = []; // CORREÇÃO: Manter todos os registros

    /**
     * CORREÇÃO: Função para iniciar validação de caixa
     */
    function initCaixaValidation(caixaData) {
        console.log("🚀 Iniciando validação com", caixaData?.length || 0, "registros");
        
        if (!caixaData || caixaData.length === 0) {
            console.warn('⚠️ Nenhum dado de caixa disponível');
            if (window.showNotification) {
                window.showNotification('Nenhum dado de caixa para validar.', 'warning');
            }
            return;
        }
        
        // CORREÇÃO: Adicionar novos registros sem apagar existentes
        if (allCaixaRecords.length > 0) {
            console.log('📂 Adicionando', caixaData.length, 'novos aos', allCaixaRecords.length, 'existentes');
            
            // Evitar duplicatas baseado em matrícula + condutor
            const existingKeys = new Set(
                allCaixaRecords.map(record => 
                    `${record.licensePlate}_${record.condutorEntrega}`.toLowerCase()
                )
            );
            
            const newRecords = caixaData.filter(record => {
                const key = `${record.licensePlate}_${record.condutorEntrega}`.toLowerCase();
                return !existingKeys.has(key);
            });
            
            allCaixaRecords.push(...newRecords);
            console.log('✅ Adicionados', newRecords.length, 'únicos. Total:', allCaixaRecords.length);
            
            if (window.showNotification) {
                window.showNotification(`Adicionados ${newRecords.length} novos registros. Total: ${allCaixaRecords.length}`, 'success');
            }
        } else {
            allCaixaRecords = [...caixaData];
            console.log('📝 Primeira carga:', allCaixaRecords.length, 'registros');
        }
        
        // Obter dados de comparação
        const comparisonResults = window.comparator ? window.comparator.getResults() : null;
        const validatedData = comparisonResults ? comparisonResults.all : [];
        
        if (!validatedData || validatedData.length === 0) {
            console.warn("⚠️ Dados de comparação não disponíveis");
        }
        
        // CORREÇÃO: Extrair condutores únicos de TODOS os registros
        drivers = [...new Set(allCaixaRecords.map(item => item.condutorEntrega).filter(Boolean))];
        console.log("👥 Condutores:", drivers);
        
        // Preencher interface
        populateDriverSelect(drivers);
        driverSelection.classList.remove('hidden');
        
        // Processar entregas
        processDeliveries(allCaixaRecords, validatedData);
        
        // Mostrar botões
        addCaixaBtn.classList.remove('hidden');
        closeCaixaBtn.classList.remove('hidden');
    }

    /**
     * CORREÇÃO: Verificar inconsistências permanentes
     */
    function getPermanentInconsistency(delivery, validatedRecord) {
        if (!window.PaymentValidation) {
            console.warn('⚠️ PaymentValidation não disponível');
            return null;
        }
        
        const errors = window.PaymentValidation.validatePayment(delivery, validatedRecord);
        return errors.filter(error => error.type === 'permanent');
    }

    /**
     * CORREÇÃO: Processar entregas com melhor ID management
     */
    function processDeliveries(caixaData, validatedData) {
        console.log('🔄 A processar', caixaData.length, 'entregas...');
        
        // Criar mapa de registros validados
        const validatedMap = new Map();
        if (validatedData && validatedData.length > 0) {
            validatedData.forEach(record => {
                if (record.licensePlate) {
                    const normalizedPlate = window.normalizeLicensePlate(record.licensePlate);
                    validatedMap.set(normalizedPlate, record);
                }
            });
        }
        
        // Manter entregas já validadas
        const existingValidated = pendingDeliveries.filter(d => d.status === 'validated');
        pendingDeliveries = [...existingValidated];
        
        // Processar cada entrega
        caixaData.forEach((delivery, index) => {
            if (!delivery.licensePlate) return;
            
            // CORREÇÃO: Verificar se já foi processada
            const alreadyProcessed = validatedDeliveries.some(vd => 
                vd.licensePlate === delivery.licensePlate && 
                vd.condutorEntrega === delivery.condutorEntrega
            ) || pendingDeliveries.some(pd => 
                pd.licensePlate === delivery.licensePlate && 
                pd.condutorEntrega === delivery.condutorEntrega
            );
            
            if (alreadyProcessed) {
                console.log('⏭️ Já processada:', delivery.licensePlate);
                return;
            }
            
            const licensePlateLower = window.normalizeLicensePlate(delivery.licensePlate);
            const validatedRecord = validatedMap.get(licensePlateLower);
            
            // Verificar inconsistências
            const inconsistencies = [];
            let permanentInconsistencies = null;
            
            if (validatedRecord) {
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.bookingPriceBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.bookingPriceOdoo) || 0;
                
                // Verificar diferenças de preço (tolerância de 0.01€)
                if (Math.abs(deliveryPrice - bookingPriceBO) > 0.01) {
                    inconsistencies.push('bookingPriceBO');
                }
                
                if (Math.abs(deliveryPrice - bookingPriceOdoo) > 0.01) {
                    inconsistencies.push('bookingPriceOdoo');
                }
                
                // CORREÇÃO: Verificar inconsistências permanentes de pagamento
                permanentInconsistencies = getPermanentInconsistency(delivery, validatedRecord);
                
            } else {
                inconsistencies.push('missing_record');
            }
            
            // Determinar status
            let status = 'pending';
            if (inconsistencies.length > 0 || (permanentInconsistencies && permanentInconsistencies.length > 0)) {
                status = 'inconsistent';
            } else {
                status = 'ready';
            }
            
            // CORREÇÃO: Criar objeto com ID único baseado em timestamp + index
            const deliveryObject = {
                id: `${delivery.licensePlate}_${delivery.condutorEntrega}_${Date.now()}_${index}`,
                licensePlate: delivery.licensePlate,
                alocation: delivery.alocation,
                checkOut: window.DateUtils ? 
                    window.DateUtils.formatForDisplay(delivery.checkOut) : 
                    delivery.checkOut,
                paymentMethod: delivery.paymentMethod || 'N/A',
                priceOnDelivery: delivery.priceOnDelivery || 0,
                condutorEntrega: delivery.condutorEntrega,
                campaign: delivery.campaign,
                campaignPay: delivery.campaignPay,
                parkBrand: delivery.parkBrand,
                status: status,
                inconsistencies: inconsistencies,
                permanentInconsistencies: permanentInconsistencies,
                validatedRecord: validatedRecord,
                originalDelivery: delivery,
                resolution: null
            };
            
            pendingDeliveries.push(deliveryObject);
        });
        
        console.log('✅ Entregas processadas:', {
            total: pendingDeliveries.length,
            pending: pendingDeliveries.filter(d => d.status === 'pending').length,
            ready: pendingDeliveries.filter(d => d.status === 'ready').length,
            inconsistent: pendingDeliveries.filter(d => d.status === 'inconsistent').length,
            validated: pendingDeliveries.filter(d => d.status === 'validated').length
        });
    }

    /**
     * CORREÇÃO: Renderizar tabela com gestão correta de IDs
     */
    function renderDeliveriesTable(deliveries) {
        if (!deliveriesTable) {
            console.error('❌ Tabela não encontrada');
            return;
        }
        
        deliveriesTable.innerHTML = '';
        
        if (deliveries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega para este condutor.</td>';
            deliveriesTable.appendChild(row);
            return;
        }
        
        deliveries.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Styling baseado no status
            if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
                row.classList.add('status-error');
            } else if (delivery.status === 'inconsistent') {
                row.classList.add('status-warning');
            } else if (delivery.status === 'ready') {
                row.classList.add('status-success');
            } else if (delivery.status === 'validated') {
                row.classList.add('status-success');
            }
            
            row.innerHTML = `
                <td>${delivery.alocation || 'N/A'}</td>
                <td>${delivery.licensePlate}</td>
                <td>${delivery.checkOut}</td>
                <td>${delivery.paymentMethod}</td>
                <td>${delivery.priceOnDelivery} €</td>
                <td>${getStatusText(delivery)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm view-delivery-details" data-delivery-id="${delivery.id}">Detalhes</button>
                    <button class="btn ${delivery.status === 'ready' ? 'btn-success' : 'btn-primary'} btn-sm validate-delivery" data-delivery-id="${delivery.id}">Validar</button>
                </td>
            `;
            
            deliveriesTable.appendChild(row);
        });
        
        addDeliveryTableButtonEvents();
    }

    /**
     * CORREÇÃO: Eventos com busca por ID
     */
    function addDeliveryTableButtonEvents() {
        document.querySelectorAll('.view-delivery-details').forEach(button => {
            button.addEventListener('click', function() {
                const deliveryId = this.getAttribute('data-delivery-id');
                showDeliveryDetailsModal(deliveryId);
            });
        });
        
        document.querySelectorAll('.validate-delivery').forEach(button => {
            button.addEventListener('click', function() {
                const deliveryId = this.getAttribute('data-delivery-id');
                showValidateDeliveryModal(deliveryId);
            });
        });
    }

    /**
     * CORREÇÃO: Modal de detalhes com busca corrigida
     */
    function showDeliveryDetailsModal(deliveryId) {
        // CORREÇÃO: Buscar em todas as listas possíveis
        const delivery = currentDriverDeliveries.find(d => d.id === deliveryId) || 
                        validatedDeliveries.find(d => d.id === deliveryId) ||
                        pendingDeliveries.find(d => d.id === deliveryId);
        
        if (!delivery) {
            console.error('❌ Entrega não encontrada:', deliveryId);
            if (window.showNotification) {
                window.showNotification('Entrega não encontrada!', 'error');
            }
            return;
        }
        
        const modalBody = document.getElementById('details-modal-body');
        if (!modalBody) {
            console.error('❌ Modal não encontrado');
            return;
        }
        
        modalBody.innerHTML = `
            <h4>Entrega: ${delivery.alocation || delivery.licensePlate}</h4>
            <p><strong>Matrícula:</strong> ${delivery.licensePlate}</p>
            <p><strong>Data Checkout:</strong> ${delivery.checkOut}</p>
            <p><strong>Condutor:</strong> ${delivery.condutorEntrega}</p>
            <p><strong>Status:</strong> ${getStatusText(delivery)}</p>
            ${delivery.resolution ? `<p><strong>Resolução:</strong> ${getResolutionText(delivery.resolution)}</p>` : ''}
            
            <h4 class="mt-20">Detalhes de Pagamento</h4>
            <table class="table">
                <tr><th>Método</th><td>${delivery.paymentMethod}</td></tr>
                <tr><th>Valor na Entrega</th><td>${delivery.priceOnDelivery} €</td></tr>
                <tr><th>Campanha</th><td>${delivery.campaign || 'N/A'}</td></tr>
                <tr><th>Tipo Campanha</th><td>${delivery.campaignPay || 'N/A'}</td></tr>
            </table>
            
            ${delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0 ? `
                <div class="status-error mt-20">
                    <h4>⚠️ Inconsistências Permanentes</h4>
                    <ul>
                        ${delivery.permanentInconsistencies.map(error => 
                            `<li>${error.message}</li>`
                        ).join('')}
                    </ul>
                    <p><em>Estas inconsistências não desaparecem após validação.</em></p>
                </div>
            ` : ''}
            
            ${delivery.inconsistencies && delivery.inconsistencies.length > 0 ? `
                <h4 class="mt-20">Inconsistências</h4>
                <ul>
                    ${delivery.inconsistencies.map(inc => {
                        if (inc === 'bookingPriceBO') {
                            return `<li>Preço Entrega: ${delivery.priceOnDelivery}€ vs BO: ${delivery.validatedRecord?.bookingPriceBO}€</li>`;
                        } else if (inc === 'bookingPriceOdoo') {
                            return `<li>Preço Entrega: ${delivery.priceOnDelivery}€ vs Odoo: ${delivery.validatedRecord?.bookingPriceOdoo}€</li>`;
                        } else if (inc === 'missing_record') {
                            return '<li>Registro não encontrado na comparação</li>';
                        }
                        return `<li>${inc}</li>`;
                    }).join('')}
                </ul>
            ` : ''}
        `;
        
        document.getElementById('details-modal-overlay').style.display = 'flex';
    }

    /**
     * CORREÇÃO: Modal de validação
     */
    function showValidateDeliveryModal(deliveryId) {
        const delivery = currentDriverDeliveries.find(d => d.id === deliveryId);
        
        if (!delivery) {
            console.error('❌ Entrega não encontrada para validação:', deliveryId);
            if (window.showNotification) {
                window.showNotification('Entrega não encontrada!', 'error');
            }
            return;
        }
        
        const modalOverlay = document.getElementById('validate-modal-overlay');
        const modalBody = document.getElementById('validate-modal-body');
        
        if (!modalOverlay || !modalBody) {
            console.error('❌ Modal de validação não encontrado');
            return;
        }
        
        modalBody.innerHTML = '';
        
        const content = document.createElement('div');
        content.innerHTML = `
            <h4>Validar: ${delivery.alocation || delivery.licensePlate}</h4>
            <p><strong>Matrícula:</strong> ${delivery.licensePlate}</p>
            <p><strong>Método:</strong> ${delivery.paymentMethod}</p>
            <p><strong>Valor:</strong> ${delivery.priceOnDelivery} €</p>
        `;
        
        // CORREÇÃO: Aviso para inconsistências permanentes
        if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
            content.innerHTML += `
                <div class="status-error mt-20">
                    <h4>⚠️ Atenção: Inconsistências Permanentes</h4>
                    <p>Esta entrega tem inconsistências que <strong>não podem ser corrigidas</strong>:</p>
                    <ul>
                        ${delivery.permanentInconsistencies.map(error => 
                            `<li>${error.message}</li>`
                        ).join('')}
                    </ul>
                    <p><strong>Podes validar, mas as inconsistências permanecerão.</strong></p>
                </div>
            `;
        }
        
        // Formulário de validação
        const form = document.createElement('form');
        form.id = 'validate-delivery-form';
        form.innerHTML = `
            <div class="form-group mt-20">
                <label for="resolution">Resolução:</label>
                <select id="resolution" class="form-control" required>
                    <option value="">Seleciona uma resolução</option>
                    <option value="confirmed">Confirmar sem alterações</option>
                    <option value="corrected">Confirmar com correções</option>
                    <option value="auto_validated">Validação automática</option>
                </select>
            </div>
            
            <div id="correction-fields" class="hidden mt-10">
                <div class="form-group">
                    <label for="corrected-price">Valor Corrigido:</label>
                    <input type="number" id="corrected-price" class="form-control" step="0.01" min="0" value="${delivery.priceOnDelivery}">
                </div>
                
                <div class="form-group mt-10">
                    <label for="corrected-payment-method">Método Corrigido:</label>
                    <select id="corrected-payment-method" class="form-control">
                        <option value="${delivery.paymentMethod}" selected>${delivery.paymentMethod}</option>
                        <option value="numerário">numerário</option>
                        <option value="multibanco">multibanco</option>
                        <option value="no pay">no pay</option>
                        <option value="online">online</option>
                    </select>
                </div>
                
                <div class="form-group mt-10">
                    <label for="correction-notes">Notas:</label>
                    <textarea id="correction-notes" class="form-control" rows="3" placeholder="Descreve as alterações..."></textarea>
                </div>
            </div>
            
            <div class="form-group mt-20">
                <button type="submit" class="btn btn-primary">Confirmar Validação</button>
                <button type="button" class="btn btn-secondary" id="cancel-validate">Cancelar</button>
            </div>
        `;
        
        content.appendChild(form);
        modalBody.appendChild(content);
        modalOverlay.style.display = 'flex';
        
        // Eventos do formulário
        const resolutionSelect = document.getElementById('resolution');
        const correctionFields = document.getElementById('correction-fields');
        const cancelBtn = document.getElementById('cancel-validate');
        
        resolutionSelect.addEventListener('change', function() {
            if (this.value === 'corrected') {
                correctionFields.classList.remove('hidden');
            } else {
                correctionFields.classList.add('hidden');
            }
        });
        
        cancelBtn.addEventListener('click', function() {
            modalOverlay.style.display = 'none';
        });
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const resolution = resolutionSelect.value;
            let correctedPrice = delivery.priceOnDelivery;
            let correctedPaymentMethod = delivery.paymentMethod;
            let correctionNotes = '';
            
            if (resolution === 'corrected') {
                correctedPrice = parseFloat(document.getElementById('corrected-price').value) || 0;
                correctedPaymentMethod = document.getElementById('corrected-payment-method').value;
                correctionNotes = document.getElementById('correction-notes').value || '';
            }
            
            validateDelivery(delivery, resolution, correctedPrice, correctionNotes, correctedPaymentMethod);
            modalOverlay.style.display = 'none';
        });
    }

    /**
     * CORREÇÃO: Validar entrega preservando inconsistências permanentes
     */
    function validateDelivery(delivery, resolution, correctedPrice, correctionNotes, correctedPaymentMethod) {
        console.log('✅ Validando:', delivery.licensePlate, 'Resolução:', resolution);
        
        // Guardar valores originais se há correções
        if (resolution === 'corrected') {
            delivery.originalPrice = delivery.priceOnDelivery;
            delivery.originalPaymentMethod = delivery.paymentMethod;
            delivery.originalInconsistencies = delivery.inconsistencies ? [...delivery.inconsistencies] : [];
            
            // Aplicar correções
            delivery.priceOnDelivery = correctedPrice;
            delivery.paymentMethod = correctedPaymentMethod.toLowerCase();
            delivery.resolutionNotes = correctionNotes;
            delivery.userNotes = correctionNotes;
        }
        
        // Atualizar status
        delivery.status = 'validated';
        delivery.resolution = resolution;
        
        // IMPORTANTE: Preservar inconsistências permanentes
        if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
            console.log('⚠️ Preservando inconsistências permanentes');
            delivery.permanentInconsistency = true; // Flag para relatórios
        }
        
        // Mover da lista atual para validadas
        const index = currentDriverDeliveries.findIndex(d => d.id === delivery.id);
        if (index !== -1) {
            currentDriverDeliveries.splice(index, 1);
        }
        
        validatedDeliveries.push(delivery);
        
        // Atualizar interface
        renderDeliveriesTable(currentDriverDeliveries);
        if (deliveryCountElement) {
            deliveryCountElement.textContent = currentDriverDeliveries.length;
        }
        
        if (window.showNotification) {
            window.showNotification('Entrega validada com sucesso!', 'success');
        }
        
        console.log('✅ Validação concluída');
    }

    // Funções auxiliares
    function populateDriverSelect(driversList) {
        if (!driverSelect) return;
        
        driverSelect.innerHTML = '<option value="">Seleciona um condutor</option>';
        
        driversList.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver;
            option.textContent = driver;
            driverSelect.appendChild(option);
        });
    }

    function getStatusText(delivery) {
        if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
            return 'Inconsistência Permanente';
        }
        
        switch (delivery.status) {
            case 'pending': return 'Pendente';
            case 'inconsistent': return 'Inconsistente';
            case 'ready': return 'Pronto para Validação';
            case 'validated': return 'Validado';
            default: return delivery.status;
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

    // Eventos principais
    if (driverSelect) {
        driverSelect.addEventListener('change', function() {
            const selectedDriver = this.value;
            
            if (selectedDriver) {
                currentDriverDeliveries = pendingDeliveries.filter(delivery => 
                    delivery.condutorEntrega === selectedDriver && 
                    delivery.status !== 'validated'
                );
                
                if (driverDeliveries) driverDeliveries.classList.remove('hidden');
                if (deliveryCountElement) deliveryCountElement.textContent = currentDriverDeliveries.length;
                renderDeliveriesTable(currentDriverDeliveries);
            } else {
                if (driverDeliveries) driverDeliveries.classList.add('hidden');
            }
        });
    }

    // CORREÇÃO: Botão "Adicionar Caixa" - não limpar dados
    if (addCaixaBtn) {
        addCaixaBtn.addEventListener('click', function() {
            console.log('📂 Preparando para adicionar nova folha...');
            
            // Trigger upload sem limpar dados existentes
            const caixaFileInput = document.getElementById('caixa-file');
            if (caixaFileInput) {
                caixaFileInput.click();
            }
            
            if (window.showNotification) {
                window.showNotification('Seleciona o arquivo da nova folha de caixa.', 'info');
            }
        });
    }

    // Botão "Fechar Caixa"
    if (closeCaixaBtn) {
        closeCaixaBtn.addEventListener('click', function() {
            const totalPending = pendingDeliveries.filter(d => d.status !== 'validated').length;
            
            if (totalPending > 0) {
                if (!confirm(`Ainda há ${totalPending} entregas não validadas. Desejas fechar a caixa?`)) {
                    return;
                }
            }
            
            // Preparar dados para dashboard
            const allDeliveries = [...validatedDeliveries, ...pendingDeliveries];
            
            if (window.dashboard && window.dashboard.setDeliveryData) {
                window.dashboard.setDeliveryData(allDeliveries);
            }
            
            // Mudar para dashboard
            const dashboardTab = document.querySelector('.nav-tab[data-tab="dashboard"]');
            if (dashboardTab && window.changeTab) {
                window.changeTab(dashboardTab);
            }
            
            if (window.showNotification) {
                window.showNotification('Caixa fechada! Dados enviados para dashboard.', 'success');
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
    window.validator = {
        initCaixaValidation: initCaixaValidation,
        getValidatedDeliveries: () => validatedDeliveries,
        getPendingDeliveries: () => pendingDeliveries,
        getAllCaixaRecords: () => allCaixaRecords
    };

    console.log('✅ Validator corrigido carregado!');
});