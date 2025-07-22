# Caixa Multipark

Sistema de gestão e validação de dados para Multipark, integrando informações do Odoo, registos de caixa e entregas do back office.

## 🚀 Funcionalidades

- **Importação de Dados**: Upload e processamento de ficheiros Excel do Odoo, registos de caixa e entregas
- **Validação Automática**: Sistema de comparação e identificação de discrepâncias
- **Dashboard Interativo**: Visualização de estatísticas e métricas em tempo real
- **Autenticação Segura**: Sistema de login integrado com Supabase
- **Interface Responsiva**: Compatível com desktop e dispositivos móveis

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel
- **Processamento**: JavaScript para análise de ficheiros Excel

## 📋 Estrutura do Projeto

```
caixa-multipark/
├── index.html              # Página principal da aplicação
├── login.html              # Página de autenticação
├── css/
│   ├── styles.css          # Estilos principais
│   └── additional-styles.css # Estilos adicionais
├── js/
│   ├── app.js              # Aplicação principal
│   ├── supabase-integration.js # Integração com Supabase
│   ├── file-processor.js   # Processamento de ficheiros
│   ├── validation-system.js # Sistema de validação
│   ├── dashboard.js        # Dashboard e estatísticas
│   └── notifications.js    # Sistema de notificações
├── uploads/                # Ficheiros de teste
└── docs/                   # Documentação
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um ficheiro `.env` ou configure as seguintes variáveis:

```javascript
const SUPABASE_URL = 'https://uvcmgzhwiibjcygqsjrm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Base de Dados

O projeto utiliza as seguintes tabelas no Supabase:

- `users` - Gestão de utilizadores
- `import_batches` - Controlo de importações
- `sales_orders` - Dados do Odoo
- `cash_records` - Registos de caixa
- `deliveries` - Entregas do back office
- `comparisons` - Comparações e discrepâncias
- `validations` - Sistema de validação

## 🚀 Deployment

### Vercel

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Local

1. Clone o repositório
2. Abra `index.html` num servidor local
3. Configure as credenciais do Supabase

## 📊 Fluxo de Trabalho

1. **Login**: Autenticação via Supabase
2. **Import**: Upload de ficheiros Excel (Odoo, Caixa, Entregas)
3. **Process**: Processamento automático e validação
4. **Compare**: Identificação de discrepâncias
5. **Validate**: Resolução manual de conflitos
6. **Dashboard**: Visualização de resultados

## 🔐 Segurança

- Autenticação obrigatória para todas as operações
- Row Level Security (RLS) ativado em todas as tabelas
- Validação de dados no frontend e backend
- Logs de auditoria para todas as ações

## 📱 Compatibilidade

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Dispositivos móveis (iOS/Android)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para a sua feature
3. Commit as suas alterações
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da Multipark. Todos os direitos reservados.

## 📞 Suporte

Para suporte técnico, contacte: jorgetabuada@airpark.pt

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025

