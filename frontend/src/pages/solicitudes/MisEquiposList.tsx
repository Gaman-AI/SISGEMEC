import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/auth.store";
import EmptyState from "@/components/EmptyState";
// Preferir el mismo origen que usa "Nueva Solicitud". Si ahí usan otro repo/función, impórtala aquí.
import { listEquiposPropiosLite } from "@/data/solicitudes.repository";
// Fallback con datos completos desde repo de equipos (no modifica backend ni contratos)
import { listEquipos } from "@/data/equipos.repository";

type AnyRecord = Record<string, any>;

export default function MisEquiposList() {
  const { state } = useAuth();

  const displayName =
    (state.status === "authenticated" ? state.profile.full_name : null) ||
    (state.status === "authenticated" ? state.profile.email : null) ||
    "Responsable";

  const responsableId = state.status === "authenticated" ? state.profile.user_id : null;
  const [data, setData] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (!responsableId) {
          setData([]);
          return;
        }

        // 1) Intento: mismo origen que "Nueva Solicitud" (puede ser limitado en campos)
        const { data: liteData, error: liteError } = await listEquiposPropiosLite(responsableId);
        if (liteError) throw liteError;
        let rows: AnyRecord[] = liteData || [];

        // 2) Si no trae campos completos, hacemos un Fallback no invasivo a listEquipos (mismo filtro)
        const isLite =
          !rows?.length ||
          Object.keys(rows[0] ?? {}).length < 6 || // heurística simple de "pocos campos"
          (!rows[0]?.estado_nombre && !rows[0]?.estado && !rows[0]?.estado_equipo_id);

        if (isLite) {
          const resp = await listEquipos({ responsable_id: responsableId, page: 1, pageSize: 200 });
          // El repo puede devolver {data, total} o un array directo. Soportamos ambos.
          const maybeData = (resp && ("data" in resp ? resp.data : resp)) as AnyRecord[] | undefined;
          if (Array.isArray(maybeData) && maybeData.length) rows = maybeData;
        }

        if (!alive) return;
        setData(Array.isArray(rows) ? rows : []);
        console.debug("[MisEquipos] responsable:", responsableId, "rows:", rows?.length ?? 0, "sample:", rows?.[0]);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error al cargar tus equipos");
        setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [responsableId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((e) => {
      const s = [
        e.num_serie,
        e.marca,
        e.modelo,
        e.tipo_equipo,
        e.sistema_operitivo,
        e.sistema_operativo,
        e.ubicacion_actual,
        e.procesador,
        e.ram,
        e.disco,
        e.estado_nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return s.includes(q);
    });
  }, [data, search]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Header name={displayName} search={search} onSearch={setSearch} />
        <div className="rounded-xl border bg-[#E5EADF] text-[#26272A] p-4">Cargando…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Header name={displayName} search={search} onSearch={setSearch} />
        <div className="rounded-xl border bg-[#CFD0BF] text-[#26272A] p-4">{error}</div>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="space-y-4">
        <Header name={displayName} search={search} onSearch={setSearch} />
        <div className="bg-[#F4F5F0] text-[#26272A] border rounded-lg">
          <EmptyState
            title="Sin equipos asignados"
            description="Cuando se te asigne un equipo aparecerá aquí."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header name={displayName} search={search} onSearch={setSearch} />
      <div className="text-sm" style={{ color: "#527779" }}>
        Tienes {filtered.length} equipo{filtered.length === 1 ? "" : "s"} asignado{filtered.length === 1 ? "" : "s"}.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => (
          <EquipoCard key={e.equipo_id ?? `${e.num_serie}-${e.marca}-${e.modelo}`} equipo={e} />
        ))}
      </div>
    </div>
  );
}

/* --------------------- UI helpers --------------------- */

function Header({
  name,
  search,
  onSearch,
}: {
  name: string;
  search: string;
  onSearch: (v: string) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-[#26272A]">Bienvenido, {name}</h2>
        <p className="text-sm" style={{ color: "#527779" }}>
          Aquí puedes consultar la información de tus equipos asignados.
        </p>
      </div>
      <input
        type="text"
        placeholder="Buscar por serie, marca, modelo…"
        className="w-full md:w-80 rounded-xl border px-3 py-2 outline-none focus:ring-2"
        style={{
          backgroundColor: "#F4F5F0",
          color: "#26272A",
          borderColor: "#C7D8D0",
        }}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}

function Tag({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  const styles =
    tone === "accent"
      ? { backgroundColor: "#D4D970", color: "#26272A" }
      : { backgroundColor: "#C7D8D0", color: "#26272A" };
  return (
    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium" style={styles}>
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs" style={{ color: "#527779" }}>
        {label}
      </span>
      <span className="font-medium text-[#26272A]">{value ?? "—"}</span>
    </div>
  );
}

const HIDDEN_FIELDS = new Set([
  "equipo_id",
  "responsable_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "id",
]);

// Orden lógico de campos primero; lo que no esté aquí se agrega después automáticamente.
const FIELDS_ORDER: Array<[key: string, label: string]> = [
  ["num_serie", "Núm. Serie"],
  ["tipo_equipo", "Tipo de equipo"],
  ["marca", "Marca"],
  ["modelo", "Modelo"],
  ["procesador", "Procesador"],
  ["ram", "RAM"],
  ["disco", "Disco"],
  ["sistema_operativo", "Sistema Operativo"],
  ["ubicacion_actual", "Ubicación"],
  ["estado_nombre", "Estado"],
  ["estado", "Estado"],
  ["estado_equipo_id", "Estado (ID)"],
  ["fecha_ingreso", "Fecha de ingreso"],
  ["fecha_salida", "Fecha de salida"],
  ["observaciones", "Observaciones"],
];

function EquipoCard({ equipo }: { equipo: AnyRecord }) {
  const title =
    [equipo?.marca, equipo?.modelo].filter(Boolean).join(" ") ||
    equipo?.tipo_equipo ||
    "Equipo";

  const estadoTexto =
    equipo?.estado_nombre ||
    equipo?.estado ||
    (equipo?.estado_equipo_id != null ? String(equipo.estado_equipo_id) : null) ||
    "—";

  // Campos en orden preferido
  const inOrder = FIELDS_ORDER.filter(([k]) => equipo[k] !== undefined && !HIDDEN_FIELDS.has(k));

  // Campos adicionales no listados (se agregan automáticamente)
  const extras = Object.keys(equipo)
    .filter(
      (k) =>
        !HIDDEN_FIELDS.has(k) &&
        !inOrder.find(([kk]) => kk === k) &&
        equipo[k] !== null &&
        equipo[k] !== ""
    )
    .map((k) => [k, labelize(k)] as [string, string]);

  // Construye pares [label, valor] con formato básico
  const pairs: Array<[string, string | null]> = [
    ...inOrder.map(([k, label]) => [label, normalizeValue(equipo[k])] as [string, string | null]),
    ...extras.map(([k, label]) => [label, normalizeValue(equipo[k])] as [string, string | null]),
  ];

  return (
    <div className="rounded-2xl border p-4 shadow-sm hover:shadow transition" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold text-[#26272A]">{title}</div>
          <div className="text-sm" style={{ color: "#527779" }}>
            {equipo?.tipo_equipo || "Tipo no especificado"}
          </div>
        </div>
        <Tag tone="muted">Estado — {estadoTexto}</Tag>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {pairs.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </div>

      {equipo?.equipo_id ? (
        <div className="mt-3 flex items-center justify-between">
          <Tag tone="accent">Asignado</Tag>
          <span className="text-xs" style={{ color: "#527779" }}>
            #{equipo.equipo_id}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------- utils --------------------- */

function labelize(key: string): string {
  // transforma snake/camel a etiqueta legible
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeValue(v: any): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  // fechas ISO -> local date (solo yyyy-mm-dd o iso)
  if (typeof v === "string" && /\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return String(v);
}



