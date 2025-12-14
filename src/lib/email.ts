// src/lib/email.ts

type ResetPasswordPayload = {
  to: string;
  resetLink: string;
};

export async function sendPasswordResetEmail(payload: ResetPasswordPayload) {
  const { to, resetLink } = payload;

  // Fail-fast: evitar llamadas a EmailJS si el destinatario viene vacío
  if (!to || !to.trim()) {
    const err: any = new Error(
      "Destinatario vacío (to) en sendPasswordResetEmail"
    );
    err.status = 422;
    throw err;
  }

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId) throw new Error("Falta EMAILJS_SERVICE_ID en .env.local");
  if (!templateId) throw new Error("Falta EMAILJS_TEMPLATE_ID en .env.local");
  if (!publicKey) throw new Error("Falta EMAILJS_PUBLIC_KEY en .env.local");
  if (!privateKey) throw new Error("Falta EMAILJS_PRIVATE_KEY en .env.local");

  const url = "https://api.emailjs.com/api/v1.0/email/send";

  const body = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey, // Public Key requerida
    accessToken: privateKey, // Private Key requerida en strict mode
    template_params: {
      // Mantener compatibilidad ante cambios de template
      to_email: to,
      to: to,
      email: to,
      recipient: to,
      reset_link: resetLink,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    const err: any = new Error(`EmailJS API error (${res.status}): ${text}`);
    err.status = res.status;
    err.text = text;
    throw err;
  }

  return { ok: true, status: res.status, text };
}
