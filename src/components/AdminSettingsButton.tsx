"use client";

import { Gear } from "phosphor-react";
import Link from "next/link";

interface AdminSettingsButtonProps {
  userRole: string;
}

export function AdminSettingsButton({ userRole }: AdminSettingsButtonProps) {
  if (userRole !== "MASTER_ADMIN") {
    return null;
  }

  return (
    <Link
      href="/admin/ajustes"
      className="px-3 py-2 bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary transition-colors flex items-center gap-2 border border-theme"
      title="Ajustes de administración"
    >
      <Gear size={18} weight="bold" />
      <span className="hidden sm:inline">Ajustes</span>
    </Link>
  );
}

