import * as React from "react";
import { Brand } from "@/components/common/Brand";

export default function Topbar() {
  return (
    <header className="h-14 flex items-center justify-between px-3 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
      <Brand />
      {/* Sin selector de color, sin botón de modo oscuro */}
      <div />
    </header>
  );
}

