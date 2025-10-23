import * as React from "react";

type KV = { key: string; value: string };

type Props = {
  value?: Record<string, any>;
  onChange: (val: Record<string, any>) => void;
  label?: string;
  helpText?: string;
};

const PRESETS = [
  { key: "apps", value: ["Word","Excel","PowerPoint","Teams","Outlook"] },
  { key: "storage_gb", value: 1000 },
  { key: "soporte", value: "24/7" },
];

function normalizeToPairs(obj?: Record<string, any>): KV[] {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj).map(([k, v]) => ({ key: String(k), value: JSON.stringify(v) }));
}

function parseValue(raw: string): any {
  const t = raw.trim();
  if (t === "") return "";
  // intenta JSON parse
  try { return JSON.parse(t); } catch {}
  // boolean
  if (t.toLowerCase() === "true") return true;
  if (t.toLowerCase() === "false") return false;
  // number
  const n = Number(t);
  if (!Number.isNaN(n) && /^\d+(\.\d+)?$/.test(t)) return n;
  // string como fallback
  return t;
}

export const FeaturesEditor: React.FC<Props> = ({ value, onChange, label = "Características", helpText = "Agrega pares clave/valor. Los valores pueden ser números, booleanos o JSON (e.g., [\"Word\",\"Excel\"])." }) => {
  const [rows, setRows] = React.useState<KV[]>(() => normalizeToPairs(value));

  React.useEffect(() => {
    setRows(normalizeToPairs(value));
  }, [value]);

  const emit = (r: KV[]) => {
    const out: Record<string, any> = {};
    r.forEach(({ key, value }) => {
      if (key.trim() === "") return;
      out[key.trim()] = parseValue(value);
    });
    onChange(out);
  };

  const addRow = () => {
    const next = [...rows, { key: "", value: "" }];
    setRows(next); emit(next);
  };

  const removeRow = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next); emit(next);
  };

  const updateRow = (idx: number, patch: Partial<KV>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setRows(next); emit(next);
  };

  const applyPreset = (k: string, v: any) => {
    const s = JSON.stringify(v);
    // si ya existe la clave, la reemplazamos
    const idx = rows.findIndex(r => r.key === k);
    let next: KV[];
    if (idx >= 0) {
      next = rows.map((r, i) => i === idx ? ({ key: k, value: s }) : r);
    } else {
      next = [...rows, { key: k, value: s }];
    }
    setRows(next); emit(next);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium">{label}</label>
        <p className="text-xs text-gray-500">{helpText}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
            onClick={() => applyPreset(p.key, p.value)}
          >
            + {p.key}
          </button>
        ))}
      </div>

      <div className="rounded-md border divide-y">
        {rows.length === 0 && (
          <div className="p-3 text-sm text-gray-500">Sin características. Agrega una fila.</div>
        )}
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center">
            <input
              className="col-span-4 rounded border px-2 py-1 text-sm"
              placeholder="clave (p. ej. apps)"
              value={row.key}
              onChange={(e) => updateRow(idx, { key: e.target.value })}
            />
            <input
              className="col-span-7 rounded border px-2 py-1 text-sm"
              placeholder='valor (p. ej. ["Word","Excel"])'
              value={row.value}
              onChange={(e) => updateRow(idx, { value: e.target.value })}
            />
            <button
              type="button"
              className="col-span-1 rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              onClick={() => removeRow(idx)}
            >
              X
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="rounded border px-2 py-1 text-xs"
        onClick={addRow}
      >
        + Agregar característica
      </button>
    </div>
  );
};