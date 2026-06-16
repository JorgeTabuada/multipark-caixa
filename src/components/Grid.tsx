"use client";
import { useMemo } from "react";
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type VisibilityState,
} from "@tanstack/react-table";
import { SOURCES, COLUMNS, FLAGS, type Row } from "@/lib/schema";
import { fmtMoney, fmtDate, fmtNum } from "@/lib/format";

const EST_COLOR: Record<string, string> = {
  ok: "#16a34a", pendente: "#d97706", problema: "#dc2626",
};

function renderCell(kind: string, v: unknown) {
  if (kind === "estado") {
    const s = String(v ?? "pendente");
    return <span className="px-1.5 py-0.5 rounded text-xxs font-semibold"
      style={{ background: (EST_COLOR[s] || "#444") + "33", color: EST_COLOR[s] || "#aaa" }}>{s}</span>;
  }
  if (kind === "notas") return v ? <span title="tem notas">📝</span> : <span className="text-mut/30">·</span>;
  if (v === null || v === undefined || v === "") return <span className="text-mut/40">·</span>;
  switch (kind) {
    case "money": {
      const n = Number(v);
      const neg = n < 0;
      return <span className={"tabular " + (neg ? "text-[#d97706]" : "")}>{fmtMoney(v)}</span>;
    }
    case "num": return <span className="tabular">{fmtNum(v)}</span>;
    case "date": return <span className="text-txt/85">{fmtDate(v)}</span>;
    case "badge":
      return <span className="inline-block bg-[#eaf1fb] text-txt/90 rounded px-1.5 py-0.5 text-xxs">{String(v)}</span>;
    default: {
      const s = String(v);
      return <span title={s}>{s.length > 26 ? s.slice(0, 24) + "…" : s}</span>;
    }
  }
}

function Flag({ v }: { v: unknown }) {
  if (v === null || v === undefined)
    return <span className="text-mut/40" title="fonte ausente">—</span>;
  return v
    ? <span className="text-[#16a34a] font-bold" title="bate">✓</span>
    : <span className="text-[#dc2626] font-bold" title="diverge">✗</span>;
}

export function Grid({
  rows, visible, sort, dir, onSort, onRowClick,
}: {
  rows: Row[];
  visible: VisibilityState;
  sort: string; dir: "asc" | "desc";
  onSort: (key: string) => void;
  onRowClick: (r: Row) => void;
}) {
  const columns = useMemo<ColumnDef<Row>[]>(() => {
    const groups: ColumnDef<Row>[] = SOURCES.map((s) => ({
      id: "grp_" + s.id,
      header: s.label,
      meta: { color: s.color },
      columns: COLUMNS.filter((c) => c.source === s.id).map((c) => ({
        id: c.key,
        accessorKey: c.key,
        header: c.label,
        cell: (ctx) => renderCell(c.kind, ctx.getValue()),
      })),
    }));
    groups.push({
      id: "grp_flags",
      header: "Estado",
      meta: { color: "#14233f" },
      columns: FLAGS.map((f) => ({
        id: f.key,
        accessorKey: f.key,
        header: f.label,
        cell: (ctx) => <Flag v={ctx.getValue()} />,
      })),
    });
    return groups;
  }, []);

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility: visible },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="border border-line rounded-xl overflow-auto max-h-[64vh]">
      <table className="border-collapse text-xs w-max min-w-full">
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((hg, gi) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const color = (h.column.columnDef.meta as { color?: string })?.color;
                const isGroup = gi === 0;
                const leafKey = h.column.id;
                const sortable = !isGroup && h.subHeaders.length === 0;
                return (
                  <th
                    key={h.id}
                    colSpan={h.colSpan}
                    onClick={sortable ? () => onSort(leafKey) : undefined}
                    className={
                      "px-2 py-1.5 text-left whitespace-nowrap border-b border-line bg-panel " +
                      (isGroup ? "text-center font-bold border-r border-line/60 " : "font-semibold ") +
                      (sortable ? "cursor-pointer select-none hover:bg-[#eaf1fb]" : "")
                    }
                    style={isGroup && color ? { color, borderTop: `2px solid ${color}` } : { color: "#64748b" }}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    {sortable && sort === leafKey ? (dir === "asc" ? " ▲" : " ▼") : ""}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onRowClick(r.original)}
              className="hover:bg-[#eaf1fb] cursor-pointer border-b border-line/40"
            >
              {r.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-1 whitespace-nowrap max-w-[230px] overflow-hidden text-ellipsis">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr><td className="px-3 py-6 text-mut text-center" colSpan={50}>sem resultados para os filtros atuais</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
