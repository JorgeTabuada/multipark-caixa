import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLS = [
  "multipark_id", "matricula_mp", "cidade", "estado_reserva",
  "valor_mp", "valor_bo", "valor_caixa", "pago_caixa", "pago_stripe", "pago_viva",
  "metodo_mp", "metodo_bo", "metodo_caixa", "metodo_est",
  "campanha_mp", "valor_bate", "metodo_bate", "n_diferencas", "campos_diferentes",
];

const NORM = "[[:space:]]+";

// Reservas que usam um método de pagamento (drill-down).
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const m = p.get("metodo");
    if (!m) return NextResponse.json({ error: "falta metodo" }, { status: 400 });
    const limit = Math.min(Number(p.get("limit") || 300), 2000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);

    const where = sql`WHERE
      regexp_replace(btrim(metodo_mp), ${NORM}, ' ', 'g') = ${m}
      OR regexp_replace(btrim(metodo_bo), ${NORM}, ' ', 'g') = ${m}
      OR regexp_replace(btrim(metodo_caixa), ${NORM}, ' ', 'g') = ${m}
      OR regexp_replace(btrim(metodo_est), ${NORM}, ' ', 'g') = ${m}`;

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM staging.mv_reconciliacao_wide ${where}`;
    const rows = await sql`
      SELECT ${sql(COLS)} FROM staging.mv_reconciliacao_wide ${where}
      ORDER BY n_diferencas DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
    return NextResponse.json({ rows, total: count, columns: COLS });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
