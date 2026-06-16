-- =====================================================================
-- Migration 0006 — Atribuição manual de pagamento -> reserva
-- O utilizador liga manualmente um pagamento (Viva/Stripe/Caixa) a uma
-- reserva. Esta atribuição SOBREPÕE o matching automático em todas as
-- vistas (Viva, reconciliação, métodos, pricing).
-- =====================================================================
CREATE TABLE IF NOT EXISTS staging.atribuicao (
  fonte        text NOT NULL,            -- 'viva' | 'stripe' | 'caixa'
  ref          text NOT NULL,            -- id do pagamento na fonte (transaction_id / charge / pi / licenseplate)
  multipark_id text,                      -- reserva atribuída (NULL = sem reserva / desligado)
  matricula    text,
  valor        numeric,
  metodo       text,
  nota         text,
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (fonte, ref)
);
CREATE INDEX IF NOT EXISTS ix_atrib_mp ON staging.atribuicao (multipark_id);
