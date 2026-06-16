-- =====================================================================
-- Migration 0003 — Conciliação Stripe -> Reserva
-- Para CADA pagamento Stripe (tem paymentintent_id = chave direta) liga a
-- reserva nas várias bases (Multipark / Backoffice / Caixa) por pi e
-- verifica se o VALOR do Stripe bate com o valor de cada base que a tenha.
-- =====================================================================
CREATE INDEX IF NOT EXISTS ix_bo_pi ON staging.reservas_backoffice (paymentintentid);

DROP MATERIALIZED VIEW IF EXISTS staging.mv_stripe_reservas;
CREATE MATERIALIZED VIEW staging.mv_stripe_reservas AS
WITH j AS (
  SELECT
    s.id                  AS charge_id,
    s.paymentintent_id    AS pi,
    s.created_date_utc    AS stripe_data,
    s.amount              AS stripe_amount,
    s.amount_refunded     AS stripe_reembolso,
    s.status              AS stripe_status,
    s.payment_source_type AS stripe_tipo,
    s.customer_email      AS stripe_email,
    s.description         AS stripe_desc,
    m.id  AS mp_id, m.id_transacao AS pi_mp, m.matricula AS mp_matricula, m.nome_do_cliente AS mp_cliente,
    m.cidade_do_parque AS cidade, m.estado AS estado_mp, m.data_hora_saida AS saida_mp,
    m.preco_total AS valor_mp, m.metodo_pagamento AS metodo_mp,
    b.rid AS bo_id, b.licenseplate AS bo_matricula, b.bookingprice AS valor_bo, b.action AS action_bo,
    c.licenseplate AS caixa_matricula, c.totalgeral AS valor_caixa, c.totalpaid AS pago_caixa,
    c.cid AS caixa_present
  FROM staging.stripe s
  LEFT JOIN LATERAL (
    SELECT m0.* FROM staging.reservas_multipark m0
    WHERE m0.id_transacao = s.paymentintent_id
    ORDER BY m0.ultima_atualizacao DESC NULLS LAST LIMIT 1) m ON true
  LEFT JOIN LATERAL (
    SELECT b0.licenseplate, b0.bookingprice, b0.action, b0.paymentintentid AS rid
    FROM staging.reservas_backoffice b0
    WHERE b0.paymentintentid = s.paymentintent_id
    ORDER BY b0.actiondate DESC NULLS LAST LIMIT 1) b ON true
  LEFT JOIN LATERAL (
    SELECT c0.licenseplate, c0.totalgeral, c0.totalpaid, c0.paymentintentid AS cid
    FROM staging.caixa c0
    WHERE c0.paymentintentid = s.paymentintent_id
    ORDER BY c0.actiondate DESC NULLS LAST LIMIT 1) c ON true
),
s2 AS (
  SELECT j.*,
    ((mp_id IS NOT NULL)::int + (bo_id IS NOT NULL)::int + (caixa_present IS NOT NULL)::int) AS n_bases,
    greatest(
      CASE WHEN valor_mp    IS NOT NULL THEN abs((stripe_amount)::numeric - (valor_mp)::numeric) END,
      CASE WHEN valor_bo    IS NOT NULL THEN abs((stripe_amount)::numeric - (valor_bo)::numeric) END,
      CASE WHEN valor_caixa IS NOT NULL THEN abs((stripe_amount)::numeric - (valor_caixa)::numeric) END
    ) AS dif_max
  FROM j
)
SELECT
  charge_id, pi, stripe_data, stripe_amount, stripe_reembolso, stripe_status, stripe_tipo,
  stripe_email, stripe_desc,
  mp_id, mp_matricula, mp_cliente, cidade, estado_mp, saida_mp, valor_mp, metodo_mp,
  bo_matricula, valor_bo, action_bo, caixa_matricula, valor_caixa, pago_caixa,
  coalesce(mp_matricula, bo_matricula, caixa_matricula) AS matricula,
  -- payment intents registados em cada base (ligados ao charge do Stripe)
  pi_mp, bo_id AS pi_bo, caixa_present AS pi_caixa,
  concat_ws(', ',
    CASE WHEN pi_mp IS NOT NULL THEN 'Multipark' END,
    CASE WHEN bo_id IS NOT NULL THEN 'Backoffice' END,
    CASE WHEN caixa_present IS NOT NULL THEN 'Caixa' END) AS pi_bases,
  n_bases,
  round(CASE WHEN valor_mp    IS NOT NULL THEN (stripe_amount)::numeric - (valor_mp)::numeric    END, 2) AS dif_mp,
  round(CASE WHEN valor_bo    IS NOT NULL THEN (stripe_amount)::numeric - (valor_bo)::numeric    END, 2) AS dif_bo,
  round(CASE WHEN valor_caixa IS NOT NULL THEN (stripe_amount)::numeric - (valor_caixa)::numeric END, 2) AS dif_caixa,
  round(dif_max, 2) AS dif_max,
  CASE WHEN n_bases = 0 THEN 'sem reserva'
       WHEN dif_max <= 0.01 THEN 'valor certo'
       ELSE 'valor errado' END AS valor_status,
  (n_bases > 0) AS tem_reserva
FROM s2;

CREATE UNIQUE INDEX IF NOT EXISTS ix_msr_charge ON staging.mv_stripe_reservas (charge_id);
CREATE INDEX IF NOT EXISTS ix_msr_status ON staging.mv_stripe_reservas (valor_status);
CREATE INDEX IF NOT EXISTS ix_msr_data ON staging.mv_stripe_reservas (stripe_data);
CREATE INDEX IF NOT EXISTS ix_msr_mat ON staging.mv_stripe_reservas (matricula);
