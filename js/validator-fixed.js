// validator-fixed.js - Correção do sistema de validação
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const driverSelect = document.getElementById('driver-select');
    const driverSelection = document.getElementById('driver-selection');
    const driverDeliveries = document.getElementById('driver-deliveries');
    const deliveriesTable = document.getElementById('deliveries-table').querySelector('tbody');
    const deliveryCountElement = document.getElementById('delivery-count');
    const addCaixaBtn = document.getElementById('add-caixa-btn');
    const closeCaixaBtn = document.getElementById('close-caixa-btn');
    
    // Variáveis globais
    let validatedDeliveries = [];
    let pendingDeliveries = [];
    let currentDriverDeliveries = [];
    let drivers = [];
    let allCaixaRecords = []; // CORREÇÃO: Manter todos os registros de caixa

    /**
     * CORREÇÃO: Função para iniciar validação de caixa
     */
    function initCaixaValidation(caixaData) {
        console.log("🚀 Iniciando validação de caixa com dados:", caixaData?.length || 0, "registros");
        
        if (!caixaData || caixaData.length === 0) {
            console.warn('⚠️ Nenhum dado de caixa disponível');
            return;
        }
        
        // CORREÇÃO: Adicionar novos registros aos existentes em vez de substituir
        if (allCaixaRecords.length > 0) {
            console.log('📂 Adicionando', caixaData.length, 'novos registros aos', allCaixaRecords.length, 'existentes');
            
            // Verificar duplicatas por matrícula + condutor
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
            console.log('✅ Adicionados', newRecords.length, 'registros únicos. Total:', allCaixaRecords.length);
        } else {
            allCaixaRecords = [...caixaData];
        }
        
        // Obter dados validados da comparação
        const comparisonResults = window.comparator ? window.comparator.getResults() : null;
        const validatedData = comparisonResults ? comparisonResults.all : [];
        
        if (!validatedData || validatedData.length === 0) {
            console.warn("⚠️ Dados de comparação não disponíveis");
        }
        
        // CORREÇÃO: Extrair condutores únicos de TODOS os registros
        drivers = [...new Set(allCaixaRecords.map(item => item.condutorEntrega).filter(Boolean))];
        console.log("👥 Condutores encontrados:", drivers);
        
        // Preencher select de condutores
        populateDriverSelect(drivers);
        
        // Mostrar interface
        driverSelection.classList.remove('hidden');
        
        // Processar entregas
        processDeliveries(allCaixaRecords, validatedData);
        
        // Mostrar botões
        addCaixaBtn.classList.remove('hidden');
        closeCaixaBtn.classList.remove('hidden');
    }

    /**
     * CORREÇÃO: Verificar inconsistências permanentes com validações específicas
     */
    function getPermanentInconsistency(delivery, validatedRecord) {
        const inconsistencies = [];
        
        // CORREÇÃO: Validação para pagamento "no pay"
        if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'no pay') {
            // Verificar se campaignPay é false
            const campaignPayIsFalse = validatedRecord && validatedRecord.boRecord && 
                                     (validatedRecord.boRecord.campaignPay === false || 
                                      validatedRecord.boRecord.campaignPay === 'false');
            
            if (!campaignPayIsFalse) {
                inconsistencies.push('no_pay_without_campaign_pay_false');
            }
        }
        
        // CORREÇÃO: Validação para pagamento "online"
        if (delivery.paymentMethod && delivery.paymentMethod.toLowerCase() === 'online') {
            // Verificar se hasOnlinePayment é true
            const hasOnlinePaymentTrue = validatedRecord && validatedRecord.boRecord && 
                                       (validatedRecord.boRecord.hasOnlinePayment === true || 
                                        validatedRecord.boRecord.hasOnlinePayment === 'true');
            
            if (!hasOnlinePaymentTrue) {
                inconsistencies.push('online_without_online_payment_true');
            }
        }
        
        return inconsistencies.length > 0 ? inconsistencies : null;
    }

    /**
     * CORREÇÃO: Processar entregas com melhores validações
     */
    function processDeliveries(caixaData, validatedData) {
        console.log('🔄 A processar', caixaData.length, 'entregas...');
        
        // Criar mapa de registros validados
        const validatedMap = new Map();
        if (validatedData && validatedData.length > 0) {
            validatedData.forEach(record => {
                if (record.licensePlate) {
                    validatedMap.set(record.licensePlate.toString().toLowerCase(), record);
                }
            });
        }
        
        // Resetar entregas pendentes (manter as já validadas)
        const existingValidated = pendingDeliveries.filter(d => d.status === 'validated');
        pendingDeliveries = [...existingValidated];
        
        // Processar cada entrega da caixa
        caixaData.forEach(delivery => {
            if (!delivery.licensePlate) return;
            
            // CORREÇÃO: Verificar se já foi validada
            const alreadyValidated = validatedDeliveries.some(vd => 
                vd.licensePlate === delivery.licensePlate && 
                vd.condutorEntrega === delivery.condutorEntrega
            ) || pendingDeliveries.some(pd => 
                pd.licensePlate === delivery.licensePlate && 
                pd.condutorEntrega === delivery.condutorEntrega && 
                pd.status === 'validated'
            );
            
            if (alreadyValidated) {
                console.log('⏭️ Entrega já validada:', delivery.licensePlate);
                return;
            }
            
            const licensePlateLower = delivery.licensePlate.toString().toLowerCase();
            const validatedRecord = validatedMap.get(licensePlateLower);
            
            // Verificar inconsistências
            const inconsistencies = [];
            let permanentInconsistencies = null;
            
            if (validatedRecord) {
                const deliveryPrice = parseFloat(delivery.priceOnDelivery) || 0;
                const bookingPriceBO = parseFloat(validatedRecord.bookingPriceBO) || 0;
                const bookingPriceOdoo = parseFloat(validatedRecord.bookingPriceOdoo) || 0;
                
                // Verificar diferenças de preço
                if (Math.abs(deliveryPrice - bookingPriceBO) > 0.01) {
                    inconsistencies.push('bookingPriceBO');
                }
                
                if (Math.abs(deliveryPrice - bookingPriceOdoo) > 0.01) {
                    inconsistencies.push('bookingPriceOdoo');
                }
                
                // CORREÇÃO: Verificar inconsistências permanentes
                permanentInconsistencies = getPermanentInconsistency(delivery, validatedRecord);
                
            } else {
                inconsistencies.push('missing_record');
            }
            
            // Determinar status
            let status = 'pending';
            if (inconsistencies.length > 0 || permanentInconsistencies) {
                status = 'inconsistent';
            } else {
                status = 'ready';
            }
            
            // CORREÇÃO: Criar objeto de entrega com ID único
            const deliveryObject = {
                id: `${delivery.licensePlate}_${delivery.condutorEntrega}_${Date.now()}`,
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
     * CORREÇÃO: Renderizar tabela com melhor gestão de IDs
     */
    function renderDeliveriesTable(deliveries) {
        deliveriesTable.innerHTML = '';
        
        if (deliveries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">Nenhuma entrega pendente para este condutor.</td>';
            deliveriesTable.appendChild(row);
            return;
        }
        
        deliveries.forEach(delivery => {
            const row = document.createElement('tr');
            
            // Status styling
            if (delivery.permanentInconsistencies) {
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
     * CORREÇÃO: Eventos dos botões com busca por ID
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
     * CORREÇÃO: Mostrar modal de detalhes com busca corrigida
     */
    function showDeliveryDetailsModal(deliveryId) {
        const delivery = currentDriverDeliveries.find(d => d.id === deliveryId) || 
                        validatedDeliveries.find(d => d.id === deliveryId) ||
                        pendingDeliveries.find(d => d.id === deliveryId);
        
        if (!delivery) {
            console.error('❌ Entrega não encontrada com ID:', deliveryId);
            alert('Entrega não encontrada!');
            return;
        }
        
        const modalBody = document.getElementById('details-modal-body');
        if (!modalBody) {
            console.error('❌ Modal de detalhes não encontrado');
            return;
        }
        
        modalBody.innerHTML = '';
        
        const content = document.createElement('div');
        content.innerHTML = `
            <h4>Entrega: ${delivery.alocation || delivery.licensePlate}</h4>
            <p><strong>Matrícula:</strong> ${delivery.licensePlate}</p>
            <p><strong>Data de Checkout:</strong> ${delivery.checkOut}</p>
            <p><strong>Condutor:</strong> ${delivery.condutorEntrega}</p>
            <p><strong>Status:</strong> ${getStatusText(delivery)}</p>
            ${delivery.resolution ? `<p><strong>Resolução:</strong> ${getResolutionText(delivery.resolution)}</p>` : ''}
            
            <h4 class="mt-20">Detalhes de Pagamento</h4>
            <table class="table">
                <tr><th>Método de Pagamento</th><td>${delivery.paymentMethod}</td></tr>
                <tr><th>Valor na Entrega</th><td>${delivery.priceOnDelivery} €</td></tr>
                <tr><th>Campanha</th><td>${delivery.campaign || 'N/A'}</td></tr>
                <tr><th>Tipo de Campanha</th><td>${delivery.campaignPay || 'N/A'}</td></tr>
            </table>
        `;
        
        // CORREÇÃO: Verificar inconsistências permanentes
        if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
            const permanentDiv = document.createElement('div');
            permanentDiv.className = 'status-error mt-20';
            permanentDiv.innerHTML = `
                <h4>⚠️ Inconsistências Permanentes</h4>
                <ul>
                    ${delivery.permanentInconsistencies.map(inc => {
                        if (inc === 'no_pay_without_campaign_pay_false') {
                            return '<li>Pagamento "No Pay" mas campaignPay não é false no Back Office</li>';
                        } else if (inc === 'online_without_online_payment_true') {
                            return '<li>Pagamento "Online" mas hasOnlinePayment não é true no Back Office</li>';
                        }
                        return `<li>${inc}</li>`;
                    }).join('')}
                </ul>
                <p><em>Estas inconsistências não desaparecem mesmo após validação.</em></p>
            `;
            content.appendChild(permanentDiv);
        }
        
        // Outras inconsistências
        if (delivery.inconsistencies && delivery.inconsistencies.length > 0) {
            const inconsistenciesDiv = document.createElement('div');
            inconsistenciesDiv.innerHTML = `
                <h4 class="mt-20">Inconsistências</h4>
                <ul>
                    ${delivery.inconsistencies.map(inc => {
                        if (inc === 'bookingPriceBO') {
                            return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € vs Booking BO: ${delivery.validatedRecord?.bookingPriceBO || 'N/A'} €</li>`;
                        } else if (inc === 'bookingPriceOdoo') {
                            return `<li>Preço na Entrega: ${delivery.priceOnDelivery} € vs Booking Odoo: ${delivery.validatedRecord?.bookingPriceOdoo || 'N/A'} €</li>`;
                        } else if (inc === 'missing_record') {
                            return '<li>Registro não encontrado na comparação Odoo vs Back Office</li>';
                        }
                        return `<li>${inc}</li>`;
                    }).join('')}
                </ul>
            `;
            content.appendChild(inconsistenciesDiv);
        }
        
        modalBody.appendChild(content);
        document.getElementById('details-modal-overlay').style.display = 'flex';
    }

    /**
     * CORREÇÃO: Validar entrega com melhor gestão
     */
    function showValidateDeliveryModal(deliveryId) {
        const delivery = currentDriverDeliveries.find(d => d.id === deliveryId);
        
        if (!delivery) {
            console.error('❌ Entrega não encontrada para validação:', deliveryId);
            alert('Entrega não encontrada!');
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
            <h4>Validar Entrega: ${delivery.alocation || delivery.licensePlate}</h4>
            <p><strong>Matrícula:</strong> ${delivery.licensePlate}</p>
            <p><strong>Método de Pagamento:</strong> ${delivery.paymentMethod}</p>
            <p><strong>Valor na Entrega:</strong> ${delivery.priceOnDelivery} €</p>
        `;
        
        // CORREÇÃO: Aviso para inconsistências permanentes
        if (delivery.permanentInconsistencies && delivery.permanentInconsistencies.length > 0) {
            content.innerHTML += `
                <div class="status-error mt-20">
                    <h4>⚠️ Atenção: Inconsistências Permanentes</h4>
                    <p>Esta entrega tem inconsistências que <strong>não podem ser corrigidas</strong>:</p>
                    <ul>
                        ${delivery.permanentInconsistencies.map(inc => {
                            if (inc === 'no_pay_without_campaign_pay_false') {
                                return '<li>Pagamento "No Pay" sem campaignPay=false no Back Office</li>';
                            } else if (inc === 'online_without_online_payment_true') {
                                return '<li>Pagamento "Online" sem hasOnlinePayment=true no Back Office</li>';
                            }
                            return `<li>${inc}</li>`;
                        }).join('')}
                    </ul>
                    <p><strong>Podes validar a entrega, mas as inconsistências permanecerão registadas.</strong></p>
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
                    <label for="corrected-payment-method">Método de Pagamento Corrigido:</label>
                    <select id="corrected-payment-method" class="form-control">
                        <option value="${delivery.paymentMethod}" selected>${delivery.paymentMethod}</option>
                        <option value="numerário">numerário</option>
                        <option value="multibanco">multibanco</option>
                        <option value="no pay">no pay</option>
                        <option value="online">online</option>
                    </select>
                </div>
                
                <div class="form-group mt-10">
                    <label for="correction-notes">Notas de Correção:</label>
                    <textarea id="correction-notes" class="form-control" rows="3" placeholder="Descreve as alterações realizadas..."></textarea>
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
     * CORREÇÃO: Validar entrega com preservação de inconsistências permanentes
     */
    function validateDelivery(delivery, resolution, correctedPrice, correctionNotes, correctedPaymentMethod) {
        console.log('✅ A validar entrega:', delivery.licensePlate, 'Resolução:', resolution);
        
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
        
        // Atualizar status e resolução
        delivery.status = 'validated';
        delivery.resolution = resolution;
        
        // IMPORTANTE: Preservar inconsistências permanentes mesmo após validação
        if (delivery.permanentInconsistencies) {
            console.log('⚠️ Preservando inconsistências permanentes:', delivery.permanentInconsistencies);
            delivery.permanentInconsistency = true; // Flag para relatórios
        }
        
        // Remover da lista atual do condutor
        const index = currentDriverDeliveries.findIndex(d => d.id === delivery.id);
        if (index !== -1) {
            currentDriverDeliveries.splice(index, 1);
        }
        
        // Adicionar às validadas
        validatedDeliveries.push(delivery);
        
        // Atualizar interface
        renderDeliveriesTable(currentDriverDeliveries);
        deliveryCountElement.textContent = currentDriverDeliveries.length;
        
        console.log('✅ Entrega validada com sucesso');
    }

    // Resto das funções...
    function populateDriverSelect(driversList) {
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
            case 'auto_validated': return 'Validado Automaticamente';
            default: return resolution;
        }
    }

    // Eventos
    driverSelect.addEventListener('change', function() {
        const selectedDriver = this.value;
        
        if (selectedDriver) {
            currentDriverDeliveries = pendingDeliveries.filter(delivery => 
                delivery.condutorEntrega === selectedDriver && 
                delivery.status !== 'validated'
            );
            
            driverDeliveries.classList.remove('hidden');
            deliveryCountElement.textContent = currentDriverDeliveries.length;
            renderDeliveriesTable(currentDriverDeliveries);
        } else {
            driverDeliveries.classList.add('hidden');
        }
    });

    // CORREÇÃO: Botão "Adicionar Caixa" - não limpar dados
    addCaixaBtn.addEventListener('click', function() {
        console.log('📂 Preparando para adicionar nova folha de caixa...');
        
        // Mostrar interface de upload sem limpar dados existentes
        document.getElementById('caixa-upload').click();
    });

    // Botão "Fechar Caixa"
    closeCaixaBtn.addEventListener('click', function() {
        const totalPending = pendingDeliveries.filter(d => d.status !== 'validated').length;
        
        if (totalPending > 0) {
            if (!confirm(`Ainda existem ${totalPending} entregas não validadas. Desejas encerrar a caixa?`)) {
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
    });

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

