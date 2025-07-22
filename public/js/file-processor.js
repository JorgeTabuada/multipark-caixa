// ===== FILE PROCESSOR INTEGRADO COM SUPABASE =====
// Substitui o fileProcessor.js original com integração completa

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 FileProcessor integrado carregado!');
    
    // Variáveis globais para armazenar os dados dos arquivos
    let odooData = null;
    let backOfficeData = null;
    let caixaData = null;

    // Referências aos elementos de upload de arquivos
    const odooFileInput = document.getElementById('odoo-file');
    const backofficeFileInput = document.getElementById('backoffice-file');
    const caixaFileInput = document.getElementById('caixa-file');
    
    // Botões de upload
    const odooUpload = document.getElementById('odoo-upload');
    const backofficeUpload = document.getElementById('backoffice-upload');
    const caixaUpload = document.getElementById('caixa-upload');
    
    // Informações dos arquivos
    const odooFileInfo = document.getElementById('odoo-file-info');
    const odooFilename = document.getElementById('odoo-filename');
    const backofficeFileInfo = document.getElementById('backoffice-file-info');
    const backofficeFilename = document.getElementById('backoffice-filename');
    const caixaFileInfo = document.getElementById('caixa-file-info');
    const caixaFilename = document.getElementById('caixa-filename');
    
    // Botão de processamento
    const processFilesBtn = document.getElementById('process-files-btn');
    
    // ===== CONFIGURAÇÃO DOS EVENTOS DE UPLOAD =====
    
    // Upload Odoo
    odooUpload.addEventListener('click', function() {
        odooFileInput.click();
    });
    
    odooFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            odooFilename.textContent = file.name;
            odooFileInfo.classList.remove('hidden');
            readExcelFile(file, 'odoo');
        }
    });
    
    // Upload Back Office  
    backofficeUpload.addEventListener('click', function() {
        backofficeFileInput.click();
    });
    
    backofficeFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            backofficeFilename.textContent = file.name;
            backofficeFileInfo.classList.remove('hidden');
            readExcelFile(file, 'backoffice');
        }
    });
    
    // Upload Caixa
    caixaUpload.addEventListener('click', function() {
        caixaFileInput.click();
    });
    
    caixaFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            caixaFilename.textContent = file.name;
            caixaFileInfo.classList.remove('hidden');
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
    
    // ===== PROCESSAMENTO ESPECÍFICO POR TIPO =====
    
    async function processOdooFile(jsonData, filename) {
        if (!isOdooFile(jsonData)) {
            alert("Este ficheiro não parece ser um export do Odoo. Verifica o formato!");
            return;
        }
        
        const transformedData = transformOdooData(jsonData);
        odooData = transformedData;
        
        // Salvar no Supabase se API disponível
        if (window.caixaAPI) {
            try {
                await window.caixaAPI.createImportBatch({ 
                    salesFilename: filename,
                    batchDate: new Date().toISOString().split('T')[0] 
                });
                await window.caixaAPI.importSalesOrders(transformedData);
                console.log('✅ Dados Odoo salvos no Supabase!');
            } catch (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
            }
        }
        
        checkFilesReady();
    }
    
    async function processBackOfficeFile(jsonData, filename) {
        backOfficeData = jsonData;
        
        // Salvar no Supabase se API disponível
        if (window.caixaAPI) {
            try {
                await window.caixaAPI.importDeliveries(jsonData);
                console.log('✅ Dados Back Office salvos no Supabase!');
            } catch (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
            }
        }
        
        checkFilesReady();
    }
    
    async function processCaixaFile(jsonData, filename) {
        caixaData = jsonData;
        
        // Salvar no Supabase se API disponível
        if (window.caixaAPI) {
            try {
                await window.caixaAPI.importCashRecords(jsonData);
                console.log('✅ Dados Caixa salvos no Supabase!');
            } catch (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
            }
        }
        
        // Auto-iniciar validação se dados disponíveis
        if (window.validator && caixaData) {
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
            .replace(/[\s\-\.\,\/\\\(\)\[\]\{\}\+\*\?\^\$\|]/g, '')
            .toLowerCase();
    }
    
    function standardizeParkName(parkName) {
        if (!parkName) return '';
        
        return String(parkName)
            .toLowerCase()
            .replace(/\s+(parking|estacionamento|park|parque)\b/g, '')
            .trim()
            .toUpperCase();
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
                    const parts = cleanDate.split(/[\/\s:]/);
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
            console.log('🔄 Dados da Caixa atualizados:', caixaData.length);
        },
        normalizeLicensePlate,
        standardizeParkName,
        formatDate,
        reprocessFiles: () => {
            // Função para reprocessar quando necessário
            if (odooData && backOfficeData) {
                window.compareOdooBackOffice(odooData, backOfficeData);
            }
        }
    };
    
    console.log('✅ FileProcessor integrado pronto!');
});