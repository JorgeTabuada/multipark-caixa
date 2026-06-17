"use client";
import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { VisibilityState } from "@tanstack/react-table";
import { COLUMNS, FLAGS, SOURCES, type Filters, type Row } from "@/lib/schema";
import { Kpis } from "@/components/Kpis";
import { FiltersBar } from "@/components/Filters";
import { ColumnPicker } from "@/components/ColumnPicker";
import { Grid } from "@/components/Grid";
import { RowDetail } from "@/components/RowDetail";
import { Nav } from "@/components/Nav";

const PAGE = 100;

function initialVisibility(): VisibilityState {
  const v: VisibilityState = {};
  COLUMNS.forEach((c) => (v[c.key] = !!c.defaultOn));
  FLAGS.forEach((f) => (v[f.key] = !!f.on));
  return v;
}

function buildParams(f: Filters, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.search) p.set("search", f.search);
  if (f.cidade) p.set("cidade", f.cidade);
  if (f.estado) p.set("estado", f.estado);
  if (f.metodo) p.set("metodo", f.metodo);
  if (f.tipoStripe) p.set("tipoStripe", f.tipoStripe);
  if (f.comPi) p.set("comPi", f.comPi);
  if (f.dataDe) p.set("dataDe", f.dataDe);
  if (f.dataAte) p.set("dataAte", f.dataAte);
  if (f.soDivergencias) p.set("soDivergencias", "1");
  if (f.soFechoCaixa) p.set("soFechoCaixa", "1");
  if (f.metodoDiverge) p.set("metodoDiverge", "1");
  if (f.campanhaDiverge) p.set("campanhaDiverge", "1");
  if (f.actionDiverge) p.set("actionDiverge", "1");
  if (f.campanhaSemPgto) p.set("campanhaSemPgto", "1");
  if (f.soComDiferencas) p.set("soComDiferencas", "1");
  if (f.revisaoEstado) p.set("revisaoEstado", f.revisaoEstado);
  if (f.revisto) p.set("revisto", f.revisto);
  if (f.acaoOcorrencia) p.set("acaoOcorrencia", "1");
  Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p.toString();
}

export default function Page() {
  const [filters, setFilters] = useState<Filters>({ soFechoCaixa: true });
  const [visible, setVisible] = useState<VisibilityState>(initialVisibility);
  const [sort, setSort] = useState("saida_mp");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);

  const meta = useQuery({
    queryKey: ["meta"],
    queryFn: async () => (await fetch("/api/meta")).json(),
  });

  const kpis = useQuery({
    queryKey: ["kpis", filters],
    queryFn: async () => (await fetch(`/api/kpis?${buildParams(filters)}`)).json(),
    placeholderData: keepPreviousData,
  });

  const data = useQuery({
    queryKey: ["recon", filters, sort, dir, page],
    queryFn: async () => {
      const qs = buildParams(filters, {
        sort, dir, limit: String(PAGE), offset: String(page * PAGE),
      });
      const r = await fetch(`/api/reconciliacao?${qs}`);
      return r.json() as Promise<{ rows: Row[]; total: number; error?: string }>;
    },
    placeholderData: keepPreviousData,
  });

  const onSort = (key: string) => {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(key); setDir("desc"); }
    setPage(0);
  };

  const setFiltersReset = (f: Filters) => { setFilters(f); setPage(0); };

  // seletor de colunas
  const toggle = (k: string) => setVisible((v) => ({ ...v, [k]: !v[k] }));
  const setSource = (src: string, on: boolean) =>
    setVisible((v) => {
      const nv = { ...v };
      COLUMNS.filter((c) => c.source === src).forEach((c) => (nv[c.key] = on));
      return nv;
    });
  const setFlags = (on: boolean) =>
    setVisible((v) => { const nv = { ...v }; FLAGS.forEach((f) => (nv[f.key] = on)); return nv; });

  // export CSV das colunas visíveis, conjunto filtrado (até 2000)
  const exportCsv = async () => {
    const qs = buildParams(filters, { sort, dir, limit: "2000", offset: "0" });
    const j = await (await fetch(`/api/reconciliacao?${qs}`)).json();
    const cols = [...COLUMNS, ...FLAGS.map((f) => ({ key: f.key, label: f.label }))]
      .filter((c) => visible[c.key]);
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [
      cols.map((c) => c.label).join(";"),
      ...(j.rows as Row[]).map((row) => cols.map((c) => esc(row[c.key])).join(";")),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "reconciliacao.csv";
    a.click();
  };

  const total = data.data?.total ?? 0;
  const totPages = Math.ceil(total / PAGE);
  const nVisible = useMemo(() => Object.values(visible).filter(Boolean).length, [visible]);

  return (
    <main className="px-5 py-4 max-w-[1700px] mx-auto">
      <header className="flex items-center gap-3 mb-3">
        <h1 className="text-base font-bold">🅿️ Reconciliação Multipark</h1>
        <span className="text-mut text-xs">
          {SOURCES.length - 1} fontes lado a lado · {total.toLocaleString("pt-PT")} reservas no filtro · {nVisible} colunas
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Nav />
          <ColumnPicker visible={visible as Record<string, boolean>} onToggle={toggle} onSource={setSource} onFlags={setFlags} />
        </div>
      </header>

      <Kpis k={kpis.data && !kpis.data.error ? kpis.data : undefined} />
      <FiltersBar f={filters} meta={meta.data} onChange={setFiltersReset} onExport={exportCsv} />

      {data.data?.error && (
        <div className="bg-[#fdecec] border border-[#f3b4b4] text-[#b91c1c] rounded-lg p-3 mb-3 text-xs">
          Erro: {data.data.error}
        </div>
      )}

      <Grid
        rows={data.data?.rows ?? []}
        visible={visible}
        sort={sort} dir={dir}
        onSort={onSort}
        onRowClick={(r) => setDetail(String(r.multipark_id))}
      />

      <div className="flex items-center justify-center gap-3 mt-3 text-xs">
        <button className="border border-line rounded-md px-3 py-1.5 text-mut hover:border-acc disabled:opacity-40"
          disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← anterior</button>
        <span className="text-mut">
          página {page + 1} de {totPages || 1} {data.isFetching && "· a carregar…"}
        </span>
        <button className="border border-line rounded-md px-3 py-1.5 text-mut hover:border-acc disabled:opacity-40"
          disabled={page + 1 >= totPages} onClick={() => setPage((p) => p + 1)}>seguinte →</button>
      </div>

      {detail && <RowDetail id={detail} onClose={() => setDetail(null)}
        ids={(data.data?.rows ?? []).map((r) => String(r.multipark_id))} onNavigate={setDetail} />}
    </main>
  );
}
