"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gear } from "phosphor-react";
import ThemeSelector from "@/components/ThemeSelector";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Correo y contraseña son obligatorios.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data?.error || "No se pudo crear la cuenta. Intente nuevamente."
        );
        return;
      }

      setSuccess("Cuenta creada correctamente. Ahora puede iniciar sesión.");
      startTransition(() => {
        router.push("/login");
      });
    } catch (err) {
      console.error("[REGISTER] Error en el cliente:", err);
      setError("Ocurrió un error inesperado. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || isPending;

  return (
    <main className="min-h-screen flex items-center justify-center bg-theme-primary px-4 relative">
      {/* Botón de ajustes de tema en la esquina superior derecha */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setShowThemeSettings(!showThemeSettings)}
          className="p-2 rounded-lg bg-theme-secondary hover:bg-theme-tertiary transition-colors border border-theme text-text-primary"
          title="Ajustes de tema"
        >
          <Gear size={20} weight="bold" />
        </button>
        {showThemeSettings && (
          <div className="absolute top-12 right-0 bg-theme-secondary border border-theme rounded-lg shadow-xl p-4 z-50 min-w-[200px]">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Apariencia</h3>
              <ThemeSelector />
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-md rounded-lg border border-theme bg-theme-secondary p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-text-primary">
          Crear cuenta · Panel de certificados
        </h1>
        <p className="mb-4 text-sm text-text-secondary">
          Solo personal autorizado puede acceder.
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Correo</label>
            <input
              type="email"
              className="w-full rounded-md border border-theme px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-theme-secondary text-text-primary"
              placeholder="correo@unah.edu.hn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-theme px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-theme-secondary text-text-primary"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-text-secondary">
              La contraseña debe tener al menos 6 caracteres.
            </p>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {disabled ? "Creando cuenta..." : "Crear cuenta y entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-text-secondary">
          Solo se crearán cuentas para correos previamente autorizados por
          coordinación.
        </p>

        <p className="mt-3 text-center text-sm text-text-primary">
          ¿Ya tiene cuenta?{" "}
          <a
            href="/login"
            className="font-medium text-accent hover:text-accent-hover hover:underline"
          >
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  );
}
