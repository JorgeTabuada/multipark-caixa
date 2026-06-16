-- =====================================================================
-- Migration 0004 — Estado de revisão + notas por reserva (triagem)
-- Tabela onde o utilizador grava o estado de cada reserva e notas.
-- O estado efetivo = estado gravado, ou automático (ok se n_diferencas=0,
-- senão pendente) quando ainda não foi tocado.
-- =====================================================================
CREATE TABLE IF NOT EXISTS staging.revisao (
  multipark_id text PRIMARY KEY,
  estado       text,                       -- 'ok' | 'pendente' | 'problema' (NULL = automático)
  notas        text,
  updated_at   timestamptz DEFAULT now()
);
