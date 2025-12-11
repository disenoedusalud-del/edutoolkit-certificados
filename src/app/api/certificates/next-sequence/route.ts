import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    // 1) Leer parámetros de la URL
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get("courseCode");
    const year = searchParams.get("year");

    // 2) Validar que existan
    if (!courseCode || !year) {
      return NextResponse.json(
        {
          error: "Missing courseCode or year",
          nextSequence: 1,
          formattedId: null,
        },
        { status: 400 }
      );
    }

    // 3) Buscar el último certificado con ese curso y año
    const snapshot = await adminDb
      .collection("certificates")
      .where("courseId", ">=", `${courseCode}-${year}-`)
      .where("courseId", "<=", `${courseCode}-${year}-\uf8ff`)
      .orderBy("courseId", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      // No hay certificados aún → empezamos en 1
      return NextResponse.json({
        nextSequence: 1,
        formattedId: `${courseCode}-${year}-01`,
      });
    }

    const lastDoc = snapshot.docs[0];
    const lastData = lastDoc.data();

    // courseId esperado: "LM-2025-03"
    const lastCourseId = (lastData.courseId as string) || "";
    const parts = lastCourseId.split("-");
    const lastSeqStr = parts[2] || "0";
    const lastSeq = parseInt(lastSeqStr, 10) || 0;
    const nextSequence = lastSeq + 1;

    const formattedSequence = String(nextSequence).padStart(2, "0");
    const formattedId = `${courseCode}-${year}-${formattedSequence}`;

    return NextResponse.json({
      nextSequence,
      formattedId,
    });
  } catch (error: any) {
    console.error("[NEXT-SEQUENCE] Error:", error);
    return NextResponse.json(
      {
        error: "Error calculating next sequence",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

