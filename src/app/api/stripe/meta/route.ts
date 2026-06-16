import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await sql`
      SELECT stripe_status AS v, count(*)::int AS n
      FROM staging.mv_stripe_reservas
      WHERE stripe_status IS NOT NULL AND btrim(stripe_status) <> ''
      GROUP BY 1 ORDER BY 2 DESC`;
    return NextResponse.json({ stripeStatus: status.map((r) => ({ v: r.v, n: r.n })) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
