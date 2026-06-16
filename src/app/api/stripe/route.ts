import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const SORTABLE = new Set([
  "stripe_data", "stripe_amount", "dif_max", "valor_mp", "n_bases", "matricula",
]);

function conds(p: URLSearchParams) {
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
  const rev = p.get("revisto");
  if (rev === "sim") c.push(sql`mp_id IN (SELECT multipark_id FROM staging.revisao WHERE estado IS NOT NULL AND multipark_id IS NOT NULL)`);
  if (rev === "nao") c.push(sql`(mp_id IS NULL OR mp_id NOT IN (SELECT multipark_id FROM staging.revisao WHERE estado IS NOT NULL AND multipark_id IS NOT NULL))`);
  if (p.get("dataDe")) c.push(sql`stripe_data >= ${p.get("dataDe")}::timestamptz`);
  if (p.get("dataAte")) c.push(sql`stripe_data <= ${p.get("dataAte")}::timestamptz`);
  return c;
}

function whereOf(c: ReturnType<typeof sql>[]) {
  if (!c.length) return sql``;
  let w = c[0];
  for (let i = 1; i < c.length; i++) w = sql`${w} AND ${c[i]}`;
  return sql`WHERE ${w}`;
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const where = whereOf(conds(p));
    const sortCol = SORTABLE.has(p.get("sort") || "") ? (p.get("sort") as string) : "stripe_data";
    const dir = p.get("dir") === "asc" ? sql`ASC` : sql`DESC`;
    const limit = Math.min(Number(p.get("limit") || 100), 5000);
    const offset = Math.max(Number(p.get("offset") || 0), 0);

    const [{ count }] = await sql`SELECT count(*)::int AS count FROM staging.mv_stripe_reservas ${where}`;
    const rows = await sql`
      SELECT mv.*,
        (SELECT a.multipark_id FROM staging.atribuicao a WHERE a.fonte='stripe' AND a.ref=mv.pi) AS atrib_mp,
        (SELECT a.matricula FROM staging.atribuicao a WHERE a.fonte='stripe' AND a.ref=mv.pi) AS atrib_mat
      FROM staging.mv_stripe_reservas mv ${where}
      ORDER BY ${sql(sortCol)} ${dir} NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
    return NextResponse.json({ rows, total: count, limit, offset });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
