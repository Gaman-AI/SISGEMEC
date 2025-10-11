// FILE: frontend/src/pages/ImportarPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Users, Monitor, ArrowRight } from "lucide-react";

export default function ImportarPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Importar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Importa datos desde archivos Excel a la base de datos
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tarjeta Importar Usuarios */}
        <div className="rounded-2xl border-none p-5 shadow-sm bg-[#CFD0BF]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-slate-800" />
            <div className="text-lg font-medium text-slate-800">Importar Usuarios</div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Importa responsables desde Excel con la hoja <b>"Usuarios"</b>.<br/>
            Columnas requeridas: <i>First Name, Last Name, Email Address</i>.
          </p>
          <Link
            to="/import-usuarios"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#CFD0BF] text-slate-800 border border-slate-300 hover:opacity-90 transition-colors"
          >
            <Users className="h-4 w-4 mr-2" />
            Importar Usuarios
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>

        {/* Tarjeta Importar Equipos */}
        <div className="rounded-2xl border-none p-5 shadow-sm bg-[#C7D8D0]">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-5 w-5 text-slate-800" />
            <div className="text-lg font-medium text-slate-800">Importar Equipos</div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Importa equipos desde Excel con la hoja <b>"Equipos"</b>.<br/>
            Requiere que los usuarios ya existan. Columnas: <i>Número de serie, Estado, Responsable email</i>.
          </p>
          <Link
            to="/import-equipos"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#C7D8D0] text-slate-800 border border-slate-300 hover:opacity-90 transition-colors"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Importar Equipos
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium text-slate-900 mb-2">Información Importante</h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• <strong>Orden recomendado:</strong> Importa usuarios primero, luego equipos</li>
          <li>• <strong>Formatos soportados:</strong> .xlsx, .xls</li>
          <li>• <strong>Plantillas:</strong> Descarga las plantillas desde cada página de importación</li>
          <li>• <strong>Idempotencia:</strong> Re-importar no duplica datos existentes</li>
        </ul>
      </div>
    </div>
  );
}
