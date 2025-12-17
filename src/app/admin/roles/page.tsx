// src/app/admin/roles/page.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Plus, Trash, Pencil, Shield } from "phosphor-react";
import Link from "next/link";
import type { UserRole } from "@/lib/auth";

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export default function AdminRolesPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("VIEWER");
  const [formLoading, setFormLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin-users");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cargar usuarios");
      }
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar usuarios"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail.trim(),
          role: formRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar usuario");
      }

      toast.success("Usuario guardado correctamente");
      setShowForm(false);
      setFormEmail("");
      setFormRole("VIEWER");
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar usuario"
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`¿Estás seguro de eliminar el usuario ${email}?`)) {
      return;
    }

    try {
      console.log("[DELETE] Intentando eliminar usuario:", email);
      const res = await fetch(
        `/api/admin-users?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      console.log("[DELETE] Respuesta del servidor:", { status: res.status, data });

      if (!res.ok) {
        const errorMsg = data.error || data.details || "Error al eliminar usuario";
        console.error("[DELETE] Error:", errorMsg);
        throw new Error(errorMsg);
      }

      toast.success("Usuario eliminado correctamente");
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar usuario"
      );
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormRole(user.role);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormEmail("");
    setFormRole("VIEWER");
    setEditingUser(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-theme-primary p-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mb-4">
        <Link
          href="/admin/certificados"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} weight="bold" />
          <span>Volver a Certificados</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Administración de Roles
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} weight="bold" />
            Agregar Usuario
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-theme-secondary rounded-xl shadow p-6 border border-theme mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={!!editingUser}
                className="w-full rounded-md border border-theme px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent bg-theme-secondary text-text-primary disabled:bg-theme-tertiary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Rol
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="VIEWER">VIEWER - Solo lectura</option>
                <option value="EDITOR">EDITOR - Crear y editar</option>
                <option value="ADMIN">ADMIN - Gestión completa</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {formLoading ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary border border-theme"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-text-secondary"
                    >
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-theme-tertiary">
                      <td className="px-4 py-3 text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            user.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : user.role === "EDITOR"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-theme-tertiary text-text-primary"
                          }`}
                        >
                          <Shield size={14} weight="bold" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Pencil size={16} weight="bold" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.email)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash size={16} weight="bold" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

