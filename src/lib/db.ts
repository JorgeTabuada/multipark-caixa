import postgres from "postgres";

// Ligação server-side ao Postgres da Supabase (Session pooler).
// Preferimos variáveis PG* separadas (sem problemas de URL-encoding da password);
// caímos para DATABASE_URL se não existirem.
declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
}

function make() {
  const ssl = { rejectUnauthorized: false } as const; // pooler usa cert que não validamos localmente
  if (process.env.PGHOST && process.env.PGPASSWORD) {
    return postgres({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || "postgres",
      ssl,
      max: 5,
      idle_timeout: 20,
      prepare: false, // necessário com o pooler em modo transaction/session
    });
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL ou PGHOST/PGPASSWORD em .env.local");
  return postgres(url, { ssl, max: 5, idle_timeout: 20, prepare: false });
}

export const sql = globalThis._sql ?? make();
if (process.env.NODE_ENV !== "production") globalThis._sql = sql;

export const MV = "staging.mv_reconciliacao_wide";
