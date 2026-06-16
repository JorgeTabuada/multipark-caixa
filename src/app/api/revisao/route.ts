import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const ESTADOS = new Set(["ok", "pendente", "problema"]);

// GET ?id=  -> estado + notas gravados de uma reserva
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
    const rows = await sql`SELECT estado, notas, updated_at FROM staging.revisao WHERE multipark_id = ${id}`;
    return NextResponse.json(rows[0] ?? { estado: null, notas: null, updated_at: null });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// POST { id, estado, notas } -> grava (upsert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 });
    const estado = body.estado && ESTADOS.has(body.estado) ? body.estado : null;
    const notas = typeof body.notas === "string" ? body.notas : null;
    await sql`
      INSERT INTO staging.revisao (multipark_id, estado, notas, updated_at)
      VALUES (${id}, ${estado}, ${notas}, now())
      ON CONFLICT (multipark_id) DO UPDATE
        SET estado = EXCLUDED.estado, notas = EXCLUDED.notas, updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
