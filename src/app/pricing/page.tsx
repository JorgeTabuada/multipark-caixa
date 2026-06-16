"use client";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Nav } from "@/components/Nav";
import { PricingDetail } from "@/components/PricingDetail";
import { RowDetail } from "@/components/RowDetail";
import { fmtMoney, fmtDate, fmtEur0 } from "@/lib/format";

const PAGE = 100;
type Row = Record<string, unknown>;
interface Filters {
  search?: string; soMulti?: boolean; soProblema?: boolean; soFaltaPagar?: boolean; soSuspeito?: boolean;
  revisto?: string; dataDe?: string; dataAte?: string;
}
interface Item { total?: number; description?: string; amountPaid?: number; paymentMethod?: string; }

function buildParams(f: Filters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.search) p.set("search", f.search);
  if (f.soMulti) p.set("soMulti", "1");
  if (f.soProblema) p.set("soProblema", "1");
  if (f.soFaltaPagar) p.set("soFaltaPagar", "1");
  if (f.soSuspeito) p.set("soSuspeito", "1");
  if (f.revisto) p.set("revisto", f.revisto);
  if (f.dataDe) p.set("dataDe", f.dataDe);
  if (f.dataAte) p.set("dataAte", f.dataAte);
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p.toString();
}

// rende os itens do pricing de forma compacta: "Reserva 85€ Online · Entrega 15€ MB"
function PricingItens({ json }: { json: unknown }) {
  let arr: Item[] = [];
  try { arr = Array.isArray(json) ? json : JSON.parse(String(json)); } catch { /* */ }
  if (!arr?.length) return <span className="text-mut/40">·</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {arr.map((it, i) => (
        <span key={i} className="whitespace-nowrap">
          <span className="text-mut">{it.description || "?"}</span>{" "}
          <span className="tabular font-medium">{it.total != null ? fmtMoney(it.total) : ""}</span>{" "}
          <span className={"px-1 rounded text-xxs " + (it.paymentMethod ? "bg-chip" : "bg-badbg text-bad")}>
            {it.paymentMethod || "sem método"}
          </span>
        </span>
      ))}
    </div>
  );
}

const selCls = "bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-acc";

export default function PricingPage() {
  const [f, setF] = useState<Filters>({});
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("saida");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [detail, setDetail] = useState<Row | null>(null);
  const [detalheRes, setDetalheRes] = useState<string | null>(null);
  const set = (patch: Partial<Filters>) => { setF({ ...f, ...patch }); setPage(0); };

  const kpis = useQuery({
    queryKey: ["pkpis", f],
    queryFn: async () => (await fetch(`/api/pricing/kpis?${buildParams(f)}`)).json(),
    placeholderData: keepPreviousData,
  });
  const data = useQuery({
    queryKey: ["pricing", f, sort, dir, page],
    queryFn: async () =>
      (await fetch(`/api/pricing?${buildParams(f, { sort, dir, limit: String(PAGE), offset: String(page * PAGE) })}`)).json() as Promise<{ rows: Row[]; total: number; error?: string }>,
    placeholderData: keepPreviousData,
  });

  const onSort = (k: string) => {
    if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(k); setDir("desc"); }
    setPage(0);
  };
  const k = kpis.data && !kpis.data.error ? kpis.data : undefined;
  const total = data.data?.total ?? 0;
  const totPages = Math.ceil(total / PAGE);

  return (
    <main className="px-5 py-4 max-w-[1700px] mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-bold">🧾 Pricing</h1>
        <span className="text-mut text-xs">decomposição do pricing (valet · estacionamento · extras) e tipos de pagamento</span>
        <div className="ml-auto"><Nav /></div>
      </header>

      <div className="flex flex-wrap gap-2.5 mb-3">
        <Kpi n={k ? k.total.toLocaleString("pt-PT") : "…"} l="reservas c/ pricing" />
        <Kpi n={k ? k.multi.toLocaleString("pt-PT") : "…"} l="≥2 tipos pagamento" tone="#1d6fe6" />
        <Kpi n={k ? k.sem_metodo.toLocaleString("pt-PT") : "…"} l="item sem método" tone="#dc2626" />
        <Kpi n={k ? k.falta_pagar_n.toLocaleString("pt-PT") : "…"} l="por pagar" tone="#dc2626" />
        <Kpi n={k ? fmtEur0(k.falta_pagar_eur) : "…"} l="€ por pagar" tone="#dc2626" />
        <Kpi n={k ? (k.suspeito ?? 0).toLocaleString("pt-PT") : "…"} l="valor suspeito" tone="#dc2626" />
        <Kpi n={k ? k.difere_caixa.toLocaleString("pt-PT") : "…"} l="difere da caixa" tone="#d97706" />
        <Kpi n={k ? fmtEur0(k.eur_valet) : "…"} l="€ valet (pago)" />
        <Kpi n={k ? fmtEur0(k.eur_estacionamento) : "…"} l="€ estacionamento (pago)" />
        <Kpi n={k ? fmtEur0(k.eur_extras) : "…"} l="€ extras (pago)" />
      </div>

      <div className="bg-panel border border-line rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <label className="text-mut text-xxs uppercase">Pesquisa</label>
          <input className={selCls + " w-full"} placeholder="matrícula, multiparkId, método…"
            defaultValue={f.search || ""}
            onKeyDown={(e) => { if (e.key === "Enter") set({ search: (e.target as HTMLInputElement).value }); }}
            onBlur={(e) => set({ search: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Saída de</label>
          <input type="date" className={selCls} value={f.dataDe || ""} onChange={(e) => set({ dataDe: e.target.value || undefined })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Saída até</label>
          <input type="date" className={selCls} value={f.dataAte || ""} onChange={(e) => set({ dataAte: e.target.value || undefined })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-mut text-xxs uppercase">Revisto por mim</label>
          <select className={selCls} value={f.revisto || ""} onChange={(e) => set({ revisto: e.target.value || undefined })}>
            <option value="">todas</option>
            <option value="sim">já revistas</option>
            <option value="nao">por rever</option>
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soMulti} onChange={(e) => set({ soMulti: e.target.checked })} /> só ≥2 tipos de pagamento
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soProblema} onChange={(e) => set({ soProblema: e.target.checked })} /> só com problema
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soFaltaPagar} onChange={(e) => set({ soFaltaPagar: e.target.checked })} /> só por pagar
        </label>
        <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer mb-1.5">
          <input type="checkbox" checked={!!f.soSuspeito} onChange={(e) => set({ soSuspeito: e.target.checked })} /> só valor suspeito
        </label>
      </div>

      {data.data?.error && <div className="bg-badbg border border-line text-bad rounded-lg p-3 mb-3 text-xs">Erro: {data.data.error}</div>}

      <div className="border border-line rounded-xl overflow-auto max-h-[64vh]">
        <table className="border-collapse text-xs w-max min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-panel">
              <Th label="Matrícula" k="matricula" sort={sort} dir={dir} onSort={onSort} />
              <th className="px-2 py-1.5 text-left text-mut font-semibold">Cidade</th>
              <Th label="Saída" k="saida" sort={sort} dir={dir} onSort={onSort} />
              <Th label="Valor reserva" k="valor_reserva" sort={sort} dir={dir} onSort={onSort} num />
              <th className="px-2 py-1.5 text-left text-mut font-semibold">Itens do pricing</th>
              <Th label="Métodos" k="n_metodos" sort={sort} dir={dir} onSort={onSort} />
              <Th label="Total" k="soma_total" sort={sort} dir={dir} onSort={onSort} num />
              <Th label="Pago" k="soma_paga" sort={sort} dir={dir} onSort={onSort} num />
              <th className="px-2 py-1.5 text-right text-mut font-semibold">Por pagar</th>
              <th className="px-2 py-1.5 text-right text-mut font-semibold">Valet pago</th>
              <th className="px-2 py-1.5 text-right text-mut font-semibold">Estac. pago</th>
              <th className="px-2 py-1.5 text-right text-mut font-semibold">Extras pago</th>
              <th className="px-2 py-1.5 text-left text-mut font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(data.data?.rows ?? []).map((r, i) => {
              const falta = Number(r.falta_pagar) || 0;
              const probl: string[] = [];
              if (r.multi_pagamento) probl.push("≥2 pagamentos");
              if (r.tem_metodo_vazio) probl.push("sem método");
              if (falta > 0.01) probl.push("por pagar");
              if (r.valor_suspeito) probl.push("valor suspeito ⚠");
              if (r.difere_caixa) probl.push("≠ caixa");
              return (
                <tr key={i} onClick={() => setDetail(r)}
                  className="border-b border-line/40 hover:bg-[#eaf1fb] cursor-pointer align-top">
                  <td className="px-2 py-1.5 font-medium">{String(r.matricula ?? "")}</td>
                  <td className="px-2 py-1.5"><span className="bg-chip rounded px-1.5 py-0.5 text-xxs">{String(r.cidade ?? "")}</span></td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-txt/80">{fmtDate(r.saida)}</td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtMoney(r.valor_reserva)}</td>
                  <td className="px-2 py-1.5"><PricingItens json={r.pricing_json} /></td>
                  <td className="px-2 py-1.5">{r.multi_pagamento ? <span className="bg-[#e0ecff] text-acc rounded px-1.5 py-0.5 text-xxs font-semibold">{String(r.metodos)}</span> : <span className="text-mut">{String(r.metodos ?? "")}</span>}</td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtMoney(r.soma_total)}</td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtMoney(r.soma_paga)}</td>
                  <td className={"px-2 py-1.5 text-right tabular " + (falta > 0.01 ? "text-bad font-semibold" : "text-mut/40")}>{falta > 0.01 ? fmtMoney(falta) : "·"}</td>
                  <td className="px-2 py-1.5 text-right tabular text-mut">{Number(r.v_valet) ? fmtMoney(r.v_valet) : "·"}</td>
                  <td className="px-2 py-1.5 text-right tabular text-mut">{Number(r.v_estacionamento) ? fmtMoney(r.v_estacionamento) : "·"}</td>
                  <td className="px-2 py-1.5 text-right tabular text-mut">{Number(r.v_extras) ? fmtMoney(r.v_extras) : "·"}</td>
                  <td className="px-2 py-1.5">
                    {probl.length === 0 ? <span className="text-ok">✓</span> :
                      <span className="text-bad text-xxs">{probl.join(" · ")}</span>}
                  </td>
                </tr>
              );
            })}
            {!(data.data?.rows ?? []).length && <tr><td colSpan={13} className="px-3 py-6 text-mut text-center">sem resultados</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 mt-3 text-xs">
        <button className="border border-line rounded-md px-3 py-1.5 text-mut hover:border-acc disabled:opacity-40" disabled={page === 0} onClick={() => setPage((x) => Math.max(0, x - 1))}>← anterior</button>
        <span className="text-mut">página {page + 1} de {totPages || 1} · {total.toLocaleString("pt-PT")} reservas {data.isFetching && "· a carregar…"}</span>
        <button className="border border-line rounded-md px-3 py-1.5 text-mut hover:border-acc disabled:opacity-40" disabled={page + 1 >= totPages} onClick={() => setPage((x) => x + 1)}>seguinte →</button>
      </div>

      {detail && <PricingDetail row={detail} onClose={() => setDetail(null)}
        onAbrirReserva={(id) => { setDetail(null); setDetalheRes(id); }} />}
      {detalheRes && <RowDetail id={detalheRes} onClose={() => setDetalheRes(null)} />}
    </main>
  );
}

function Th({ label, k, sort, dir, onSort, num }: { label: string; k: string; sort: string; dir: string; onSort: (k: string) => void; num?: boolean }) {
  return (
    <th onClick={() => onSort(k)}
      className={"px-2 py-1.5 text-mut font-semibold cursor-pointer hover:bg-[#eaf1fb] whitespace-nowrap " + (num ? "text-right" : "text-left")}>
      {label}{sort === k ? (dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
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
