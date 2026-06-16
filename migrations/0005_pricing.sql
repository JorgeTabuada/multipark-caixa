-- =====================================================================
-- Migration 0005 — Análise do Pricing (JSON)
-- O campo `pricings` (Backoffice e Caixa) é um array JSON de itens
-- {total, description, amountPaid, paymentMethod}. Esta view decompõe-o
-- por reserva (base = Backoffice, que tem o pricing mais completo),
-- soma por categoria, deteta multi-pagamento e problemas, e compara
-- a soma paga com a Caixa.
-- =====================================================================
DROP VIEW IF EXISTS staging.v_pricing;
DROP MATERIALIZED VIEW IF EXISTS staging.mv_pricing;
CREATE MATERIALIZED VIEW staging.mv_pricing AS
WITH bo AS (
  SELECT b.multiparkid, b.licenseplate, b.city, b.bookingprice, b.checkout,
         b.action, b.paymentintentid, b.paymentmethod,
         NULLIF(btrim(b.pricings), '')::jsonb AS pj
  FROM staging.reservas_backoffice b
  WHERE NULLIF(btrim(b.pricings), '') IS NOT NULL
    AND jsonb_typeof(NULLIF(btrim(b.pricings), '')::jsonb) = 'array'
    AND jsonb_array_length(NULLIF(btrim(b.pricings), '')::jsonb) > 0
)
SELECT
  bo.multiparkid           AS multipark_id,
  bo.licenseplate          AS matricula,
  bo.city                  AS cidade,
  bo.action                AS action_bo,
  bo.checkout              AS saida,
  bo.bookingprice          AS valor_reserva,
  bo.paymentmethod         AS metodo_reserva,
  bo.pj                    AS pricing_json,
  jsonb_array_length(bo.pj) AS n_itens,
  -- métodos de pagamento distintos no pricing
  (SELECT count(DISTINCT NULLIF(btrim(e->>'paymentMethod'), ''))
     FROM jsonb_array_elements(bo.pj) e
     WHERE NULLIF(btrim(e->>'paymentMethod'), '') IS NOT NULL) AS n_metodos,
  (SELECT string_agg(DISTINCT NULLIF(btrim(e->>'paymentMethod'), ''), ', ')
     FROM jsonb_array_elements(bo.pj) e
     WHERE NULLIF(btrim(e->>'paymentMethod'), '') IS NOT NULL) AS metodos,
  -- somas
  (SELECT coalesce(sum((e->>'total')::numeric), 0) FROM jsonb_array_elements(bo.pj) e)      AS soma_total,
  (SELECT coalesce(sum((e->>'amountPaid')::numeric), 0) FROM jsonb_array_elements(bo.pj) e) AS soma_paga,
  -- por categoria (description) — somam o EFETIVAMENTE PAGO (amountPaid), não o preço de tabela,
  -- para itens sem método/não pagos (amountPaid=0) não inflacionarem os totais
  (SELECT coalesce(sum((e->>'amountPaid')::numeric), 0) FROM jsonb_array_elements(bo.pj) e
     WHERE lower(e->>'description') LIKE '%valet%') AS v_valet,
  (SELECT coalesce(sum((e->>'amountPaid')::numeric), 0) FROM jsonb_array_elements(bo.pj) e
     WHERE lower(e->>'description') LIKE '%estacionamento%' OR lower(e->>'description') LIKE '%reserva%') AS v_estacionamento,
  (SELECT coalesce(sum((e->>'amountPaid')::numeric), 0) FROM jsonb_array_elements(bo.pj) e
     WHERE lower(e->>'description') LIKE '%entrega%') AS v_entrega,
  (SELECT coalesce(sum((e->>'amountPaid')::numeric), 0) FROM jsonb_array_elements(bo.pj) e
     WHERE lower(e->>'description') NOT LIKE '%valet%' AND lower(e->>'description') NOT LIKE '%estacionamento%'
       AND lower(e->>'description') NOT LIKE '%reserva%' AND lower(e->>'description') NOT LIKE '%entrega%') AS v_extras,
  -- itens sem método de pagamento
  (SELECT count(*) FROM jsonb_array_elements(bo.pj) e
     WHERE NULLIF(btrim(e->>'paymentMethod'), '') IS NULL)::int AS itens_sem_metodo,
  -- comparação com a Caixa (soma paga e métodos no pricing da caixa)
  cax.soma_paga_caixa,
  cax.metodos_caixa
FROM bo
LEFT JOIN LATERAL (
  SELECT
    (SELECT coalesce(sum((e->>'amountPaid')::numeric), 0)
       FROM jsonb_array_elements(NULLIF(btrim(cx.pricings), '')::jsonb) e) AS soma_paga_caixa,
    (SELECT string_agg(DISTINCT NULLIF(btrim(e->>'paymentMethod'), ''), ', ')
       FROM jsonb_array_elements(NULLIF(btrim(cx.pricings), '')::jsonb) e
       WHERE NULLIF(btrim(e->>'paymentMethod'), '') IS NOT NULL) AS metodos_caixa
  FROM staging.caixa cx
  WHERE NULLIF(btrim(cx.pricings), '') IS NOT NULL
    AND jsonb_typeof(NULLIF(btrim(cx.pricings), '')::jsonb) = 'array'
    AND ( (bo.paymentintentid ~ 'pi_' AND cx.paymentintentid = bo.paymentintentid)
          OR (cx.licenseplate = bo.licenseplate AND cx.checkout = bo.checkout) )
  ORDER BY cx.actiondate DESC NULLS LAST
  LIMIT 1
) cax ON true;

-- flags derivadas numa 2ª view (sobre a matriz) para legibilidade
CREATE OR REPLACE VIEW staging.v_pricing AS
SELECT p.*,
  (n_metodos > 1)                                              AS multi_pagamento,
  (abs(soma_paga - coalesce(valor_reserva, soma_paga)) > 0.01) AS pago_difere_reserva,
  (itens_sem_metodo > 0)                                       AS tem_metodo_vazio,
  (soma_paga_caixa IS NOT NULL AND abs(soma_paga - soma_paga_caixa) > 0.01) AS difere_caixa,
  -- item com valor anormalmente alto (erro de inserção; parking não passa de ~1000€)
  EXISTS (SELECT 1 FROM jsonb_array_elements(p.pricing_json) e WHERE (e->>'total')::numeric > 1000) AS valor_suspeito
FROM staging.mv_pricing p;

CREATE INDEX IF NOT EXISTS ix_mvp_mat ON staging.mv_pricing (matricula);
CREATE INDEX IF NOT EXISTS ix_mvp_nmet ON staging.mv_pricing (n_metodos);
CREATE INDEX IF NOT EXISTS ix_mvp_saida ON staging.mv_pricing (saida);
