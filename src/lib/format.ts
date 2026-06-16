export const fmtMoney = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? ""
    : Number(v).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export const fmtNum = (v: unknown) =>
  v === null || v === undefined || v === "" ? "" : Number(v).toLocaleString("pt-PT");

export const fmtDate = (v: unknown) => {
  if (!v) return "";
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

export const fmtEur0 = (v: unknown) =>
  (Number(v) || 0).toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " €";
