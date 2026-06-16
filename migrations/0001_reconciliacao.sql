-- =====================================================================
-- Migration 0001 — Reconciliação Multipark (GERADA por _gen.py)
-- View "wide" (1 linha por reserva) que compara TODOS os campos com
-- equivalente em >=2 fontes. NÃO cria tabelas (staging já existe).
-- =====================================================================
CREATE INDEX IF NOT EXISTS ix_bo_mpid     ON staging.reservas_backoffice (multiparkid);
CREATE INDEX IF NOT EXISTS ix_caixa_pi    ON staging.caixa (paymentintentid);
CREATE INDEX IF NOT EXISTS ix_caixa_lp_co ON staging.caixa (licenseplate, checkout);
CREATE INDEX IF NOT EXISTS ix_caixa_action ON staging.caixa (actiondate);
CREATE INDEX IF NOT EXISTS ix_stripe_pi   ON staging.stripe (paymentintent_id);
CREATE INDEX IF NOT EXISTS ix_est_mat_de  ON staging.estatisticas_caixa (matricula, data_entrega);
CREATE INDEX IF NOT EXISTS ix_viva_dh     ON staging.viva (data_hora);
CREATE INDEX IF NOT EXISTS ix_mp_pi       ON staging.reservas_multipark (id_transacao);

DROP MATERIALIZED VIEW IF EXISTS staging.mv_reconciliacao_wide;
DROP VIEW IF EXISTS staging.v_reconciliacao_wide;
CREATE VIEW staging.v_reconciliacao_wide AS
WITH base AS (
  SELECT
    m.id AS multipark_id,
    m.cidade_do_parque AS cidade,
    m.estado AS estado_reserva,
    m.nome_do_parque AS parque,
    m.matricula AS matricula_mp,
    b.licenseplate AS matricula_bo,
    c.licenseplate AS matricula_caixa,
    e.matricula AS matricula_est,
    m.email_do_cliente AS email_mp,
    b.email AS email_bo,
    c.email AS email_caixa,
    s.customer_email AS email_stripe,
    v.e_mail AS email_viva,
    b.phonenumber AS telefone_bo,
    s.customer_phone AS telefone_stripe,
    v.phone AS telefone_viva,
    btrim(concat_ws(' ', m.nome_do_cliente, m.apelido_do_cliente)) AS cliente_mp,
    b.fullname AS cliente_bo,
    e.cliente AS cliente_est,
    s.customer_description AS cliente_stripe,
    m.id_transacao AS pi_mp,
    b.paymentintentid AS pi_bo,
    c.paymentintentid AS pi_caixa,
    s.paymentintent_id AS pi_stripe,
    m.data_hora_entrada AS entrada_mp,
    b.checkin AS entrada_bo,
    c.checkin AS entrada_caixa,
    m.data_hora_saida AS saida_mp,
    b.checkout AS saida_bo,
    c.checkout AS saida_caixa,
    e.data_entrega AS saida_est,
    b.bookingdate AS bookingdate_bo,
    c.bookingdate AS bookingdate_caixa,
    m.preco_total AS valor_mp,
    b.bookingprice AS valor_bo,
    c.totalgeral AS valor_caixa,
    e.total_geral AS valor_est,
    m.preco_original AS preco_original_mp,
    e.preco_original AS preco_original_est,
    b.priceondelivery AS price_on_delivery_bo,
    c.priceondelivery AS price_on_delivery_caixa,
    m.preco_entrega AS valet_mp,
    b.deliveryprice AS valet_bo,
    b.correctedprice AS preco_corrigido_bo,
    c.correctedprice AS preco_corrigido_caixa,
    b.correction AS correcao_bo,
    c.correction AS correcao_caixa,
    c.totalpaid AS pago_caixa,
    e.total_pago AS pago_est,
    s.amount AS pago_stripe,
    v.amount AS pago_viva,
    c.totallefttopay AS por_pagar_caixa,
    e.por_receber AS por_pagar_est,
    m.metodo_pagamento AS metodo_mp,
    b.paymentmethod AS metodo_bo,
    c.paymentmethod AS metodo_caixa,
    e.metodo_pagamento AS metodo_est,
    b.hasonlinepayment AS hasonline_bo,
    c.hasonlinepayment AS hasonline_caixa,
    m.external_campaign AS campanha_mp,
    b.campaign AS campanha_bo,
    c.campaign AS campanha_caixa,
    b.campaignpay AS campaignpay_bo,
    c.campaignpay AS campaignpay_caixa,
    b.action AS action_bo,
    c.action AS action_caixa,
    b.actiondate AS actiondate_bo,
    c.actiondate AS actiondate_caixa,
    b.actionuser AS actionuser_bo,
    c.actionuser AS actionuser_caixa,
    b.validated AS validated_bo,
    c.validated AS validated_caixa,
    b.validatedby AS validatedby_bo,
    c.validatedby AS validatedby_caixa,
    b.validateddate AS validateddate_bo,
    c.validateddate AS validateddate_caixa,
    b.drivervalidated AS drivervalidated_bo,
    c.drivervalidated AS drivervalidated_caixa,
    b.drivervalidatedby AS drivervalidatedby_bo,
    c.drivervalidatedby AS drivervalidatedby_caixa,
    b.drivervalidateddate AS drivervalidateddate_bo,
    c.drivervalidateddate AS drivervalidateddate_caixa,
    b.closedbooking AS closedbooking_bo,
    c.closedbooking AS closedbooking_caixa,
    b.closedby AS closedby_bo,
    c.closedby AS closedby_caixa,
    b.closeddate AS closeddate_bo,
    c.closeddate AS closeddate_caixa,
    b.condutorrecolha AS condutorrecolha_bo,
    c.condutorrecolha AS condutorrecolha_caixa,
    b.condutorentrega AS condutorentrega_bo,
    c.condutorentrega AS condutorentrega_caixa,
    b.condutormovimentacao AS condutormov_bo,
    c.condutormovimentacao AS condutormov_caixa,
    b.ocorrence AS ocorrence_bo,
    c.ocorrence AS ocorrence_caixa,
    b.ocorrencetype AS ocorrencetype_bo,
    c.ocorrencetype AS ocorrencetype_caixa,
    b.ocorrenceremarks AS ocorrenceremarks_bo,
    c.ocorrenceremarks AS ocorrenceremarks_caixa,
    b.bookingremarks AS bookingremarks_bo,
    c.bookingremarks AS bookingremarks_caixa,
    b.remarks AS remarks_bo,
    c.remarks AS remarks_caixa,
    b.credit AS credit_bo,
    c.credit AS credit_caixa,
    b.pricings AS pricings_bo,
    c.pricings AS pricings_caixa,
    b.idclient AS idclient_bo,
    c.idclient AS idclient_caixa,
    s.status AS statuspgto_stripe,
    v.status AS statuspgto_viva,
    s.payment_source_type AS tipo_stripe,
    s.amount_refunded AS reembolso_stripe,
    v.card_type AS tipo_viva,
    c.n_caixa, s.n_stripe, v.n_viva,
    m._raw AS raw_mp, b._raw AS raw_bo, c.raw AS raw_caixa,
    s.raw AS raw_stripe, e._raw AS raw_est, v.raw AS raw_viva
  FROM staging.reservas_multipark m
  LEFT JOIN staging.reservas_backoffice b ON b.multiparkid = m.id
  LEFT JOIN LATERAL (
    SELECT c2.*, c2._raw AS raw, count(*) OVER () AS n_caixa
    FROM staging.caixa c2
    WHERE c2.paymentintentid = m.id_transacao
       OR (c2.licenseplate = m.matricula AND c2.checkout = m.data_hora_saida)
    ORDER BY c2.actiondate DESC NULLS LAST LIMIT 1) c ON true
  LEFT JOIN LATERAL (
    SELECT s2.*, s2._raw AS raw, count(*) OVER () AS n_stripe
    FROM staging.stripe s2 WHERE s2.paymentintent_id = m.id_transacao
    ORDER BY s2.created_date_utc DESC NULLS LAST LIMIT 1) s ON true
  LEFT JOIN LATERAL (
    SELECT e2.* FROM staging.estatisticas_caixa e2
    WHERE e2.matricula = m.matricula AND e2.data_entrega = m.data_hora_saida LIMIT 1) e ON true
  LEFT JOIN LATERAL (
    SELECT v2.*, v2._raw AS raw, count(*) OVER () AS n_viva
    FROM staging.viva v2
    WHERE abs((v2.amount)::numeric - (m.preco_total)::numeric) <= 0.01
      AND v2.data_hora IS NOT NULL AND m.data_hora_saida IS NOT NULL
      AND abs(extract(epoch FROM (v2.data_hora - m.data_hora_saida))) <= 3600
    ORDER BY abs(extract(epoch FROM (v2.data_hora - m.data_hora_saida))) ASC LIMIT 1) v ON true
),
calc AS (
  SELECT base.*,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(matricula_caixa::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(matricula_est::text)),'\s+','','g'),''))) THEN true ELSE false END AS matricula_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_caixa::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(email_stripe::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(email_viva::text)),'\s+','','g'),''))) THEN true ELSE false END AS email_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(telefone_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(telefone_stripe::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(telefone_viva::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(telefone_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(telefone_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(telefone_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(telefone_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(telefone_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(telefone_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(telefone_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(telefone_viva::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(telefone_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(telefone_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(telefone_stripe::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(telefone_viva::text)),'\s+','','g'),''))) THEN true ELSE false END AS telefone_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(cliente_est::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(cliente_stripe::text)),'\s+','','g'),''))) THEN true ELSE false END AS cliente_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pi_caixa::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pi_stripe::text)),'\s+','','g'),''))) THEN true ELSE false END AS pi_bate,
    CASE WHEN ((entrada_mp IS NOT NULL)::int + (entrada_bo IS NOT NULL)::int + (entrada_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((entrada_mp IS NULL OR entrada_bo IS NULL OR entrada_mp = entrada_bo) AND (entrada_mp IS NULL OR entrada_caixa IS NULL OR entrada_mp = entrada_caixa) AND (entrada_bo IS NULL OR entrada_caixa IS NULL OR entrada_bo = entrada_caixa)) THEN true ELSE false END AS entrada_bate,
    CASE WHEN ((saida_mp IS NOT NULL)::int + (saida_bo IS NOT NULL)::int + (saida_caixa IS NOT NULL)::int + (saida_est IS NOT NULL)::int) = 0 THEN NULL WHEN ((saida_mp IS NULL OR saida_bo IS NULL OR saida_mp = saida_bo) AND (saida_mp IS NULL OR saida_caixa IS NULL OR saida_mp = saida_caixa) AND (saida_mp IS NULL OR saida_est IS NULL OR saida_mp = saida_est) AND (saida_bo IS NULL OR saida_caixa IS NULL OR saida_bo = saida_caixa) AND (saida_bo IS NULL OR saida_est IS NULL OR saida_bo = saida_est) AND (saida_caixa IS NULL OR saida_est IS NULL OR saida_caixa = saida_est)) THEN true ELSE false END AS saida_bate,
    CASE WHEN ((bookingdate_bo IS NOT NULL)::int + (bookingdate_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((bookingdate_bo IS NULL OR bookingdate_caixa IS NULL OR bookingdate_bo = bookingdate_caixa)) THEN true ELSE false END AS bookingdate_bate,
    CASE WHEN ((valor_mp IS NOT NULL)::int + (valor_bo IS NOT NULL)::int + (valor_caixa IS NOT NULL)::int + (valor_est IS NOT NULL)::int) = 0 THEN NULL WHEN ((valor_mp IS NULL OR valor_bo IS NULL OR abs((valor_mp)::numeric-(valor_bo)::numeric)<=0.01) AND (valor_mp IS NULL OR valor_caixa IS NULL OR abs((valor_mp)::numeric-(valor_caixa)::numeric)<=0.01) AND (valor_mp IS NULL OR valor_est IS NULL OR abs((valor_mp)::numeric-(valor_est)::numeric)<=0.01) AND (valor_bo IS NULL OR valor_caixa IS NULL OR abs((valor_bo)::numeric-(valor_caixa)::numeric)<=0.01) AND (valor_bo IS NULL OR valor_est IS NULL OR abs((valor_bo)::numeric-(valor_est)::numeric)<=0.01) AND (valor_caixa IS NULL OR valor_est IS NULL OR abs((valor_caixa)::numeric-(valor_est)::numeric)<=0.01)) THEN true ELSE false END AS valor_bate,
    CASE WHEN ((preco_original_mp IS NOT NULL)::int + (preco_original_est IS NOT NULL)::int) = 0 THEN NULL WHEN ((preco_original_mp IS NULL OR preco_original_est IS NULL OR abs((preco_original_mp)::numeric-(preco_original_est)::numeric)<=0.01)) THEN true ELSE false END AS preco_original_bate,
    CASE WHEN ((price_on_delivery_bo IS NOT NULL)::int + (price_on_delivery_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((price_on_delivery_bo IS NULL OR price_on_delivery_caixa IS NULL OR abs((price_on_delivery_bo)::numeric-(price_on_delivery_caixa)::numeric)<=0.01)) THEN true ELSE false END AS price_on_delivery_bate,
    CASE WHEN ((valet_mp IS NOT NULL)::int + (valet_bo IS NOT NULL)::int) = 0 THEN NULL WHEN ((valet_mp IS NULL OR valet_bo IS NULL OR abs((valet_mp)::numeric-(valet_bo)::numeric)<=0.01)) THEN true ELSE false END AS valet_bate,
    CASE WHEN ((preco_corrigido_bo IS NOT NULL)::int + (preco_corrigido_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((preco_corrigido_bo IS NULL OR preco_corrigido_caixa IS NULL OR abs((preco_corrigido_bo)::numeric-(preco_corrigido_caixa)::numeric)<=0.01)) THEN true ELSE false END AS preco_corrigido_bate,
    CASE WHEN ((correcao_bo IS NOT NULL)::int + (correcao_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((correcao_bo IS NULL OR correcao_caixa IS NULL OR abs((correcao_bo)::numeric-(correcao_caixa)::numeric)<=0.01)) THEN true ELSE false END AS correcao_bate,
    CASE WHEN ((pago_caixa IS NOT NULL)::int + (pago_est IS NOT NULL)::int + (pago_stripe IS NOT NULL)::int + (pago_viva IS NOT NULL)::int) = 0 THEN NULL WHEN ((pago_caixa IS NULL OR pago_est IS NULL OR abs((pago_caixa)::numeric-(pago_est)::numeric)<=0.01) AND (pago_caixa IS NULL OR pago_stripe IS NULL OR abs((pago_caixa)::numeric-(pago_stripe)::numeric)<=0.01) AND (pago_caixa IS NULL OR pago_viva IS NULL OR abs((pago_caixa)::numeric-(pago_viva)::numeric)<=0.01) AND (pago_est IS NULL OR pago_stripe IS NULL OR abs((pago_est)::numeric-(pago_stripe)::numeric)<=0.01) AND (pago_est IS NULL OR pago_viva IS NULL OR abs((pago_est)::numeric-(pago_viva)::numeric)<=0.01) AND (pago_stripe IS NULL OR pago_viva IS NULL OR abs((pago_stripe)::numeric-(pago_viva)::numeric)<=0.01)) THEN true ELSE false END AS pago_bate,
    CASE WHEN ((por_pagar_caixa IS NOT NULL)::int + (por_pagar_est IS NOT NULL)::int) = 0 THEN NULL WHEN ((por_pagar_caixa IS NULL OR por_pagar_est IS NULL OR abs((por_pagar_caixa)::numeric-(por_pagar_est)::numeric)<=0.01)) THEN true ELSE false END AS por_pagar_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(metodo_caixa::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(metodo_est::text)),'\s+','','g'),''))) THEN true ELSE false END AS metodo_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(hasonline_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(hasonline_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(hasonline_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(hasonline_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(hasonline_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(hasonline_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS hasonline_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(campanha_mp::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(campanha_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(campanha_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(campanha_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(campanha_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(campanha_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(campanha_bo::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(campanha_mp::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(campanha_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(campanha_mp::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(campanha_caixa::text)),'\s+','','g'),'')) AND (nullif(regexp_replace(lower(btrim(campanha_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(campanha_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(campanha_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(campanha_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS campanha_bate,
    CASE WHEN (((CASE WHEN lower(btrim(campaignpay_bo)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_bo)) IN ('false','f','0','nao','não','no') THEN false END) IS NOT NULL)::int + ((CASE WHEN lower(btrim(campaignpay_caixa)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_caixa)) IN ('false','f','0','nao','não','no') THEN false END) IS NOT NULL)::int) = 0 THEN NULL WHEN (((CASE WHEN lower(btrim(campaignpay_bo)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_bo)) IN ('false','f','0','nao','não','no') THEN false END) IS NULL OR (CASE WHEN lower(btrim(campaignpay_caixa)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_caixa)) IN ('false','f','0','nao','não','no') THEN false END) IS NULL OR (CASE WHEN lower(btrim(campaignpay_bo)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_bo)) IN ('false','f','0','nao','não','no') THEN false END) = (CASE WHEN lower(btrim(campaignpay_caixa)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_caixa)) IN ('false','f','0','nao','não','no') THEN false END))) THEN true ELSE false END AS campaignpay_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(action_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(action_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(action_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(action_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(action_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(action_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS action_bate,
    CASE WHEN ((actiondate_bo IS NOT NULL)::int + (actiondate_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((actiondate_bo IS NULL OR actiondate_caixa IS NULL OR actiondate_bo = actiondate_caixa)) THEN true ELSE false END AS actiondate_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(actionuser_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(actionuser_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(actionuser_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(actionuser_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(actionuser_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(actionuser_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS actionuser_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(validated_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(validated_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(validated_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(validated_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(validated_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(validated_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS validated_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(validatedby_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(validatedby_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(validatedby_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(validatedby_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(validatedby_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(validatedby_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS validatedby_bate,
    CASE WHEN ((validateddate_bo IS NOT NULL)::int + (validateddate_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((validateddate_bo IS NULL OR validateddate_caixa IS NULL OR validateddate_bo = validateddate_caixa)) THEN true ELSE false END AS validateddate_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(drivervalidated_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(drivervalidated_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(drivervalidated_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(drivervalidated_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(drivervalidated_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(drivervalidated_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS drivervalidated_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(drivervalidatedby_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(drivervalidatedby_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(drivervalidatedby_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(drivervalidatedby_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(drivervalidatedby_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(drivervalidatedby_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS drivervalidatedby_bate,
    CASE WHEN ((drivervalidateddate_bo IS NOT NULL)::int + (drivervalidateddate_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((drivervalidateddate_bo IS NULL OR drivervalidateddate_caixa IS NULL OR drivervalidateddate_bo = drivervalidateddate_caixa)) THEN true ELSE false END AS drivervalidateddate_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(closedbooking_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(closedbooking_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(closedbooking_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(closedbooking_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(closedbooking_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(closedbooking_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS closedbooking_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(closedby_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(closedby_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(closedby_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(closedby_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(closedby_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(closedby_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS closedby_bate,
    CASE WHEN ((closeddate_bo IS NOT NULL)::int + (closeddate_caixa IS NOT NULL)::int) = 0 THEN NULL WHEN ((closeddate_bo IS NULL OR closeddate_caixa IS NULL OR closeddate_bo = closeddate_caixa)) THEN true ELSE false END AS closeddate_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(condutorrecolha_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(condutorrecolha_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(condutorrecolha_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(condutorrecolha_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(condutorrecolha_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(condutorrecolha_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS condutorrecolha_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(condutorentrega_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(condutorentrega_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(condutorentrega_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(condutorentrega_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(condutorentrega_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(condutorentrega_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS condutorentrega_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(condutormov_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(condutormov_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(condutormov_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(condutormov_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(condutormov_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(condutormov_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS condutormov_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(ocorrence_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(ocorrence_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(ocorrence_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(ocorrence_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(ocorrence_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(ocorrence_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS ocorrence_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(ocorrencetype_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(ocorrencetype_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(ocorrencetype_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(ocorrencetype_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(ocorrencetype_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(ocorrencetype_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS ocorrencetype_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(ocorrenceremarks_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(ocorrenceremarks_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(ocorrenceremarks_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(ocorrenceremarks_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(ocorrenceremarks_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(ocorrenceremarks_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS ocorrenceremarks_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(bookingremarks_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(bookingremarks_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(bookingremarks_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(bookingremarks_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(bookingremarks_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(bookingremarks_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS bookingremarks_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(remarks_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(remarks_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(remarks_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(remarks_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(remarks_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(remarks_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS remarks_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(credit_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(credit_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(credit_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(credit_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(credit_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(credit_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS credit_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(pricings_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(pricings_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(pricings_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pricings_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(pricings_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(pricings_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS pricings_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(idclient_bo::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(idclient_caixa::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(idclient_bo::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(idclient_caixa::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(idclient_bo::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(idclient_caixa::text)),'\s+','','g'),''))) THEN true ELSE false END AS idclient_bate,
    CASE WHEN ((nullif(regexp_replace(lower(btrim(statuspgto_stripe::text)),'\s+','','g'),'') IS NOT NULL)::int + (nullif(regexp_replace(lower(btrim(statuspgto_viva::text)),'\s+','','g'),'') IS NOT NULL)::int) = 0 THEN NULL WHEN ((nullif(regexp_replace(lower(btrim(statuspgto_stripe::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(statuspgto_viva::text)),'\s+','','g'),'') IS NULL OR nullif(regexp_replace(lower(btrim(statuspgto_stripe::text)),'\s+','','g'),'') = nullif(regexp_replace(lower(btrim(statuspgto_viva::text)),'\s+','','g'),''))) THEN true ELSE false END AS statuspgto_bate,
    (pi_mp IS NOT NULL AND pi_stripe IS NOT NULL) AS tem_stripe
    , round(coalesce(valor_bo,0)-coalesce(valor_mp,0),2) AS dif_valor_bo
    , round(coalesce(valor_caixa,0)-coalesce(valor_mp,0),2) AS dif_valor_caixa
    , round(coalesce(pago_stripe,0)-coalesce(valor_mp,0),2) AS dif_pago_stripe
    , (lower(btrim(action_bo))='fecho de caixa' OR lower(btrim(action_caixa))='fecho de caixa') AS is_fecho_caixa
    , (NULLIF(btrim(coalesce(campanha_mp,campanha_bo,campanha_caixa)),'') IS NOT NULL) AS tem_campanha
    , COALESCE((CASE WHEN lower(btrim(campaignpay_bo)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_bo)) IN ('false','f','0','nao','não','no') THEN false END), (CASE WHEN lower(btrim(campaignpay_caixa)) IN ('true','t','1','sim','yes') THEN true WHEN lower(btrim(campaignpay_caixa)) IN ('false','f','0','nao','não','no') THEN false END)) AS campaign_pay
    , (coalesce(pago_caixa,0)>0 OR coalesce(pago_stripe,0)>0 OR coalesce(pago_viva,0)>0 OR coalesce(pago_est,0)>0) AS teve_pagamento
  FROM base
),
fin AS (
  SELECT calc.*,
    CASE WHEN NOT tem_campanha THEN 'sem campanha'
         WHEN campaign_pay THEN 'campanha paga (campaignPay)'
         WHEN teve_pagamento THEN 'campanha + pagamento'
         ELSE 'campanha SEM pagamento' END AS situacao_campanha,
    CASE WHEN NOT tem_campanha THEN NULL
         WHEN campaign_pay OR teve_pagamento THEN true ELSE false END AS campanha_ok,
    ((CASE WHEN matricula_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN email_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN telefone_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN cliente_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN pi_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN entrada_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN saida_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN bookingdate_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN valor_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN preco_original_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN price_on_delivery_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN valet_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN preco_corrigido_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN correcao_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN pago_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN por_pagar_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN metodo_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN hasonline_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN campanha_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN campaignpay_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN action_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN actiondate_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN actionuser_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN validated_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN validatedby_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN validateddate_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN drivervalidated_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN drivervalidatedby_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN drivervalidateddate_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN closedbooking_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN closedby_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN closeddate_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN condutorrecolha_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN condutorentrega_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN condutormov_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN ocorrence_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN ocorrencetype_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN ocorrenceremarks_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN bookingremarks_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN remarks_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN credit_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN pricings_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN idclient_bate IS FALSE THEN 1 ELSE 0 END) + (CASE WHEN statuspgto_bate IS FALSE THEN 1 ELSE 0 END)) AS n_diferencas,
    concat_ws(', ',
    CASE WHEN matricula_bate IS FALSE THEN 'Matrícula' END,
    CASE WHEN email_bate IS FALSE THEN 'Email' END,
    CASE WHEN telefone_bate IS FALSE THEN 'Telefone' END,
    CASE WHEN cliente_bate IS FALSE THEN 'Cliente' END,
    CASE WHEN pi_bate IS FALSE THEN 'PaymentIntent' END,
    CASE WHEN entrada_bate IS FALSE THEN 'Entrada' END,
    CASE WHEN saida_bate IS FALSE THEN 'Saída' END,
    CASE WHEN bookingdate_bate IS FALSE THEN 'Data reserva' END,
    CASE WHEN valor_bate IS FALSE THEN 'Valor reserva' END,
    CASE WHEN preco_original_bate IS FALSE THEN 'Preço original' END,
    CASE WHEN price_on_delivery_bate IS FALSE THEN 'A pagar na entrega' END,
    CASE WHEN valet_bate IS FALSE THEN 'Valet (entrega)' END,
    CASE WHEN preco_corrigido_bate IS FALSE THEN 'Preço corrigido' END,
    CASE WHEN correcao_bate IS FALSE THEN 'Correção' END,
    CASE WHEN pago_bate IS FALSE THEN 'Valor pago' END,
    CASE WHEN por_pagar_bate IS FALSE THEN 'Por pagar/receber' END,
    CASE WHEN metodo_bate IS FALSE THEN 'Método' END,
    CASE WHEN hasonline_bate IS FALSE THEN 'Tem pgto online' END,
    CASE WHEN campanha_bate IS FALSE THEN 'Campanha' END,
    CASE WHEN campaignpay_bate IS FALSE THEN 'CampaignPay' END,
    CASE WHEN action_bate IS FALSE THEN 'Action final' END,
    CASE WHEN actiondate_bate IS FALSE THEN 'Data action' END,
    CASE WHEN actionuser_bate IS FALSE THEN 'Util. action' END,
    CASE WHEN validated_bate IS FALSE THEN 'Validado' END,
    CASE WHEN validatedby_bate IS FALSE THEN 'Validado por' END,
    CASE WHEN validateddate_bate IS FALSE THEN 'Data validação' END,
    CASE WHEN drivervalidated_bate IS FALSE THEN 'Motorista validado' END,
    CASE WHEN drivervalidatedby_bate IS FALSE THEN 'Motorista val. por' END,
    CASE WHEN drivervalidateddate_bate IS FALSE THEN 'Motorista val. data' END,
    CASE WHEN closedbooking_bate IS FALSE THEN 'Reserva fechada' END,
    CASE WHEN closedby_bate IS FALSE THEN 'Fechado por' END,
    CASE WHEN closeddate_bate IS FALSE THEN 'Data fecho' END,
    CASE WHEN condutorrecolha_bate IS FALSE THEN 'Condutor recolha' END,
    CASE WHEN condutorentrega_bate IS FALSE THEN 'Condutor entrega' END,
    CASE WHEN condutormov_bate IS FALSE THEN 'Condutor mov.' END,
    CASE WHEN ocorrence_bate IS FALSE THEN 'Ocorrência' END,
    CASE WHEN ocorrencetype_bate IS FALSE THEN 'Tipo ocorrência' END,
    CASE WHEN ocorrenceremarks_bate IS FALSE THEN 'Obs ocorrência' END,
    CASE WHEN bookingremarks_bate IS FALSE THEN 'Obs reserva' END,
    CASE WHEN remarks_bate IS FALSE THEN 'Observações' END,
    CASE WHEN credit_bate IS FALSE THEN 'Crédito' END,
    CASE WHEN pricings_bate IS FALSE THEN 'Pricings' END,
    CASE WHEN idclient_bate IS FALSE THEN 'ID cliente' END,
    CASE WHEN statuspgto_bate IS FALSE THEN 'Estado pagamento' END
    ) AS campos_diferentes
  FROM calc
)
SELECT * FROM fin;

CREATE MATERIALIZED VIEW staging.mv_reconciliacao_wide AS SELECT * FROM staging.v_reconciliacao_wide;
CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_id ON staging.mv_reconciliacao_wide (multipark_id);
CREATE INDEX IF NOT EXISTS ix_mv_cidade ON staging.mv_reconciliacao_wide (cidade);
CREATE INDEX IF NOT EXISTS ix_mv_estado ON staging.mv_reconciliacao_wide (estado_reserva);
CREATE INDEX IF NOT EXISTS ix_mv_saida  ON staging.mv_reconciliacao_wide (saida_mp);
CREATE INDEX IF NOT EXISTS ix_mv_mat    ON staging.mv_reconciliacao_wide (matricula_mp);
CREATE INDEX IF NOT EXISTS ix_mv_vbate  ON staging.mv_reconciliacao_wide (valor_bate);
CREATE INDEX IF NOT EXISTS ix_mv_fecho  ON staging.mv_reconciliacao_wide (is_fecho_caixa);
CREATE INDEX IF NOT EXISTS ix_mv_ndif   ON staging.mv_reconciliacao_wide (n_diferencas);
