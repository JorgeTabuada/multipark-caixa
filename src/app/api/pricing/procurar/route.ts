import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Procura um valor (parcial) de pagamento à volta de uma data, nas fontes de
// pagamento (Stripe, Viva) e na Caixa. Útil para pagamentos divididos: o que
// está no Stripe/Viva é o valor PARCIAL, não o total da reserva.
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const valor = Number(p.get("valor"));
    const data = p.get("data"); // ISO (saída/checkout da reserva)
    if (!valor || !data) return NextResponse.json({ error: "falta valor ou data" }, { status: 400 });
    const horas = Math.min(Number(p.get("horas") || 48), 240); // janela ± horas (default 48h)
    const lo = valor - 0.01, hi = valor + 0.01;
    const jan = `${horas} hours`;

    const stripe = await sql`
      SELECT 'Stripe' AS fonte, paymentintent_id AS ref, amount AS valor, created_date_utc AS data,
             status, payment_source_type AS tipo, customer_email AS email,
             round(extract(epoch FROM (created_date_utc - ${data}::timestamptz)))::int AS dsec
      FROM staging.stripe
      WHERE amount BETWEEN ${lo} AND ${hi}
        AND created_date_utc BETWEEN ${data}::timestamptz - ${jan}::interval AND ${data}::timestamptz + ${jan}::interval
      ORDER BY abs(extract(epoch FROM (created_date_utc - ${data}::timestamptz))) ASC LIMIT 25`;

    const viva = await sql`
      SELECT 'Viva' AS fonte, transaction_id AS ref, amount AS valor, data_hora AS data,
             status, card_type AS tipo, e_mail AS email,
             round(extract(epoch FROM (data_hora - ${data}::timestamptz)))::int AS dsec
      FROM staging.viva
      WHERE amount BETWEEN ${lo} AND ${hi}
        AND data_hora BETWEEN ${data}::timestamptz - ${jan}::interval AND ${data}::timestamptz + ${jan}::interval
      ORDER BY abs(extract(epoch FROM (data_hora - ${data}::timestamptz))) ASC LIMIT 25`;

    const caixa = await sql`
      SELECT 'Caixa' AS fonte, licenseplate AS ref, totalpaid AS valor, actiondate AS data,
             paymentmethod AS status, paymentmethod AS tipo, email,
             round(extract(epoch FROM (actiondate - ${data}::timestamptz)))::int AS dsec
      FROM staging.caixa
      WHERE totalpaid BETWEEN ${lo} AND ${hi}
        AND actiondate BETWEEN ${data}::timestamptz - ${jan}::interval AND ${data}::timestamptz + ${jan}::interval
      ORDER BY abs(extract(epoch FROM (actiondate - ${data}::timestamptz))) ASC LIMIT 25`;

    const resultados = [...stripe, ...viva, ...caixa].sort((a, b) => Math.abs(Number(a.dsec)) - Math.abs(Number(b.dsec)));
    return NextResponse.json({ valor, data, horas, resultados });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
