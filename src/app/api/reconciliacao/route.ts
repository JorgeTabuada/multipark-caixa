import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildWhere, parseFilters, safeOrder } from "@/lib/query";
import { COLUMNS, FLAGS } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Colunas a devolver na grelha (tudo menos os _raw), derivadas do schema.
const NON_RAW = [...COLUMNS.map((c) => c.key), ...FLAGS.map((f) => f.key)];
// inclui os campos de revisão (estado efetivo + notas) calculados no JOIN
const SELCOLS = [...NON_RAW, "revisao_estado", "revisao_notas", "tem_notas"];

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const f = parseFilters(p);
    // lookup exato por multipark_id (rápido, indexado) para o detalhe
    const where = p.get("exato") && p.get("search")
      ? sql`WHERE multipark_id = ${p.get("search")}`
      : buildWhere(f);
    const order = safeOrder(p.get("sort"), p.get("dir"));
    const limit = Math.min(Number(p.get("limit") || 100), 2000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);
    const wantRaw = p.get("raw") === "1";

    // base com estado de revisão (gravado ou automático) + notas
    const base = sql`
      SELECT mv.*,
        coalesce(r.estado, CASE WHEN mv.n_diferencas = 0 THEN 'ok' ELSE 'pendente' END) AS revisao_estado,
        r.notas AS revisao_notas,
        (r.notas IS NOT NULL AND btrim(r.notas) <> '') AS tem_notas,
        (r.estado IS NOT NULL) AS revisto
      FROM staging.mv_reconciliacao_wide mv
      LEFT JOIN staging.revisao r ON r.multipark_id = mv.multipark_id`;

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM (${base}) j ${where}`;

    const rows = wantRaw
      ? await sql`SELECT * FROM (${base}) j ${where} ${order} LIMIT ${limit} OFFSET ${offset}`
      : await sql`SELECT ${sql(SELCOLS)} FROM (${base}) j ${where} ${order} LIMIT ${limit} OFFSET ${offset}`;

    return NextResponse.json({ rows, total: count, limit, offset });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
