// src/app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Si estamos en modo "register", primero pedimos al backend crear la cuenta
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            data?.error ??
              "No se pudo crear la cuenta. Verifica que el correo esté autorizado.",
          );
        }
      }

      // 2) Iniciar sesión con Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();

      const resLogin = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const dataLogin = await resLogin.json().catch(() => null);

      if (!resLogin.ok) {
        throw new Error(
          dataLogin?.error ?? "No se pudo crear la sesión de administrador",
        );
      }

      // 4) Redirigir al panel
      router.push("/admin/certificados");
      router.refresh();
    } catch (err: unknown) {
      // Manejo específico de errores de Firebase Auth
      const error = err as { code?: string; message?: string };
      
      // Solo loguear errores que no sean de credenciales inválidas (ya se manejan)
      if (error?.code !== "auth/invalid-credential") {
        console.error("[LOGIN]", err);
      }
      
      // Si recibimos auth/invalid-credential, necesitamos verificar si el usuario existe
      // para distinguir entre "usuario no existe" y "contraseña incorrecta"
      if (error?.code === "auth/invalid-credential") {
        // Verificar si el usuario existe para dar el mensaje correcto
        try {
          const checkRes = await fetch("/api/auth/check-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const checkData = await checkRes.json();
          
          if (checkData.exists === true) {
            setError("Contraseña incorrecta. ¿Olvidaste tu contraseña?");
          } else {
            setError("Aún no tienes cuenta creada. Ve a 'Crear cuenta' para registrarte.");
          }
        } catch {
          // Si no podemos verificar, asumimos que es usuario no encontrado
          setError("Aún no tienes cuenta creada. Ve a 'Crear cuenta' para registrarte.");
        }
      } else if (error?.code === "auth/user-not-found") {
        setError("Aún no tienes cuenta creada. Ve a 'Crear cuenta' para registrarte.");
      } else if (error?.code === "auth/wrong-password") {
        setError("Contraseña incorrecta. ¿Olvidaste tu contraseña?");
      } else if (error?.code === "auth/invalid-email") {
        setError("El formato del correo no es válido.");
      } else if (error?.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Intenta más tarde.");
      } else {
        setError(error?.message ?? "Ocurrió un error al procesar la solicitud");
      }
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "login" ? "Iniciar sesión" : "Crear cuenta";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-md">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-slate-800">
            {title} · Panel de certificados
          </h1>
          <p className="text-xs text-slate-500">
            Solo personal autorizado de EduSalud puede acceder.
          </p>
        </div>

        {/* Toggle Login / Registro */}
        <div className="flex rounded-md border bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 px-3 py-2 border-r ${
              mode === "login"
                ? "bg-white font-semibold text-slate-800"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 px-3 py-2 ${
              mode === "register"
                ? "bg-white font-semibold text-slate-800"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Crear cuenta
          </button>
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

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Contraseña
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
            {mode === "register" && (
              <p className="mt-1 text-[11px] text-slate-500">
                La contraseña debe tener al menos 6 caracteres.
              </p>
            )}
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
            {loading
              ? mode === "login"
                ? "Ingresando..."
                : "Creando cuenta..."
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta y entrar"}
          </button>

          {mode === "login" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="text-xs text-sky-600 hover:text-sky-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
        </form>

        {mode === "register" && (
          <p className="text-center text-[11px] text-slate-500">
            Solo se crearán cuentas para correos previamente autorizados por
            coordinación.
          </p>
        )}
      </div>
    </div>
  );
}


