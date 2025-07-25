// ===== FILE PROCESSOR INTEGRADO COM SUPABASE - VERSÃO CORRIGIDA =====
// Substitui o fileProcessor.js original com verificação de duplicados

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 FileProcessor integrado com anti-duplicados carregado!');
    
    // Variáveis globais para armazenar os dados dos arquivos
    let odooData = null;
    let backOfficeData = null;
    let caixaData = null;

    // Referências aos elementos de upload de arquivos com verificação de segurança
    const odooFileInput = document.getElementById('odoo-file');
    const backofficeFileInput = document.getElementById('backoffice-file');
    const caixaFileInput = document.getElementById('caixa-file');
    
    // Botões de upload com verificação de segurança
    const odooUpload = document.getElementById('odoo-upload');
    const backofficeUpload = document.getElementById('backoffice-upload');
    const caixaUpload = document.getElementById('caixa-upload');
    
    // Informações dos arquivos com verificação de segurança
    const odooFileInfo = document.getElementById('odoo-file-info');
    const odooFilename = document.getElementById('odoo-filename');
    const backofficeFileInfo = document.getElementById('backoffice-file-info');
    const backofficeFilename = document.getElementById('backoffice-filename');
    const caixaFileInfo = document.getElementById('caixa-file-info');
    const caixaFilename = document.getElementById('caixa-filename');
    
    // Botão de processamento com verificação de segurança
    const processFilesBtn = document.getElementById('process-files-btn');
    
    // Verificar se todos os elementos existem antes de adicionar event listeners
    if (!odooFileInput || !backofficeFileInput || !caixaFileInput) {
        console.error('❌ Elementos de input de ficheiro não encontrados');
        return;
    }
    
    if (!odooUpload || !backofficeUpload || !caixaUpload) {
        console.error('❌ Botões de upload não encontrados');
        return;
    }
    
    // ===== CONFIGURAÇÃO DOS EVENTOS DE UPLOAD =====
    
    // Upload Odoo
    odooUpload.addEventListener('click', function() {
        odooFileInput.click();
    });
    
    odooFileInput.addEventListener('change', function(e) {
        if (e.target && e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (odooFilename) odooFilename.textContent = file.name;
            if (odooFileInfo) odooFileInfo.classList.remove('hidden');
            readExcelFile(file, 'odoo');
        }
    });
    
    // Upload Back Office  
    backofficeUpload.addEventListener('click', function() {
        backofficeFileInput.click();
    });
    
    backofficeFileInput.addEventListener('change', function(e) {
        if (e.target && e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (backofficeFilename) backofficeFilename.textContent = file.name;
            if (backofficeFileInfo) backofficeFileInfo.classList.remove('hidden');
            readExcelFile(file, 'backoffice');
        }
    });
    
    // Upload Caixa
    caixaUpload.addEventListener('click', function() {
        caixaFileInput.click();
    });
    
    caixaFileInput.addEventListener('change', function(e) {
        if (e.target && e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (caixaFilename) caixaFilename.textContent = file.name;
            if (caixaFileInfo) caixaFileInfo.classList.remove('hidden');
            readExcelFile(file, 'caixa');
        }
    });

    // ===== PROCESSAMENTO DE FICHEIROS =====
    
    async function readExcelFile(file, fileType) {
        try {
            showProcessingIndicator(`A processar ${fileType}...`);
            
            const data = await readFileAsArrayBuffer(file);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Obter a primeira planilha
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Converter para JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
            
            console.log(`📊 ${fileType} processado:`, {
                registros: jsonData.length,
                colunas: Object.keys(jsonData[0] || {}),
                amostra: jsonData.slice(0, 2)
            });
            
            // Processar conforme o tipo
            if (fileType === 'odoo') {
                await processOdooFile(jsonData, file.name);
            } else if (fileType === 'backoffice') {
                await processBackOfficeFile(jsonData, file.name);
            } else if (fileType === 'caixa') {
                await processCaixaFile(jsonData, file.name);
            }
            
            hideProcessingIndicator();
            
        } catch (error) {
            hideProcessingIndicator();
            console.error(`Erro ao processar ${fileType}:`, error);
            alert(`Erro ao processar o ficheiro ${fileType}. Verifica se é um Excel válido.`);
        }
    }
    
    // ===== VERIFICAÇÃO DE DUPLICADOS =====
    
    async function checkForDuplicates(data, table, plateField = 'license_plate') {
        if (!window.caixaAPI || !data || data.length === 0) return [];
        
        try {
            // Obter todas as matrículas que vamos inserir
            const newPlates = data
                .map(record => normalizeLicensePlate(record[plateField] || record.licensePlate || ''))
                .filter(plate => plate && plate.length > 0);
            
            if (newPlates.length === 0) return [];
            
            // Verificar quais já existem na base de dados
            const { data: existing, error } = await window.caixaAPI.client
                .from(table)
                .select('license_plate')
                .in('license_plate', newPlates);
            
            if (error) {
                console.error(`Erro ao verificar duplicados em ${table}:`, error);
                return [];
            }
            
            const existingPlates = new Set(existing.map(row => row.license_plate));
            console.log(`🔍 ${table}: ${existingPlates.size} duplicados encontrados de ${newPlates.length} registos`);
            
            return Array.from(existingPlates);
            
        } catch (error) {
            console.error(`Erro na verificação de duplicados em ${table}:`, error);
            return [];
        }
    }
    
    async function removeDuplicatesFromData(data, existingPlates, plateField = 'license_plate') {
        const existingSet = new Set(existingPlates);
        
        const uniqueData = data.filter(record => {
            const plate = normalizeLicensePlate(record[plateField] || record.licensePlate || '');
            return !existingSet.has(plate);
        });
        
        const duplicatesCount = data.length - uniqueData.length;
        
        if (duplicatesCount > 0) {
            console.log(`🚫 ${duplicatesCount} duplicados removidos. ${uniqueData.length} novos registos restantes.`);
        }
        
        return {
            uniqueData,
            duplicatesCount,
            originalCount: data.length
        };
    }

    // ===== PROCESSAMENTO ESPECÍFICO POR TIPO COM ANTI-DUPLICADOS =====
    
    async function processOdooFile(jsonData, filename) {
        if (!isOdooFile(jsonData)) {
            alert("Este ficheiro não parece ser um export do Odoo. Verifica o formato!");
            return;
        }
        
        showProcessingIndicator('A verificar duplicados no Odoo...');
        
        // Transformar dados
        const transformedData = transformOdooData(jsonData);
        
        // Verificar duplicados
        const existingPlates = await checkForDuplicates(transformedData, 'sales_orders');
        const result = await removeDuplicatesFromData(transformedData, existingPlates);
        
        if (result.duplicatesCount > 0) {
            const proceed = confirm(
                `⚠️ Encontrados ${result.duplicatesCount} duplicados!\\n\\n` +
                `• Total no ficheiro: ${result.originalCount}\\n` +
                `• Duplicados: ${result.duplicatesCount}\\n` +
                `• Novos registos: ${result.uniqueData.length}\\n\\n` +
                `Queres continuar e importar apenas os novos registos?`
            );
            
            if (!proceed) {
                hideProcessingIndicator();
                return;
            }
        }
        
        odooData = result.uniqueData;
        
        // Salvar no Supabase se houver dados únicos
        if (result.uniqueData.length > 0 && window.caixaAPI) {
            try {
                showProcessingIndicator(`A importar ${result.uniqueData.length} registos únicos do Odoo...`);
                
                await window.caixaAPI.createImportBatch({ 
                    salesFilename: filename,
                    batchDate: new Date().toISOString().split('T')[0] 
                });
                await window.caixaAPI.importSalesOrders(result.uniqueData);
                
                console.log(`✅ ${result.uniqueData.length} novos registos Odoo salvos no Supabase!`);
                
                if (result.duplicatesCount > 0) {
                    alert(`✅ Importação concluída!\\n\\n` +
                          `• Novos registos importados: ${result.uniqueData.length}\\n` +
                          `• Duplicados ignorados: ${result.duplicatesCount}`);
                }
                
            } catch (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
                alert('Erro ao salvar no Supabase: ' + error.message);
            }
        } else if (result.uniqueData.length === 0) {
            alert('ℹ️ Todos os registos já existem na base de dados. Nenhum novo registo foi importado.');
        }
        
        checkFilesReady();
    }
    
    async function processBackOfficeFile(jsonData, filename) {
        showProcessingIndicator('A verificar duplicados no Back Office...');
        
        // Verificar duplicados
        const existingPlates = await checkForDuplicates(jsonData, 'deliveries');
        const result = await removeDuplicatesFromData(jsonData, existingPlates);
        
        if (result.duplicatesCount > 0) {
            const proceed = confirm(
                `⚠️ Encontrados ${result.duplicatesCount} duplicados!\\n\\n` +
                `• Total no ficheiro: ${result.originalCount}\\n` +
                `• Duplicados: ${result.duplicatesCount}\\n` +
                `• Novos registos: ${result.uniqueData.length}\\n\\n` +
                `Queres continuar e importar apenas os novos registos?`
            );
            
            if (!proceed) {
                hideProcessingIndicator();
                return;
            }
        }
        
        backOfficeData = result.uniqueData;
        
        // Salvar no Supabase se houver dados únicos
        if (result.uniqueData.length > 0 && window.caixaAPI) {
            try {
                showProcessingIndicator(`A importar ${result.uniqueData.length} registos únicos do Back Office...`);
                await window.caixaAPI.importDeliveries(result.uniqueData);
                console.log(`✅ ${result.uniqueData.length} novos registos Back Office salvos no Supabase!`);
                
                if (result.duplicatesCount > 0) {
                    alert(`✅ Importação concluída!\\n\\n` +
                          `• Novos registos importados: ${result.uniqueData.length}\\n` +
                          `• Duplicados ignorados: ${result.duplicatesCount}`);
                }
                
            } catch (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
                alert('Erro ao salvar no Supabase: ' + error.message);
            }
        } else if (result.uniqueData.length === 0) {
            alert('ℹ️ Todos os registos já existem na base de dados. Nenhum novo registo foi importado.');
        }
        
        checkFilesReady();
    }
    
    async function processCaixaFile(jsonData, filename) {
        showProcessingIndicator('A verificar duplicados na Caixa...');
        
        // Verificar duplicados
        const existingPlates = await checkForDuplicates(jsonData, 'cash_records');
        const result = await removeDuplicatesFromData(jsonData, existingPlates);
        
        if (result.duplicatesCount > 0) {
            const proceed = confirm(
                `⚠️ Encontrados ${result.duplicatesCount} duplicados!\\n\\n` +
                `• Total no ficheiro: ${result.originalCount}\\n` +
                `• Duplicados: ${result.duplicatesCount}\\n` +
                `• Novos registos: ${result.uniqueData.length}\\n\\n` +
                `Queres continuar e importar apenas os novos registos?`
            );
            
            if (!proceed) {
                hideProcessingIndicator();
                return;
            }
        }
        
        caixaData = result.uniqueData;
        
        // Salvar no Supabase se houver dados únicos
        if (result.uniqueData.length > 0 && window.caixaAPI) {
            try {
                showProcessingIndicator(`A importar ${result.uniqueData.length} registos únicos da Caixa...`);
                await window.caixaAPI.importCashRecords(result.uniqueData);
                console.log(`✅ ${result.uniqueData.length} novos registos Caixa salvos no Supabase!`);
                
                if (result.duplicatesCount > 0) {
                    alert(`✅ Importação concluída!\\n\\n` +
                          `• Novos registos importados: ${result.uniqueData.length}\\n` +
                          `• Duplicados ignorados: ${result.duplicatesCount}`);
                }
                
            } catch (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
                alert('Erro ao salvar no Supabase: ' + error.message);
            }
        } else if (result.uniqueData.length === 0) {
            alert('ℹ️ Todos os registos já existem na base de dados. Nenhum novo registo foi importado.');
            caixaData = [];  // Garantir que não há dados para processar
        }
        
        // Auto-iniciar validação se dados disponíveis
        if (window.validator && caixaData && caixaData.length > 0) {
            setTimeout(() => {
                window.validator.initCaixaValidation(caixaData);
            }, 500);
        }
    }

    // ===== VERIFICAÇÃO E TRANSFORMAÇÃO DE DADOS =====
    
    function isOdooFile(data) {
        if (data.length === 0) return false;
        
        const firstRow = data[0];
        const expectedColumns = ['imma', 'date_start', 'parking_name', 'price'];
        const alternativeColumns = ['licensePlate', 'bookingDate', 'parkBrand'];
        
        const hasExpected = expectedColumns.some(col => firstRow.hasOwnProperty(col));
        const hasAlternative = alternativeColumns.some(col => firstRow.hasOwnProperty(col));
        
        return hasExpected || hasAlternative;
    }
    
    function transformOdooData(data) {
        return data.map(record => {
            return {
                licensePlate: normalizeLicensePlate(record.imma || record.licensePlate || ''),
                bookingPrice: parseFloat(record.price || record.bookingPrice || 0),
                parkBrand: standardizeParkName(record.parking_name || record.parkBrand || ''),
                share: parseFloat(record.share || 0),
                bookingDate: formatDate(record.date_start || record.bookingDate || ''),
                checkIn: formatDate(record.date_checkin || record.checkIn || ''),
                checkOut: formatDate(record.date_end || record.checkOut || ''),
                priceOnDelivery: parseFloat(record.price_to_pay || record.priceOnDelivery || 0),
                paymentMethod: (record.payment_method || record.paymentMethod || '').toLowerCase(),
                driver: record.driver || record.condutor || '',
                campaign: record.campaign || '',
                campaignPay: record.campaign_pay === 'true' || record.campaign_pay === true,
                hasOnlinePayment: record.has_online_payment === 'true' || record.has_online_payment === true,
                originalData: record
            };
        });
    }

    // ===== UTILITÁRIOS =====
    
    function normalizeLicensePlate(plate) {
        if (!plate) return '';
        return String(plate)
            .replace(/[\\s\\-\\.\\,\\/\\\\\\(\\)\\[\\]\\{\\}\\+\\*\\?\\^\\$\\|]/g, '')
            .toLowerCase();
    }
    
    /**
     * 🔧 FUNÇÃO MELHORADA - Remove cidades do Odoo e normaliza marcas
     * 
     * Exemplos de transformação:
     * "Redpark Lisbon" -> "REDPARK"  
     * "Airpark Lisboa" -> "AIRPARK"
     * "Skypark Porto" -> "SKYPARK"
     * "redpark" -> "REDPARK"
     */
    function standardizeParkName(parkName) {
        if (!parkName) return '';
        
        let normalized = String(parkName).toLowerCase().trim();
        
        // ✅ LISTA DE CIDADES PARA REMOVER (PORTUGAL E OUTRAS)
        const cities = [
            // Portugal
            'lisbon', 'lisboa', 'porto', 'oporto', 'aveiro', 'braga', 'coimbra', 
            'faro', 'funchal', 'leiria', 'setubal', 'viseu', 'evora', 'beja',
            'castelo branco', 'guarda', 'portalegre', 'santarem', 'viana do castelo',
            'vila real', 'braganca', 'azores', 'madeira',
            
            // Outras cidades comuns
            'madrid', 'barcelona', 'sevilla', 'valencia', 'bilbao', 'malaga',
            'paris', 'london', 'rome', 'milan', 'berlin', 'amsterdam'
        ];
        
        // ✅ REMOVER PALAVRAS RELACIONADAS COM ESTACIONAMENTO
        const parkingWords = [
            'parking', 'estacionamento', 'park', 'parque', 'garage', 'garagem',
            'station', 'terminal', 'aeroporto', 'airport'
        ];
        
        // ✅ REMOVER CIDADES DO NOME
        cities.forEach(city => {
            // Remover cidade no final: "redpark lisbon" -> "redpark"
            const cityAtEnd = new RegExp(`\\\\s+${city}\\\\s*$`, 'gi');
            normalized = normalized.replace(cityAtEnd, '');
            
            // Remover cidade no início: "lisbon redpark" -> "redpark" 
            const cityAtStart = new RegExp(`^${city}\\\\s+`, 'gi');
            normalized = normalized.replace(cityAtStart, '');
            
            // Remover cidade no meio: "red lisbon park" -> "red park"
            const cityInMiddle = new RegExp(`\\\\s+${city}\\\\s+`, 'gi');
            normalized = normalized.replace(cityInMiddle, ' ');
        });
        
        // ✅ REMOVER PALAVRAS DE ESTACIONAMENTO
        parkingWords.forEach(word => {
            const regex = new RegExp(`\\\\s+${word}\\\\b`, 'gi');
            normalized = normalized.replace(regex, '');
        });
        
        // ✅ LIMPAR ESPAÇOS EXTRA E CONVERTER PARA MAIÚSCULAS
        normalized = normalized
            .replace(/\\s+/g, ' ')  // Múltiplos espaços -> um espaço
            .trim()                  // Remover espaços início/fim  
            .toUpperCase();         // Maiúsculas
        
        console.log(`🔄 Marca normalizada: "${parkName}" -> "${normalized}"`);
        
        return normalized;
    }
    
    function formatDate(dateValue) {
        if (!dateValue) return '';
        
        try {
            let dateObj;
            
            if (typeof dateValue === 'number') {
                dateObj = dateValue > 10000000000 ? new Date(dateValue) : new Date(dateValue * 1000);
            } else if (typeof dateValue === 'string') {
                if (dateValue.includes('/')) {
                    const cleanDate = dateValue.replace(/,/g, ' ');
                    const parts = cleanDate.split(/[\\/\\s:]/);
                    if (parts.length >= 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        const hour = parts[3] ? parseInt(parts[3], 10) : 0;
                        const minute = parts[4] ? parseInt(parts[4], 10) : 0;
                        dateObj = new Date(year, month, day, hour, minute);
                    }
                } else {
                    dateObj = new Date(dateValue);
                }
            } else {
                dateObj = new Date(dateValue);
            }
            
            if (isNaN(dateObj.getTime())) return dateValue;
            
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            
            return `${day}/${month}/${year} ${hours}:${minutes}`;
            
        } catch (error) {
            console.warn('Erro ao formatar data:', error);
            return dateValue;
        }
    }
    
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(new Uint8Array(e.target.result));
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // ===== UI/UX HELPERS =====
    
    function showProcessingIndicator(message) {
        // Criar ou mostrar indicador de processamento
        let indicator = document.getElementById('processing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'processing-indicator';
            indicator.className = 'processing-indicator';
            indicator.innerHTML = `
                <div class="processing-content">
                    <div class="spinner"></div>
                    <p id="processing-message">${message}</p>
                </div>
            `;
            document.body.appendChild(indicator);
        } else {
            document.getElementById('processing-message').textContent = message;
            indicator.style.display = 'flex';
        }
    }
    
    function hideProcessingIndicator() {
        const indicator = document.getElementById('processing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    function checkFilesReady() {
        if (odooData && backOfficeData) {
            processFilesBtn.disabled = false;
            processFilesBtn.textContent = 'Processar Arquivos ✅';
        }
    }

    // ===== EVENTO DE PROCESSAMENTO =====
    
    processFilesBtn.addEventListener('click', function() {
        if (!odooData || !backOfficeData) {
            alert('Por favor, carrega os ficheiros Odoo e Back Office primeiro!');
            return;
        }
        
        if (odooData.length === 0 && backOfficeData.length === 0) {
            alert('Não há dados únicos para comparar. Todos os registos já existem na base de dados.');
            return;
        }
        
        showProcessingIndicator('A comparar dados...');
        
        setTimeout(() => {
            try {
                // Chamar comparação
                if (window.compareOdooBackOffice) {
                    window.compareOdooBackOffice(odooData, backOfficeData);
                }
                
                // Mudar para aba de comparação
                const compareTab = document.querySelector('.nav-tab[data-tab="compare"]');
                if (compareTab && window.changeTab) {
                    window.changeTab(compareTab);
                }
                
                hideProcessingIndicator();
                
            } catch (error) {
                hideProcessingIndicator();
                console.error('Erro no processamento:', error);
                alert('Erro ao processar os ficheiros!');
            }
        }, 500);
    });

    // ===== EXPORTAR PARA USO GLOBAL =====
    
    window.fileProcessor = {
        odooData: () => odooData,
        backOfficeData: () => backOfficeData,
        caixaData: () => caixaData,
        setOdooData: (data) => { odooData = data; },
        setBackOfficeData: (data) => { backOfficeData = data; },
        setCaixaData: (data) => { 
            caixaData = data;
            console.log('🔄 Dados da Caixa atualizados:', caixaData?.length || 0);
        },
        normalizeLicensePlate,
        standardizeParkName,
        formatDate,
        checkForDuplicates,
        removeDuplicatesFromData,
        reprocessFiles: () => {
            // Função para reprocessar quando necessário
            if (odooData && backOfficeData) {
                window.compareOdooBackOffice(odooData, backOfficeData);
            }
        }
    };
    
    console.log('✅ FileProcessor integrado com normalização de marcas pronto!');
});
