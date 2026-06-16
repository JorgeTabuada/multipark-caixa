"use client";
import { useState } from "react";
import { SOURCES, COLUMNS, FLAGS } from "@/lib/schema";

export function ColumnPicker({
  visible, onToggle, onSource, onFlags,
}: {
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSource: (src: string, on: boolean) => void;
  onFlags: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const flagsOn = FLAGS.every((f) => visible[f.key]);

  return (
    <div className="relative">
      <button
        className="bg-panel2 border border-line rounded-md px-3 py-1.5 text-xs hover:border-acc"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙ Colunas / fontes
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-30 bg-panel border border-line rounded-xl p-3 w-[320px] max-h-[70vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-line">
              <span className="text-xs font-semibold">Estado (reconciliação)</span>
              <label className="text-xxs text-mut flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={flagsOn} onChange={(e) => onFlags(e.target.checked)} /> mostrar
              </label>
            </div>
            {SOURCES.map((s) => {
              const cols = COLUMNS.filter((c) => c.source === s.id);
              if (!cols.length) return null;
              const allOn = cols.every((c) => visible[c.key]);
              return (
                <div key={s.id} className="mb-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                    <label className="text-xxs text-mut flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={allOn} onChange={(e) => onSource(s.id, e.target.checked)} /> tudo
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pl-1">
                    {cols.map((c) => (
                      <label key={c.key} className="text-xxs flex items-center gap-1 cursor-pointer text-txt/90">
                        <input type="checkbox" checked={!!visible[c.key]} onChange={() => onToggle(c.key)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
