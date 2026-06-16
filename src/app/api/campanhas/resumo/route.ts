import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Resumo de uma campanha: totais por fonte, métodos de pagamento, campaignPay,
// e se os totais batem entre as fontes que a têm.
export async function GET(req: NextRequest) {
  try {
    const camp = req.nextUrl.searchParams.get("campanha");
    if (!camp) return NextResponse.json({ error: "falta campanha" }, { status: 400 });

    // totais por fonte (cada base agregada independentemente)
    const [mp] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(preco_total),0)::numeric AS total,
             count(*) FILTER (WHERE id_transacao ~ 'pi_')::int AS com_pi
      FROM staging.reservas_multipark
      WHERE regexp_replace(btrim(external_campaign), '\\s+', ' ', 'g') = ${camp}`;
    const [bo] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(bookingprice),0)::numeric AS total,
             count(*) FILTER (WHERE paymentintentid ~ 'pi_')::int AS com_pi
      FROM staging.reservas_backoffice
      WHERE regexp_replace(btrim(campaign), '\\s+', ' ', 'g') = ${camp}`;
    const [cx] = await sql`
      SELECT count(*)::int AS n, coalesce(sum(totalgeral),0)::numeric AS total,
             coalesce(sum(totalpaid),0)::numeric AS total_pago,
             count(*) FILTER (WHERE paymentintentid ~ 'pi_')::int AS com_pi
      FROM staging.caixa
      WHERE regexp_replace(btrim(campaign), '\\s+', ' ', 'g') = ${camp}`;

    // métodos de pagamento por fonte
    const metodosMp = await sql`
      SELECT coalesce(nullif(btrim(metodo_pagamento),''),'(vazio)') AS m, count(*)::int AS n
      FROM staging.reservas_multipark
      WHERE regexp_replace(btrim(external_campaign), '\\s+', ' ', 'g') = ${camp}
      GROUP BY 1 ORDER BY 2 DESC`;
    const metodosBo = await sql`
      SELECT coalesce(nullif(btrim(paymentmethod),''),'(vazio)') AS m, count(*)::int AS n
      FROM staging.reservas_backoffice
      WHERE regexp_replace(btrim(campaign), '\\s+', ' ', 'g') = ${camp}
      GROUP BY 1 ORDER BY 2 DESC`;
    const metodosCx = await sql`
      SELECT coalesce(nullif(btrim(paymentmethod),''),'(vazio)') AS m, count(*)::int AS n
      FROM staging.caixa
      WHERE regexp_replace(btrim(campaign), '\\s+', ' ', 'g') = ${camp}
      GROUP BY 1 ORDER BY 2 DESC`;

    // campaignPay (backoffice / caixa)
    const [cpay] = await sql`
      SELECT
        count(*) FILTER (WHERE lower(btrim(campaignpay)) IN ('true','t','1','sim'))::int AS bo_pay
      FROM staging.reservas_backoffice
      WHERE regexp_replace(btrim(campaign), '\\s+', ' ', 'g') = ${camp}`;

    // métodos unificados (nome -> contagem por fonte)
    const mset = new Map<string, { metodo: string; mp: number; bo: number; caixa: number }>();
    const add = (rows: { m: string; n: number }[], key: "mp" | "bo" | "caixa") => {
      for (const r of rows) {
        const e = mset.get(r.m) || { metodo: r.m, mp: 0, bo: 0, caixa: 0 };
        e[key] = r.n; mset.set(r.m, e);
      }
    };
    add(metodosMp as unknown as { m: string; n: number }[], "mp");
    add(metodosBo as unknown as { m: string; n: number }[], "bo");
    add(metodosCx as unknown as { m: string; n: number }[], "caixa");
    const metodos = [...mset.values()].sort((a, b) => (b.mp + b.bo + b.caixa) - (a.mp + a.bo + a.caixa));

    // está tudo igual? (totais de valor batem entre as fontes presentes, tol 0,01)
    const totais = [mp, bo, cx].filter((f) => f.n > 0).map((f) => Number(f.total));
    const tudo_igual_valor = totais.length > 1 ? (Math.max(...totais) - Math.min(...totais) <= 0.01) : null;
    const ns = [mp, bo, cx].filter((f) => f.n > 0).map((f) => f.n);
    const tudo_igual_n = ns.length > 1 ? (Math.max(...ns) === Math.min(...ns)) : null;

    return NextResponse.json({
      campanha: camp,
      porFonte: [
        { fonte: "Multipark", n: mp.n, total: Number(mp.total), com_pi: mp.com_pi },
        { fonte: "Backoffice", n: bo.n, total: Number(bo.total), com_pi: bo.com_pi },
        { fonte: "Caixa", n: cx.n, total: Number(cx.total), total_pago: Number(cx.total_pago), com_pi: cx.com_pi },
      ],
      metodos,
      campaignpay_bo: cpay.bo_pay,
      tudo_igual_valor,
      tudo_igual_n,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
