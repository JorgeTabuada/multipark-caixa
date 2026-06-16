"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Nav } from "@/components/Nav";
import { RowDetail } from "@/components/RowDetail";
import { fmtMoney, fmtEur0 } from "@/lib/format";

type Row = Record<string, unknown>;

interface Resumo {
  campanha: string;
  porFonte: { fonte: string; n: number; total: number; total_pago?: number; com_pi: number }[];
  metodos: { metodo: string; mp: number; bo: number; caixa: number }[];
  campaignpay_bo: number;
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
  { k: "valor_bate", l: "Valor bate", kind: "flag" },
  { k: "metodo_bate", l: "Método bate", kind: "flag" },
  { k: "campanha_bate", l: "Campanha bate", kind: "flag" },
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

export default function CampanhasPage() {
  const [camp, setCamp] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["camplist"],
    queryFn: async () => (await fetch("/api/campanhas")).json() as Promise<{ campanhas: { nome: string; n: number }[] }>,
  });
  const resumo = useQuery({
    queryKey: ["campresumo", camp],
    queryFn: async () => (await fetch(`/api/campanhas/resumo?campanha=${encodeURIComponent(camp)}`)).json() as Promise<Resumo>,
    enabled: !!camp,
    placeholderData: keepPreviousData,
  });
  const reservas = useQuery({
    queryKey: ["campreservas", camp],
    queryFn: async () => (await fetch(`/api/campanhas/reservas?campanha=${encodeURIComponent(camp)}&limit=500`)).json() as Promise<{ rows: Row[]; total: number }>,
    enabled: !!camp,
    placeholderData: keepPreviousData,
  });

  const r = resumo.data && !resumo.data.error ? resumo.data : undefined;

  return (
    <main className="px-5 py-4 max-w-[1700px] mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-bold">🎯 Campanhas</h1>
        <span className="text-mut text-xs">totais e comparação por campanha nas 3 fontes</span>
        <div className="ml-auto"><Nav /></div>
      </header>

      <div className="bg-panel border border-line rounded-xl p-3 mb-3 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[320px]">
          <label className="text-mut text-xxs uppercase">Campanha</label>
          <select className="bg-panel2 border border-line rounded-md px-2 py-2 text-sm focus:outline-none focus:border-acc"
            value={camp} onChange={(e) => setCamp(e.target.value)}>
            <option value="">— escolher campanha —</option>
            {lista.data?.campanhas?.map((c) => (
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

      {!camp && <div className="text-mut text-sm px-1">Escolhe uma campanha para ver os totais, tipos de pagamento e comparação entre fontes.</div>}

      {r && (
        <>
          {/* Totais por fonte */}
          <div className="grid grid-cols-3 gap-3 mb-3 max-w-[900px]">
            {r.porFonte.map((f) => (
              <div key={f.fonte} className="bg-panel2 border border-line rounded-lg p-3">
                <div className="text-acc text-xs font-semibold mb-1">{f.fonte}</div>
                <div className="text-[22px] font-bold tabular">{f.n.toLocaleString("pt-PT")}<span className="text-mut text-xs font-normal"> reservas</span></div>
                <div className="text-sm tabular mt-1">{fmtEur0(f.total)} <span className="text-mut text-xxs">valor</span></div>
                {f.total_pago !== undefined && <div className="text-sm tabular text-[#16a34a]">{fmtEur0(f.total_pago)} <span className="text-mut text-xxs">pago</span></div>}
                <div className="text-mut text-xxs mt-1">{f.com_pi} com paymentIntent</div>
              </div>
            ))}
          </div>

          {/* Métodos de pagamento */}
          <div className="bg-panel border border-line rounded-xl p-3 mb-3 max-w-[700px]">
            <div className="text-sm font-semibold mb-2">Tipos de pagamento</div>
            <table className="text-xs w-full">
              <thead><tr className="text-mut">
                <th className="text-left py-1">Método</th><th className="text-right">Multipark</th><th className="text-right">Backoffice</th><th className="text-right">Caixa</th>
              </tr></thead>
              <tbody>
                {r.metodos.map((m) => (
                  <tr key={m.metodo} className="border-t border-line/40">
                    <td className="py-1">{m.metodo}</td>
                    <td className="text-right tabular">{m.mp || "·"}</td>
                    <td className="text-right tabular">{m.bo || "·"}</td>
                    <td className="text-right tabular">{m.caixa || "·"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-mut text-xxs mt-2">campaignPay ativo no Backoffice: {r.campaignpay_bo} reservas</div>
          </div>

          {/* Drill-down reservas */}
          <div className="text-sm font-semibold mb-1">Reservas da campanha {reservas.data ? `(${reservas.data.total})` : ""}</div>
          <div className="border border-line rounded-xl overflow-auto max-h-[55vh]">
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
