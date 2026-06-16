"use client";
import { fmtEur0 } from "@/lib/format";

interface K {
  total: number; valor_ok: number; valor_div: number; sem_pagamento: number;
  rev_ok: number; rev_pendente: number; rev_problema: number;
  fecho_caixa: number; com_diferencas: number; metodo_div: number; action_div: number; campanha_sem_pgto: number;
  eur_divergencia: number; eur_stripe: number; eur_reembolso: number; eur_tpa: number;
  eur_caixa: number; eur_reservas: number;
}

function Card({ n, l, tone }: { n: string; l: string; tone?: "ok" | "bad" | "warn" }) {
  const color = tone === "ok" ? "#16a34a" : tone === "bad" ? "#dc2626" : tone === "warn" ? "#d97706" : "#14233f";
  return (
    <div className="bg-panel2 border border-line rounded-lg px-3.5 py-3 min-w-[130px]">
      <div className="text-[22px] font-bold tabular" style={{ color }}>{n}</div>
      <div className="text-mut text-xxs mt-0.5">{l}</div>
    </div>
  );
}

export function Kpis({ k }: { k: K | undefined }) {
  if (!k) return <div className="text-mut text-xxs px-1 py-3">a calcular indicadores…</div>;
  const pct = k.total ? Math.round((k.valor_ok / k.total) * 100) : 0;
  return (
    <div className="flex flex-wrap gap-2.5 mb-3">
      <Card n={k.total.toLocaleString("pt-PT")} l="reservas" />
      <Card n={k.rev_ok.toLocaleString("pt-PT")} l="✓ OK" tone="ok" />
      <Card n={k.rev_pendente.toLocaleString("pt-PT")} l="⧗ pendentes" tone="warn" />
      <Card n={k.rev_problema.toLocaleString("pt-PT")} l="✗ problemas" tone="bad" />
      <Card n={k.fecho_caixa.toLocaleString("pt-PT")} l="fecho de caixa" />
      <Card n={k.com_diferencas.toLocaleString("pt-PT")} l="linhas c/ diferenças" tone="bad" />
      <Card n={`${pct}%`} l="valor bate" tone="ok" />
      <Card n={k.valor_div.toLocaleString("pt-PT")} l="divergem em valor" tone="bad" />
      <Card n={k.metodo_div.toLocaleString("pt-PT")} l="método diverge" tone="bad" />
      <Card n={k.action_div.toLocaleString("pt-PT")} l="action diverge" tone="bad" />
      <Card n={k.campanha_sem_pgto.toLocaleString("pt-PT")} l="campanha s/ pgto" tone="warn" />
      <Card n={fmtEur0(k.eur_divergencia)} l="€ em divergência" tone="bad" />
      <Card n={k.sem_pagamento.toLocaleString("pt-PT")} l="sem pagamento" tone="warn" />
      <Card n={fmtEur0(k.eur_reservas)} l="€ reservas (MP)" />
      <Card n={fmtEur0(k.eur_stripe)} l="€ online (Stripe)" />
      <Card n={fmtEur0(k.eur_tpa)} l="€ TPA (Viva)" />
      <Card n={fmtEur0(k.eur_caixa)} l="€ pago (caixa)" />
      <Card n={fmtEur0(k.eur_reembolso)} l="€ reembolsos" tone="warn" />
    </div>
  );
}
