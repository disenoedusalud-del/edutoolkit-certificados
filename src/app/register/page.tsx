"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">
          Crear cuenta · Panel de certificados
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          Solo personal autorizado de EduSalud puede acceder.
        </p>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Correo</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="correo@unah.edu.hn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              La contraseña debe tener al menos 6 caracteres.
            </p>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {disabled ? "Creando cuenta..." : "Crear cuenta y entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          Solo se crearán cuentas para correos previamente autorizados por
          coordinación.
        </p>

        <p className="mt-3 text-center text-sm">
          ¿Ya tiene cuenta?{" "}
          <a
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  );
}
