"use client";
import type { Filters } from "@/lib/schema";

interface Meta {
  cidades: string[]; estados: string[]; metodos: string[]; tiposStripe: string[];
}

const sel = "bg-panel2 border border-line rounded-md px-2 py-1.5 text-xs min-w-[120px] focus:outline-none focus:border-acc";
const inp = sel;

export function FiltersBar({
  f, meta, onChange, onExport,
}: {
  f: Filters;
  meta: Meta | undefined;
  onChange: (f: Filters) => void;
  onExport: () => void;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  return (
    <div className="bg-panel border border-line rounded-xl p-3 mb-3 flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
        <label className="text-mut text-xxs uppercase tracking-wide">Pesquisa</label>
        <input
          className={inp + " w-full"} placeholder="matrícula, multiparkId, pi_…"
          defaultValue={f.search || ""}
          onKeyDown={(e) => { if (e.key === "Enter") set({ search: (e.target as HTMLInputElement).value }); }}
          onBlur={(e) => set({ search: e.target.value })}
        />
      </div>
      <Field label="Cidade">
        <select className={sel} value={f.cidade || ""} onChange={(e) => set({ cidade: e.target.value || undefined })}>
          <option value="">todas</option>
          {meta?.cidades.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Estado">
        <select className={sel} value={f.estado || ""} onChange={(e) => set({ estado: e.target.value || undefined })}>
          <option value="">todos</option>
          {meta?.estados.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Método (MP)">
        <select className={sel} value={f.metodo || ""} onChange={(e) => set({ metodo: e.target.value || undefined })}>
          <option value="">todos</option>
          {meta?.metodos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Tipo Stripe">
        <select className={sel} value={f.tipoStripe || ""} onChange={(e) => set({ tipoStripe: e.target.value || undefined })}>
          <option value="">todos</option>
          {meta?.tiposStripe.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="PaymentIntent">
        <select className={sel} value={f.comPi || ""} onChange={(e) => set({ comPi: e.target.value as Filters["comPi"] })}>
          <option value="">todos</option>
          <option value="sim">com pi_</option>
          <option value="nao">sem pi_</option>
        </select>
      </Field>
      <Field label="Revisão">
        <select className={sel} value={f.revisaoEstado || ""} onChange={(e) => set({ revisaoEstado: e.target.value || undefined })}>
          <option value="">todas</option>
          <option value="ok">OK</option>
          <option value="pendente">Pendente</option>
          <option value="problema">Problema</option>
        </select>
      </Field>
      <Field label="Revisto por mim">
        <select className={sel} value={f.revisto || ""} onChange={(e) => set({ revisto: e.target.value || undefined })}>
          <option value="">todas</option>
          <option value="sim">já revistas</option>
          <option value="nao">por rever</option>
        </select>
      </Field>
      <Field label="Saída de">
        <input type="date" className={inp} value={f.dataDe || ""} onChange={(e) => set({ dataDe: e.target.value || undefined })} />
      </Field>
      <Field label="Saída até">
        <input type="date" className={inp} value={f.dataAte || ""} onChange={(e) => set({ dataAte: e.target.value || undefined })} />
      </Field>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-1 mb-1.5 basis-full">
        <Chk on={!!f.soFechoCaixa} set={(v) => set({ soFechoCaixa: v })} label="só Fecho de Caixa" />
        <Chk on={!!f.soComDiferencas} set={(v) => set({ soComDiferencas: v })} label="só com diferenças" />
        <Chk on={!!f.soDivergencias} set={(v) => set({ soDivergencias: v })} label="valor diverge" />
        <Chk on={!!f.metodoDiverge} set={(v) => set({ metodoDiverge: v })} label="método diverge" />
        <Chk on={!!f.campanhaDiverge} set={(v) => set({ campanhaDiverge: v })} label="campanha diverge" />
        <Chk on={!!f.actionDiverge} set={(v) => set({ actionDiverge: v })} label="action diverge" />
        <Chk on={!!f.campanhaSemPgto} set={(v) => set({ campanhaSemPgto: v })} label="campanha s/ pagamento" />
      </div>
      <div className="flex gap-2 ml-auto mb-0.5">
        <button className="bg-transparent border border-line text-mut rounded-md px-3 py-1.5 text-xs hover:border-acc"
          onClick={() => onChange({})}>limpar</button>
        <button className="bg-transparent border border-line text-mut rounded-md px-3 py-1.5 text-xs hover:border-acc"
          onClick={onExport}>exportar CSV</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-mut text-xxs uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Chk({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-mut cursor-pointer">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
}
