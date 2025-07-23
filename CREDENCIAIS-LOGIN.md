# 🚨 CREDENCIAIS DE LOGIN CORRETAS

## 🔐 **UTILIZADORES DISPONÍVEIS**

O Supabase está **100% funcional**, mas tens de usar as credenciais corretas!

### **Utilizadores Existentes:**

**1. Administrador Principal:**
```
Email: jorgetabuada@airpark.pt
Password: (a password que definiste quando criaste a conta)
```

**2. Utilizador de Teste:**
```  
Email: teste@teste.pt
Password: (password definida quando foi criado)
```

## ⚠️ **PROBLEMA IDENTIFICADO**

**O erro 401 acontece porque:**
- ✅ Supabase está funcional
- ✅ Token está correto  
- ✅ Base de dados tem utilizadores
- ❌ **MAS** `admin@multipark.com` **NÃO EXISTE!**

## 🔧 **SOLUÇÕES**

### **Opção 1: Usar Credenciais Existentes**
Experimenta fazer login com `jorgetabuada@airpark.pt` ou `teste@teste.pt`

### **Opção 2: Criar Novos Utilizadores**
1. Vai ao **dashboard Supabase** → Authentication → Users
2. Clica em **"Add user"** 
3. Cria: `admin@multipark.com` com password `admin123`

### **Opção 3: Reset Password**
Se não te lembrares das passwords:
1. Na página de login, clica **"Esqueceu a password?"**
2. Introduce o email existente
3. Verifica o email para reset

## 🎯 **CONFIRMAÇÃO**

**Status do Supabase:** ✅ **100% FUNCIONAL**
- URL: https://uvcmgzhwiibjcygqsjrm.supabase.co ✅
- Token: Válido e correto ✅  
- Tabelas: Todas criadas com dados ✅
- RLS: Ativado em todas as tabelas ✅

**O único problema:** utilizador `admin@multipark.com` não existe na base de dados!

## 🚀 **TESTE RÁPIDO**

**Experimenta agora:**
1. Vai a: https://multipark-caixa.vercel.app
2. **Email:** `jorgetabuada@airpark.pt`
3. **Password:** (a tua password original)

**Resultado esperado:** ✅ Login deve funcionar!

---

**Atualização**: 23/07/2025 16:05  
**Status**: ✅ Problema identificado - usar credenciais corretas
