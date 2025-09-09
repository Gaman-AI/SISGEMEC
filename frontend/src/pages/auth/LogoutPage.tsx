import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/auth.store";

export default function LogoutPage() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  React.useEffect(() => {
    (async () => {
      await signOut();
      nav("/login", { replace: true });
    })();
  }, [signOut, nav]);
  return null;
}