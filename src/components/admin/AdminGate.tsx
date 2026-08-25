"use client";

import { useEffect, useState, type ReactNode } from "react";

export const ADMIN_AUTH_KEY = "abacus_admin_authed";

export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_AUTH_KEY);
  window.location.reload();
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthed(sessionStorage.getItem(ADMIN_AUTH_KEY) === "true");
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const login = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Abacus Admin</h1>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
            placeholder="Password"
            autoFocus
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-center"
          />
          <button
            type="button"
            onClick={login}
            className="rounded-full bg-accent text-background px-5 py-2.5 font-medium hover:opacity-90 transition-opacity"
          >
            Login
          </button>
          {error && <p className="text-incorrect text-sm text-center">Incorrect password</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
