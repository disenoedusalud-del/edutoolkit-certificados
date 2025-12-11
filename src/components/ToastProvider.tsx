"use client";

import { useState, useCallback, useEffect } from "react";
import { ToastContainer } from "./Toast";
import { Toast } from "./Toast";
import { setToastCallback } from "@/lib/toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Configurar el callback para que toast.ts pueda usarlo
  useEffect(() => {
    setToastCallback(addToast);
  }, [addToast]);

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

