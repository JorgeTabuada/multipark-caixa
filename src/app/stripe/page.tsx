"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Nav } from "@/components/Nav";
import { RowDetail } from "@/components/RowDetail";
import { fmtMoney, fmtDate, fmtEur0 } from "@/lib/format";

const PAGE = 100;

interface Filters {
  search?: string; status?: string; stripeStatus?: string; soErrado?: boolean; soSemReserva?: boolean;
  dataDe?: string; dataAte?: string;
}
type Row = Record<string, unknown>;

const COLS: { k: string; l: string; kind: string; sort?: boolean }[] = [
  { k: "valor_status", l: "Estado valor", kind: "status" },
  { k: "stripe_data", l: "Data Stripe", kind: "date", sort: true },
  { k: "stripe_amount", l: "Valor Stripe", kind: "money", sort: true },
  { k: "stripe_tipo", l: "Tipo", kind: "badge" },
  { k: "stripe_status", l: "Estado Stripe", kind: "badge" },
  { k: "matricula", l: "Matrícula", kind: "text", sort: true },
  { k: "mp_cliente", l: "Cliente", kind: "text" },
  { k: "mp_id", l: "ID Multipark", kind: "text" },
  { k: "cidade", l: "Cidade", kind: "badge" },
  { k: "pi_bases", l: "PI registado em", kind: "badge" },
  { k: "n_bases", l: "# bases", kind: "num", sort: true },
  { k: "valor_mp", l: "Valor Multipark", kind: "money" },
  { k: "dif_mp", l: "Δ MP", kind: "money" },
  { k: "valor_bo", l: "Valor Backoffice", kind: "money" },
  { k: "dif_bo", l: "Δ BO", kind: "money" },
  { k: "valor_caixa", l: "Valor Caixa", kind: "money" },
  { k: "dif_caixa", l: "Δ Caixa", kind: "money" },
  { k: "dif_max", l: "Δ máx", kind: "money", sort: true },
  { k: "pi", l: "PI Stripe", kind: "text" },
  { k: "pi_mp", l: "PI Multipark", kind: "text" },
  { k: "pi_bo", l: "PI Backoffice", kind: "text" },
  { k: "pi_caixa", l: "PI Caixa", kind: "text" },
  { k: "stripe_email", l: "Email Stripe", kind: "text" },
];

const ST_COLOR: Record<string, string> = {
  "valor certo": "#16a34a", "valor errado": "#dc2626", "sem reserva": "#64748b",
};

function buildParams(f: Filters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.search) p.set("search", f.search);
  if (f.status) p.set("status", f.status);
  if (f.stripeStatus) p.set("stripeStatus", f.stripeStatus);
  if (f.soErrado) p.set("soErrado", "1");
  if (f.soSemReserva) p.set("soSemReserva", "1");
  if (f.dataDe) p.set("dataDe", f.dataDe);
  if (f.dataAte) p.set("dataAte", f.dataAte);
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p.toString();
}

function cell(kind: string, v: unknown) {
  if (kind === "status") {
    const s = String(v ?? "");
    return <span className="px-1.5 py-0.5 rounded text-xxs font-semibold"
      style={{ background: (ST_COLOR[s] || "#444") + "33", color: ST_COLOR[s] || "#aaa" }}>{s}</span>;
  }
  if (v === null || v === undefined || v === "") return <span className="text-mut/40">·</span>;
  if (kind === "money") { const n = Number(v); return <span className={"tabular " + (n < 0 ? "text-[#d97706]" : n > 0 ? "text-[#dc2626]" : "")}>{fmtMoney(v)}</span>; }
  if (kind === "num") return <span className="tabular">{String(v)}</span>;
  if (kind === "date") return <span className="text-txt/85">{fmtDate(v)}</span>;
  if (kind === "badge") return <span className="inline-block bg-[#eaf1fb] rounded px-1.5 py-0.5 text-xxs">{String(v)}</span>;
  const s = String(v);
  return <span title={s}>{s.length > 26 ? s.slice(0, 24) + "…" : s}</span>;
}

const selCls = "bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-acc";

export default function StripePage() {
  const [f, setF] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("stripe_data");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [detail, setDetail] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => { setF({ ...f, ...patch }); setPage(0); };

  const meta = useQuery({
    queryKey: ["smeta"],
    queryFn: async () => (await fetch("/api/stripe/meta")).json() as Promise<{ stripeStatus: { v: string; n: number }[] }>,
  });
  const kpis = useQuery({
    queryKey: ["skpis", f],
    queryFn: async () => (await fetch(`/api/stripe/kpis?${buildParams(f)}`)).json(),
    placeholderData: keepPreviousData,
  });
  const data = useQuery({
    queryKey: ["stripe", f, sort, dir, page],
    queryFn: async () =>
      (await fetch(`/api/stripe?${buildParams(f, { sort, dir, limit: String(PAGE), offset: String(page * PAGE) })}`)).json() as Promise<{ rows: Row[]; total: number; error?: string }>,
    placeholderData: keepPreviousData,
  });

  const onSort = (k: string) => {
    if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("desc"); }
    setPage(0);
  };
  const exportCsv = async () => {
    const j = await (await fetch(`/api/stripe?${buildParams(f, { sort, dir, limit: "5000", offset: "0" })}`)).json();
    const esc = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = [COLS.map((c) => c.l).join(";"), ...(j.rows as Row[]).map((r) => COLS.map((c) => esc(r[c.k])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "stripe_reservas.csv"; a.click();
  };

  const k = kpis.data && !kpis.data.error ? kpis.data : undefined;
  const total = data.data?.total ?? 0;
  const totPages = Math.ceil(total / PAGE);

  return (
    <main className="px-5 py-4 max-w-[1700px] mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-bold">🟣 Conciliação Stripe → Reserva</h1>
        <span className="text-mut text-xs">cada pagamento Stripe ligado por paymentIntent; valor vs todas as bases</span>
        <div className="ml-auto"><Nav /></div>
      </header>

      <div className="flex flex-wrap gap-2.5 mb-3">
        <Kpi n={k ? k.total.toLocaleString("pt-PT") : "…"} l="pagamentos Stripe" />
        <Kpi n={k ? k.certo.toLocaleString("pt-PT") : "…"} l="valor certo" tone="#16a34a" />
        <Kpi n={k ? k.errado.toLocaleString("pt-PT") : "…"} l="valor errado" tone="#dc2626" />
        <Kpi n={k ? k.sem_reserva.toLocaleString("pt-PT") : "…"} l="sem reserva" tone="#64748b" />
        <Kpi n={k ? fmtEur0(k.eur_total) : "…"} l="€ total Stripe" />
        <Kpi n={k ? fmtEur0(k.eur_divergencia) : "…"} l="€ em divergência" tone="#dc2626" />
        <Kpi n={k ? fmtEur0(k.eur_sem_reserva) : "…"} l="€ sem reserva" tone="#d97706" />
      </div>

      <div className="bg-panel border border-line rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="text-mut text-xxs uppercase">Pesquisa</label>
          <input className={selCls + " w-full"} placeholder="matrícula, pi_, charge, email, cliente…"
            defaultValue={f.search || ""}
            onKeyDown={(e) => { if (e.key === "Enter") set({ search: (e.target as HTMLInputElement).value }); }}
            onBlur={(e) => set({ search: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Estado valor</label>
          <select className={selCls} value={f.status || ""} onChange={(e) => set({ status: e.target.value || undefined })}>
            <option value="">todos</option>
            <option value="valor certo">valor certo</option>
            <option value="valor errado">valor errado</option>
            <option value="sem reserva">sem reserva</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Estado Stripe</label>
          <select className={selCls} value={f.stripeStatus || ""} onChange={(e) => set({ stripeStatus: e.target.value || undefined })}>
            <option value="">todos</option>
            {meta.data?.stripeStatus?.map((s) => (
              <option key={s.v} value={s.v}>{s.v} ({s.n})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Data de</label>
          <input type="date" className={selCls} value={f.dataDe || ""} onChange={(e) => set({ dataDe: e.target.value || undefined })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Data até</label>
          <input type="date" className={selCls} value={f.dataAte || ""} onChange={(e) => set({ dataAte: e.target.value || undefined })} />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soErrado} onChange={(e) => set({ soErrado: e.target.checked })} /> só valor errado
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soSemReserva} onChange={(e) => set({ soSemReserva: e.target.checked })} /> só sem reserva
        </label>
        <div className="flex gap-2 ml-auto mb-0.5">
          <button className="bg-transparent border border-line text-mut rounded-md px-3 py-1.5 text-xs hover:border-acc" onClick={() => setF({})}>limpar</button>
          <button className="bg-transparent border border-line text-mut rounded-md px-3 py-1.5 text-xs hover:border-acc" onClick={exportCsv}>exportar CSV</button>
        </div>
      </div>

      {data.data?.error && <div className="bg-[#fdecec] border border-[#f3b4b4] text-[#b91c1c] rounded-lg p-3 mb-3 text-xs">Erro: {data.data.error}</div>}

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
              const r = raw.atrib_mp === ""
                ? { ...raw, mp_id: null, matricula: raw.matricula }
                : raw.atrib_mp ? { ...raw, mp_id: raw.atrib_mp, matricula: raw.atrib_mat ?? raw.matricula } : raw;
              const rid = (r.mp_id || r.matricula) as string | undefined;
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
