import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get("courseCode");
    const year = searchParams.get("year");

    if (!courseCode || !year) {
      return NextResponse.json(
        { error: "Se requieren courseCode y year" },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum)) {
      return NextResponse.json(
        { error: "El año debe ser un número válido" },
        { status: 400 }
      );
    }

    // Buscar todos los certificados que empiecen con el mismo código y año
    const prefix = `${courseCode}-${year}-`;
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .where("courseId", ">=", prefix)
      .where("courseId", "<", prefix + "\uf8ff")
      .get();

    // Extraer números secuenciales existentes
    const existingNumbers = certificatesSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const certCourseId = data.courseId || "";
        const match = certCourseId.match(new RegExp(`^${courseCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-${year}-(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter((num) => num > 0);

    // Encontrar el siguiente número disponible
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;

    return NextResponse.json({
      nextSequence: nextNumber,
      formattedId: `${courseCode}-${year}-${nextNumber.toString().padStart(2, "0")}`,
    });
  } catch (error: any) {
    console.error("Error calculating next sequence:", error);
    // Si hay error, retornar 1 como default
    return NextResponse.json({
      nextSequence: 1,
      formattedId: `${searchParams.get("courseCode")}-${searchParams.get("year")}-01`,
    });
  }
}

