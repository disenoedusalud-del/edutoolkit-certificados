// src/app/forgot-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gear } from "phosphor-react";
import Link from "next/link";
import ThemeSelector from "@/components/ThemeSelector";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log("[FORGOT-PASSWORD] Iniciando solicitud para:", email);

    try {
      // El backend genera el link y lo envía por email usando EmailJS
      console.log("[FORGOT-PASSWORD] Llamando a /api/auth/reset-password");
      
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      console.log("[FORGOT-PASSWORD] Respuesta recibida:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
      });

      const data = await res.json();
      console.log("[FORGOT-PASSWORD] Datos de respuesta:", data);

      if (!res.ok) {
        throw new Error(data.error || "Error al solicitar restablecimiento");
      }

      console.log("[FORGOT-PASSWORD] ✅ Solicitud exitosa");
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error("[FORGOT-PASSWORD] ❌ Error completo:", {
        error,
        message: error?.message,
        code: error?.code,
      });
      setError(error?.message || "Error al solicitar restablecimiento");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-primary relative">
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

        <div className="w-full max-w-md space-y-4 rounded-xl bg-theme-secondary p-6 shadow-md border border-theme">
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-semibold text-green-600">
              Email Enviado
            </h1>
            <p className="text-sm text-text-secondary">
              Si el correo está registrado, recibirás un email con instrucciones
              para restablecer tu contraseña. Revisa tu bandeja de entrada y
              spam.
            </p>
            <p className="text-xs text-text-secondary">
              El enlace de restablecimiento expirará en 1 hora.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-white hover:bg-accent-hover"
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-theme-primary relative">
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

      <div className="w-full max-w-md space-y-6 rounded-xl bg-theme-secondary p-6 shadow-md border border-theme">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-text-primary">
            Restablecer Contraseña
          </h1>
          <p className="text-xs text-text-secondary">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu
            contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-theme px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-theme-secondary text-text-primary"
              placeholder="correo@unah.edu.hn"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Volver al login
        </Link>
      </div>
    </div>
  );
}

