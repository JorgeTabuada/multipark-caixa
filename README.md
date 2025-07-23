# 🚗 Caixa Multipark

Sistema web completo para gestão e validação de caixa de entregas da Multipark, integrando dados do Odoo, registos de caixa e entregas do back office.

## 🚀 **Status do Projeto**

✅ **TOTALMENTE FUNCIONAL** - Todos os problemas críticos foram corrigidos!

- ✅ Token Supabase configurado e funcional
- ✅ Sistema de autenticação operacional  
- ✅ Interface responsiva e moderna
- ✅ Processamento de ficheiros Excel
- ✅ Dashboard com estatísticas em tempo real
- ✅ Sistema de validação robusto

## 📋 **Funcionalidades**

### 🔐 **Autenticação Segura**
- Sistema de login integrado com Supabase
- Gestão de sessões e permissões
- Utilizadores de teste pré-configurados

### 📊 **Importação e Processamento**
- Upload de ficheiros Excel (Odoo, Back Office, Caixa)
- Validação automática de dados
- Processamento em tempo real com feedback visual

### 🔍 **Comparação e Validação**
- Comparação automática Odoo vs Back Office
- Identificação de discrepâncias e registos ausentes
- Sistema de resolução manual de conflitos
- Validação cruzada com dados de caixa

### 📈 **Dashboard Interativo**
- Estatísticas em tempo real
- Gráficos de entregas por método de pagamento
- Análise por condutor e marca
- Comparativo entre dados previstos e efetivos

### 📤 **Exportação**
- Exportação para Excel com dados validados
- Histórico de exportações
- Relatórios personalizados

## 🛠️ **Tecnologias**

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Supabase (PostgreSQL + Auth + Storage)  
- **Deployment**: Vercel com CI/CD automático
- **Processamento**: SheetJS para ficheiros Excel
- **Gráficos**: Chart.js para visualizações
- **UI**: Font Awesome + Google Fonts

## 🚀 **Como Usar**

### **1. Acesso**
```
URL: https://multipark-caixa.vercel.app
```

### **2. Login** 
Utilizadores de teste disponíveis:
- **admin@multipark.com** / admin123
- **user@multipark.com** / user123  
- **manager@multipark.com** / manager123

### **3. Fluxo de Trabalho**
1. **Importar** ficheiros Excel (Odoo + Back Office)
2. **Comparar** dados e resolver discrepâncias
3. **Validar** com ficheiro de caixa
4. **Analisar** resultados no dashboard
5. **Exportar** relatório final

## 📁 **Estrutura do Projeto**

```
caixa-multipark/
├── index.html              # Aplicação principal
├── login.html              # Página de autenticação  
├── css/
│   ├── styles.css          # Estilos principais
│   └── additional-styles.css # Estilos complementares
├── js/
│   ├── config.js           # Configurações globais
│   ├── error-handler.js    # Sistema de erros
│   ├── supabase-integration.js # API Supabase
│   ├── app.js              # Aplicação principal
│   ├── file-processor.js   # Processamento Excel
│   ├── validation-system.js # Sistema validação
│   ├── dashboard.js        # Dashboard e gráficos
│   └── notifications.js    # Sistema notificações
├── uploads/                # Ficheiros de exemplo
├── docs/                   # Documentação
├── package.json            # Configuração NPM
├── vercel.json            # Configuração deployment
└── README.md              # Este ficheiro
```

## 🔧 **Configuração Local**

### **Pré-requisitos**
- Node.js 16+ 
- NPM ou Yarn

### **Instalação**
```bash
# Clonar repositório
git clone https://github.com/JorgeTabuada/multipark-caixa.git
cd multipark-caixa

# Instalar dependências
npm install

# Servir localmente  
npm run dev
# ou
npm start
```

### **Variáveis de Ambiente**
O projeto está configurado para funcionar imediatamente. Para ambientes personalizados:

```javascript
// js/supabase-integration.js
const SUPABASE_URL = 'your_supabase_url';
const SUPABASE_ANON_KEY = 'your_anon_key';
```

## 🗄️ **Base de Dados**

### **Tabelas Supabase**
- `users` - Gestão de utilizadores
- `import_batches` - Controlo de importações  
- `sales_orders` - Dados do Odoo
- `deliveries` - Entregas do back office
- `cash_records` - Registos de caixa
- `comparisons` - Resultados de comparação
- `validations` - Validações manuais
- `exports` - Histórico de exportações

### **Row Level Security (RLS)**
- Todas as tabelas têm RLS ativado
- Utilizadores só acedem aos seus dados
- Logs de auditoria para todas as operações

## 📊 **Tipos de Ficheiro Suportados**

### **Excel (.xlsx, .xls)**
- **Odoo Sales Orders**: Encomendas e preços de reserva
- **Back Office Deliveries**: Entregas e alocações  
- **Caixa Records**: Registos de pagamentos

### **Formato Esperado**
Ficheiros devem conter colunas padrão:
- Matrícula, Preço, Marca, Condutor, Método Pagamento, etc.

## 🔐 **Segurança**

- Autenticação obrigatória para todas as operações
- Tokens JWT para sessões seguras
- Validação de dados no frontend e backend
- Proteção contra XSS e CSRF
- Headers de segurança configurados

## 📱 **Compatibilidade**

### **Browsers Suportados**
- ✅ Chrome 90+
- ✅ Firefox 88+  
- ✅ Safari 14+
- ✅ Edge 90+

### **Dispositivos**
- ✅ Desktop (recomendado)
- ✅ Tablet 
- ✅ Mobile (funcional)

## 🐛 **Resolução de Problemas**

### **Erro de Login**
- Verificar credenciais
- Limpar cache do browser
- Verificar conexão à internet

### **Erro de Upload**
- Ficheiro deve ser .xlsx ou .xls
- Tamanho máximo: 10MB
- Verificar formato das colunas

### **Dados não Aparecem**
- Aguardar processamento
- Refrescar página (F5)
- Verificar console para erros

## 📞 **Suporte**

- **Email**: jorgetabuada@airpark.pt
- **Empresa**: Multipark
- **Issues**: [GitHub Issues](https://github.com/JorgeTabuada/multipark-caixa/issues)

## 📄 **Licença**

Este projeto é propriedade da **Multipark**. Todos os direitos reservados.

## 🏆 **Créditos**

- **Desenvolvimento**: Jorge Tabuada
- **Design**: Multipark Team  
- **QA**: Multipark Operations

## 📈 **Changelog**

### **v1.0.0** - 23/07/2025
- ✅ Sistema completo funcional
- ✅ Correção de token Supabase  
- ✅ Interface moderna e responsiva
- ✅ Sistema de erros robusto
- ✅ Dashboard com estatísticas
- ✅ Deployment automático no Vercel

---

**🚀 Projeto pronto para produção!** 

Para começar a usar, acede a: **https://multipark-caixa.vercel.app**
