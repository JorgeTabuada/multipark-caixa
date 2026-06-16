import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lista de campanhas (união das 3 fontes que têm campanha), normalizadas.
export async function GET() {
  try {
    const rows = await sql`
      SELECT camp, count(*)::int AS n FROM (
        SELECT regexp_replace(btrim(external_campaign), '\\s+', ' ', 'g') AS camp FROM staging.reservas_multipark
        UNION ALL
        SELECT regexp_replace(btrim(campaign), '\\s+', ' ', 'g') FROM staging.reservas_backoffice
        UNION ALL
        SELECT regexp_replace(btrim(campaign), '\\s+', ' ', 'g') FROM staging.caixa
      ) x
      WHERE camp IS NOT NULL AND camp <> ''
      GROUP BY camp ORDER BY camp`;
    return NextResponse.json({ campanhas: rows.map((r) => ({ nome: r.camp, n: r.n })) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
