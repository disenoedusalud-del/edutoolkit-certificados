import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import type { Certificate } from "@/types/Certificate";

// GET /api/certificates
export async function GET(request: Request) {
  try {
    // Si en el futuro quieres usar query params, los leemos aquí,
    // pero por ahora no los usamos para evitar problemas de tipos.
    // const { searchParams } = new URL(request.url);
    // const limit = parseInt(searchParams.get("limit") || "100");

    // Traemos todos los certificados
    const snapshot = await adminDb.collection("certificates").get();

    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return NextResponse.json(
      { error: "Error al obtener certificados" },
      { status: 500 }
    );
  }
}

// POST /api/certificates
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      courseName,
      courseId,
      courseType,
      year,
      origin = "nuevo",
      email = null,
      phone = null,
      contactSource = "ninguno",
      driveFileId = null,
      deliveryStatus = "en_archivo",
      deliveryDate = null,
      deliveredTo = null,
      physicalLocation = null,
      folioCode = null,
      emailSent = false,
      whatsappSent = false,
      marketingConsent = false,
    } = body;

    // Validar campos requeridos con mensajes específicos
    const missingFields: string[] = [];
    if (!fullName || !fullName.trim()) missingFields.push("Nombre completo");
    if (!courseName || !courseName.trim()) missingFields.push("Nombre del curso");
    if (!courseId || !courseId.trim()) missingFields.push("ID del curso");
    if (!courseType || !courseType.trim()) missingFields.push("Tipo de curso");
    if (!year) missingFields.push("Año");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Faltan campos requeridos: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Si el courseId termina en -01, -02, etc., calcular el siguiente número secuencial
    let finalCourseId = courseId.trim();
    const courseIdPattern = /^(.+)-(\d{4})-(\d+)$/;
    const match = finalCourseId.match(courseIdPattern);

    if (match) {
      const [, courseCode, courseYear, currentNumber] = match;
      const courseYearNum = parseInt(courseYear);

      // Si el año coincide, buscar el siguiente número secuencial
      if (courseYearNum === year) {
        // Buscar todos los certificados que empiecen con el mismo código y año
        const prefix = `${courseCode}-${year}-`;
        const certificatesSnapshot = await adminDb
          .collection("certificates")
          .where("courseId", ">=", prefix)
          .where("courseId", "<", prefix + "\uf8ff")
          .get();

        // Extraer números secuenciales existentes
        const escapedCourseCode = courseCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const existingNumbers = certificatesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const certCourseId = data.courseId || "";
            const certMatch = certCourseId.match(
              new RegExp(`^${escapedCourseCode}-${year}-(\\d+)$`)
            );
            return certMatch ? parseInt(certMatch[1]) : 0;
          })
          .filter((num) => num > 0);

        // Encontrar el siguiente número disponible
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        const nextNumber = maxNumber + 1;
        finalCourseId = `${courseCode}-${year}-${nextNumber
          .toString()
          .padStart(2, "0")}`;
      }
    }

    const certificateData: Omit<Certificate, "id"> = {
      fullName,
      courseName,
      courseId: finalCourseId,
      courseType,
      year,
      origin,
      email,
      phone,
      contactSource,
      driveFileId,
      deliveryStatus,
      deliveryDate,
      deliveredTo,
      physicalLocation,
      folioCode,
      emailSent,
      whatsappSent,
      marketingConsent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("certificates").add(certificateData);

    return NextResponse.json(
      { id: docRef.id, ...certificateData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating certificate:", error);
    return NextResponse.json(
      { error: "Error al crear el certificado" },
      { status: 500 }
    );
  }
}
