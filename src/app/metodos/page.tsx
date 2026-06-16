"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Nav } from "@/components/Nav";
import { RowDetail } from "@/components/RowDetail";
import { fmtMoney, fmtEur0 } from "@/lib/format";

type Row = Record<string, unknown>;

interface Resumo {
  metodo: string;
  porFonte: { fonte: string; n: number; total: number; total_pago?: number }[];
  cidades: { cidade: string; n: number; total: number }[];
  campanhas: { campanha: string; n: number }[];
  tudo_igual_valor: boolean | null;
  tudo_igual_n: boolean | null;
  error?: string;
}

const DRILL_COLS: { k: string; l: string; kind: string }[] = [
  { k: "matricula_mp", l: "Matrícula", kind: "text" },
  { k: "cidade", l: "Cidade", kind: "badge" },
  { k: "estado_reserva", l: "Estado", kind: "badge" },
  { k: "valor_mp", l: "Valor MP", kind: "money" },
  { k: "valor_bo", l: "Valor BO", kind: "money" },
  { k: "valor_caixa", l: "Valor Caixa", kind: "money" },
  { k: "pago_caixa", l: "Pago Caixa", kind: "money" },
  { k: "pago_stripe", l: "Pago Stripe", kind: "money" },
  { k: "pago_viva", l: "Pago Viva", kind: "money" },
  { k: "metodo_mp", l: "Método MP", kind: "badge" },
  { k: "metodo_bo", l: "Método BO", kind: "badge" },
  { k: "metodo_caixa", l: "Método Caixa", kind: "badge" },
  { k: "metodo_est", l: "Método Est", kind: "badge" },
  { k: "valor_bate", l: "Valor bate", kind: "flag" },
  { k: "metodo_bate", l: "Método bate", kind: "flag" },
  { k: "campos_diferentes", l: "Campos diferentes", kind: "text" },
];

function cell(kind: string, v: unknown) {
  if (kind === "flag") return v === null || v === undefined ? <span className="text-mut/40">—</span>
    : v ? <span className="text-[#16a34a] font-bold">✓</span> : <span className="text-[#dc2626] font-bold">✗</span>;
  if (v === null || v === undefined || v === "") return <span className="text-mut/40">·</span>;
  if (kind === "money") { const n = Number(v); return <span className={"tabular " + (n < 0 ? "text-[#d97706]" : "")}>{fmtMoney(v)}</span>; }
  if (kind === "badge") return <span className="inline-block bg-[#eaf1fb] rounded px-1.5 py-0.5 text-xxs">{String(v)}</span>;
  const s = String(v);
  return <span title={s}>{s.length > 30 ? s.slice(0, 28) + "…" : s}</span>;
}

export default function MetodosPage() {
  const [met, setMet] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["metlist"],
    queryFn: async () => (await fetch("/api/metodos")).json() as Promise<{ metodos: { nome: string; n: number }[] }>,
  });
  const resumo = useQuery({
    queryKey: ["metresumo", met],
    queryFn: async () => (await fetch(`/api/metodos/resumo?metodo=${encodeURIComponent(met)}`)).json() as Promise<Resumo>,
    enabled: !!met,
    placeholderData: keepPreviousData,
  });
  const reservas = useQuery({
    queryKey: ["metreservas", met],
    queryFn: async () => (await fetch(`/api/metodos/reservas?metodo=${encodeURIComponent(met)}&limit=500`)).json() as Promise<{ rows: Row[]; total: number }>,
    enabled: !!met,
    placeholderData: keepPreviousData,
  });

  const r = resumo.data && !resumo.data.error ? resumo.data : undefined;

  return (
    <main className="px-5 py-4 max-w-[1700px] mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-bold">💶 Métodos de pagamento</h1>
        <span className="text-mut text-xs">totais e comparação por método nas 4 fontes</span>
        <div className="ml-auto"><Nav /></div>
      </header>

      <div className="bg-panel border border-line rounded-xl p-3 mb-3 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[320px]">
          <label className="text-mut text-xxs uppercase">Método de pagamento</label>
          <select className="bg-panel2 border border-line rounded-md px-2 py-2 text-sm focus:outline-none focus:border-acc"
            value={met} onChange={(e) => setMet(e.target.value)}>
            <option value="">— escolher método —</option>
            {lista.data?.metodos?.map((c) => (
              <option key={c.nome} value={c.nome}>{c.nome} ({c.n})</option>
            ))}
          </select>
        </div>
        {r && (
          <div className="flex gap-2 items-center mb-1">
            <Badge ok={r.tudo_igual_valor} label="totais de valor" />
            <Badge ok={r.tudo_igual_n} label="nº de reservas" />
          </div>
        )}
      </div>

      {!met && <div className="text-mut text-sm px-1">Escolhe um método para ver os totais por fonte, distribuição por cidade/campanha e comparação.</div>}

      {r && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-3 max-w-[1100px]">
            {r.porFonte.map((f) => (
              <div key={f.fonte} className="bg-panel2 border border-line rounded-lg p-3">
                <div className="text-acc text-xs font-semibold mb-1">{f.fonte}</div>
                <div className="text-[22px] font-bold tabular">{f.n.toLocaleString("pt-PT")}<span className="text-mut text-xs font-normal"> res.</span></div>
                <div className="text-sm tabular mt-1">{fmtEur0(f.total)} <span className="text-mut text-xxs">valor</span></div>
                {f.total_pago !== undefined && <div className="text-sm tabular text-[#16a34a]">{fmtEur0(f.total_pago)} <span className="text-mut text-xxs">pago</span></div>}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-3">
            <div className="bg-panel border border-line rounded-xl p-3 min-w-[280px]">
              <div className="text-sm font-semibold mb-2">Por cidade (Multipark)</div>
              <table className="text-xs w-full">
                <thead><tr className="text-mut"><th className="text-left py-1">Cidade</th><th className="text-right">Reservas</th><th className="text-right">Valor</th></tr></thead>
                <tbody>
                  {r.cidades.map((c) => (
                    <tr key={c.cidade} className="border-t border-line/40">
                      <td className="py-1">{c.cidade}</td>
                      <td className="text-right tabular">{c.n}</td>
                      <td className="text-right tabular">{fmtMoney(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-panel border border-line rounded-xl p-3 min-w-[320px] flex-1 max-w-[560px]">
              <div className="text-sm font-semibold mb-2">Por campanha (Multipark)</div>
              <table className="text-xs w-full">
                <thead><tr className="text-mut"><th className="text-left py-1">Campanha</th><th className="text-right">Reservas</th></tr></thead>
                <tbody>
                  {r.campanhas.map((c) => (
                    <tr key={c.campanha} className="border-t border-line/40">
                      <td className="py-1">{c.campanha}</td>
                      <td className="text-right tabular">{c.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-sm font-semibold mb-1">Reservas com este método {reservas.data ? `(${reservas.data.total})` : ""}</div>
          <div className="border border-line rounded-xl overflow-auto max-h-[50vh]">
            <table className="border-collapse text-xs w-max min-w-full">
              <thead className="sticky top-0 z-10">
                <tr>{DRILL_COLS.map((c) => <th key={c.k} className="px-2 py-1.5 text-left whitespace-nowrap border-b border-line bg-panel text-mut font-semibold">{c.l}</th>)}</tr>
              </thead>
              <tbody>
                {(reservas.data?.rows ?? []).map((row, i) => (
                  <tr key={i} onClick={() => row.multipark_id && setDetail(String(row.multipark_id))}
                    className="hover:bg-[#eaf1fb] border-b border-line/40 cursor-pointer">
                    {DRILL_COLS.map((c) => <td key={c.k} className="px-2 py-1 whitespace-nowrap max-w-[230px] overflow-hidden text-ellipsis">{cell(c.kind, row[c.k])}</td>)}
                  </tr>
                ))}
                {!(reservas.data?.rows ?? []).length && <tr><td colSpan={DRILL_COLS.length} className="px-3 py-6 text-mut text-center">sem reservas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detail && <RowDetail id={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}

function Badge({ ok, label }: { ok: boolean | null; label: string }) {
  const txt = ok === null ? "—" : ok ? "tudo igual" : "diverge";
  const color = ok === null ? "#64748b" : ok ? "#16a34a" : "#dc2626";
  return (
    <span className="px-2 py-1 rounded-md text-xs border" style={{ borderColor: color + "66", color, background: color + "1a" }}>
      {label}: <b>{txt}</b>
    </span>
  );
}
