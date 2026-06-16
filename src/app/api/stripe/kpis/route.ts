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
      c.push(sql`(matricula ILIKE ${q} OR pi ILIKE ${q} OR charge_id ILIKE ${q}
                  OR stripe_email ILIKE ${q} OR mp_id ILIKE ${q} OR mp_cliente ILIKE ${q})`);
    }
    const st = p.get("status");
    if (st) c.push(sql`valor_status = ${st}`);
    const ss = p.get("stripeStatus");
    if (ss) c.push(sql`stripe_status = ${ss}`);
    if (p.get("soErrado") === "1") c.push(sql`valor_status = 'valor errado'`);
    if (p.get("soSemReserva") === "1") c.push(sql`tem_reserva IS FALSE`);
    if (p.get("dataDe")) c.push(sql`stripe_data >= ${p.get("dataDe")}::timestamptz`);
    if (p.get("dataAte")) c.push(sql`stripe_data <= ${p.get("dataAte")}::timestamptz`);
    let where = sql``;
    if (c.length) { let w = c[0]; for (let i = 1; i < c.length; i++) w = sql`${w} AND ${c[i]}`; where = sql`WHERE ${w}`; }

    const [k] = await sql`
      SELECT
        count(*)::int                                              AS total,
        count(*) FILTER (WHERE valor_status = 'valor certo')::int   AS certo,
        count(*) FILTER (WHERE valor_status = 'valor errado')::int  AS errado,
        count(*) FILTER (WHERE valor_status = 'sem reserva')::int   AS sem_reserva,
        coalesce(sum(stripe_amount), 0)::numeric                    AS eur_total,
        coalesce(sum(abs(dif_max)) FILTER (WHERE valor_status = 'valor errado'), 0)::numeric AS eur_divergencia,
        coalesce(sum(stripe_amount) FILTER (WHERE valor_status = 'sem reserva'), 0)::numeric  AS eur_sem_reserva
      FROM staging.mv_stripe_reservas ${where}`;
    return NextResponse.json(k);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
