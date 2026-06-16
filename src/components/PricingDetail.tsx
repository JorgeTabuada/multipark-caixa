"use client";
import { useState, useEffect, useCallback } from "react";
import { fmtMoney, fmtDate } from "@/lib/format";

interface Item { total?: number; description?: string; amountPaid?: number; paymentMethod?: string; }
type Row = Record<string, unknown>;

function parseItens(json: unknown): Item[] {
  try { return Array.isArray(json) ? json : JSON.parse(String(json)); } catch { return []; }
}

export function PricingDetail({ row, onClose, onAbrirReserva }: { row: Row; onClose: () => void; onAbrirReserva?: (id: string) => void }) {
  const itens = parseItens(row.pricing_json);
  const [copied, setCopied] = useState<string | null>(null);
  const [proc, setProc] = useState<{ valor: number; metodo: string } | null>(null);
  const [res, setRes] = useState<Row[] | null>(null);
  const [outras, setOutras] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [descartados, setDescartados] = useState<Set<string>>(new Set());
  const [atrib, setAtrib] = useState<Row[]>([]);

  const mpId = row.multipark_id ? String(row.multipark_id) : "";
  const carregarAtrib = useCallback(async () => {
    if (!mpId) return;
    const j = await (await fetch(`/api/atribuir?multipark_id=${encodeURIComponent(mpId)}`)).json();
    setAtrib(j.atribuicoes || []);
  }, [mpId]);
  useEffect(() => { carregarAtrib(); }, [carregarAtrib]);

  const atribuir = async (cand: Row, metodo: string) => {
    await fetch("/api/atribuir", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fonte: String(cand.fonte || "").toLowerCase(), ref: cand.ref,
        multipark_id: mpId, matricula: row.matricula, valor: cand.valor, metodo,
      }),
    });
    carregarAtrib();
  };
  const desatribuir = async (a: Row) => {
    await fetch("/api/atribuir", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fonte: a.fonte, ref: a.ref, multipark_id: null }),
    });
    carregarAtrib();
  };
  const jaAtribuido = (fonte: unknown, ref: unknown) =>
    atrib.some((a) => String(a.fonte) === String(fonte).toLowerCase() && String(a.ref) === String(ref));

  const copy = (v: unknown) => {
    const s = String(v ?? ""); if (!s) return;
    navigator.clipboard?.writeText(s).catch(() => {});
    setCopied(s); window.setTimeout(() => setCopied((c) => (c === s ? null : c)), 1500);
  };

  // valor parcial pago por método (soma amountPaid dos itens desse método)
  const porMetodo = new Map<string, number>();
  for (const it of itens) {
    const m = (it.paymentMethod || "").trim() || "(sem método)";
    porMetodo.set(m, (porMetodo.get(m) || 0) + (Number(it.amountPaid) || 0));
  }
  const metodos = [...porMetodo.entries()];

  const procurar = async (valor: number, metodo: string) => {
    setProc({ valor, metodo }); setRes(null); setOutras(null); setLoading(true); setDescartados(new Set());
    const data = String(row.saida || "");
    const excl = row.multipark_id ? `&excluir=${encodeURIComponent(String(row.multipark_id))}` : "";
    const j = await (await fetch(`/api/pricing/procurar?valor=${valor}&data=${encodeURIComponent(data)}&horas=72${excl}`)).json();
    setRes(j.resultados || []); setOutras(j.reservas || []); setLoading(false);
  };
  const descartar = (ref: string) => setDescartados((s) => new Set(s).add(ref));
  const fmtDelta = (sec: number) => {
    const a = Math.abs(sec), sg = sec >= 0 ? "+" : "−";
    if (a < 90) return `${sg}${a}s`;
    if (a < 5400) return `${sg}${Math.round(a / 60)}min`;
    return `${sg}${(a / 3600).toFixed(1)}h`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-panel border border-line rounded-xl w-[min(950px,95vw)] max-h-[88vh] overflow-auto p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Pricing · <span className="text-acc">{String(row.matricula ?? "")}</span>
            <span className="text-mut font-normal text-sm"> · {fmtDate(row.saida)} · {String(row.cidade ?? "")}</span>
          </h3>
          <div className="flex items-center gap-3">
            {copied && <span className="text-ok text-xs">copiado: {copied.length > 28 ? copied.slice(0, 26) + "…" : copied}</span>}
            {onAbrirReserva && !!row.multipark_id && (
              <button className="text-xs border border-acc/50 text-acc rounded-md px-2 py-1 hover:bg-[#e0ecff]"
                onClick={() => onAbrirReserva(String(row.multipark_id))}>detalhe completo →</button>
            )}
            <button className="text-mut hover:text-txt text-lg leading-none" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* cópia rápida */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-sm">
          {([["Matrícula", row.matricula], ["ID Multipark", row.multipark_id]] as [string, unknown][])
            .filter(([, v]) => v).map(([l, v]) => (
              <button key={l} onClick={() => copy(v)} className="bg-panel2 border border-line rounded-md px-2.5 py-1 text-xs hover:border-acc">
                📋 {l}: <span className="font-medium">{String(v)}</span>
              </button>
            ))}
          <span className="ml-auto text-sm text-mut self-center">
            Reserva: <b className="text-txt">{fmtMoney(row.valor_reserva)}</b> · Total pricing: <b className="text-txt">{fmtMoney(row.soma_total)}</b> · Pago: <b className="text-txt">{fmtMoney(row.soma_paga)}</b>
          </span>
        </div>

        {/* pagamentos já atribuídos a esta reserva */}
        {atrib.length > 0 && (
          <div className="bg-okbg border border-ok/30 rounded-lg p-3 mb-3">
            <div className="text-sm font-semibold text-ok mb-1.5">✓ Pagamentos atribuídos a esta reserva</div>
            <div className="flex flex-col gap-1">
              {atrib.map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="bg-chip rounded px-1.5 py-0.5 text-xs">{String(a.fonte)}</span>
                  <span className="tabular font-semibold">{fmtMoney(a.valor)}</span>
                  {a.metodo ? <span className="text-mut">{String(a.metodo)}</span> : null}
                  <span className="text-xs break-all cursor-pointer hover:text-acc" onClick={() => copy(a.ref)}>{String(a.ref)}</span>
                  <button className="ml-auto text-xs text-mut hover:text-bad" onClick={() => desatribuir(a)}>remover</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* valor parcial POR MÉTODO (o que interessa nos pagamentos divididos) */}
        <div className="bg-panel2 border border-line rounded-lg p-3 mb-3">
          <div className="text-sm font-semibold mb-2">Pago por método {metodos.length > 1 && <span className="text-acc">· pagamento dividido</span>}</div>
          <div className="flex flex-col gap-1.5">
            {metodos.map(([m, v]) => (
              <div key={m} className="flex items-center gap-3 text-sm">
                <span className={"rounded px-2 py-0.5 text-xs " + (m === "(sem método)" ? "bg-badbg text-bad" : "bg-chip")}>{m}</span>
                <span className="tabular font-semibold">{fmtMoney(v)}</span>
                {m !== "(sem método)" && (
                  <button onClick={() => procurar(v, m)}
                    className="text-xs border border-line rounded-md px-2 py-1 hover:border-acc text-acc">
                    🔎 procurar {fmtMoney(v)} à volta da data
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* resultados da procura do valor parcial */}
        {proc && (() => {
          const visiveis = (res || []).filter((r) => !descartados.has(String(r.ref)));
          return (
            <div className="border border-acc/40 rounded-lg p-3 mb-3">
              <div className="text-sm font-semibold mb-1">
                Pagamentos de {fmtMoney(proc.valor)} ({proc.metodo}) perto de {fmtDate(row.saida)}
                {loading && <span className="text-mut font-normal"> · a procurar…</span>}
              </div>
              {!loading && visiveis.length > 1 && (
                <div className="text-xs text-bad mb-2">⚠ {visiveis.length} pagamentos com este valor nesta janela — pode ser de outra reserva. Confirma pela hora (o mais próximo de 0s é o mais provável) e descarta os que não são.</div>
              )}
              {res && visiveis.length > 0 ? (
                <table className="text-xs w-full">
                  <thead><tr className="text-mut text-left"><th className="py-1">Fonte</th><th>Valor</th><th>Data</th><th>Δ hora</th><th>Tipo/Estado</th><th>Ref</th><th></th></tr></thead>
                  <tbody>
                    {visiveis.map((r, i) => {
                      const d = Number(r.dsec) || 0;
                      const perto = Math.abs(d) <= 90;
                      return (
                        <tr key={i} className={"border-t border-line/40 " + (i === 0 && perto ? "bg-okbg" : "")}>
                          <td className="py-1"><span className="bg-chip rounded px-1.5 py-0.5">{String(r.fonte)}</span></td>
                          <td className="tabular">{fmtMoney(r.valor)}</td>
                          <td className="whitespace-nowrap">{fmtDate(r.data)}</td>
                          <td className={"tabular " + (perto ? "text-ok font-semibold" : "text-mut")}>{fmtDelta(d)}</td>
                          <td>{String(r.tipo ?? r.status ?? "")}</td>
                          <td className="break-all cursor-pointer hover:text-acc" onClick={() => copy(r.ref)} title="copiar">{String(r.ref ?? "")}</td>
                          <td className="whitespace-nowrap">
                            {jaAtribuido(r.fonte, r.ref)
                              ? <span className="text-ok text-xs font-semibold">✓ atribuído</span>
                              : <button className="text-xs border border-ok/50 text-ok rounded px-2 py-0.5 hover:bg-okbg"
                                  title="atribuir este pagamento a esta reserva" onClick={() => atribuir(r, proc.metodo)}>✓ é esta</button>}
                            <button className="text-mut hover:text-bad ml-2" title="descartar (não é este)" onClick={() => descartar(String(r.ref))}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (!loading && <div className="text-mut text-sm">Nenhum pagamento de {fmtMoney(proc.valor)} encontrado nessa janela. (pode ter sido pago noutra altura, em multibanco/dinheiro físico, ou registado com outro valor)</div>)}

              {/* outras reservas com um item deste valor no mesmo período */}
              {outras && outras.length > 0 && (
                <div className="mt-3 pt-2 border-t border-line">
                  <div className="text-xs font-semibold text-bad mb-1">
                    ⚠ {outras.length} outra(s) reserva(s) com um item de {fmtMoney(proc.valor)} neste período — o pagamento pode pertencer a uma destas:
                  </div>
                  <table className="text-xs w-full">
                    <thead><tr className="text-mut text-left"><th className="py-1">Matrícula</th><th>Cidade</th><th>Saída</th><th>Δ hora</th><th>Métodos</th><th>ID</th></tr></thead>
                    <tbody>
                      {outras.map((r, i) => {
                        const d = Number(r.dsec) || 0; const perto = Math.abs(d) <= 120;
                        return (
                          <tr key={i} className={"border-t border-line/40 " + (perto ? "bg-badbg" : "")}>
                            <td className="py-1 font-medium cursor-pointer hover:text-acc" onClick={() => copy(r.matricula)} title="copiar">{String(r.matricula ?? "")}</td>
                            <td>{String(r.cidade ?? "")}</td>
                            <td className="whitespace-nowrap">{fmtDate(r.saida)}</td>
                            <td className={"tabular " + (perto ? "text-bad font-semibold" : "text-mut")}>{fmtDelta(d)}</td>
                            <td>{String(r.metodos ?? "")}</td>
                            <td className="break-all cursor-pointer hover:text-acc" onClick={() => copy(r.multipark_id)} title="copiar">{String(r.multipark_id ?? "").slice(0, 14)}…</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* itens do pricing */}
        <div className="text-sm font-semibold mb-1">Itens do pricing</div>
        <div className="border border-line rounded-lg overflow-hidden mb-3">
          <table className="text-sm w-full">
            <thead className="bg-panel2"><tr className="text-mut text-left">
              <th className="px-3 py-2">Descrição</th><th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Pago</th><th className="px-3 py-2">Método</th>
            </tr></thead>
            <tbody>
              {itens.map((it, i) => {
                const susp = (Number(it.total) || 0) > 1000;
                return (
                  <tr key={i} className={"border-t border-line/40 " + (susp ? "bg-badbg" : "")}>
                    <td className="px-3 py-1.5">{it.description || "?"}</td>
                    <td className={"px-3 py-1.5 text-right tabular " + (susp ? "text-bad font-bold" : "")}>{fmtMoney(it.total)}{susp && " ⚠"}</td>
                    <td className="px-3 py-1.5 text-right tabular">{fmtMoney(it.amountPaid)}</td>
                    <td className="px-3 py-1.5">{(it.paymentMethod || "").trim()
                      ? <span className="bg-chip rounded px-1.5 py-0.5 text-xs">{it.paymentMethod}</span>
                      : <span className="bg-badbg text-bad rounded px-1.5 py-0.5 text-xs">sem método</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* comparação caixa */}
        {row.soma_paga_caixa != null && (
          <div className="text-sm text-mut">
            Na Caixa: pago <b className="text-txt">{fmtMoney(row.soma_paga_caixa)}</b>
            {row.metodos_caixa ? <> · métodos: {String(row.metodos_caixa)}</> : null}
            {row.difere_caixa ? <span className="text-bad"> · ⚠ difere do Backoffice</span> : <span className="text-ok"> · bate</span>}
          </div>
        )}
      </div>
    </div>
  );
}
