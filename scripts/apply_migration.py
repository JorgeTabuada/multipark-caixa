#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Aplica migrations/0001_reconciliacao.sql ao Postgres da Supabase
(recria view + materialized view + índices). Lê ../.env.local.
Uso:  python scripts/apply_migration.py
"""
import os, ssl, glob, re, time
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

import sys
conn.run("SET statement_timeout = '600s'")  # views pesadas (LATERAL) podem demorar
# aplica todas as migrations (ou só a passada como argumento)
migs = sorted(glob.glob(os.path.join(APP, "migrations", "*.sql")))
if len(sys.argv) > 1:
    migs = [m for m in migs if sys.argv[1] in os.path.basename(m)]
for mig in migs:
    raw = open(mig, encoding="utf-8").read()
    clean = "\n".join(re.sub(r"--.*$", "", ln) for ln in raw.splitlines())
    stmts = [s.strip() for s in clean.split(";") if s.strip()]
    print(f"\n== {os.path.basename(mig)} ({len(stmts)} statements) ==")
    t = time.time()
    for i, st in enumerate(stmts, 1):
        tt = time.time(); conn.run(st)
        print(f"  [{i}/{len(stmts)}] {time.time()-tt:5.1f}s  {' '.join(st.split())[:55]}")
    print(f"  total {time.time()-t:.1f}s")
conn.close()
