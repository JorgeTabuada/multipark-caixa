-- =====================================================================
-- Migration 0002 — Conciliação Viva -> Reserva (v2)
-- Para CADA pagamento Viva procura a melhor reserva, por prioridade de
-- fonte: Multipark -> Backoffice -> Caixa (só recorre à seguinte se a
-- anterior não tiver candidato). Em cada fonte usa a cascata de sinais:
--   email+valor > valor+hora exata > valor+hora > valor+dia aprox (<=6h).
-- Marca fonte_reserva, confiança, nº candidatos e revisão manual (ambíguo).
-- =====================================================================
CREATE INDEX IF NOT EXISTS ix_mp_preco       ON staging.reservas_multipark (preco_total);
CREATE INDEX IF NOT EXISTS ix_mp_saida2      ON staging.reservas_multipark (data_hora_saida);
CREATE INDEX IF NOT EXISTS ix_bo_price       ON staging.reservas_backoffice (bookingprice);
CREATE INDEX IF NOT EXISTS ix_bo_checkout    ON staging.reservas_backoffice (checkout);
CREATE INDEX IF NOT EXISTS ix_caixa_total    ON staging.caixa (totalgeral);
CREATE INDEX IF NOT EXISTS ix_caixa_checkout ON staging.caixa (checkout);

DROP MATERIALIZED VIEW IF EXISTS staging.mv_viva_reservas;
CREATE MATERIALIZED VIEW staging.mv_viva_reservas AS
WITH j AS (
  SELECT
    v.transaction_id, v.order_code, v.merchant_reference,
    v.data_hora AS viva_data_hora, v.amount AS viva_amount, v.netamount AS viva_netamount,
    v.card_type AS viva_cartao, v.terminal_id AS viva_terminal, v.status AS viva_status,
    v.e_mail AS viva_email, v.customer_description AS viva_cliente,
    mp.rid AS mp_rid, mp.mat AS mp_mat, mp.cli AS mp_cli, mp.eml AS mp_eml, mp.cid AS mp_cid,
    mp.parq AS mp_parq, mp.est AS mp_est, mp.sai AS mp_sai, mp.val AS mp_val, mp.met AS mp_met,
    mp.pi AS mp_pi, mp.dsec AS mp_dsec, mp.em AS mp_em,
    bo.rid AS bo_rid, bo.mat AS bo_mat, bo.cli AS bo_cli, bo.eml AS bo_eml, bo.cid AS bo_cid,
    bo.parq AS bo_parq, bo.est AS bo_est, bo.sai AS bo_sai, bo.val AS bo_val, bo.met AS bo_met,
    bo.pi AS bo_pi, bo.dsec AS bo_dsec, bo.em AS bo_em,
    cx.rid AS cx_rid, cx.mat AS cx_mat, cx.cli AS cx_cli, cx.eml AS cx_eml, cx.cid AS cx_cid,
    cx.parq AS cx_parq, cx.est AS cx_est, cx.sai AS cx_sai, cx.val AS cx_val, cx.met AS cx_met,
    cx.pi AS cx_pi, cx.dsec AS cx_dsec, cx.em AS cx_em,
    cmp.n AS cand_mp, cbo.n AS cand_bo, ccx.n AS cand_cx
  FROM staging.viva v
  LEFT JOIN LATERAL (
    SELECT m.id AS rid, m.matricula AS mat, m.nome_do_cliente AS cli, m.email_do_cliente AS eml,
           m.cidade_do_parque AS cid, m.nome_do_parque AS parq, m.estado AS est,
           m.data_hora_saida AS sai, m.preco_total AS val, m.metodo_pagamento AS met, m.id_transacao AS pi,
           abs(extract(epoch FROM (m.data_hora_saida - v.data_hora))) AS dsec,
           (nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(m.email_do_cliente))=lower(btrim(v.e_mail))) AS em
    FROM staging.reservas_multipark m
    WHERE m.preco_total BETWEEN (v.amount - 0.01) AND (v.amount + 0.01)
      AND m.data_hora_saida IS NOT NULL AND v.data_hora IS NOT NULL
      AND ((nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(m.email_do_cliente))=lower(btrim(v.e_mail)))
           OR abs(extract(epoch FROM (m.data_hora_saida - v.data_hora)))<=21600)
    ORDER BY (nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(m.email_do_cliente))=lower(btrim(v.e_mail))) DESC,
             abs(extract(epoch FROM (m.data_hora_saida - v.data_hora))) ASC
    LIMIT 1) mp ON true
  LEFT JOIN LATERAL (
    SELECT coalesce(nullif(btrim(b.multiparkid),''), b.licenseplate) AS rid, b.licenseplate AS mat,
           b.fullname AS cli, b.email AS eml, b.city AS cid, b.parkbrand AS parq, b.stats AS est,
           b.checkout AS sai, b.bookingprice AS val, b.paymentmethod AS met, b.paymentintentid AS pi,
           abs(extract(epoch FROM (b.checkout - v.data_hora))) AS dsec,
           (nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(b.email))=lower(btrim(v.e_mail))) AS em
    FROM staging.reservas_backoffice b
    WHERE b.bookingprice BETWEEN (v.amount - 0.01) AND (v.amount + 0.01)
      AND b.checkout IS NOT NULL AND v.data_hora IS NOT NULL
      AND ((nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(b.email))=lower(btrim(v.e_mail)))
           OR abs(extract(epoch FROM (b.checkout - v.data_hora)))<=21600)
    ORDER BY (nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(b.email))=lower(btrim(v.e_mail))) DESC,
             abs(extract(epoch FROM (b.checkout - v.data_hora))) ASC
    LIMIT 1) bo ON true
  LEFT JOIN LATERAL (
    SELECT coalesce(nullif(btrim(cx0.paymentintentid),''), cx0.licenseplate) AS rid, cx0.licenseplate AS mat,
           NULL::text AS cli, cx0.email AS eml, cx0.city AS cid, cx0.parkbrand AS parq, cx0.stats AS est,
           cx0.checkout AS sai, cx0.totalgeral AS val, cx0.paymentmethod AS met, cx0.paymentintentid AS pi,
           abs(extract(epoch FROM (cx0.checkout - v.data_hora))) AS dsec,
           (nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(cx0.email))=lower(btrim(v.e_mail))) AS em
    FROM staging.caixa cx0
    WHERE cx0.totalgeral BETWEEN (v.amount - 0.01) AND (v.amount + 0.01)
      AND cx0.checkout IS NOT NULL AND v.data_hora IS NOT NULL
      AND ((nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(cx0.email))=lower(btrim(v.e_mail)))
           OR abs(extract(epoch FROM (cx0.checkout - v.data_hora)))<=21600)
    ORDER BY (nullif(btrim(v.e_mail),'') IS NOT NULL AND lower(btrim(cx0.email))=lower(btrim(v.e_mail))) DESC,
             abs(extract(epoch FROM (cx0.checkout - v.data_hora))) ASC
    LIMIT 1) cx ON true
  LEFT JOIN LATERAL (SELECT count(*) n FROM staging.reservas_multipark m2
     WHERE m2.preco_total BETWEEN (v.amount - 0.01) AND (v.amount + 0.01) AND m2.data_hora_saida IS NOT NULL
       AND abs(extract(epoch FROM (m2.data_hora_saida - v.data_hora)))<=3600) cmp ON true
  LEFT JOIN LATERAL (SELECT count(*) n FROM staging.reservas_backoffice b2
     WHERE b2.bookingprice BETWEEN (v.amount - 0.01) AND (v.amount + 0.01) AND b2.checkout IS NOT NULL
       AND abs(extract(epoch FROM (b2.checkout - v.data_hora)))<=3600) cbo ON true
  LEFT JOIN LATERAL (SELECT count(*) n FROM staging.caixa c2
     WHERE c2.totalgeral BETWEEN (v.amount - 0.01) AND (v.amount + 0.01) AND c2.checkout IS NOT NULL
       AND abs(extract(epoch FROM (c2.checkout - v.data_hora)))<=3600) ccx ON true
),
s AS (
  SELECT
    transaction_id, order_code, merchant_reference, viva_data_hora, viva_amount, viva_netamount,
    viva_cartao, viva_terminal, viva_status, viva_email, viva_cliente,
    coalesce(mp_rid, bo_rid, cx_rid)                                              AS reserva_id,
    CASE WHEN mp_rid IS NOT NULL THEN 'multipark'
         WHEN bo_rid IS NOT NULL THEN 'backoffice'
         WHEN cx_rid IS NOT NULL THEN 'caixa' END                                AS fonte_reserva,
    coalesce(mp_mat, bo_mat, cx_mat)   AS matricula,
    coalesce(mp_cli, bo_cli, cx_cli)   AS cliente,
    coalesce(mp_eml, bo_eml, cx_eml)   AS email_reserva,
    coalesce(mp_cid, bo_cid, cx_cid)   AS cidade,
    coalesce(mp_parq, bo_parq, cx_parq) AS parque,
    coalesce(mp_est, bo_est, cx_est)   AS estado,
    coalesce(mp_sai, bo_sai, cx_sai)   AS saida,
    coalesce(mp_val, bo_val, cx_val)   AS valor_reserva,
    coalesce(mp_met, bo_met, cx_met)   AS metodo,
    coalesce(mp_pi, bo_pi, cx_pi)      AS pi,
    coalesce(mp_dsec, bo_dsec, cx_dsec) AS dsec,
    coalesce(mp_em, bo_em, cx_em)      AS email_match,
    CASE WHEN mp_rid IS NOT NULL THEN cand_mp
         WHEN bo_rid IS NOT NULL THEN cand_bo
         WHEN cx_rid IS NOT NULL THEN cand_cx ELSE 0 END                         AS n_candidatos,
    viva_amount AS _vamt
  FROM j
)
SELECT
  transaction_id, order_code, merchant_reference, viva_data_hora, viva_amount, viva_netamount,
  viva_cartao, viva_terminal, viva_status, viva_email, viva_cliente,
  reserva_id, fonte_reserva, matricula, cliente, email_reserva, cidade, parque, estado,
  saida, valor_reserva, metodo, pi, dsec, n_candidatos,
  CASE WHEN reserva_id IS NULL THEN 'sem reserva'
       WHEN email_match THEN 'email + valor'
       WHEN dsec <= 300  THEN 'valor + hora exata'
       WHEN dsec <= 3600 THEN 'valor + hora'
       ELSE 'valor + dia aprox' END                                             AS match_metodo,
  CASE WHEN reserva_id IS NULL THEN 'nenhuma'
       WHEN email_match THEN 'alta'
       WHEN n_candidatos > 1 THEN 'media'
       WHEN dsec <= 300 THEN 'alta'
       WHEN dsec <= 3600 THEN 'media'
       ELSE 'baixa' END                                                         AS confianca,
  (reserva_id IS NOT NULL AND n_candidatos > 1 AND NOT coalesce(email_match, false)) AS revisao_manual,
  round((_vamt)::numeric - coalesce(valor_reserva, 0), 2)                        AS dif_valor
FROM s;

CREATE UNIQUE INDEX IF NOT EXISTS ix_mvr_tx ON staging.mv_viva_reservas (transaction_id);
CREATE INDEX IF NOT EXISTS ix_mvr_conf ON staging.mv_viva_reservas (confianca);
CREATE INDEX IF NOT EXISTS ix_mvr_dh ON staging.mv_viva_reservas (viva_data_hora);
CREATE INDEX IF NOT EXISTS ix_mvr_mat ON staging.mv_viva_reservas (matricula);
CREATE INDEX IF NOT EXISTS ix_mvr_fonte ON staging.mv_viva_reservas (fonte_reserva);
CREATE INDEX IF NOT EXISTS ix_mvr_rev ON staging.mv_viva_reservas (revisao_manual);
