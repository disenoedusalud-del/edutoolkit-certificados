// src/app/admin/layout.tsx
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeSettingsButton } from "@/components/ThemeSettingsButton";
import { AdminSettingsButton } from "@/components/AdminSettingsButton";
import { AdminLogo } from "@/components/AdminLogo";

export const dynamic = "force-dynamic";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header con información del usuario y botón de salir */}
      <header className="bg-theme-secondary border-b border-theme shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <AdminLogo />
                <h1 className="text-lg font-semibold text-text-primary">
                  Panel de Administración
                </h1>
              </div>
              <span className="text-sm text-text-secondary">
                {user.email}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-theme-tertiary text-text-primary rounded border border-theme relative">
                {user.role}
                {user.role === "MASTER_ADMIN" && (
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent rounded-full punto-admin"></span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSettingsButton />
              <AdminSettingsButton userRole={user.role} />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
