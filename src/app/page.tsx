// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Redirige directamente al panel de certificados
  redirect("/admin/certificados");
}
