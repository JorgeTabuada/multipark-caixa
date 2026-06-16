import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLS = [
  "multipark_id", "matricula_mp", "cidade", "estado_reserva",
  "valor_mp", "valor_bo", "valor_caixa", "pago_caixa", "pago_stripe", "pago_viva",
  "metodo_mp", "metodo_bo", "metodo_caixa",
  "campanha_mp", "campanha_bo", "campanha_caixa", "campaignpay_bo",
  "valor_bate", "metodo_bate", "campanha_bate", "situacao_campanha",
  "n_diferencas", "campos_diferentes",
];

// Reservas de uma campanha (drill-down da mv de reconciliação).
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const camp = p.get("campanha");
    if (!camp) return NextResponse.json({ error: "falta campanha" }, { status: 400 });
    const limit = Math.min(Number(p.get("limit") || 200), 2000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);

    const where = sql`WHERE
      regexp_replace(btrim(campanha_mp), '\\s+', ' ', 'g') = ${camp}
      OR regexp_replace(btrim(campanha_bo), '\\s+', ' ', 'g') = ${camp}
      OR regexp_replace(btrim(campanha_caixa), '\\s+', ' ', 'g') = ${camp}`;

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM staging.mv_reconciliacao_wide ${where}`;
    const rows = await sql`
      SELECT ${sql(COLS)} FROM staging.mv_reconciliacao_wide ${where}
      ORDER BY n_diferencas DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
    return NextResponse.json({ rows, total: count, columns: COLS });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
