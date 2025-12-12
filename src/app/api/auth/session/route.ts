// src/app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebaseAdmin";

const COOKIE_NAME = "edutoolkit_session";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "Falta idToken" },
        { status: 400 }
      );
    }

    // Verificamos el token con Firebase Admin
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Puedes usar algunos campos si quieres (uid, email, etc.)
    console.log("[AUTH] Usuario autenticado:", decoded.uid, decoded.email);

    const cookieStore = cookies();

    // 7 días de sesión
    const maxAge = 7 * 24 * 60 * 60;

    cookieStore.set(COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[AUTH][SESSION][POST] Error:", error);
    return NextResponse.json(
      { error: "No se pudo crear la sesión" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[AUTH][SESSION][DELETE] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cerrar sesión" },
      { status: 500 }
    );
  }
}
