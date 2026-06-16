#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Refresca a materialized view de reconciliação após nova carga de dados.
Lê as credenciais de ../.env.local (ou ../../.env / *.env).
Uso:  python scripts/refresh_matview.py
"""
import os, ssl, glob, time
import pg8000.native

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)

def load_env():
    env = {}
    cands = [os.path.join(APP, ".env.local"),
             os.path.join(os.path.dirname(APP), ".env")] + \
            sorted(glob.glob(os.path.join(os.path.dirname(APP), "*.env")))
    for p in cands:
        if not os.path.exists(p):
            continue
        for line in open(p, encoding="utf-8"):
            s = line.strip()
            if s.startswith("#") or "=" not in s:
                continue
            k, v = s.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = load_env()
cfg = dict(user=env.get("PGUSER", "postgres"), password=env["PGPASSWORD"],
           host=env["PGHOST"], port=int(env.get("PGPORT", 5432)),
           database=env.get("PGDATABASE", "postgres"))
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
conn = pg8000.native.Connection(ssl_context=ctx, **cfg)

for mv in ("staging.mv_reconciliacao_wide", "staging.mv_viva_reservas"):
    t = time.time()
    try:
        conn.run(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {mv}")
    except Exception:
        conn.run(f"REFRESH MATERIALIZED VIEW {mv}")
    n = conn.run(f"SELECT count(*) FROM {mv}")[0][0]
    print(f"{mv}: refrescado em {time.time()-t:.1f}s — {n} linhas")
conn.close()
