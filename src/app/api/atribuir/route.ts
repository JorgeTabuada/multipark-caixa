import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const FONTES = new Set(["viva", "stripe", "caixa"]);

// GET ?multipark_id=  -> pagamentos atribuídos a uma reserva
// GET ?fonte=&ref=    -> atribuição de um pagamento
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const mp = p.get("multipark_id");
    const fonte = p.get("fonte");
    const ref = p.get("ref");
    if (mp) {
      const rows = await sql`SELECT * FROM staging.atribuicao WHERE multipark_id = ${mp} ORDER BY updated_at DESC`;
      return NextResponse.json({ atribuicoes: rows });
    }
    if (fonte && ref) {
      const rows = await sql`SELECT * FROM staging.atribuicao WHERE fonte = ${fonte} AND ref = ${ref}`;
      return NextResponse.json(rows[0] ?? null);
    }
    return NextResponse.json({ error: "falta multipark_id ou fonte+ref" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST { fonte, ref, multipark_id, matricula, valor, metodo, nota } -> atribui (upsert)
//   multipark_id null/"" -> remove a atribuição
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const fonte = String(b.fonte || "").toLowerCase();
    const ref = String(b.ref || "");
    if (!FONTES.has(fonte) || !ref) return NextResponse.json({ error: "fonte/ref inválidos" }, { status: 400 });

    if (!b.multipark_id) {
      await sql`DELETE FROM staging.atribuicao WHERE fonte = ${fonte} AND ref = ${ref}`;
      return NextResponse.json({ ok: true, removido: true });
    }
    await sql`
      INSERT INTO staging.atribuicao (fonte, ref, multipark_id, matricula, valor, metodo, nota, updated_at)
      VALUES (${fonte}, ${ref}, ${b.multipark_id}, ${b.matricula ?? null},
              ${b.valor ?? null}, ${b.metodo ?? null}, ${b.nota ?? null}, now())
      ON CONFLICT (fonte, ref) DO UPDATE
        SET multipark_id = EXCLUDED.multipark_id, matricula = EXCLUDED.matricula,
            valor = EXCLUDED.valor, metodo = EXCLUDED.metodo, nota = EXCLUDED.nota, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
