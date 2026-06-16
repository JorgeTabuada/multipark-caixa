# Reconciliação Multipark

App web de **reconciliação financeira de reservas** que cruza as 6 fontes do schema
`staging` (Supabase) e mostra **uma linha por reserva** com os valores de cada fonte
**lado a lado**, destacando o que bate e o que diverge.

## Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + TanStack Table v8 + TanStack Query v5
- Acesso server-side ao Postgres via `postgres` (porsager) — **credenciais nunca no browser**
- A lógica de cruzamento vive numa **view SQL**; a app lê de uma **materialized view** (rápida)

## Pôr a funcionar

1. **Dependências**
   ```bash
   npm install
   ```

2. **Ligação** — criar `.env.local` (já incluído neste ambiente; não commitar):
   ```env
   PGHOST=aws-1-eu-central-1.pooler.supabase.com
   PGPORT=5432
   PGUSER=postgres.jszqacdnzhhvbzpxhkvx
   PGPASSWORD="a-tua-password"     # aspas se a password tiver # ou outros símbolos
   PGDATABASE=postgres
   # alternativa: DATABASE_URL=postgresql://user:pass@host:5432/postgres
   ```

3. **Migration** (uma vez) — cria a view, a materialized view e os índices:
   ```bash
   psql "$DATABASE_URL" -f migrations/0001_reconciliacao.sql   # ou, sem psql:
   python scripts/apply_migration.py
   ```
   A base `staging` **já existe e está populada** — a migration só cria views/índices.
   O ficheiro da migration e o `src/lib/schema.ts` são **gerados** a partir de um mapa de
   conceitos em `scripts/gen_schema.py` (correr `python scripts/gen_schema.py` após editar o mapa).

4. **Arrancar**
   ```bash
   npm run dev      # http://localhost:3000
   ```

## Funcionalidades
- **Grelha densa** (estilo Airtable) com colunas **agrupadas por fonte** (Multipark · Backoffice · Caixa · Estatística · Stripe · Viva) e cabeçalho fixo.
- **Estado da reconciliação** por linha (`✓` verde bate / `✗` vermelho diverge / `—` cinza ausente):
  `valor bate`, `saída bate`, **`método bate`** (método de pagamento igual entre fontes),
  **`campanha bate`** (campanha igual entre fontes), **`action bate`** (action final igual
  entre Backoffice e Caixa), **`campanha c/ pgto`** e `tem Stripe`.
- **Comparação de TODOS os campos com equivalente em ≥2 fontes** (43 campos: matrícula,
  email, telefone, cliente, payment intent, datas, valores, métodos, campanhas, action,
  validações, condutores, ocorrências, observações, etc.). Cada campo tem flag `<campo> bate`.
- Coluna **"Campos diferentes"** + **"Nº difs"** — lista por reserva quais os campos que
  divergem entre as fontes (ex.: "Cliente, Valor reserva"). Comparação com normalização
  (ignora maiúsculas e espaços/tabs); valores monetários com tolerância 0,01 €.
- **Situação da campanha** (coluna): `sem campanha` / `campanha paga (campaignPay)` /
  `campanha + pagamento` / **`campanha SEM pagamento`** (sinaliza campanha sem campaignPay
  nem qualquer pagamento — potencial receita perdida).
- **Seletor de colunas/fontes** (⚙) — liga/desliga fontes inteiras ou campos individuais.
- **Filtros**: pesquisa (matrícula/multiparkId/pi_), cidade, estado, método, tipo Stripe,
  com/sem `pi_`, datas de saída, e os toggles **só Fecho de Caixa** (ligado por defeito),
  valor diverge, método diverge, campanha diverge, action diverge, campanha s/ pagamento.
- **KPIs**: total, fecho de caixa, % que bate, nº em divergência de valor/método/action,
  campanha sem pagamento, € por canal (Stripe/Viva/caixa), reembolsos.
- **Ordenação** por qualquer coluna, **paginação** server-side.
- **Triagem (estado + notas)** — cada reserva tem um estado de revisão **automático**
  (OK se não há diferenças, senão Pendente) que o utilizador pode mudar para **OK / Pendente /
  Problema** e escrever **notas**, gravadas na base (`staging.revisao`). KPIs no topo (OK /
  pendentes / problemas) e filtro por estado de revisão. Coluna "Revisão" (colorida) e "Notas" (📝).
- **Detalhe da linha** — clicar abre o painel de triagem (estado, notas, campos que divergem)
  e o `_raw` (jsonb original) de cada fonte lado a lado. Guardar atualiza KPIs e grelha.
  O **mesmo painel abre ao clicar num registo em qualquer página** (Viva, Stripe, Campanhas,
  Métodos) — a triagem fica sempre ligada ao multipark_id da reserva.
  **Copiar para procurar**: no topo do painel há botões de cópia rápida (Matrícula, ID
  Multipark, PaymentIntent, PI Stripe) e qualquer valor das tabelas `_raw` copia para a área
  de transferência ao clicar — para colar (Ctrl+V) e procurar noutro sítio.
- **Export CSV** do conjunto filtrado (colunas visíveis).

> O filtro **só Fecho de Caixa** está ligado por omissão: mostra apenas as reservas cuja
> action final é `"Fecho de Caixa"`. Desligar para ver todas as reservas.

### Página "Conciliação Viva → Reserva" (`/viva`)
Parte de **cada pagamento Viva** (TPA) e procura a melhor reserva, por **prioridade de
fonte** (Multipark → Backoffice → Caixa) e, em cada uma, por cascata de sinais:
**email + valor** → **valor + hora exata** → **valor + hora** → **valor + dia aproximado**.
Mostra a reserva anexada (matrícula, cliente, ID, **fonte**), o **método de match**, a
**confiança** (alta/média/baixa/nenhuma), a diferença de valor, o **nº de candidatos** e a
marca de **revisão manual** (⚠ ambíguo sem email para desambiguar). KPIs (com/sem reserva,
rever manual, € por anexar) e filtros por confiança, fonte, "só sem reserva", "só ambíguos",
"só rever manual", datas e pesquisa; export CSV.
Migration: `migrations/0002_viva_reservas.sql` (`staging.mv_viva_reservas`).

### Página "Conciliação Stripe → Reserva" (`/stripe`)
Parte de **cada pagamento Stripe** e liga a reserva por **paymentIntent** (chave direta) nas
três bases (Multipark/Backoffice/Caixa). Verifica se o **valor do Stripe bate com o valor de
cada base** que tenha a reserva: estado **valor certo** / **valor errado** / **sem reserva**,
com Δ por base e Δ máximo. Mostra ainda os **payment intents de cada base** (Multipark /
Backoffice / Caixa) e a coluna **"PI registado em"** (em que bases o pagamento aparece —
útil para ver pagamentos que não chegaram a uma das bases). KPIs (certo/errado/sem reserva,
€ em divergência) e filtros por estado, "só valor errado", "só sem reserva", datas e pesquisa;
export CSV. (Confirmado: o paymentIntent está sempre na coluna `paymentintentid`, não em
campos alternativos.)
Migration: `migrations/0003_stripe_reservas.sql` (`staging.mv_stripe_reservas`).

### Página "Campanhas" (`/campanhas`)
Selector de campanha (98 campanhas das 3 fontes que têm o campo). Para a campanha
escolhida mostra: **totais por fonte** (nº reservas, € valor, € pago na caixa), badges de
**"está tudo igual"** (totais de valor e nº de reservas batem entre fontes?), a tabela de
**tipos de pagamento** (método × Multipark/Backoffice/Caixa), o `campaignPay` ativo, e o
**drill-down das reservas** da campanha (valores/métodos lado a lado, flags de comparação).
Agrega direto das tabelas base + `mv_reconciliacao_wide` (sem materialized view nova).
Endpoints: `/api/campanhas`, `/api/campanhas/resumo`, `/api/campanhas/reservas`.

## Atualizar dados
Após nova carga para `staging`, refrescar a materialized view:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY staging.mv_reconciliacao_wide;
```
Ou, sem psql (usa o `.env.local`):
```bash
python scripts/refresh_matview.py
```

## Notas
- A ligação de **dados** ao Viva (TPA) é **aproximada** (valor + data/hora, janela de 24h),
  por não haver chave direta — tratar como "match provável". As restantes ligam por
  `multiparkId` / `paymentIntent` / matrícula+data.
- Comparações de valor usam tolerância de **0,01 €**.
- Os índices e a materialized view fazem o `count`/KPIs passar de ~24 s para <0,1 s.
