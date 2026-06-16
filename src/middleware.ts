import { NextRequest, NextResponse } from "next/server";

// Protege toda a app com uma password (HTTP Basic Auth).
// A password vem da variável de ambiente APP_PASSWORD (definir no Vercel).
// Sem APP_PASSWORD definida (ex. em local), não bloqueia.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return NextResponse.next(); // sem password configurada → não bloqueia
  const user = process.env.APP_USER || "multipark";

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [u, p] = atob(auth.slice(6)).split(":");
      if (u === user && p === pass) return NextResponse.next();
    } catch { /* credenciais malformadas */ }
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Reconciliacao Multipark"' },
  });
}
