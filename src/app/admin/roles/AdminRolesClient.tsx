// src/app/admin/roles/AdminRolesClient.tsx
"use client";

import { useEffect, useState } from "react";
import type { AdminUser, AdminRole } from "@/lib/adminRoles";

type Props = {
  currentUserEmail: string;
};

export default function AdminRolesClient({ currentUserEmail }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<AdminRole>("ADMIN");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/admin-users", {
        method: "GET",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al cargar los usuarios");
      }

      const data = (await res.json()) as AdminUser[];
      setUsers(data);
    } catch (err: any) {
      console.error("[ADMIN-ROLES][LOAD] Error:", err);
      setError(err?.message ?? "Error al cargar los usuarios administradores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const email = formEmail.trim().toLowerCase();
    if (!email) {
      setError("El correo es obligatorio");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: formRole,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar el usuario");
      }

      setSuccess(`Usuario ${email} guardado como ${formRole}.`);

      // Actualizar listado en memoria
      setUsers((prev) => {
        const existingIdx = prev.findIndex(
          (u) => u.email.toLowerCase() === email,
        );
        const updated: AdminUser = {
          email,
          role: formRole,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserEmail,
        };

        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = updated;
          return copy;
        }

        return [...prev, updated];
      });
    } catch (err: any) {
      console.error("[ADMIN-ROLES][SAVE] Error:", err);
      setError(
        err?.message ?? "Ocurrió un error al guardar el usuario administrador",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1 border-b pb-4">
        <h1 className="text-xl font-semibold">
          Gestión de usuarios administradores
        </h1>
        <p className="text-sm text-gray-600">
          Solo usted (MASTER_ADMIN) puede ver y modificar esta sección.
        </p>
        <p className="text-xs text-gray-500">
          Sesión iniciada como: <strong>{currentUserEmail}</strong>
        </p>
      </header>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-sm font-semibold">Agregar o actualizar usuario</h2>
        <p className="text-xs text-gray-600">
          Recuerde: solo se recomienda agregar correos institucionales
          relacionados con EduSalud.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Correo electrónico</label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="nombre.apellido@unah.edu.hn"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Rol</label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as AdminRole)}
              className="w-full rounded-md border px-2 py-1 text-sm"
            >
              <option value="ADMIN">ADMIN (gestiona certificados)</option>
              <option value="LECTOR">
                LECTOR (solo consulta, sin cambios) – futuro
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar usuario"}
          </button>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600" role="status">
              {success}
            </p>
          )}
        </form>
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Lista de administradores</h2>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Recargar"}
          </button>
        </div>

        {error && !saving && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {users.length === 0 && !loading && (
          <p className="text-sm text-gray-500">
            No hay usuarios administradores registrados en Firestore aún.
          </p>
        )}

        {users.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-2 py-1">Correo</th>
                <th className="px-2 py-1">Rol</th>
                <th className="px-2 py-1">Última actualización</th>
                <th className="px-2 py-1">Actualizado por</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b last:border-0">
                  <td className="px-2 py-1">{u.email}</td>
                  <td className="px-2 py-1">{u.role}</td>
                  <td className="px-2 py-1 text-xs text-gray-500">
                    {u.updatedAt
                      ? new Date(u.updatedAt).toLocaleString("es-HN")
                      : "-"}
                  </td>
                  <td className="px-2 py-1 text-xs text-gray-500">
                    {u.updatedBy || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
