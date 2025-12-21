// src/app/api/admin-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateEmail } from "@/lib/validation";
import type { UserRole } from "@/lib/auth";
export const runtime = "nodejs";

// GET /api/admin-users - Listar todos los usuarios admin
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Solo MASTER_ADMIN puede ver la lista
    await requireRole("MASTER_ADMIN");

    // 3. Obtener usuarios
    const snapshot = await adminDb.collection("adminUsers").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      
      return {
        id: doc.id,
        email: data.email || doc.id, // El email se guarda en el documento
        role: data.role as UserRole,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    return NextResponse.json(users, {
      headers: {
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Solo MASTER_ADMIN puede ver esta lista" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST /api/admin-users - Crear o actualizar usuario admin
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Solo MASTER_ADMIN puede crear/actualizar usuarios
    const currentUser = await requireRole("MASTER_ADMIN");

    // 3. Validar entrada
    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ["VIEWER", "EDITOR", "ADMIN"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `El rol debe ser uno de: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Normalizar email para usar como ID del documento
    const normalizedEmail = email.toLowerCase().trim();
    const docId = normalizedEmail.replace(/[.#$/[\]]/g, "_");

    // Verificar si ya existe para preservar createdAt y detectar cambios
    const existingDoc = await adminDb.collection("adminUsers").doc(docId).get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;
    const previousRole = existingData?.role;

    // Guardar en Firestore
    await adminDb.collection("adminUsers").doc(docId).set(
      {
        email: normalizedEmail,
        role,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email, // Agregar quién hizo el cambio
        createdAt: existingData?.createdAt || new Date().toISOString(),
      },
      { merge: true }
    );

    // Registrar en historial unificado
    const action = existingDoc.exists ? "updated" : "created";
    await adminDb.collection("systemHistory").add({
      action,
      entityType: "adminUser",
      entityId: normalizedEmail,
      entityName: normalizedEmail,
      email: normalizedEmail,
      role,
      previousRole: existingDoc.exists ? previousRole : undefined,
      performedBy: currentUser.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, email: normalizedEmail, role },
      {
        status: existingDoc.exists ? 200 : 201,
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Solo MASTER_ADMIN puede gestionar usuarios" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { error: "Error al guardar usuario" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin-users - Eliminar usuario admin
export async function DELETE(request: NextRequest) {
  try {
    console.log("[DELETE-USER] Iniciando eliminación de usuario...");
    
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar autenticación y rol ANTES de obtener el email
    let currentUser;
    try {
      currentUser = await requireRole("MASTER_ADMIN");
      console.log("[DELETE-USER] ✅ Usuario autenticado como:", {
        email: currentUser.email,
        role: currentUser.role,
      });
    } catch (authError) {
      console.error("[DELETE-USER] ❌ Error de autenticación/autorización:", authError);
      if (authError instanceof Error) {
        if (authError.message === "UNAUTHORIZED") {
          return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }
        if (authError.message === "FORBIDDEN") {
          return NextResponse.json(
            { error: "Solo MASTER_ADMIN puede eliminar usuarios" },
            { status: 403 }
          );
        }
      }
      throw authError;
    }

    // 3. Obtener email del query
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    console.log("[DELETE-USER] Email recibido del query:", email);

    if (!email) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const docId = normalizedEmail.replace(/[.#$/[\]]/g, "_");

    console.log("[DELETE-USER] Normalización:", {
      original: email,
      normalized: normalizedEmail,
      docId: docId,
    });

    // Prevenir eliminar usuarios que están en MASTER_ADMIN_EMAILS
    const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    
    if (masterEmails.includes(normalizedEmail)) {
      console.log("[DELETE-USER] ⚠️ Intento de eliminar usuario MASTER_ADMIN:", normalizedEmail);
      return NextResponse.json(
        { 
          error: "No se puede eliminar un usuario que está en MASTER_ADMIN_EMAILS. Remueve el email de la variable de entorno primero." 
        },
        { status: 403 }
      );
    }

    // Prevenir que un usuario se elimine a sí mismo
    if (currentUser.email.toLowerCase() === normalizedEmail) {
      console.log("[DELETE-USER] ⚠️ Intento de auto-eliminación:", normalizedEmail);
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 403 }
      );
    }

    // Verificar si el documento existe antes de eliminar
    const docRef = adminDb.collection("adminUsers").doc(docId);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      console.log("[DELETE-USER] ⚠️ El documento no existe en Firestore:", docId);
      
      // Verificar si está en ALLOWED_ADMIN_EMAILS
      const allowedEmails = (process.env.ALLOWED_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      
      if (allowedEmails.includes(normalizedEmail)) {
        return NextResponse.json(
          { 
            error: "Este usuario no está en Firestore, pero está en ALLOWED_ADMIN_EMAILS. Remueve el email de la variable de entorno primero." 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "El usuario no existe en la base de datos" },
        { status: 404 }
      );
    }

    // Obtener datos del usuario antes de eliminar
    const userData = docSnapshot.data();
    const userRole = userData?.role;

    console.log("[DELETE-USER] Eliminando documento:", docId);
    await docRef.delete();
    console.log("[DELETE-USER] ✅ Usuario eliminado correctamente");

    // Registrar en historial unificado
    await adminDb.collection("systemHistory").add({
      action: "deleted",
      entityType: "adminUser",
      entityId: normalizedEmail,
      entityName: normalizedEmail,
      email: normalizedEmail,
      role: userRole,
      performedBy: currentUser.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: "Usuario eliminado" },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("[DELETE-USER] ❌ Error inesperado:", error);
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Solo MASTER_ADMIN puede eliminar usuarios" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { 
        error: "Error al eliminar usuario",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

