// src/app/reset-password/page.tsx
"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { ArrowLeft } from "phosphor-react";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Obtener el código de acción desde la URL
    const actionCode = searchParams.get("oobCode");
    const mode = searchParams.get("mode");

    if (!actionCode || mode !== "resetPassword") {
      setError("El enlace de restablecimiento no es válido o ha expirado.");
      setLoading(false);
      return;
    }

    setCode(actionCode);

    // Verificar el código y obtener el email
    verifyPasswordResetCode(auth, actionCode)
      .then((email) => {
        setEmail(email);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error verificando código:", err);
        setError(
          err.code === "auth/expired-action-code"
            ? "El enlace ha expirado. Solicita un nuevo restablecimiento de contraseña."
            : "El enlace de restablecimiento no es válido."
        );
        setLoading(false);
      });
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError("Código de restablecimiento no válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      await confirmPasswordReset(auth, code, password);
      setSuccess(true);
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error("Error restableciendo contraseña:", error);
      
      if (error?.code === "auth/expired-action-code") {
        setError("El enlace ha expirado. Solicita un nuevo restablecimiento de contraseña.");
      } else if (error?.code === "auth/invalid-action-code") {
        setError("El código de restablecimiento no es válido.");
      } else {
        setError(error?.message || "Error al restablecer la contraseña. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md">
          <p className="text-center text-sm text-slate-600">
            Verificando enlace...
          </p>
        </div>
      </div>
    );
  }

  if (error && !code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-md">
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-semibold text-slate-800">
              Enlace Inválido
            </h1>
            <p className="text-sm text-red-600">{error}</p>
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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-md">
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-semibold text-green-600">
              ¡Contraseña restablecida!
            </h1>
            <p className="text-sm text-slate-600">
              Tu contraseña ha sido cambiada correctamente. Serás redirigido al login...
            </p>
          </div>
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
          {email && (
            <p className="text-xs text-slate-500">
              Restableciendo contraseña para: {email}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Nueva Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              La contraseña debe tener al menos 6 caracteres.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {submitting ? "Restableciendo..." : "Restablecer Contraseña"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md">
          <p className="text-center text-sm text-slate-600">
            Cargando...
          </p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}


