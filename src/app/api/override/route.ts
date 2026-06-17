import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGO_ESTADOS = new Set(["pago", "nao_pago", "falta_valor"]);

// GET ?id= -> override manual de pagamento de uma reserva
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
    const rows = await sql`
      SELECT metodo, pago_estado, pago_valor, nota, updated_at
      FROM staging.override WHERE multipark_id = ${id}`;
    return NextResponse.json(rows[0] ?? { metodo: null, pago_estado: null, pago_valor: null, nota: null });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST { id, metodo, pago_estado, pago_valor, nota } -> grava (upsert).
// Campos vazios/null limpam o respetivo override.
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const id = String(b.id || "");
    if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
    const metodo = b.metodo ? String(b.metodo).trim() || null : null;
    const pagoEstado = b.pago_estado && PAGO_ESTADOS.has(b.pago_estado) ? b.pago_estado : null;
    const pagoValor = b.pago_valor === "" || b.pago_valor == null ? null : Number(b.pago_valor);
    const nota = typeof b.nota === "string" && b.nota.trim() ? b.nota.trim() : null;

    // se tudo vazio, apaga o override (volta ao automático)
    if (!metodo && !pagoEstado && pagoValor == null && !nota) {
      await sql`DELETE FROM staging.override WHERE multipark_id = ${id}`;
      return NextResponse.json({ ok: true, limpo: true });
    }
    await sql`
      INSERT INTO staging.override (multipark_id, metodo, pago_estado, pago_valor, nota, updated_at)
      VALUES (${id}, ${metodo}, ${pagoEstado}, ${pagoValor}, ${nota}, now())
      ON CONFLICT (multipark_id) DO UPDATE
        SET metodo = EXCLUDED.metodo, pago_estado = EXCLUDED.pago_estado,
            pago_valor = EXCLUDED.pago_valor, nota = EXCLUDED.nota, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
