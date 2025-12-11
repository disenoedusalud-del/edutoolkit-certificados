import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { Course } from "@/types/Course";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // "active" | "archived" | null (todos)

    let query = adminDb.collection("courses");

    // Filtrar por estado si se especifica
    if (status === "active" || status === "archived") {
      query = query.where("status", "==", status);
    }

    // Intentar ordenar por nombre, pero si falla (por falta de índice), obtener sin ordenar
    try {
      query = query.orderBy("name", "asc");
      const snapshot = await query.get();
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json(Array.isArray(data) ? data : []);
    } catch (orderError: any) {
      // Si falla el ordenamiento (probablemente falta índice), obtener sin ordenar
      console.warn("No se pudo ordenar cursos, obteniendo sin orden:", orderError.message);
      
      // Reconstruir la query con el filtro pero sin orderBy
      let queryWithoutOrder = adminDb.collection("courses");
      if (status === "active" || status === "archived") {
        queryWithoutOrder = queryWithoutOrder.where("status", "==", status);
      }
      
      const snapshot = await queryWithoutOrder.get();
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      console.log("Cursos obtenidos (sin orden):", data.length, "Filtro status:", status);
      
      // Filtrar por status en memoria si es necesario (por si acaso)
      let filteredData = data;
      if (status === "active" || status === "archived") {
        filteredData = data.filter((course: any) => {
          const courseStatus = course.status || "active"; // Default a active si no tiene status
          return courseStatus === status;
        });
        console.log("Cursos filtrados por status:", filteredData.length);
      }
      
      // Ordenar manualmente en memoria
      const sortedData = Array.isArray(filteredData) 
        ? filteredData.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        : [];
      
      console.log("Cursos finales:", sortedData.length);
      return NextResponse.json(sortedData);
    }
  } catch (error: any) {
    console.error("Error fetching courses:", error);
    // Si hay un error, devolver array vacío en lugar de objeto de error
    // Esto evita problemas en el frontend
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, courseType = "Curso", edition = null, status = "active" } = body;

    // Validar campos requeridos
    if (!id || !name) {
      return NextResponse.json(
        { error: "El código y el nombre son requeridos" },
        { status: 400 }
      );
    }

    // Validar courseType
    const validCourseTypes = ["Curso", "Diplomado", "Webinar", "Taller", "Seminario"];
    if (!validCourseTypes.includes(courseType)) {
      return NextResponse.json(
        { error: "El tipo de curso no es válido" },
        { status: 400 }
      );
    }

    // Validar formato del código (solo letras mayúsculas, 1-20 caracteres)
    const codeRegex = /^[A-Z]{1,20}$/;
    if (!codeRegex.test(id)) {
      return NextResponse.json(
        { error: "El código debe tener 1-20 letras mayúsculas (A-Z)" },
        { status: 400 }
      );
    }

    // Verificar que no exista un curso con el mismo código
    const existingDoc = await adminDb.collection("courses").doc(id).get();
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: "Ya existe un curso con este código" },
        { status: 400 }
      );
    }

    // Validar estado
    if (status !== "active" && status !== "archived") {
      return NextResponse.json(
        { error: "El estado debe ser 'active' o 'archived'" },
        { status: 400 }
      );
    }

    const courseData: Course = {
      id,
      name: name.trim(),
      courseType: courseType as Course["courseType"],
      edition: edition ? parseInt(edition.toString()) : null,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection("courses").doc(id).set(courseData);
    
    console.log("Curso creado:", courseData);

    return NextResponse.json(courseData, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Error al crear el curso" },
      { status: 500 }
    );
  }
}

