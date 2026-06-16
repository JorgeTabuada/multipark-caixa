import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Opções distintas para os dropdowns de filtro.
export async function GET() {
  try {
    const [cidades, estados, metodos, tiposStripe] = await Promise.all([
      sql`SELECT DISTINCT cidade AS v FROM staging.mv_reconciliacao_wide WHERE cidade IS NOT NULL ORDER BY 1`,
      sql`SELECT DISTINCT estado_reserva AS v FROM staging.mv_reconciliacao_wide WHERE estado_reserva IS NOT NULL ORDER BY 1`,
      sql`SELECT DISTINCT metodo_mp AS v FROM staging.mv_reconciliacao_wide WHERE metodo_mp IS NOT NULL ORDER BY 1`,
      sql`SELECT DISTINCT tipo_stripe AS v FROM staging.mv_reconciliacao_wide WHERE tipo_stripe IS NOT NULL ORDER BY 1`,
    ]);
    return NextResponse.json({
      cidades: cidades.map((r) => r.v),
      estados: estados.map((r) => r.v),
      metodos: metodos.map((r) => r.v),
      tiposStripe: tiposStripe.map((r) => r.v),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
