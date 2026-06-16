import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildWhere, parseFilters } from "@/lib/query";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const f = parseFilters(req.nextUrl.searchParams);
    const where = buildWhere(f);

    const base = sql`
      SELECT mv.*,
        coalesce(r.estado, CASE WHEN mv.n_diferencas = 0 THEN 'ok' ELSE 'pendente' END) AS revisao_estado
      FROM staging.mv_reconciliacao_wide mv
      LEFT JOIN staging.revisao r ON r.multipark_id = mv.multipark_id`;

    const [k] = await sql`
      SELECT
        count(*)::int                                                        AS total,
        count(*) FILTER (WHERE revisao_estado = 'ok')::int                    AS rev_ok,
        count(*) FILTER (WHERE revisao_estado = 'pendente')::int              AS rev_pendente,
        count(*) FILTER (WHERE revisao_estado = 'problema')::int              AS rev_problema,
        count(*) FILTER (WHERE valor_bate)::int                              AS valor_ok,
        count(*) FILTER (WHERE valor_bate IS FALSE)::int                     AS valor_div,
        count(*) FILTER (WHERE pi_stripe IS NULL AND pago_viva IS NULL
                           AND coalesce(pago_caixa,0) = 0)::int              AS sem_pagamento,
        count(*) FILTER (WHERE is_fecho_caixa)::int                          AS fecho_caixa,
        count(*) FILTER (WHERE n_diferencas > 0)::int                        AS com_diferencas,
        count(*) FILTER (WHERE metodo_bate IS FALSE)::int                    AS metodo_div,
        count(*) FILTER (WHERE action_bate IS FALSE)::int                    AS action_div,
        count(*) FILTER (WHERE campanha_ok IS FALSE)::int                    AS campanha_sem_pgto,
        coalesce(sum(abs(coalesce(dif_valor_caixa,0)))
                 FILTER (WHERE valor_bate IS FALSE), 0)::numeric             AS eur_divergencia,
        coalesce(sum(pago_stripe), 0)::numeric                               AS eur_stripe,
        coalesce(sum(reembolso_stripe), 0)::numeric                          AS eur_reembolso,
        coalesce(sum(pago_viva), 0)::numeric                                 AS eur_tpa,
        coalesce(sum(pago_caixa), 0)::numeric                                AS eur_caixa,
        coalesce(sum(valor_mp), 0)::numeric                                  AS eur_reservas
      FROM (${base}) j ${where}`;

    return NextResponse.json(k);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
