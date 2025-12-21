// src/components/ConfirmDialog.tsx
"use client";

import { X, Warning, Trash, Info } from "phosphor-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash,
      iconColor: "text-error",
      iconBg: "bg-error/20",
      buttonBg: "bg-error",
      buttonHover: "hover:bg-error/90",
    },
    warning: {
      icon: Warning,
      iconColor: "text-warning",
      iconBg: "bg-warning/20",
      buttonBg: "bg-warning",
      buttonHover: "hover:bg-warning/90",
    },
    info: {
      icon: Info,
      iconColor: "text-accent",
      iconBg: "bg-accent/20",
      buttonBg: "bg-accent",
      buttonHover: "hover:bg-accent-hover",
    },
  };

  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-secondary rounded-xl shadow-lg border border-theme max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${styles.iconBg} rounded-lg`}>
              <Icon size={24} weight="bold" className={styles.iconColor} />
            </div>
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors border border-theme"
            aria-label="Cerrar"
          >
            <X size={20} weight="bold" className="text-text-primary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text-secondary whitespace-pre-line">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary transition-colors border border-theme"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${styles.buttonBg} text-white rounded-lg ${styles.buttonHover} transition-colors border border-theme`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

