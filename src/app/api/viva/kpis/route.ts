import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const [k] = await sql`
      SELECT
        count(*)::int                                            AS total,
        count(*) FILTER (WHERE reserva_id IS NOT NULL)::int       AS com_reserva,
        count(*) FILTER (WHERE reserva_id IS NULL)::int           AS sem_reserva,
        count(*) FILTER (WHERE confianca = 'alta')::int           AS alta,
        count(*) FILTER (WHERE confianca = 'media')::int          AS media,
        count(*) FILTER (WHERE confianca = 'baixa')::int          AS baixa,
        count(*) FILTER (WHERE revisao_manual IS TRUE)::int       AS revisao,
        count(*) FILTER (WHERE n_candidatos > 1)::int             AS ambiguos,
        coalesce(sum(viva_amount), 0)::numeric                    AS eur_total,
        coalesce(sum(viva_amount) FILTER (WHERE reserva_id IS NULL), 0)::numeric AS eur_sem_reserva
      FROM staging.mv_viva_reservas ${where}`;
    return NextResponse.json(k);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
