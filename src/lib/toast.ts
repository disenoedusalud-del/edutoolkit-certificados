import { Toast, ToastType } from "@/components/Toast";

type ToastCallback = (toast: Toast) => void;

let toastCallback: ToastCallback | null = null;

export function setToastCallback(callback: ToastCallback) {
  toastCallback = callback;
}

export function showToast(
  message: string,
  type: ToastType = "info",
  duration: number = 5000
) {
  if (toastCallback) {
    const toast: Toast = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      duration,
    };
    toastCallback(toast);
  } else {
    // Fallback a alert si no hay callback configurado
    alert(message);
  }
}

export const toast = {
  success: (message: string, duration?: number) =>
    showToast(message, "success", duration),
  error: (message: string, duration?: number) =>
    showToast(message, "error", duration),
  warning: (message: string, duration?: number) =>
    showToast(message, "warning", duration),
  info: (message: string, duration?: number) =>
    showToast(message, "info", duration),
};

