// src/app/api/logout/route.ts
import { NextResponse } from "next/server";

const COOKIE_NAME = "edutoolkit_session";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // Borrar la cookie de sesión
    response.cookies.set({
      name: COOKIE_NAME,
      value: "",
      maxAge: 0, // expira de inmediato
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[LOGOUT][POST] Error:", error);
    return NextResponse.json(
      { error: "No se pudo cerrar la sesión" },
      { status: 500 }
    );
  }
}
