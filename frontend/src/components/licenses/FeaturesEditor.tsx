import * as React from "react";

type Props = {
  value?: Record<string, any>;
  onChange: (val: Record<string, any>) => void;
  label?: string;
  helpText?: string;
};

/**
 * Extrae el texto de descripción del objeto features
 */
function getDescriptionFromValue(v?: Record<string, any>): string {
  if (!v || typeof v !== "object") return "";

  // Si tiene 'description' como string, usarlo directamente
  if (typeof v.description === "string") {
    return v.description;
  }

  // Si tiene otras claves, mostrar como JSON legible (para planes viejos)
  if (Object.keys(v).length > 0) {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return "";
    }
  }

  return "";
}

export const FeaturesEditor: React.FC<Props> = ({
  value,
  onChange,
  label = "Características",
  helpText = "Describe brevemente qué incluye este plan. Este texto se guardará como parte de la configuración del plan.",
}) => {
  const [text, setText] = React.useState<string>(() => getDescriptionFromValue(value));

  // Sincronizar cuando value cambia externamente (ej: al cargar un plan para editar)
  React.useEffect(() => {
    setText(getDescriptionFromValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    const trimmed = newText.trim();

    // Si está vacío, enviar objeto vacío
    // Si tiene contenido, enviar { description: "<texto>" }
    if (!trimmed) {
      onChange({});
    } else {
      onChange({ description: trimmed });
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium">{label}</label>
        <p className="text-xs text-gray-500">{helpText}</p>
      </div>
      <textarea
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[90px]"
        placeholder="Ej: Acceso a todas las apps de Adobe para equipo creativo. Incluye Photoshop, Illustrator, Premiere Pro y soporte 24/7."
        value={text}
        onChange={handleChange}
        rows={3}
      />
    </div>
  );
};
