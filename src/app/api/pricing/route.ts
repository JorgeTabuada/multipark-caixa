import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const SORTABLE = new Set([
  "saida", "valor_reserva", "soma_total", "soma_paga", "n_metodos", "n_itens", "matricula",
]);

function conds(p: URLSearchParams) {
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
  return c;
}
function whereOf(c: ReturnType<typeof sql>[]) {
  if (!c.length) return sql``;
  let w = c[0];
  for (let i = 1; i < c.length; i++) w = sql`${w} AND ${c[i]}`;
  return sql`WHERE ${w}`;
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const where = whereOf(conds(p));
    const sortCol = SORTABLE.has(p.get("sort") || "") ? (p.get("sort") as string) : "saida";
    const dir = p.get("dir") === "asc" ? sql`ASC` : sql`DESC`;
    const limit = Math.min(Number(p.get("limit") || 100), 5000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM staging.v_pricing ${where}`;
    const rows = await sql`
      SELECT multipark_id, matricula, cidade, saida, valor_reserva, metodo_reserva,
             n_itens, n_metodos, metodos, soma_total, soma_paga,
             round(soma_total - soma_paga, 2) AS falta_pagar,
             v_valet, v_estacionamento, v_entrega, v_extras, itens_sem_metodo,
             soma_paga_caixa, metodos_caixa,
             multi_pagamento, pago_difere_reserva, tem_metodo_vazio, difere_caixa, valor_suspeito,
             pricing_json
      FROM staging.v_pricing ${where}
      ORDER BY ${sql(sortCol)} ${dir} NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
    return NextResponse.json({ rows, total: count, limit, offset });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
