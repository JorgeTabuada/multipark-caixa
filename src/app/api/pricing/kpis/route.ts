import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const c: ReturnType<typeof sql>[] = [];
    const search = p.get("search");
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      c.push(sql`(matricula ILIKE ${q} OR multipark_id ILIKE ${q} OR metodos ILIKE ${q})`);
    }
    if (p.get("soMulti") === "1") c.push(sql`multi_pagamento IS TRUE`);
    if (p.get("soProblema") === "1")
      c.push(sql`(tem_metodo_vazio IS TRUE OR difere_caixa IS TRUE OR valor_suspeito IS TRUE OR (soma_total - soma_paga) > 0.01)`);
    if (p.get("soFaltaPagar") === "1") c.push(sql`(soma_total - soma_paga) > 0.01`);
    if (p.get("soSuspeito") === "1") c.push(sql`valor_suspeito IS TRUE`);
    const rev = p.get("revisto");
    if (rev === "sim") c.push(sql`multipark_id IN (SELECT multipark_id FROM staging.revisao WHERE estado IS NOT NULL AND multipark_id IS NOT NULL)`);
    if (rev === "nao") c.push(sql`(multipark_id IS NULL OR multipark_id NOT IN (SELECT multipark_id FROM staging.revisao WHERE estado IS NOT NULL AND multipark_id IS NOT NULL))`);
    if (p.get("metodo")) c.push(sql`metodos ILIKE ${"%" + p.get("metodo") + "%"}`);
    if (p.get("dataDe")) c.push(sql`saida >= ${p.get("dataDe")}::timestamptz`);
    if (p.get("dataAte")) c.push(sql`saida <= ${p.get("dataAte")}::timestamptz`);
    let where = sql``;
    if (c.length) { let w = c[0]; for (let i = 1; i < c.length; i++) w = sql`${w} AND ${c[i]}`; where = sql`WHERE ${w}`; }

    const [k] = await sql`
      SELECT
        count(*)::int                                                       AS total,
        count(*) FILTER (WHERE multi_pagamento)::int                        AS multi,
        count(*) FILTER (WHERE tem_metodo_vazio)::int                       AS sem_metodo,
        count(*) FILTER (WHERE difere_caixa)::int                           AS difere_caixa,
        count(*) FILTER (WHERE valor_suspeito)::int                         AS suspeito,
        count(*) FILTER (WHERE (soma_total - soma_paga) > 0.01)::int        AS falta_pagar_n,
        coalesce(sum(soma_total - soma_paga) FILTER (WHERE (soma_total - soma_paga) > 0.01), 0)::numeric AS falta_pagar_eur,
        coalesce(sum(soma_total), 0)::numeric                               AS eur_total,
        coalesce(sum(v_valet), 0)::numeric                                  AS eur_valet,
        coalesce(sum(v_estacionamento), 0)::numeric                         AS eur_estacionamento,
        coalesce(sum(v_extras), 0)::numeric                                 AS eur_extras
      FROM staging.v_pricing ${where}`;
    return NextResponse.json(k);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
