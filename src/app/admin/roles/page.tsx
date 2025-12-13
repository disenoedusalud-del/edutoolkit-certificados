// src/app/admin/roles/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebaseAdmin";
import { isMasterAdmin } from "@/lib/adminRoles";
import AdminRolesClient from "./AdminRolesClient";

export default async function AdminRolesPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    redirect("/login");
  }

  let email: string | null = null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie!, true);
    email = decoded.email ?? null;
  } catch (error) {
    console.error("[ADMIN-ROLES][PAGE] Error verificando sesión:", error);
    redirect("/login");
  }

  if (!email || !isMasterAdmin(email)) {
    // Si no es MASTER, lo mandamos al listado de certificados
    redirect("/admin/certificados");
  }

  // Pasamos el correo actual al componente cliente solo para mostrarlo
  return <AdminRolesClient currentUserEmail={email} />;
}
