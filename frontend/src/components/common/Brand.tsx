import * as React from "react";
import { cn } from "@/lib/utils";
// Nota: mantenemos el import del icono como fallback opcional si el logo falla
import { SquareGanttChart } from "lucide-react";

// Intenta primero con el alias "@". Si tu proyecto no reconoce "@", cambia a:
// import logoSrc from "../../assets/brand/aosenuma-logo-white.png";
import logoSrc from "@/assets/brand/aosenuma-logo-white.png";

type Props = {
  compact?: boolean;
  className?: string;
};

/**
 * Componente de marca para la cabecera del sidebar.
 * - Muestra el logo (imagen) + el texto "Numafix" cuando no está colapsado.
 * - Cuando está colapsado (compact), muestra sólo el logo en tamaño reducido.
 * - Fallback seguro: si la imagen falla, se muestra el ícono + el texto (si no está compact).
 */
export function Brand({ compact = false, className }: Props) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!imgError ? (
        <img
          src={logoSrc}
          alt="Aosenuma"
          className={compact ? "h-6 w-6" : "h-7 w-auto"}
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <SquareGanttChart className={compact ? "h-6 w-6" : "h-7 w-7"} />
      )}

      {/* Texto sólo cuando no está colapsado */}
      {!compact && (
        <span className="font-semibold tracking-tight select-none">
          Numafix
        </span>
      )}
    </div>
  );
}

export default Brand;
