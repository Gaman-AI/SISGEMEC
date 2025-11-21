// FILE: frontend/src/pages/ImportarPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Users, Monitor, ArrowRight } from "lucide-react";

export default function ImportarPage() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Importar
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Importa datos desde archivos Excel a la base de datos del sistema.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tarjeta Importar Usuarios */}
        <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-[#208692]" />
            <h2 className="text-lg font-medium text-[#164F5B]">Importar Usuarios</h2>
          </div>
          <p className="text-sm text-[#26272A] mb-4">
            Importa responsables desde un archivo Excel ya estructurado con la hoja <b>"Usuarios"</b>.<br/>
            Columnas requeridas: <i>First Name, Last Name, Email Address</i>.
          </p>
          <Link
            to="/import-usuarios"
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-[#208692] hover:bg-[#164F5B] text-white
              transition-colors duration-200 shadow-sm
              px-4 py-2.5 text-sm font-semibold
            "
          >
            <Users className="h-4 w-4" />
            Importar usuarios
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tarjeta Importar Equipos */}
        <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-5 w-5 text-[#208692]" />
            <h2 className="text-lg font-medium text-[#164F5B]">Importar Equipos</h2>
          </div>
          <p className="text-sm text-[#26272A] mb-4">
            Importa equipos desde un archivo Excel ya estructurado con la hoja <b>"Equipos"</b>.<br/>
            Requiere que los usuarios ya existan. Columnas: <i>Número de serie, Estado, Responsable email</i>.
          </p>
          <Link
            to="/import-equipos"
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-[#208692] hover:bg-[#164F5B] text-white
              transition-colors duration-200 shadow-sm
              px-4 py-2.5 text-sm font-semibold
            "
          >
            <Monitor className="h-4 w-4" />
            Importar equipos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-8 rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#164F5B] mb-2">
          Información importante
        </h3>
        <ul className="text-sm text-[#26272A] space-y-1">
          <li>• <strong>Orden recomendado:</strong> Importa usuarios primero, luego equipos</li>
          <li>• <strong>Formatos soportados:</strong> .xlsx, .xls</li>
          <li>• <strong>Plantillas:</strong> Descarga las plantillas desde cada página de importación</li>
          <li>• <strong>Idempotencia:</strong> Re-importar no duplica datos existentes</li>
        </ul>
      </div>
    </div>
  );
}
