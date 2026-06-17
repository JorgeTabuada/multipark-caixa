-- =====================================================================
-- Migration 0007 — Override manual de pagamento por reserva
-- Permite ao utilizador corrigir manualmente, por reserva:
--   - o método de pagamento (quando as fontes estão erradas/em falta)
--   - o estado de pagamento: pago / não pago / falta valor
--   - o valor pago/em falta (quando aplicável)
-- Aplica-se AO VIVO na reconciliação (não precisa de refresh da MV).
-- Tabela nova e independente — não toca nas tabelas partilhadas.
-- =====================================================================
CREATE TABLE IF NOT EXISTS staging.override (
  multipark_id text PRIMARY KEY,
  metodo       text,          -- método de pagamento corrigido (NULL = sem override)
  pago_estado  text,          -- NULL | 'pago' | 'nao_pago' | 'falta_valor'
  pago_valor   numeric,       -- valor pago confirmado, ou valor em falta (estado 'falta_valor')
  nota         text,
  updated_at   timestamptz DEFAULT now()
);
