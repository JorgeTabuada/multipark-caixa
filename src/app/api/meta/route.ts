import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Opções distintas para os dropdowns de filtro.
// Numa única query/ligação (antes eram 4 em paralelo) para não pressionar o pooler.
export async function GET() {
  try {
    const rows = await sql`
      SELECT 'cidade' AS campo, cidade AS v FROM staging.mv_reconciliacao_wide WHERE cidade IS NOT NULL
      UNION ALL
      SELECT 'estado', estado_reserva FROM staging.mv_reconciliacao_wide WHERE estado_reserva IS NOT NULL
      UNION ALL
      SELECT 'metodo', metodo_mp FROM staging.mv_reconciliacao_wide WHERE metodo_mp IS NOT NULL
      UNION ALL
      SELECT 'tipoStripe', tipo_stripe FROM staging.mv_reconciliacao_wide WHERE tipo_stripe IS NOT NULL`;
    const uniqSort = (campo: string) =>
      [...new Set(rows.filter((r) => r.campo === campo).map((r) => r.v as string))].sort((a, b) => a.localeCompare(b, "pt"));
    return NextResponse.json({
      cidades: uniqSort("cidade"),
      estados: uniqSort("estado"),
      metodos: uniqSort("metodo"),
      tiposStripe: uniqSort("tipoStripe"),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
