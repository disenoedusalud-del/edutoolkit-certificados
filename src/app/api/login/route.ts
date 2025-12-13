// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getAdminRoleForEmail } from "@/lib/adminRoles";

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 5; // 5 días en segundos

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const idToken = body?.idToken as string | undefined;

    if (!idToken) {
      return NextResponse.json(
        { ok: false, error: "MISSING_TOKEN" },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!decoded?.uid) {
      return NextResponse.json(
        { ok: false, error: "INVALID_TOKEN" },
        { status: 401 },
      );
    }

    const email = decoded.email;
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "NO_EMAIL" },
        { status: 400 },
      );
    }

    // Obtener rol (super_admin, admin, editor, viewer) o null
    const role = await getAdminRoleForEmail(email);

    if (!role) {
      return NextResponse.json(
        { ok: false, error: "NO_PERMISSIONS" },
        { status: 403 },
      );
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_SECONDS,
    });

    return NextResponse.json({ ok: true, role, email });
  } catch (err) {
    console.error("[API /login] error:", err);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
