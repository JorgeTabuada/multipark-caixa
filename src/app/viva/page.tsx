"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Nav } from "@/components/Nav";
import { RowDetail } from "@/components/RowDetail";
import { fmtMoney, fmtDate, fmtEur0 } from "@/lib/format";

const PAGE = 100;

interface Filters {
  search?: string;
  confianca?: string;
  fonte?: string;
  soAmbiguos?: boolean;
  soRevisao?: boolean;
  soSemReserva?: boolean;
  soComReserva?: boolean;
  revisto?: string;
  dataDe?: string;
  dataAte?: string;
}

type Vrow = Record<string, unknown>;

const COLS: { k: string; l: string; kind: string; sort?: boolean }[] = [
  { k: "confianca", l: "Confiança", kind: "conf" },
  { k: "revisao_manual", l: "Rever", kind: "bool" },
  { k: "match_metodo", l: "Match por", kind: "badge" },
  { k: "fonte_reserva", l: "Fonte", kind: "badge" },
  { k: "viva_data_hora", l: "Data/hora Viva", kind: "date", sort: true },
  { k: "viva_amount", l: "Valor Viva", kind: "money", sort: true },
  { k: "viva_cartao", l: "Cartão", kind: "badge" },
  { k: "viva_terminal", l: "Terminal", kind: "text" },
  { k: "viva_email", l: "Email Viva", kind: "text" },
  { k: "matricula", l: "Matrícula", kind: "text", sort: true },
  { k: "cliente", l: "Cliente", kind: "text" },
  { k: "reserva_id", l: "ID Reserva", kind: "text" },
  { k: "cidade", l: "Cidade", kind: "badge" },
  { k: "saida", l: "Saída reserva", kind: "date" },
  { k: "valor_reserva", l: "Valor reserva", kind: "money", sort: true },
  { k: "dif_valor", l: "Δ Valor", kind: "money", sort: true },
  { k: "metodo", l: "Método reserva", kind: "badge" },
  { k: "pi", l: "PI da reserva", kind: "text" },
  { k: "n_candidatos", l: "# cand.", kind: "num", sort: true },
];

const CONF_COLOR: Record<string, string> = {
  alta: "#16a34a", media: "#d97706", baixa: "#ea580c", nenhuma: "#dc2626", manual: "#1d6fe6", retirado: "#94a3b8",
};

function buildParams(f: Filters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.search) p.set("search", f.search);
  if (f.confianca) p.set("confianca", f.confianca);
  if (f.fonte) p.set("fonte", f.fonte);
  if (f.revisto) p.set("revisto", f.revisto);
  if (f.soAmbiguos) p.set("soAmbiguos", "1");
  if (f.soRevisao) p.set("soRevisao", "1");
  if (f.soSemReserva) p.set("soSemReserva", "1");
  if (f.soComReserva) p.set("soComReserva", "1");
  if (f.dataDe) p.set("dataDe", f.dataDe);
  if (f.dataAte) p.set("dataAte", f.dataAte);
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p.toString();
}

function cell(kind: string, v: unknown) {
  if (kind === "conf") {
    const s = String(v ?? "");
    return <span className="px-1.5 py-0.5 rounded text-xxs font-semibold"
      style={{ background: (CONF_COLOR[s] || "#444") + "33", color: CONF_COLOR[s] || "#aaa" }}>{s}</span>;
  }
  if (kind === "bool") return v ? <span className="text-[#d97706] font-bold" title="rever manualmente">⚠</span> : <span className="text-mut/30">·</span>;
  if (v === null || v === undefined || v === "") return <span className="text-mut/40">·</span>;
  if (kind === "money") { const n = Number(v); return <span className={"tabular " + (n < 0 ? "text-[#d97706]" : "")}>{fmtMoney(v)}</span>; }
  if (kind === "num") return <span className="tabular">{String(v)}</span>;
  if (kind === "date") return <span className="text-txt/85">{fmtDate(v)}</span>;
  if (kind === "badge") return <span className="inline-block bg-[#eaf1fb] rounded px-1.5 py-0.5 text-xxs">{String(v)}</span>;
  const s = String(v);
  return <span title={s}>{s.length > 26 ? s.slice(0, 24) + "…" : s}</span>;
}

const selCls = "bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-acc";

export default function VivaPage() {
  const [f, setF] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("viva_data_hora");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [detail, setDetail] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => { setF({ ...f, ...patch }); setPage(0); };

  const kpis = useQuery({
    queryKey: ["vkpis", f],
    queryFn: async () => (await fetch(`/api/viva/kpis?${buildParams(f)}`)).json(),
    placeholderData: keepPreviousData,
  });
  const data = useQuery({
    queryKey: ["viva", f, sort, dir, page],
    queryFn: async () =>
      (await fetch(`/api/viva?${buildParams(f, { sort, dir, limit: String(PAGE), offset: String(page * PAGE) })}`)).json() as Promise<{ rows: Vrow[]; total: number; error?: string }>,
    placeholderData: keepPreviousData,
  });

  const onSort = (k: string) => {
    if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("desc"); }
    setPage(0);
  };

  const exportCsv = async () => {
    const j = await (await fetch(`/api/viva?${buildParams(f, { sort, dir, limit: "5000", offset: "0" })}`)).json();
    const esc = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [COLS.map((c) => c.l).join(";"), ...(j.rows as Vrow[]).map((r) => COLS.map((c) => esc(r[c.k])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "viva_reservas.csv"; a.click();
  };

  const k = kpis.data && !kpis.data.error ? kpis.data : undefined;
  const total = data.data?.total ?? 0;
  const totPages = Math.ceil(total / PAGE);

  return (
    <main className="px-5 py-4 max-w-[1700px] mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-bold">💳 Conciliação Viva → Reserva</h1>
        <span className="text-mut text-xs">cada pagamento Viva ligado à melhor reserva</span>
        <div className="ml-auto"><Nav /></div>
      </header>

      {/* KPIs */}
      <div className="flex flex-wrap gap-2.5 mb-3">
        <Kpi n={k ? k.total.toLocaleString("pt-PT") : "…"} l="pagamentos Viva" />
        <Kpi n={k ? k.com_reserva.toLocaleString("pt-PT") : "…"} l="com reserva" tone="#16a34a" />
        <Kpi n={k ? k.sem_reserva.toLocaleString("pt-PT") : "…"} l="sem reserva" tone="#dc2626" />
        <Kpi n={k ? k.alta.toLocaleString("pt-PT") : "…"} l="confiança alta" tone="#16a34a" />
        <Kpi n={k ? k.media.toLocaleString("pt-PT") : "…"} l="média" tone="#d97706" />
        <Kpi n={k ? k.baixa.toLocaleString("pt-PT") : "…"} l="baixa" tone="#ea580c" />
        <Kpi n={k ? k.revisao.toLocaleString("pt-PT") : "…"} l="rever manual" tone="#d97706" />
        <Kpi n={k ? fmtEur0(k.eur_total) : "…"} l="€ total Viva" />
        <Kpi n={k ? fmtEur0(k.eur_sem_reserva) : "…"} l="€ por anexar" tone="#dc2626" />
      </div>

      {/* Filtros */}
      <div className="bg-panel border border-line rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="text-mut text-xxs uppercase">Pesquisa</label>
          <input className={selCls + " w-full"} placeholder="matrícula, transaction, email, cliente…"
            defaultValue={f.search || ""}
            onKeyDown={(e) => { if (e.key === "Enter") set({ search: (e.target as HTMLInputElement).value }); }}
            onBlur={(e) => set({ search: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Confiança</label>
          <select className={selCls} value={f.confianca || ""} onChange={(e) => set({ confianca: e.target.value || undefined })}>
            <option value="">todas</option>
            <option value="alta">alta</option>
            <option value="media">média</option>
            <option value="baixa">baixa</option>
            <option value="nenhuma">nenhuma</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Fonte reserva</label>
          <select className={selCls} value={f.fonte || ""} onChange={(e) => set({ fonte: e.target.value || undefined })}>
            <option value="">todas</option>
            <option value="multipark">multipark</option>
            <option value="backoffice">backoffice</option>
            <option value="caixa">caixa</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Revisto por mim</label>
          <select className={selCls} value={f.revisto || ""} onChange={(e) => set({ revisto: e.target.value || undefined })}>
            <option value="">todas</option>
            <option value="sim">já revistas</option>
            <option value="nao">por rever</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Saída de</label>
          <input type="date" className={selCls} value={f.dataDe || ""} onChange={(e) => set({ dataDe: e.target.value || undefined })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Saída até</label>
          <input type="date" className={selCls} value={f.dataAte || ""} onChange={(e) => set({ dataAte: e.target.value || undefined })} />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soSemReserva} onChange={(e) => set({ soSemReserva: e.target.checked, soComReserva: false })} /> só sem reserva
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soComReserva} onChange={(e) => set({ soComReserva: e.target.checked, soSemReserva: false })} /> só com reserva
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soAmbiguos} onChange={(e) => set({ soAmbiguos: e.target.checked })} /> só ambíguos
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soRevisao} onChange={(e) => set({ soRevisao: e.target.checked })} /> só rever manual
        </label>
        <div className="flex gap-2 ml-auto mb-0.5">
          <button className="bg-transparent border border-line text-mut rounded-md px-3 py-1.5 text-xs hover:border-acc" onClick={() => setF({})}>limpar</button>
          <button className="bg-transparent border border-line text-mut rounded-md px-3 py-1.5 text-xs hover:border-acc" onClick={exportCsv}>exportar CSV</button>
        </div>
      </div>

      {data.data?.error && <div className="bg-[#fdecec] border border-[#f3b4b4] text-[#b91c1c] rounded-lg p-3 mb-3 text-xs">Erro: {data.data.error}</div>}

      {/* Grelha */}
      <div className="border border-line rounded-xl overflow-auto max-h-[64vh]">
        <table className="border-collapse text-xs w-max min-w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              {COLS.map((c) => (
                <th key={c.k} onClick={c.sort ? () => onSort(c.k) : undefined}
                  className={"px-2 py-1.5 text-left whitespace-nowrap border-b border-line bg-panel text-mut font-semibold " + (c.sort ? "cursor-pointer hover:bg-[#eaf1fb]" : "")}>
                  {c.l}{c.sort && sort === c.k ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.data?.rows ?? []).map((raw, i) => {
              // atribuição manual sobrepõe o match automático ("" = retirado)
              const r = raw.atrib_mp === ""
                ? { ...raw, reserva_id: null, matricula: null, confianca: "retirado", match_metodo: "retirado manualmente" }
                : raw.atrib_mp
                ? { ...raw, reserva_id: raw.atrib_mp, matricula: raw.atrib_mat ?? raw.matricula, confianca: "manual", match_metodo: "atribuição manual" }
                : raw;
              const rid = (r.reserva_id || r.matricula) as string | undefined;
              return (
                <tr key={i} onClick={() => rid && setDetail(String(rid))}
                  className={"border-b border-line/40 " + (rid ? "hover:bg-[#eaf1fb] cursor-pointer" : "opacity-60")}>
                  {COLS.map((c) => <td key={c.k} className="px-2 py-1 whitespace-nowrap max-w-[230px] overflow-hidden text-ellipsis">{cell(c.kind, r[c.k])}</td>)}
                </tr>
              );
            })}
            {!(data.data?.rows ?? []).length && <tr><td colSpan={COLS.length} className="px-3 py-6 text-mut text-center">sem resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 mt-3 text-xs">
        <button className="border border-line rounded-md px-3 py-1.5 text-mut hover:border-acc disabled:opacity-40" disabled={page === 0} onClick={() => setPage((x) => Math.max(0, x - 1))}>← anterior</button>
        <span className="text-mut">página {page + 1} de {totPages || 1} · {total.toLocaleString("pt-PT")} pagamentos {data.isFetching && "· a carregar…"}</span>
        <button className="border border-line rounded-md px-3 py-1.5 text-mut hover:border-acc disabled:opacity-40" disabled={page + 1 >= totPages} onClick={() => setPage((x) => x + 1)}>seguinte →</button>
      </div>

      {detail && <RowDetail id={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}

function Kpi({ n, l, tone }: { n: string; l: string; tone?: string }) {
  return (
    <div className="bg-panel2 border border-line rounded-lg px-3.5 py-3 min-w-[120px]">
      <div className="text-[22px] font-bold tabular" style={{ color: tone || "#14233f" }}>{n}</div>
      <div className="text-mut text-xxs mt-0.5">{l}</div>
    </div>
  );
}
