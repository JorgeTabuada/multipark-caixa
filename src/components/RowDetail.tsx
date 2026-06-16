"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RAW_KEYS } from "@/lib/schema";
import { fmtMoney, fmtDate } from "@/lib/format";

const LABELS: Record<string, string> = {
  raw_mp: "Multipark", raw_bo: "Backoffice", raw_caixa: "Caixa",
  raw_stripe: "Stripe", raw_est: "Estatística", raw_viva: "Viva",
};

// fontes (colunas) e campos (linhas) — ordem fixa e igual para todas as fontes
const SRCS: [string, string][] = [
  ["mp", "Multipark"], ["bo", "Backoffice"], ["caixa", "Caixa"],
  ["est", "Estatística"], ["stripe", "Stripe"], ["viva", "Viva"],
];
type Campo = { label: string; base: string; kind: "text" | "money" | "date" };
const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  { titulo: "Identificação", campos: [
    { label: "Matrícula", base: "matricula", kind: "text" },
    { label: "Cliente", base: "cliente", kind: "text" },
    { label: "Email", base: "email", kind: "text" },
    { label: "Telefone", base: "telefone", kind: "text" },
    { label: "PaymentIntent", base: "pi", kind: "text" },
  ] },
  { titulo: "Datas", campos: [
    { label: "Entrada", base: "entrada", kind: "date" },
    { label: "Saída", base: "saida", kind: "date" },
    { label: "Data reserva", base: "bookingdate", kind: "date" },
  ] },
  { titulo: "Valores", campos: [
    { label: "Valor reserva", base: "valor", kind: "money" },
    { label: "Preço original", base: "preco_original", kind: "money" },
    { label: "A pagar na entrega", base: "price_on_delivery", kind: "money" },
    { label: "Preço corrigido", base: "preco_corrigido", kind: "money" },
    { label: "Valor pago", base: "pago", kind: "money" },
    { label: "Por pagar/receber", base: "por_pagar", kind: "money" },
    { label: "Valet (não conta)", base: "valet", kind: "money" },
  ] },
  { titulo: "Pagamento", campos: [
    { label: "Método", base: "metodo", kind: "text" },
    { label: "Campanha", base: "campanha", kind: "text" },
    { label: "CampaignPay", base: "campaignpay", kind: "text" },
  ] },
  { titulo: "Estado / Ação", campos: [
    { label: "Action final", base: "action", kind: "text" },
    { label: "Validado", base: "validated", kind: "text" },
    { label: "Validado por", base: "validatedby", kind: "text" },
    { label: "Motorista validado", base: "drivervalidated", kind: "text" },
    { label: "Reserva fechada", base: "closedbooking", kind: "text" },
    { label: "Ocorrência", base: "ocorrence", kind: "text" },
  ] },
];
function fmtVal(kind: string, v: unknown) {
  if (v === null || v === undefined || v === "") return "";
  if (kind === "money") return fmtMoney(v);
  if (kind === "date") return fmtDate(v);
  return String(v);
}

const ESTADOS: { v: string; l: string; color: string }[] = [
  { v: "ok", l: "OK / Resolvido", color: "#16a34a" },
  { v: "pendente", l: "Pendente", color: "#d97706" },
  { v: "problema", l: "Problema", color: "#dc2626" },
];

export function RowDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  // `id` é um termo de pesquisa (multipark id, matrícula ou reserva_id).
  const { data, isLoading } = useQuery({
    queryKey: ["detail", id],
    queryFn: async () => {
      const r = await fetch(`/api/reconciliacao?raw=1&limit=1&search=${encodeURIComponent(id)}`);
      const j = await r.json();
      return (j.rows?.[0] ?? null) as Record<string, unknown> | null;
    },
  });
  // a triagem fica sempre ligada ao multipark_id real da reserva encontrada
  const realId = data?.multipark_id ? String(data.multipark_id) : id;
  const rev = useQuery({
    queryKey: ["revisao", realId],
    queryFn: async () => (await fetch(`/api/revisao?id=${encodeURIComponent(realId)}`)).json() as Promise<{ estado: string | null; notas: string | null }>,
    enabled: !isLoading,
  });

  const [estado, setEstado] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (v: unknown) => {
    const s = String(v ?? "");
    if (!s) return;
    navigator.clipboard?.writeText(s).catch(() => {});
    setCopied(s);
    window.setTimeout(() => setCopied((c) => (c === s ? null : c)), 1500);
  };

  useEffect(() => {
    if (rev.data) { setEstado(rev.data.estado); setNotas(rev.data.notas || ""); setDirty(false); }
  }, [rev.data]);

  const save = useMutation({
    mutationFn: async (payload: { estado: string | null; notas: string }) =>
      fetch("/api/revisao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: realId, ...payload }) }).then((r) => r.json()),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["revisao", realId] });
      qc.invalidateQueries({ queryKey: ["recon"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
    },
  });

  // estado automático sugerido (a partir do detalhe)
  const autoEstado = data ? (Number(data.n_diferencas) === 0 ? "ok" : "pendente") : "pendente";
  const efetivo = estado || autoEstado;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-panel border border-line rounded-xl w-[min(1100px,95vw)] max-h-[88vh] overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Reserva <span className="text-acc">{realId}</span>
            {data && <span className="text-mut font-normal"> · {Number(data.n_diferencas) || 0} campo(s) diferente(s)</span>}
            {!isLoading && !data && <span className="text-[#d97706] font-normal"> · não encontrada na reconciliação</span>}
          </h3>
          <div className="flex items-center gap-3">
            {copied && <span className="text-[#16a34a] text-xxs">copiado: {copied.length > 30 ? copied.slice(0, 28) + "…" : copied}</span>}
            <button className="text-mut hover:text-txt text-lg leading-none" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Cópia rápida dos campos-chave (clica para copiar) */}
        {data && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {([
              ["Matrícula", data.matricula_mp || data.matricula_bo || data.matricula_caixa],
              ["ID Multipark", data.multipark_id],
              ["PaymentIntent", data.pi_mp || data.pi_bo || data.pi_caixa],
              ["PI Stripe", data.pi_stripe],
            ] as [string, unknown][])
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <button key={l} onClick={() => copy(v)} title={`copiar ${String(v)}`}
                  className="bg-panel2 border border-line rounded-md px-2.5 py-1 text-xxs hover:border-acc">
                  📋 {l}: <span className="text-txt/90">{String(v)}</span>
                </button>
              ))}
          </div>
        )}

        {/* Triagem: estado + notas */}
        <div className="bg-panel2 border border-line rounded-lg p-3 mb-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-mut mr-1">Estado:</span>
            {ESTADOS.map((e) => {
              const active = efetivo === e.v;
              return (
                <button key={e.v}
                  onClick={() => { setEstado(e.v); setDirty(true); }}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border"
                  style={active
                    ? { background: e.color, borderColor: e.color, color: "#eef3fa" }
                    : { background: "transparent", borderColor: e.color + "66", color: e.color }}>
                  {e.l}
                </button>
              );
            })}
            {!estado && <span className="text-mut text-xxs">(automático: {autoEstado})</span>}
          </div>
          <textarea
            className="w-full bg-panel border border-line rounded-md p-2 text-xs min-h-[70px] focus:outline-none focus:border-acc"
            placeholder="Notas: o que se passa, o que falta, o que foi feito…"
            value={notas}
            onChange={(e) => { setNotas(e.target.value); setDirty(true); }} />
          <div className="flex items-center gap-2 mt-2">
            <button
              className="bg-acc text-white rounded-md px-4 py-1.5 text-xs font-semibold disabled:opacity-40"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ estado, notas })}>
              {save.isPending ? "a guardar…" : "Guardar"}
            </button>
            {save.isSuccess && !dirty && <span className="text-[#16a34a] text-xxs">guardado ✓</span>}
            {dirty && <span className="text-mut text-xxs">alterações por guardar</span>}
          </div>
        </div>

        {isLoading && <div className="text-mut text-sm">a carregar…</div>}

        {/* Diferenças encontradas — valores lado a lado de cada fonte */}
        {data && (() => {
          const diffs = GRUPOS.flatMap((g) => g.campos).filter((c) => data[`${c.base}_bate`] === false);
          if (!diffs.length) return (
            <div className="bg-okbg border border-line rounded-lg p-3 mb-3 text-sm text-ok font-semibold">✓ Todos os campos comparáveis batem entre as fontes.</div>
          );
          return (
            <div className="bg-badbg border border-line rounded-lg p-3 mb-3">
              <div className="text-sm font-semibold text-bad mb-2">⚠ {diffs.length} campo(s) diferente(s) entre fontes</div>
              <div className="flex flex-col gap-2">
                {diffs.map((c) => (
                  <div key={c.base} className="text-sm">
                    <span className="font-semibold">{c.label}:</span>{" "}
                    {SRCS.filter(([s]) => { const v = data[`${c.base}_${s}`]; return v !== null && v !== undefined && v !== ""; })
                      .map(([s, l]) => (
                        <span key={s} className="inline-block mr-3">
                          <span className="text-mut">{l} = </span>
                          <span className="cursor-pointer hover:text-acc font-medium" title="clicar para copiar"
                            onClick={() => copy(data[`${c.base}_${s}`])}>{fmtVal(c.kind, data[`${c.base}_${s}`])}</span>
                        </span>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Comparação estruturada: campos (linhas) × fontes (colunas), ordem igual para todas */}
        {data && (
          <div className="border border-line rounded-lg overflow-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="bg-panel2">
                  <th className="text-left px-3 py-2 font-semibold text-mut sticky left-0 bg-panel2 min-w-[150px]">Campo</th>
                  {SRCS.map(([, l]) => (
                    <th key={l} className="text-left px-3 py-2 font-semibold text-acc whitespace-nowrap">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRUPOS.map((g) => {
                  // mostrar só campos que existem em pelo menos uma fonte
                  const campos = g.campos.filter((c) => SRCS.some(([s]) => {
                    const v = data[`${c.base}_${s}`]; return v !== null && v !== undefined && v !== "";
                  }));
                  if (!campos.length) return null;
                  return (
                    <FragmentGroup key={g.titulo} titulo={g.titulo}>
                      {campos.map((c) => {
                        const bate = data[`${c.base}_bate`];
                        const divergente = bate === false;
                        return (
                          <tr key={c.base} className={divergente ? "bg-badbg" : ""}>
                            <td className="px-3 py-1.5 text-mut sticky left-0 whitespace-nowrap"
                              style={{ background: divergente ? "#fdecec" : "#fff" }}>
                              {c.label}{divergente && <span className="text-bad ml-1" title="diverge">✗</span>}
                            </td>
                            {SRCS.map(([s]) => {
                              const v = data[`${c.base}_${s}`];
                              const txt = fmtVal(c.kind, v);
                              return (
                                <td key={s} className={"px-3 py-1.5 whitespace-nowrap " + (txt ? "cursor-pointer hover:text-acc" : "text-mut/40")}
                                  title={txt ? "clicar para copiar" : ""}
                                  onClick={() => txt && copy(v)}>
                                  {txt || "—"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </FragmentGroup>
                  );
                })}
                {/* pagamentos online (Stripe / Viva) */}
                <FragmentGroup titulo="Pagamentos recebidos">
                  <tr>
                    <td className="px-3 py-1.5 text-mut sticky left-0 bg-panel whitespace-nowrap">Stripe (online)</td>
                    <td className="px-3 py-1.5 text-mut/40" colSpan={4}>
                      {data.pago_stripe != null ? <span className="cursor-pointer hover:text-acc text-txt" onClick={() => copy(data.pago_stripe)}>{fmtMoney(data.pago_stripe)}</span> : "—"}
                      {data.tipo_stripe ? <span className="text-mut"> · {String(data.tipo_stripe)}</span> : ""}
                      {data.estado_stripe ? <span className="text-mut"> · {String(data.estado_stripe)}</span> : ""}
                    </td>
                    <td className="px-3 py-1.5" colSpan={2}></td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-mut sticky left-0 bg-panel whitespace-nowrap">Viva (TPA)</td>
                    <td className="px-3 py-1.5 text-mut/40" colSpan={4}>
                      {data.pago_viva != null ? <span className="cursor-pointer hover:text-acc text-txt" onClick={() => copy(data.pago_viva)}>{fmtMoney(data.pago_viva)}</span> : "—"}
                      {data.tipo_viva ? <span className="text-mut"> · {String(data.tipo_viva)}</span> : ""}
                    </td>
                    <td className="px-3 py-1.5" colSpan={2}></td>
                  </tr>
                </FragmentGroup>
              </tbody>
            </table>
          </div>
        )}

        {/* dados em bruto (colapsado) */}
        {data && (
          <details className="mt-3">
            <summary className="text-xs text-mut cursor-pointer hover:text-acc">ver dados em bruto de cada fonte</summary>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {RAW_KEYS.map((k) => {
                const raw = data[k];
                return (
                  <div key={k} className="bg-panel2 border border-line rounded-lg p-2.5">
                    <div className="text-xs uppercase tracking-wide text-acc mb-1.5 font-semibold">{LABELS[k]}</div>
                    {raw ? (
                      <table className="text-xs w-full">
                        <tbody>
                          {Object.entries(raw as Record<string, unknown>)
                            .filter(([, v]) => v !== null && v !== "")
                            .map(([kk, vv]) => (
                              <tr key={kk} className="border-b border-line/30">
                                <td className="text-mut pr-2 py-0.5 align-top whitespace-nowrap">{kk}</td>
                                <td className="py-0.5 break-all cursor-pointer hover:text-acc" title="clicar para copiar"
                                  onClick={() => copy(vv)}>{String(vv)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    ) : <div className="text-mut/50 text-xs">— sem correspondência —</div>}
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function FragmentGroup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <tr><td colSpan={7} className="px-3 pt-3 pb-1 text-xxs uppercase tracking-wide text-acc font-semibold bg-panel">{titulo}</td></tr>
      {children}
    </>
  );
}
