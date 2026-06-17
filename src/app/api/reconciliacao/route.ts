import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildWhere, parseFilters, safeOrder } from "@/lib/query";
import { COLUMNS, FLAGS } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Colunas a devolver na grelha (tudo menos os _raw), derivadas do schema.
const NON_RAW = [...COLUMNS.map((c) => c.key), ...FLAGS.map((f) => f.key)];
// inclui os campos de revisão (estado efetivo + notas) e o override manual
const SELCOLS = [...NON_RAW, "revisao_estado", "revisao_notas", "tem_notas",
  "metodo_manual", "pago_estado", "pago_valor_manual",
  "viva_retirado", "stripe_retirado"];

// Campos que dependem do Viva/Stripe — anulados quando o pagamento foi retirado.
const VIVA_DEP = ["pago_viva", "tipo_viva", "statuspgto_viva"];
const STRIPE_DEP = ["pago_stripe", "tipo_stripe", "statuspgto_stripe", "reembolso_stripe", "dif_pago_stripe"];

// Aplica os overrides manuais (retirar Viva/Stripe) sobre cada linha.
function aplicarOverrides(rows: Record<string, unknown>[]) {
  for (const r of rows) {
    if (r.viva_retirado) for (const k of VIVA_DEP) r[k] = null;
    if (r.stripe_retirado) for (const k of STRIPE_DEP) r[k] = null;
  }
  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const f = parseFilters(p);
    // lookup exato por multipark_id (rápido, indexado) para o detalhe
    const where = p.get("exato") && p.get("search")
      ? sql`WHERE multipark_id = ${p.get("search")}`
      : buildWhere(f);
    const order = safeOrder(p.get("sort"), p.get("dir"));
    const limit = Math.min(Number(p.get("limit") || 100), 2000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);
    const wantRaw = p.get("raw") === "1";

    // base leve (só revisão) — usada na contagem; rápida sobre todo o universo.
    const baseCount = sql`
      SELECT mv.*,
        coalesce(r.estado, CASE WHEN mv.n_diferencas = 0 THEN 'ok' ELSE 'pendente' END) AS revisao_estado,
        r.notas AS revisao_notas,
        (r.notas IS NOT NULL AND btrim(r.notas) <> '') AS tem_notas,
        (r.estado IS NOT NULL) AS revisto
      FROM staging.mv_reconciliacao_wide mv
      LEFT JOIN staging.revisao r ON r.multipark_id = mv.multipark_id`;

    // base completa (revisão + override + deteção de Viva/Stripe retirados).
    // vtx: transação Viva que a wide view escolheu (para verificar se foi retirada);
    // av/asr: regra de atribuição que liga (ou desliga) o pagamento a esta reserva.
    const base = sql`
      SELECT mv.*,
        coalesce(r.estado, CASE WHEN mv.n_diferencas = 0 THEN 'ok' ELSE 'pendente' END) AS revisao_estado,
        r.notas AS revisao_notas,
        (r.notas IS NOT NULL AND btrim(r.notas) <> '') AS tem_notas,
        (r.estado IS NOT NULL) AS revisto,
        o.metodo AS metodo_manual,
        o.pago_estado AS pago_estado,
        o.pago_valor AS pago_valor_manual,
        (av.ref IS NOT NULL AND av.multipark_id IS DISTINCT FROM mv.multipark_id) AS viva_retirado,
        (asr.ref IS NOT NULL AND asr.multipark_id IS DISTINCT FROM mv.multipark_id) AS stripe_retirado
      FROM staging.mv_reconciliacao_wide mv
      LEFT JOIN staging.revisao r ON r.multipark_id = mv.multipark_id
      LEFT JOIN staging.override o ON o.multipark_id = mv.multipark_id
      LEFT JOIN LATERAL (
        SELECT vr.transaction_id FROM staging.mv_viva_reservas vr
        WHERE vr.reserva_id = mv.multipark_id AND mv.pago_viva IS NOT NULL
          AND abs((vr.viva_amount)::numeric - (mv.pago_viva)::numeric) <= 0.01
        LIMIT 1) vtx ON true
      LEFT JOIN staging.atribuicao av ON av.fonte = 'viva' AND av.ref = vtx.transaction_id
      LEFT JOIN staging.atribuicao asr ON asr.fonte = 'stripe' AND asr.ref = mv.pi_stripe`;

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM (${baseCount}) j ${where}`;

    const rows = wantRaw
      ? await sql`SELECT * FROM (${base}) j ${where} ${order} LIMIT ${limit} OFFSET ${offset}`
      : await sql`SELECT ${sql(SELCOLS)} FROM (${base}) j ${where} ${order} LIMIT ${limit} OFFSET ${offset}`;

    aplicarOverrides(rows as Record<string, unknown>[]);
    return NextResponse.json({ rows, total: count, limit, offset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
