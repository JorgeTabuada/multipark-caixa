# -*- coding: utf-8 -*-
"""
Classificação automática a partir do PRICING (JSON do Backoffice).
Pedido do Jorge — para cada reserva olha o array de pricing
  [{total, description, amountPaid, paymentMethod}, ...] e decide:

  1. valor suspeito (item > 1000€, erro de inserção)        -> PROBLEMA "valor suspeito"
  2. nenhum item com método de pagamento                    -> PENDENTE "sem pagamento"
  3. pago < total (faltam valores)                          -> PROBLEMA "faltam valores" (+ valor em falta)
  4. pago completo, métodos presentes:
     4a. 2+ métodos diferentes -> atualiza ficha (override) com os métodos;
         OK se sem diferenças entre fontes, senão PROBLEMA
     4b. 1 método:
         - Stripe/Online + PaymentIntent + 0 diferenças -> OK automático
         - Dinheiro/Numerário -> PENDENTE, nota com valor + "numerário" (confirmação humana)
         - outro -> não classifica (deixa como está)

Escreve em staging.revisao (estado+notas) e staging.override (metodo/estado pago).
Uso:
  python scripts/classificar_pricing.py                 (PREVIEW, não grava)
  python scripts/classificar_pricing.py aplicar         (grava tudo)
  python scripts/classificar_pricing.py aplicar so-novas (só reservas sem revisão atual)
"""
import os, ssl, sys, json, re, unicodedata
import pg8000.native
try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__)); APP = os.path.dirname(HERE)
env = {}
for line in open(os.path.join(APP, ".env.local"), encoding="utf-8"):
    s = line.strip()
    if s.startswith("#") or "=" not in s: continue
    k, v = s.split("=", 1); env[k.strip()] = v.strip().strip('"').strip("'")
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
conn = pg8000.native.Connection(ssl_context=ctx, user=env["PGUSER"], password=env["PGPASSWORD"],
    host=env["PGHOST"], port=int(env["PGPORT"]), database=env["PGDATABASE"])

def norm(s):
    if s is None: return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()

def eur(v):
    try: return f"{float(v):.2f}€".replace(".", ",")
    except: return str(v)

NUMERARIO = {"dinheiro", "numerario"}

# dados do wide para a regra do Stripe / diferenças
wide = {}
for r in conn.run("""SELECT multipark_id, pi_stripe, n_diferencas, valor_mp, pago_stripe
                     FROM staging.mv_reconciliacao_wide"""):
    wide[r[0]] = dict(pi_stripe=r[1], n_dif=r[2], valor=r[3], pago_stripe=r[4])

# pricing por reserva
rows = conn.run("""SELECT multipark_id, valor_reserva, pricing_json
                   FROM staging.mv_pricing""")

# revisões atuais (para modo so-novas e estatística)
ja = set(r[0] for r in conn.run("SELECT multipark_id FROM staging.revisao WHERE estado IS NOT NULL"))

# resultado: mp -> (estado, nota, ov_metodo, ov_estado_pago, ov_valor)
res = {}
cont = {"valor_suspeito": 0, "sem_pagamento": 0, "faltam_valores": 0,
        "varios_metodos": 0, "ok_stripe": 0, "numerario": 0, "ignorado": 0}

for mp, valor_reserva, pj in rows:
    arr = pj if isinstance(pj, list) else (json.loads(pj) if isinstance(pj, str) else [])
    if not arr: continue
    itens = []
    soma_total = 0.0; soma_paga = 0.0; metodos = []; suspeito = False
    for it in arr:
        t = float(it.get("total") or 0); a = float(it.get("amountPaid") or 0)
        m = (it.get("paymentMethod") or "").strip()
        d = (it.get("description") or "").strip()
        soma_total += t; soma_paga += a
        if m: metodos.append(m)
        if t > 1000: suspeito = True
        itens.append((d, t, a, m))
    metodos_uniq = list(dict.fromkeys(metodos))  # distintos, preserva ordem
    w = wide.get(mp, {})
    n_dif = w.get("n_dif"); pi_stripe = w.get("pi_stripe")
    valor = valor_reserva if valor_reserva is not None else soma_total
    det_itens = " · ".join(f"{d or 'item'}: {eur(a)}/{eur(t)} {m or '(sem método)'}" for d, t, a, m in itens)

    estado = nota = ov_m = ov_e = ov_v = None

    if suspeito:
        estado = "problema"; nota = f"[auto-pricing] valor suspeito (provável erro) · {det_itens}"
        cont["valor_suspeito"] += 1
    elif not metodos_uniq:
        estado = "pendente"; nota = f"[auto-pricing] sem pagamento · valor {eur(valor)}"
        ov_e = "nao_pago"; cont["sem_pagamento"] += 1
    elif soma_paga < soma_total - 0.01:
        falta = round(soma_total - soma_paga, 2)
        estado = "problema"; nota = f"[auto-pricing] faltam valores · pago {eur(soma_paga)} de {eur(soma_total)} (falta {eur(falta)}) · {det_itens}"
        ov_e = "falta_valor"; ov_v = falta; cont["faltam_valores"] += 1
    elif len(metodos_uniq) >= 2:
        ov_m = " + ".join(metodos_uniq); ov_e = "pago"
        tem_numerario = any(norm(m) in NUMERARIO for m in metodos_uniq)
        if tem_numerario:
            # split com dinheiro -> confirmação humana (regra do numerário)
            estado = "pendente"; nota = f"[auto-pricing] vários métodos c/ numerário: {ov_m} · pago {eur(soma_paga)} (confirmar)"
        elif not n_dif or n_dif == 0:
            estado = "ok"; nota = f"[auto-pricing] vários métodos: {ov_m} · pago {eur(soma_paga)} · sem diferenças"
        else:
            estado = "problema"; nota = f"[auto-pricing] vários métodos: {ov_m} · {det_itens}"
        cont["varios_metodos"] += 1
    else:
        metodo = metodos_uniq[0]; nm = norm(metodo)
        online = ("online" in nm or "stripe" in nm or bool(pi_stripe))
        if online and pi_stripe and (not n_dif or n_dif == 0):
            estado = "ok"; nota = f"[auto-pricing] Stripe ({metodo}), valor único {eur(soma_paga)}, sem diferenças → OK"
            ov_m = metodo; ov_e = "pago"; cont["ok_stripe"] += 1
        elif nm in NUMERARIO:
            estado = "pendente"; nota = f"[auto-pricing] numerário · {eur(soma_paga)} (confirmar)"
            ov_m = "Numerário"; ov_e = "pago"; cont["numerario"] += 1
        else:
            cont["ignorado"] += 1
            continue

    res[mp] = (estado, nota, ov_m, ov_e, ov_v)

# ---- resumo ----
print("=== Classificação por PRICING (preview) ===")
for k, v in cont.items():
    print(f"  {k:16s}: {v}")
print(f"  TOTAL a classificar: {len(res)}  (já têm revisão atual: {sum(1 for m in res if m in ja)})")

def exemplos(filtro, titulo, n=4):
    print(f"\n--- {titulo} ---")
    shown = 0
    for mp, (e, nt, *_ ) in res.items():
        if filtro(e, nt) and shown < n:
            print(f"  {mp} [{e}]: {nt[:140]}"); shown += 1

exemplos(lambda e, nt: "sem pagamento" in nt, "sem pagamento (PENDENTE)")
exemplos(lambda e, nt: "faltam valores" in nt, "faltam valores (PROBLEMA)")
exemplos(lambda e, nt: "vários métodos" in nt, "vários métodos")
exemplos(lambda e, nt: "Stripe" in nt and e == "ok", "Stripe -> OK automatico")
exemplos(lambda e, nt: "numerário" in nt, "numerário (PENDENTE)")
exemplos(lambda e, nt: "suspeito" in nt, "valor suspeito (PROBLEMA)")

modo = sys.argv[1] if len(sys.argv) > 1 else "preview"
if modo == "aplicar":
    so_novas = len(sys.argv) > 2 and sys.argv[2] == "so-novas"
    nr = no = 0
    for mp, (estado, nota, ov_m, ov_e, ov_v) in res.items():
        if so_novas and mp in ja: continue
        conn.run("""INSERT INTO staging.revisao(multipark_id,estado,notas,updated_at)
            VALUES(:m,:e,:n,now()) ON CONFLICT(multipark_id) DO UPDATE SET estado=:e, notas=:n, updated_at=now()""",
            m=mp, e=estado, n=nota); nr += 1
        if ov_m or ov_e or ov_v is not None:
            conn.run("""INSERT INTO staging.override(multipark_id,metodo,pago_estado,pago_valor,updated_at)
                VALUES(:m,:me,:pe,:pv,now()) ON CONFLICT(multipark_id) DO UPDATE
                SET metodo=:me, pago_estado=:pe, pago_valor=:pv, updated_at=now()""",
                m=mp, me=ov_m, pe=ov_e, pv=ov_v); no += 1
    print(f"\nAPLICADO: {nr} revisões + {no} overrides" + (" (só novas)" if so_novas else ""))
else:
    print("\n(PREVIEW — nada foi escrito. Corre com 'aplicar' para gravar.)")
conn.close()
