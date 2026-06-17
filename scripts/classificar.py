# -*- coding: utf-8 -*-
"""
Classificação automática de reservas com agregadores / NO PAY.
Regras (pedido do Jorge):
- Reserva com agregador (método OU campanha) e SEM método de pagamento real
  (Multibanco/Online/Dinheiro/Numerário/Viva Wallet) -> PENDENTE, nota: nome + valor.
- NO PAY/Instagram, OU agregador com >1 método (ex Parkos+Multibanco) -> PROBLEMA,
  nota: métodos + valores.
Uso:
  python scripts/classificar.py            (PREVIEW, não escreve)
  python scripts/classificar.py aplicar    (escreve na staging.revisao)
  python scripts/classificar.py aplicar so-novas  (só as sem revisão manual)
"""
import os, ssl, glob, sys, json, re, unicodedata
import pg8000.native

HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(HERE)
env = {}
for p in [os.path.join(APP, ".env.local")]:
    for line in open(p, encoding="utf-8"):
        s = line.strip()
        if s.startswith("#") or "=" not in s: continue
        k, v = s.split("=", 1); env[k.strip()] = v.strip().strip('"').strip("'")
cfg = dict(user=env["PGUSER"], password=env["PGPASSWORD"], host=env["PGHOST"],
           port=int(env["PGPORT"]), database=env["PGDATABASE"])
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
conn = pg8000.native.Connection(ssl_context=ctx, **cfg)

def norm(s):
    if s is None: return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()

AGREG = [norm(x) for x in [
 "topparking","Pro Tropical Conglomerare","Looking4parking","Agência Bestravel Castelo Branco",
 "Agência Bestravel Maia","Parkvia","Parkos","Agência viagens para si","Parclick","Agência Total Fun",
 "Avença Thibault Poutrel","Avença Philipp Pausder","Pro Paul McEvaney","Pro Socém","Pro Onimod",
 "Pro Ruben Bicho","Pro Cushman","Pro Blocotelha","Pro Terumo","Onepark","Pro Panicongelados",
 "Free2move","Parkimeter","Parkivado","Pro Amazin Glamping","Pro Média Saturn"]]
NOPAY = [norm(x) for x in [
 "Instagram Oferta","NO PAY - TOPPARKING","NO PAY - PRO","NO PAY - AGREGADOR","NO PAY - AGÊNCIA","NO PAY","No Pay"]]
REAIS = set(norm(x) for x in ["Multibanco","Online","Dinheiro","Numerário","Numerario","Viva Wallet"])
ESPECIAIS = set(AGREG) | set(NOPAY)

def eur(v):
    try: return f"{float(v):.2f}€".replace(".", ",")
    except: return str(v)

# reconciliação: métodos/campanhas/valor por reserva
rows = conn.run("""SELECT multipark_id, valor_mp, metodo_mp, metodo_bo, metodo_caixa, metodo_est,
  campanha_mp, campanha_bo, campanha_caixa FROM staging.mv_reconciliacao_wide""")
# pricing: itens (metodo->valor pago) por reserva
pj = {}
for r in conn.run("SELECT multipark_id, pricing_json FROM staging.mv_pricing"):
    pj[r[0]] = r[1]

# revisões manuais já existentes
ja = set(r[0] for r in conn.run("SELECT multipark_id FROM staging.revisao WHERE estado IS NOT NULL"))

pend, prob = [], []
for r in rows:
    mp = r[0]; valor = r[1]
    # originais (para as notas) e normalizados (para a regra)
    metodos_orig = [str(x).strip() for x in r[2:6] if x and str(x).strip()]
    campanhas_orig = [str(x).strip() for x in r[6:9] if x and str(x).strip()]
    itens = []
    raw = pj.get(mp)
    if raw:
        arr = raw if isinstance(raw, list) else (json.loads(raw) if isinstance(raw, str) else [])
        for it in arr:
            itens.append(it)
            m = (it.get("paymentMethod") or "").strip()
            if m: metodos_orig.append(m)
    metodos = set(norm(x) for x in metodos_orig)
    campanhas = set(norm(x) for x in campanhas_orig)
    tokens = metodos | campanhas
    espec = tokens & ESPECIAIS
    if not espec:
        continue
    tem_nopay = bool(tokens & set(NOPAY))
    metodos_reais = metodos & REAIS

    if tem_nopay or len(metodos_reais) >= 1:
        # PROBLEMA: nota com métodos + valores
        por_m = {}
        for it in itens:
            m = (it.get("paymentMethod") or "(sem método)").strip() or "(sem método)"
            por_m[m] = por_m.get(m, 0) + (float(it.get("amountPaid") or 0))
        if por_m:
            detalhe = " · ".join(f"{m}: {eur(v)}" for m, v in por_m.items())
        else:
            detalhe = ", ".join(dict.fromkeys(metodos_orig))
        nota = f"[auto] métodos: {detalhe} · valor reserva {eur(valor)}"
        prob.append((mp, nota))
    else:
        # PENDENTE: só agregador, sem método real -> nome original do agregador
        nome = next((c for c in campanhas_orig if norm(c) in ESPECIAIS),
                    next((m for m in metodos_orig if norm(m) in ESPECIAIS), "agregador"))
        nota = f"[auto] {nome} · valor reserva {eur(valor)}"
        pend.append((mp, nota))

print(f"PENDENTE: {len(pend)}  |  PROBLEMA: {len(prob)}")
print(f"(dos quais já têm revisão manual: pend={sum(1 for m,_ in pend if m in ja)}, prob={sum(1 for m,_ in prob if m in ja)})")
print("\n--- exemplos PENDENTE ---")
for mp, n in pend[:6]: print(f"  {mp}: {n}")
print("\n--- exemplos PROBLEMA ---")
for mp, n in prob[:6]: print(f"  {mp}: {n}")

modo = sys.argv[1] if len(sys.argv) > 1 else "preview"
if modo == "aplicar":
    so_novas = len(sys.argv) > 2 and sys.argv[2] == "so-novas"
    n = 0
    for estado, lista in [("pendente", pend), ("problema", prob)]:
        for mp, nota in lista:
            if so_novas and mp in ja: continue
            conn.run("""INSERT INTO staging.revisao(multipark_id,estado,notas,updated_at)
              VALUES(:m,:e,:n,now()) ON CONFLICT(multipark_id) DO UPDATE SET estado=:e, notas=:n, updated_at=now()""",
              m=mp, e=estado, n=nota)
            n += 1
    print(f"\nAPLICADO: {n} reservas atualizadas em staging.revisao" + (" (só novas)" if so_novas else ""))
else:
    print("\n(PREVIEW — nada foi escrito. Corre com 'aplicar' para gravar.)")
conn.close()
