// src/app/forgot-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-md">
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-semibold text-green-600">
              Email Enviado
            </h1>
            <p className="text-sm text-slate-600">
              Si el correo está registrado, recibirás un email con instrucciones
              para restablecer tu contraseña. Revisa tu bandeja de entrada y
              spam.
            </p>
            <p className="text-xs text-slate-500">
              El enlace de restablecimiento expirará en 1 hora.
            </p>
          </div>
          <Link
            href="/login"
            className="block w-full rounded-md bg-sky-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-sky-700"
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-md">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-slate-800">
            Restablecer Contraseña
          </h1>
          <p className="text-xs text-slate-500">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu
            contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="correo@unah.edu.hn"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={14} />
          Volver al login
        </Link>
      </div>
    </div>
  );
}

