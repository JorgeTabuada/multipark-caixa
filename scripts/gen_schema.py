# -*- coding: utf-8 -*-
"""
Gerador da view de reconciliação e do schema.ts da app, a partir de um MAPA
DE CONCEITOS (campo canónico -> coluna em cada fonte). Garante que todos os
campos que existem em >=2 fontes são comparados (flag <conceito>_bate) e
expostos lado a lado, mais uma coluna 'campos_diferentes' que lista o que diverge.
"""
import os

D = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(D)

ALIAS = {"mp": "m", "bo": "b", "caixa": "c", "est": "e", "stripe": "s", "viva": "v"}

# conceito: (key, label, cmp, ts_kind, {fonte: coluna})
#   cmp: text | num | date | bool   (como comparar)
#   ts_kind: text | badge | money | date | num   (como mostrar)
CONCEPTS = [
 ("matricula","Matrícula","text","text",{"mp":"matricula","bo":"licenseplate","caixa":"licenseplate","est":"matricula"}),
 ("email","Email","text","text",{"mp":"email_do_cliente","bo":"email","caixa":"email","stripe":"customer_email","viva":"e_mail"}),
 ("telefone","Telefone","text","text",{"bo":"phonenumber","stripe":"customer_phone","viva":"phone"}),
 ("cliente","Cliente","text","text",{"mp":"=btrim(concat_ws(' ', m.nome_do_cliente, m.apelido_do_cliente))","bo":"fullname","est":"cliente","stripe":"customer_description"}),
 ("pi","PaymentIntent","text","text",{"mp":"id_transacao","bo":"paymentintentid","caixa":"paymentintentid","stripe":"paymentintent_id"}),
 ("entrada","Entrada","date","date",{"mp":"data_hora_entrada","bo":"checkin","caixa":"checkin"}),
 ("saida","Saída","date","date",{"mp":"data_hora_saida","bo":"checkout","caixa":"checkout","est":"data_entrega"}),
 ("bookingdate","Data reserva","date","date",{"bo":"bookingdate","caixa":"bookingdate"}),
 ("valor","Valor reserva","num","money",{"mp":"preco_total","bo":"bookingprice","caixa":"totalgeral","est":"total_geral"}),
 ("preco_original","Preço original","num","money",{"mp":"preco_original","est":"preco_original"}),
 ("price_on_delivery","A pagar na entrega","num","money",{"bo":"priceondelivery","caixa":"priceondelivery"}),
 ("valet","Valet (entrega)","num","money",{"mp":"preco_entrega","bo":"deliveryprice"}),
 ("preco_corrigido","Preço corrigido","num","money",{"bo":"correctedprice","caixa":"correctedprice"}),
 ("correcao","Correção","num","money",{"bo":"correction","caixa":"correction"}),
 ("pago","Valor pago","num","money",{"caixa":"totalpaid","est":"total_pago","stripe":"amount","viva":"amount"}),
 ("por_pagar","Por pagar/receber","num","money",{"caixa":"totallefttopay","est":"por_receber"}),
 ("metodo","Método","text","badge",{"mp":"metodo_pagamento","bo":"paymentmethod","caixa":"paymentmethod","est":"metodo_pagamento"}),
 ("hasonline","Tem pgto online","text","badge",{"bo":"hasonlinepayment","caixa":"hasonlinepayment"}),
 ("campanha","Campanha","text","badge",{"mp":"external_campaign","bo":"campaign","caixa":"campaign"}),
 ("campaignpay","CampaignPay","bool","badge",{"bo":"campaignpay","caixa":"campaignpay"}),
 ("action","Action final","text","badge",{"bo":"action","caixa":"action"}),
 ("actiondate","Data action","date","date",{"bo":"actiondate","caixa":"actiondate"}),
 ("actionuser","Util. action","text","badge",{"bo":"actionuser","caixa":"actionuser"}),
 ("validated","Validado","text","badge",{"bo":"validated","caixa":"validated"}),
 ("validatedby","Validado por","text","badge",{"bo":"validatedby","caixa":"validatedby"}),
 ("validateddate","Data validação","date","date",{"bo":"validateddate","caixa":"validateddate"}),
 ("drivervalidated","Motorista validado","text","badge",{"bo":"drivervalidated","caixa":"drivervalidated"}),
 ("drivervalidatedby","Motorista val. por","text","badge",{"bo":"drivervalidatedby","caixa":"drivervalidatedby"}),
 ("drivervalidateddate","Motorista val. data","date","date",{"bo":"drivervalidateddate","caixa":"drivervalidateddate"}),
 ("closedbooking","Reserva fechada","text","badge",{"bo":"closedbooking","caixa":"closedbooking"}),
 ("closedby","Fechado por","text","badge",{"bo":"closedby","caixa":"closedby"}),
 ("closeddate","Data fecho","date","date",{"bo":"closeddate","caixa":"closeddate"}),
 ("condutorrecolha","Condutor recolha","text","badge",{"bo":"condutorrecolha","caixa":"condutorrecolha"}),
 ("condutorentrega","Condutor entrega","text","badge",{"bo":"condutorentrega","caixa":"condutorentrega"}),
 ("condutormov","Condutor mov.","text","badge",{"bo":"condutormovimentacao","caixa":"condutormovimentacao"}),
 ("ocorrence","Ocorrência","text","badge",{"bo":"ocorrence","caixa":"ocorrence"}),
 ("ocorrencetype","Tipo ocorrência","text","badge",{"bo":"ocorrencetype","caixa":"ocorrencetype"}),
 ("ocorrenceremarks","Obs ocorrência","text","text",{"bo":"ocorrenceremarks","caixa":"ocorrenceremarks"}),
 ("bookingremarks","Obs reserva","text","text",{"bo":"bookingremarks","caixa":"bookingremarks"}),
 ("remarks","Observações","text","text",{"bo":"remarks","caixa":"remarks"}),
 ("credit","Crédito","text","badge",{"bo":"credit","caixa":"credit"}),
 ("pricings","Pricings","text","text",{"bo":"pricings","caixa":"pricings"}),
 ("idclient","ID cliente","text","text",{"bo":"idclient","caixa":"idclient"}),
 ("statuspgto","Estado pagamento","text","badge",{"stripe":"status","viva":"status"}),
]

# Tolerância (segundos) para ligar um pagamento Viva (TPA) a uma reserva:
# exige mesmo valor E que a data/hora do pagamento esteja a <= esta distância
# da hora de saída. 3600 = 1 hora (antes era 86400 = 24h, que ignorava a hora).
VIVA_TOL_SEC = 3600

# conceitos com colunas visíveis por omissão
DEFAULT = {"matricula","saida","valor","pago","metodo","campanha","action"}
# flags visíveis por omissão
DEFAULT_FLAGS = {"valor_bate","saida_bate","metodo_bate","campanha_bate","action_bate"}

NORM = lambda a: "nullif(regexp_replace(lower(btrim(%s::text)),'\\s+','','g'),'')" % a
BOOLX = lambda a: ("(CASE WHEN lower(btrim(%s)) IN ('true','t','1','sim','yes') THEN true "
                   "WHEN lower(btrim(%s)) IN ('false','f','0','nao','não','no') THEN false END)" % (a, a))

def pairs(lst):
    return [(lst[i], lst[j]) for i in range(len(lst)) for j in range(i+1, len(lst))]

def flag_expr(key, cmp, aliases):
    """expressão SQL booleana: NULL se 0 presentes, true se batem, false se divergem."""
    if cmp == "text":
        pres = " + ".join("(%s IS NOT NULL)::int" % NORM(a) for a in aliases)
        pp = " AND ".join("(%s IS NULL OR %s IS NULL OR %s = %s)" % (NORM(x), NORM(y), NORM(x), NORM(y)) for x, y in pairs(aliases))
    elif cmp == "num":
        pres = " + ".join("(%s IS NOT NULL)::int" % a for a in aliases)
        pp = " AND ".join("(%s IS NULL OR %s IS NULL OR abs((%s)::numeric-(%s)::numeric)<=0.01)" % (x, y, x, y) for x, y in pairs(aliases))
    elif cmp == "date":
        pres = " + ".join("(%s IS NOT NULL)::int" % a for a in aliases)
        pp = " AND ".join("(%s IS NULL OR %s IS NULL OR %s = %s)" % (x, y, x, y) for x, y in pairs(aliases))
    else:  # bool
        pres = " + ".join("(%s IS NOT NULL)::int" % BOOLX(a) for a in aliases)
        pp = " AND ".join("(%s IS NULL OR %s IS NULL OR %s = %s)" % (BOOLX(x), BOOLX(y), BOOLX(x), BOOLX(y)) for x, y in pairs(aliases))
    pp = pp or "true"
    return "CASE WHEN (%s) = 0 THEN NULL WHEN (%s) THEN true ELSE false END" % (pres, pp)

# ----- gerar SQL da view -----
base_cols = ["    m.id AS multipark_id",
             "    m.cidade_do_parque AS cidade",
             "    m.estado AS estado_reserva",
             "    m.nome_do_parque AS parque"]
for key, label, cmp, kind, srcs in CONCEPTS:
    for f in ["mp","bo","caixa","est","stripe","viva"]:
        if f in srcs:
            col = srcs[f]
            # valor começado por "=" é uma expressão SQL literal; senão é nome de coluna
            expr = col[1:] if col.startswith("=") else "%s.%s" % (ALIAS[f], col)
            base_cols.append("    %s AS %s_%s" % (expr, key, f))
# especiais
base_cols += [
 "    s.payment_source_type AS tipo_stripe",
 "    s.amount_refunded AS reembolso_stripe",
 "    v.card_type AS tipo_viva",
 "    c.n_caixa, s.n_stripe, v.n_viva",
 "    m._raw AS raw_mp, b._raw AS raw_bo, c.raw AS raw_caixa",
 "    s.raw AS raw_stripe, e._raw AS raw_est, v.raw AS raw_viva",
]

flag_lines = []
concept_flags = []  # (key, label)
for key, label, cmp, kind, srcs in CONCEPTS:
    fontes = [f for f in ["mp","bo","caixa","est","stripe","viva"] if f in srcs]
    if len(fontes) < 2:
        continue
    aliases = ["%s_%s" % (key, f) for f in fontes]
    flag_lines.append("    %s AS %s_bate" % (flag_expr(key, cmp, aliases), key))
    concept_flags.append((key, label))

# derivados especiais no calc
calc_extra = [
 "    (pi_mp IS NOT NULL AND pi_stripe IS NOT NULL) AS tem_stripe",
 "    , round(coalesce(valor_bo,0)-coalesce(valor_mp,0),2) AS dif_valor_bo",
 "    , round(coalesce(valor_caixa,0)-coalesce(valor_mp,0),2) AS dif_valor_caixa",
 "    , round(coalesce(pago_stripe,0)-coalesce(valor_mp,0),2) AS dif_pago_stripe",
 "    , (lower(btrim(action_bo))='fecho de caixa' OR lower(btrim(action_caixa))='fecho de caixa') AS is_fecho_caixa",
 "    , (NULLIF(btrim(coalesce(campanha_mp,campanha_bo,campanha_caixa)),'') IS NOT NULL) AS tem_campanha",
 "    , COALESCE(%s, %s) AS campaign_pay" % (BOOLX("campaignpay_bo"), BOOLX("campaignpay_caixa")),
 "    , (coalesce(pago_caixa,0)>0 OR coalesce(pago_stripe,0)>0 OR coalesce(pago_viva,0)>0 OR coalesce(pago_est,0)>0) AS teve_pagamento",
]

# campos_diferentes / n_diferencas no SELECT final
diff_parts = ",\n".join("    CASE WHEN %s_bate IS FALSE THEN '%s' END" % (k, lbl.replace("'", "")) for k, lbl in concept_flags)
ndiff = " + ".join("(CASE WHEN %s_bate IS FALSE THEN 1 ELSE 0 END)" % k for k, _ in concept_flags)

VIEW = """-- =====================================================================
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
{base}
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
      AND abs(extract(epoch FROM (v2.data_hora - m.data_hora_saida))) <= {vivatol}
    ORDER BY abs(extract(epoch FROM (v2.data_hora - m.data_hora_saida))) ASC LIMIT 1) v ON true
),
calc AS (
  SELECT base.*,
{flags},
{extra}
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
    ({ndiff}) AS n_diferencas,
    concat_ws(', ',
{diffs}
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
""".format(
    base=",\n".join(base_cols),
    flags=",\n".join(flag_lines),
    extra="\n".join(calc_extra),
    ndiff=ndiff, diffs=diff_parts, vivatol=VIVA_TOL_SEC,
)

with open(os.path.join(APP, "migrations", "0001_reconciliacao.sql"), "w", encoding="utf-8") as fh:
    fh.write(VIEW)
print("migration escrita:", len(VIEW), "chars,", len(concept_flags), "flags de comparação")

# ----- gerar schema.ts -----
def col_defs():
    out = []
    # geral
    out.append('  { key: "revisao_estado", label: "Revisão", source: "geral", kind: "estado", defaultOn: true },')
    out.append('  { key: "tem_notas", label: "Notas", source: "geral", kind: "notas", defaultOn: true },')
    out.append('  { key: "multipark_id", label: "ID Multipark", source: "geral", kind: "text", defaultOn: true },')
    out.append('  { key: "cidade", label: "Cidade", source: "geral", kind: "badge", defaultOn: true },')
    out.append('  { key: "estado_reserva", label: "Estado", source: "geral", kind: "badge", defaultOn: true },')
    out.append('  { key: "parque", label: "Parque", source: "geral", kind: "text" },')
    out.append('  { key: "n_diferencas", label: "Nº difs", source: "geral", kind: "num", defaultOn: true },')
    out.append('  { key: "campos_diferentes", label: "Campos diferentes", source: "geral", kind: "text", defaultOn: true },')
    out.append('  { key: "situacao_campanha", label: "Situação campanha", source: "geral", kind: "badge", defaultOn: true },')
    # por fonte, na ordem das fontes
    specials = {
        "bo": [('dif_valor_bo','Δ Valor','money')],
        "caixa": [('dif_valor_caixa','Δ Valor','money'), ('n_caixa','# mov.','num')],
        "stripe": [('tipo_stripe','Tipo','badge'), ('reembolso_stripe','Reembolso','money'), ('dif_pago_stripe','Δ Pago','money')],
        "viva": [('tipo_viva','Cartão','badge')],
    }
    for fonte in ["mp","bo","caixa","est","stripe","viva"]:
        for key, label, cmp, kind, srcs in CONCEPTS:
            if fonte in srcs:
                don = " defaultOn: true," if key in DEFAULT else ""
                out.append('  { key: "%s_%s", label: "%s", source: "%s", kind: "%s",%s },'
                           % (key, fonte, label, fonte, kind, don))
        for key, label, kind in specials.get(fonte, []):
            out.append('  { key: "%s", label: "%s", source: "%s", kind: "%s" },' % (key, label, fonte, kind))
    return "\n".join(out)

def flag_defs():
    out = []
    for k, lbl in concept_flags:
        on = " on: true," if (k + "_bate") in DEFAULT_FLAGS else ""
        out.append('  { key: "%s_bate", label: "%s bate",%s },' % (k, lbl, on))
    out.append('  { key: "campanha_ok", label: "Campanha c/ pgto", on: true },')
    out.append('  { key: "tem_stripe", label: "Tem Stripe" },')
    return "\n".join(out)

SCHEMA = '''// GERADO por _gen.py — não editar à mão; alterar o mapa de conceitos no gerador.
export type Kind = "text" | "num" | "date" | "badge" | "money" | "estado" | "notas";
export type SourceId = "geral" | "mp" | "bo" | "caixa" | "est" | "stripe" | "viva";

export interface Source { id: SourceId; label: string; color: string; }
export const SOURCES: Source[] = [
  { id: "geral", label: "Reserva", color: "#4f8cff" },
  { id: "mp", label: "Multipark", color: "#4f8cff" },
  { id: "bo", label: "Backoffice", color: "#7c5cff" },
  { id: "caixa", label: "Caixa", color: "#2ecc71" },
  { id: "est", label: "Estatística", color: "#1abc9c" },
  { id: "stripe", label: "Stripe (online)", color: "#635bff" },
  { id: "viva", label: "Viva (TPA)", color: "#ffb454" },
];

export interface ColDef { key: string; label: string; source: SourceId; kind: Kind; defaultOn?: boolean; }

export const COLUMNS: ColDef[] = [
__COLS__
];

export const FLAGS: { key: string; label: string; on?: boolean }[] = [
__FLAGS__
];

export type Row = Record<string, unknown> & {
  multipark_id: string;
  n_diferencas: number | null;
};

export const RAW_KEYS = ["raw_mp", "raw_bo", "raw_caixa", "raw_stripe", "raw_est", "raw_viva"] as const;

export interface Filters {
  search?: string;
  cidade?: string;
  estado?: string;
  metodo?: string;
  tipoStripe?: string;
  soDivergencias?: boolean;
  comPi?: "" | "sim" | "nao";
  dataDe?: string;
  dataAte?: string;
  soFechoCaixa?: boolean;
  metodoDiverge?: boolean;
  campanhaDiverge?: boolean;
  actionDiverge?: boolean;
  campanhaSemPgto?: boolean;
  soComDiferencas?: boolean;
  revisaoEstado?: string;
  revisto?: string;
}
'''.replace("__COLS__", col_defs()).replace("__FLAGS__", flag_defs())

with open(os.path.join(APP, "src", "lib", "schema.ts"), "w", encoding="utf-8") as fh:
    fh.write(SCHEMA)
print("schema.ts escrito:", len(SCHEMA), "chars")
