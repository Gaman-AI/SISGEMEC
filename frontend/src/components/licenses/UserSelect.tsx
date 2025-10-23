import { useEffect, useMemo, useState } from "react";
import { listActiveProfilesLite, type ProfileLite } from "@/data/users.licenses.repository";

type Props = {
  value?: string | null;              // user_id seleccionado
  onSelect: (userId: string | null) => void;
  label?: string;
  placeholder?: string;
  pageSize?: number;
};

export default function UserSelect({ value, onSelect, label = "Usuario", placeholder = "Buscar por nombre o correo", pageSize = 10 }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProfileLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // debounce simple sin libs
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await listActiveProfilesLite({ page, size: pageSize, search: debouncedSearch });
        if (!cancelled) {
          setRows(res.data);
          setTotal(res.total);
        }
      } catch (e) {
        console.error("[UserSelect] load error", e);
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        !cancelled && setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, debouncedSearch]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder={placeholder}
        value={search}
        onChange={(e) => { setPage(1); setSearch(e.target.value); }}
      />

      <div className="rounded-md border">
        {loading ? (
          <div className="p-3 text-sm text-gray-500">Cargando usuarios...</div>
        ) : rows.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">No hay usuarios activos que coincidan.</div>
        ) : (
          <ul className="max-h-60 overflow-auto divide-y">
            {rows.map(u => {
              const selected = value === u.user_id;
              return (
                <li
                  key={u.user_id}
                  className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 ${selected ? "bg-blue-50" : ""}`}
                  onClick={() => onSelect(u.user_id)}
                >
                  <div className="font-medium">{u.full_name || "(Sin nombre)"}</div>
                  <div className="text-xs text-gray-500">{u.email || "(Sin correo)"}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <button
          type="button"
          className="rounded border px-2 py-1 disabled:opacity-50"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Anterior
        </button>
        <span>Página {page} de {pages}</span>
        <button
          type="button"
          className="rounded border px-2 py-1 disabled:opacity-50"
          onClick={() => setPage(p => Math.min(pages, p + 1))}
          disabled={page >= pages || loading}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}