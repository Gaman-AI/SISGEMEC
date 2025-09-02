import * as React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "../../lib/utils";
import { useSidebar } from "../../hooks/useSidebar";

type Props = { children?: React.ReactNode };

export default function AppLayout({ children }: Props) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex">
      <Sidebar />
      <div className={cn("flex min-h-dvh flex-1 flex-col")}>
        <Topbar />
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

