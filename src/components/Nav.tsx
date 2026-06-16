"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "🅿️ Reconciliação" },
  { href: "/viva", label: "💳 Viva" },
  { href: "/stripe", label: "🟣 Stripe" },
  { href: "/campanhas", label: "🎯 Campanhas" },
  { href: "/metodos", label: "💶 Métodos" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-2">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            "px-3 py-1.5 rounded-md text-xs border " +
            (path === l.href
              ? "bg-acc border-acc text-white"
              : "bg-panel2 border-line text-mut hover:border-acc")
          }
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
