import { sql, MV } from "./db";
import { COLUMNS, FLAGS, type Filters } from "./schema";

const ALL_KEYS = new Set<string>([
  "multipark_id", "cidade", "estado_reserva", "parque",
  ...COLUMNS.map((c) => c.key),
  ...FLAGS.map((f) => f.key),
]);

// Constrói a cláusula WHERE como fragmento seguro (valores parametrizados).
export function buildWhere(f: Filters) {
  const conds: ReturnType<typeof sql>[] = [];

  if (f.search && f.search.trim()) {
    const q = `%${f.search.trim()}%`;
    conds.push(
      sql`(matricula_mp ILIKE ${q} OR multipark_id ILIKE ${q} OR pi_mp ILIKE ${q} OR matricula_bo ILIKE ${q})`
    );
  }
  if (f.cidade) conds.push(sql`cidade = ${f.cidade}`);
  if (f.estado) conds.push(sql`estado_reserva = ${f.estado}`);
  if (f.metodo) conds.push(sql`metodo_mp = ${f.metodo}`);
  if (f.tipoStripe) conds.push(sql`tipo_stripe = ${f.tipoStripe}`);
  if (f.soDivergencias) conds.push(sql`valor_bate IS FALSE`);
  if (f.comPi === "sim") conds.push(sql`pi_mp IS NOT NULL`);
  if (f.comPi === "nao") conds.push(sql`pi_mp IS NULL`);
  if (f.dataDe) conds.push(sql`saida_mp >= ${f.dataDe}::timestamptz`);
  if (f.dataAte) conds.push(sql`saida_mp <= ${f.dataAte}::timestamptz`);
  if (f.soFechoCaixa) conds.push(sql`is_fecho_caixa IS TRUE`);
  if (f.metodoDiverge) conds.push(sql`metodo_bate IS FALSE`);
  if (f.campanhaDiverge) conds.push(sql`campanha_bate IS FALSE`);
  if (f.actionDiverge) conds.push(sql`action_bate IS FALSE`);
  if (f.campanhaSemPgto) conds.push(sql`campanha_ok IS FALSE`);
  if (f.soComDiferencas) conds.push(sql`n_diferencas > 0`);
  if (f.revisaoEstado) conds.push(sql`revisao_estado = ${f.revisaoEstado}`);
  if (f.revisto === "sim") conds.push(sql`revisto IS TRUE`);
  if (f.revisto === "nao") conds.push(sql`revisto IS NOT TRUE`);
  // action = "Alteração na consulta"/"Atualização" OU ocorrência preenchida
  if (f.acaoOcorrencia) conds.push(sql`(
    action_bo IN ('Alteração na consulta', 'Atualização')
    OR action_caixa IN ('Alteração na consulta', 'Atualização')
    OR nullif(btrim(ocorrence_bo), '') IS NOT NULL
    OR nullif(btrim(ocorrence_caixa), '') IS NOT NULL
  )`);

  if (!conds.length) return sql``;
  let w = conds[0];
  for (let i = 1; i < conds.length; i++) w = sql`${w} AND ${conds[i]}`;
  return sql`WHERE ${w}`;
}

export function parseFilters(p: URLSearchParams): Filters {
  return {
    search: p.get("search") || undefined,
    cidade: p.get("cidade") || undefined,
    estado: p.get("estado") || undefined,
    metodo: p.get("metodo") || undefined,
    tipoStripe: p.get("tipoStripe") || undefined,
    soDivergencias: p.get("soDivergencias") === "1",
    comPi: (p.get("comPi") as Filters["comPi"]) || "",
    dataDe: p.get("dataDe") || undefined,
    dataAte: p.get("dataAte") || undefined,
    soFechoCaixa: p.get("soFechoCaixa") === "1",
    metodoDiverge: p.get("metodoDiverge") === "1",
    campanhaDiverge: p.get("campanhaDiverge") === "1",
    actionDiverge: p.get("actionDiverge") === "1",
    campanhaSemPgto: p.get("campanhaSemPgto") === "1",
    soComDiferencas: p.get("soComDiferencas") === "1",
    revisaoEstado: p.get("revisaoEstado") || undefined,
    revisto: p.get("revisto") || undefined,
    acaoOcorrencia: p.get("acaoOcorrencia") === "1",
  };
}

export function safeOrder(col: string | null, dir: string | null) {
  const c = col && ALL_KEYS.has(col) ? col : "saida_mp";
  const d = dir === "asc" ? sql`ASC` : sql`DESC`;
  return sql`ORDER BY ${sql(c)} ${d} NULLS LAST`;
}

export { MV };
