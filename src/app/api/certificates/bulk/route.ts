import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ids, deliveryStatus } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs" },
        { status: 400 }
      );
    }

    if (!deliveryStatus) {
      return NextResponse.json(
        { error: "Se requiere un estado de entrega" },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();
    const updates = ids.map((id: string) => {
      const ref = adminDb.collection("certificates").doc(id);
      batch.update(ref, {
        deliveryStatus,
        updatedAt: new Date().toISOString(),
      });
      return id;
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${updates.length} certificado(s) actualizado(s)`,
      updated: updates.length,
    });
  } catch (error) {
    console.error("Error updating certificates:", error);
    return NextResponse.json(
      { error: "Error al actualizar los certificados" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de IDs" },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();
    ids.forEach((id: string) => {
      const ref = adminDb.collection("certificates").doc(id);
      batch.delete(ref);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${ids.length} certificado(s) eliminado(s)`,
      deleted: ids.length,
    });
  } catch (error) {
    console.error("Error deleting certificates:", error);
    return NextResponse.json(
      { error: "Error al eliminar los certificados" },
      { status: 500 }
    );
  }
}

