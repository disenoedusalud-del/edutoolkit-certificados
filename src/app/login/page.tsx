// src/app/login/page.tsx
"use client";

import { useTheme } from "@/contexts/ThemeContext";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { Gear, Eye, EyeSlash } from "phosphor-react";
import ThemeSelector from "@/components/ThemeSelector";
import Image from "next/image";

type Mode = "login" | "register";

export default function LoginPage() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        // Manejo especial para rate limiting (429)
        if (resLogin.status === 429) {
          const retryAfter = dataLogin?.retryAfter || 0;
          const minutes = Math.ceil(retryAfter / 60);
          throw new Error(
            `Demasiadas solicitudes. Intenta de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}. Si eres MASTER_ADMIN, contacta al administrador para resetear el rate limit.`
          );
        }
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

        {/* Logo EduSalud */}
        <div className="flex justify-center pb-2">
          {(theme === "dark" || theme === "tokyo-night" || theme === "neo-brutalism-dark") ? (
            <div
              className="w-[200px] h-[200px]"
              style={{
                backgroundColor: 'var(--text-primary)',
                maskImage: 'url(/images/logo_edusalud-blanco.svg?v=3)',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: 'contain',
                WebkitMaskImage: 'url(/images/logo_edusalud-blanco.svg?v=3)',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: 'contain'
              }}
              role="img"
              aria-label="Logo EduSalud"
            />
          ) : (
            <Image
              src="/images/logo_edusalud-color.svg?v=3"
              alt="Logo EduSalud"
              width={200}
              height={80}
              className="object-contain h-auto"
              priority
            />
          )}
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold text-text-primary">
            {title} · Panel de certificados
          </h1>
          <p className="text-xs text-text-secondary">
            Solo personal autorizado de EduSalud puede acceder.
          </p>
        </div>

        {/* Toggle Login / Registro */}
        <div className="flex rounded-md border border-theme bg-theme-tertiary text-xs">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 px-3 py-2 border-r border-theme ${mode === "login"
              ? "bg-theme-secondary font-semibold text-text-primary"
              : "text-text-secondary hover:bg-theme-secondary"
              }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 px-3 py-2 ${mode === "register"
              ? "bg-theme-secondary font-semibold text-text-primary"
              : "text-text-secondary hover:bg-theme-secondary"
              }`}
          >
            Crear cuenta
          </button>
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

          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-theme px-3 py-2 pr-10 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-theme-secondary text-text-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeSlash size={18} weight="regular" />
                ) : (
                  <Eye size={18} weight="regular" />
                )}
              </button>
            </div>
            {mode === "register" && (
              <p className="mt-1 text-[11px] text-text-secondary">
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
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
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
                className="text-xs text-accent hover:text-accent-hover hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
        </form>

        {mode === "register" && (
          <p className="text-center text-[11px] text-text-secondary">
            Solo se crearán cuentas para correos previamente autorizados por
            coordinación.
          </p>
        )}
      </div>
    </div>
  );
}


