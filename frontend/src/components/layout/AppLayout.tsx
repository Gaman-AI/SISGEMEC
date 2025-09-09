import * as React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";

export default function AppLayout() {
  const { collapsed } = useSidebar();
  return (
    <div className="flex">
      <Sidebar />
      <div className={cn("flex min-h-dvh flex-1 flex-col")}>
        <Topbar />
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

