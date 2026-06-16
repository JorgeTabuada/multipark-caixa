import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lista de métodos de pagamento (união das 4 fontes que têm método), normalizados.
export async function GET() {
  try {
    const rows = await sql`
      SELECT m, count(*)::int AS n FROM (
        SELECT regexp_replace(btrim(metodo_pagamento), '[[:space:]]+', ' ', 'g') AS m FROM staging.reservas_multipark
        UNION ALL
        SELECT regexp_replace(btrim(paymentmethod), '[[:space:]]+', ' ', 'g') FROM staging.reservas_backoffice
        UNION ALL
        SELECT regexp_replace(btrim(paymentmethod), '[[:space:]]+', ' ', 'g') FROM staging.caixa
        UNION ALL
        SELECT regexp_replace(btrim(metodo_pagamento), '[[:space:]]+', ' ', 'g') FROM staging.estatisticas_caixa
      ) x
      WHERE m IS NOT NULL AND m <> ''
      GROUP BY m ORDER BY n DESC`;
    return NextResponse.json({ metodos: rows.map((r) => ({ nome: r.m, n: r.n })) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
