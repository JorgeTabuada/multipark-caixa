import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Pagamentos ligados a uma reserva (automáticos da reconciliação + manuais),
// excluindo os retirados manualmente. Usado no detalhe para gerir atribuições.
export async function GET(req: NextRequest) {
  try {
    const mp = req.nextUrl.searchParams.get("multipark_id");
    if (!mp) return NextResponse.json({ error: "falta multipark_id" }, { status: 400 });

    // Viva automático ligado a esta reserva (sem regra manual a sobrepor)
    const vivaAuto = await sql`
      SELECT 'viva' AS fonte, mv.transaction_id AS ref, mv.viva_amount AS valor,
             mv.viva_data_hora AS data, mv.viva_cartao AS tipo, 'auto' AS origem
      FROM staging.mv_viva_reservas mv
      WHERE mv.reserva_id = ${mp}
        AND NOT EXISTS (SELECT 1 FROM staging.atribuicao a WHERE a.fonte='viva' AND a.ref = mv.transaction_id)`;
    // Stripe automático ligado a esta reserva
    const stripeAuto = await sql`
      SELECT 'stripe' AS fonte, mv.pi AS ref, mv.stripe_amount AS valor,
             mv.stripe_data AS data, mv.stripe_tipo AS tipo, 'auto' AS origem
      FROM staging.mv_stripe_reservas mv
      WHERE mv.mp_id = ${mp} AND mv.pi IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM staging.atribuicao a WHERE a.fonte='stripe' AND a.ref = mv.pi)`;
    // manuais anexados a esta reserva (qualquer fonte)
    const manuais = await sql`
      SELECT fonte, ref, valor, NULL::timestamptz AS data, metodo AS tipo, 'manual' AS origem
      FROM staging.atribuicao WHERE multipark_id = ${mp}`;

    return NextResponse.json({ pagamentos: [...manuais, ...vivaAuto, ...stripeAuto] });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
