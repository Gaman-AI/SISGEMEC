import React from 'react';

export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
      {/* Selector / título sección (placeholder) */}
      <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span className="font-medium">Novedad</span>
        <svg width="16" height="16" viewBox="0 0 20 20" className="opacity-60"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
      </div>

      {/* Buscador */}
      <div className="flex-1">
        <div className="relative max-w-xl">
          <input
            type="search"
            placeholder="Buscar"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-3 py-2 text-sm outline-none ring-0 transition focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
          />
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
        </div>
      </div>

      {/* Acciones (placeholders) */}
      <div className="flex items-center gap-2">
        <button className="rounded-full border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          Instalar agente
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
          <span className="sr-only">Notificaciones</span>
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-600 dark:text-gray-300"><path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zM6 8a6 6 0 1112 0c0 7 3 5 3 7H3c0-2 3 0 3-7z" fill="currentColor"/></svg>
        </button>
      </div>
    </header>
  );
}
