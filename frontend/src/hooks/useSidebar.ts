import * as React from "react";

const KEY = "sisgemec.sidebar.collapsed";

export function useSidebar() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    const saved = localStorage.getItem(KEY);
    return saved ? saved === "1" : false;
  });

  const toggle = React.useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const set = React.useCallback((value: boolean) => {
    localStorage.setItem(KEY, value ? "1" : "0");
    setCollapsed(value);
  }, []);

  return { collapsed, toggle, set };
}
