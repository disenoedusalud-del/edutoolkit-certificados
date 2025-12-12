// src/app/admin/layout.tsx
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

const COOKIE_NAME = "edutoolkit_session";

export const metadata = {
  title: "Panel de certificados | EduToolkit",
  description: "Administración de cursos y certificados de EduSalud",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Next 16: cookies() es async → hay que usar await
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;

  // Si no hay sesión, mandamos al login
  if (!sessionCookie) {
    redirect("/login");
  }

  // IMPORTANTE: aquí NO usamos <html> ni <body>.
  // Eso solo va en src/app/layout.tsx
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-slate-700">
            Panel de certificados EduSalud
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

