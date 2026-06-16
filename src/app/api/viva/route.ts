import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const SORTABLE = new Set([
  "viva_data_hora", "viva_amount", "dsec", "confianca", "matricula",
  "valor_reserva", "dif_valor", "n_candidatos",
]);

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const conds: ReturnType<typeof sql>[] = [];

    const search = p.get("search");
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conds.push(sql`(matricula ILIKE ${q} OR transaction_id ILIKE ${q} OR viva_email ILIKE ${q}
                      OR reserva_id ILIKE ${q} OR cliente ILIKE ${q} OR order_code ILIKE ${q})`);
    }
    const conf = p.get("confianca");
    if (conf) conds.push(sql`confianca = ${conf}`);
    const fonte = p.get("fonte");
    if (fonte) conds.push(sql`fonte_reserva = ${fonte}`);
    if (p.get("soAmbiguos") === "1") conds.push(sql`n_candidatos > 1`);
    if (p.get("soRevisao") === "1") conds.push(sql`revisao_manual IS TRUE`);
    if (p.get("soSemReserva") === "1") conds.push(sql`reserva_id IS NULL`);
    if (p.get("soComReserva") === "1") conds.push(sql`reserva_id IS NOT NULL`);
    if (p.get("dataDe")) conds.push(sql`viva_data_hora >= ${p.get("dataDe")}::timestamptz`);
    if (p.get("dataAte")) conds.push(sql`viva_data_hora <= ${p.get("dataAte")}::timestamptz`);

    let where = sql``;
    if (conds.length) {
      let w = conds[0];
      for (let i = 1; i < conds.length; i++) w = sql`${w} AND ${conds[i]}`;
      where = sql`WHERE ${w}`;
    }

    const sortCol = SORTABLE.has(p.get("sort") || "") ? (p.get("sort") as string) : "viva_data_hora";
    const dir = p.get("dir") === "asc" ? sql`ASC` : sql`DESC`;
    const limit = Math.min(Number(p.get("limit") || 100), 2000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM staging.mv_viva_reservas ${where}`;
    const rows = await sql`
      SELECT mv.*,
        (SELECT a.multipark_id FROM staging.atribuicao a WHERE a.fonte='viva' AND a.ref=mv.transaction_id) AS atrib_mp,
        (SELECT a.matricula FROM staging.atribuicao a WHERE a.fonte='viva' AND a.ref=mv.transaction_id) AS atrib_mat
      FROM staging.mv_viva_reservas mv ${where}
      ORDER BY ${sql(sortCol)} ${dir} NULLS LAST LIMIT ${limit} OFFSET ${offset}`;

    return NextResponse.json({ rows, total: count, limit, offset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
