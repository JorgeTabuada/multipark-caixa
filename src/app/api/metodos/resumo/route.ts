import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const NORM = "[[:space:]]+";

// Resumo de um método de pagamento: totais por fonte (4), comparação,
// distribuição por cidade e por campanha.
export async function GET(req: NextRequest) {
  try {
    const m = req.nextUrl.searchParams.get("metodo");
    if (!m) return NextResponse.json({ error: "falta metodo" }, { status: 400 });

    const [mp] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(preco_total),0)::numeric AS total
      FROM staging.reservas_multipark
      WHERE regexp_replace(btrim(metodo_pagamento), ${NORM}, ' ', 'g') = ${m}`;
    const [bo] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(bookingprice),0)::numeric AS total
      FROM staging.reservas_backoffice
      WHERE regexp_replace(btrim(paymentmethod), ${NORM}, ' ', 'g') = ${m}`;
    const [cx] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(totalgeral),0)::numeric AS total,
             coalesce(sum(totalpaid),0)::numeric AS total_pago
      FROM staging.caixa
      WHERE regexp_replace(btrim(paymentmethod), ${NORM}, ' ', 'g') = ${m}`;
    const [es] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(total_geral),0)::numeric AS total,
             coalesce(sum(total_pago),0)::numeric AS total_pago
      FROM staging.estatisticas_caixa
      WHERE regexp_replace(btrim(metodo_pagamento), ${NORM}, ' ', 'g') = ${m}`;

    // distribuição por cidade (multipark)
    const cidades = await sql`
      SELECT coalesce(nullif(btrim(cidade_do_parque),''),'(vazio)') AS cidade, count(*)::int AS n,
             coalesce(sum(preco_total),0)::numeric AS total
      FROM staging.reservas_multipark
      WHERE regexp_replace(btrim(metodo_pagamento), ${NORM}, ' ', 'g') = ${m}
      GROUP BY 1 ORDER BY 2 DESC`;
    // distribuição por campanha (multipark)
    const campanhas = await sql`
      SELECT coalesce(nullif(regexp_replace(btrim(external_campaign), ${NORM}, ' ', 'g'),''),'(sem campanha)') AS campanha,
             count(*)::int AS n
      FROM staging.reservas_multipark
      WHERE regexp_replace(btrim(metodo_pagamento), ${NORM}, ' ', 'g') = ${m}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 20`;

    const totais = [mp, bo, cx, es].filter((f) => f.n > 0).map((f) => Number(f.total));
    const tudo_igual_valor = totais.length > 1 ? (Math.max(...totais) - Math.min(...totais) <= 0.01) : null;
    const ns = [mp, bo, cx, es].filter((f) => f.n > 0).map((f) => f.n);
    const tudo_igual_n = ns.length > 1 ? (Math.max(...ns) === Math.min(...ns)) : null;

    return NextResponse.json({
      metodo: m,
      porFonte: [
        { fonte: "Multipark", n: mp.n, total: Number(mp.total) },
        { fonte: "Backoffice", n: bo.n, total: Number(bo.total) },
        { fonte: "Caixa", n: cx.n, total: Number(cx.total), total_pago: Number(cx.total_pago) },
        { fonte: "Estatística", n: es.n, total: Number(es.total), total_pago: Number(es.total_pago) },
      ],
      cidades: cidades.map((r) => ({ cidade: r.cidade, n: r.n, total: Number(r.total) })),
      campanhas: campanhas.map((r) => ({ campanha: r.campanha, n: r.n })),
      tudo_igual_valor,
      tudo_igual_n,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
