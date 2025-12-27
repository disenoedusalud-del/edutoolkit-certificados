
import { NextRequest, NextResponse } from "next/server";

// 1. Mock Next.js Server Modules completely
jest.mock('next/server', () => {
    return {
        __esModule: true,
        NextResponse: {
            json: jest.fn((data, init) => ({
                json: () => Promise.resolve(data),
                status: init?.status || 200,
                headers: new Map(),
            })),
        },
        NextRequest: class MockNextRequest {
            url: string;
            method: string;
            headers: any;
            body: any;

            constructor(input: string, init?: any) {
                this.url = input;
                this.method = init?.method || 'GET';
                this.body = init?.body;

                // Robust Headers mock
                const headersMap = new Map<string, string>();
                if (init?.headers) {
                    Object.entries(init.headers).forEach(([k, v]) => {
                        headersMap.set(k.toLowerCase(), v as string);
                    });
                }

                this.headers = {
                    get: (name: string) => headersMap.get(name.toLowerCase()) || null,
                    entries: () => headersMap.entries(),
                    [Symbol.iterator]: () => headersMap.entries(),
                };
            }

            json() {
                // Handle body parsing safely
                if (!this.body) return Promise.resolve({});
                try {
                    return Promise.resolve(JSON.parse(this.body));
                } catch (e) {
                    return Promise.resolve({});
                }
            }
        }
    };
});

// Helper para mock de queries recursivo
const createQueryMock: any = () => ({
    get: jest.fn(),
    where: jest.fn(() => createQueryMock()),
    limit: jest.fn(() => createQueryMock()),
    orderBy: jest.fn(() => createQueryMock()),
    offset: jest.fn(() => createQueryMock()),
    count: jest.fn(() => ({ get: jest.fn() })),
});

// Mock de Firebase Admin y módulos
jest.mock("@/lib/firebaseAdmin", () => ({
    adminDb: {
        collection: jest.fn(() => ({
            get: jest.fn(),
            add: jest.fn(),
            doc: jest.fn(() => ({
                get: jest.fn(),
                set: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            })),
            where: jest.fn(() => createQueryMock()), // Usar helper
        })),
        batch: jest.fn(() => ({
            update: jest.fn(),
            delete: jest.fn(),
            commit: jest.fn(),
        })),
        runTransaction: jest.fn(async (callback: any) => {
            const transaction = {
                get: jest.fn(async (queryOrRef) => {
                    // Detectar si es una query chequeando propiedades típicas
                    if (queryOrRef.where || queryOrRef.limit || queryOrRef.orderBy) {
                        return { empty: true, docs: [] };
                    }
                    return { exists: false, data: () => undefined, id: 'mock-id' };
                }),
                set: jest.fn(),
                update: jest.fn(),
            };
            return await callback(transaction);
        }),
    },
}));

jest.mock("@/lib/auth", () => ({
    requireRole: jest.fn(),
}));

jest.mock("@/lib/rateLimit", () => ({
    rateLimit: jest.fn(() => Promise.resolve({ success: true, remaining: 100 })),
    rateLimitResponse: jest.fn(),
    RATE_LIMITS: {
        API: { maxRequests: 100, windowMs: 60000 },
        HEAVY: { maxRequests: 20, windowMs: 60000 },
    },
}));

jest.mock("@/lib/appsScriptDrive", () => ({
    getOrCreateFolderInAppsScriptDrive: jest.fn(() => Promise.resolve({ ok: true, folderId: "mock-folder-id" })),
    createFolderInAppsScriptDrive: jest.fn(() => Promise.resolve({ ok: true, folderId: "mock-course-folder-id" })),
    deleteFolderInAppsScriptDrive: jest.fn(() => Promise.resolve({ ok: true })),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn((msg, err) => console.error("LOGGER ERROR:", msg, err)),
        debug: jest.fn(),
    },
}));


describe("Tests Críticos: Cursos y Certificados Masivos", () => {

    // Setup común
    const { requireRole } = require("@/lib/auth");
    const { adminDb } = require("@/lib/firebaseAdmin");

    beforeEach(() => {
        jest.clearAllMocks();
        // Simular usuario Admin por defecto
        requireRole.mockResolvedValue({ email: "admin@test.com", role: "ADMIN" });
    });

    /**
     * TEST 1: AGREGAR CURSO
     * Verifica que la API de creación de cursos funcione
     */
    describe("POST /api/courses (Crear Curso)", () => {
        it("Debe crear un curso correctamente cuando los datos son válidos y no hay duplicados", async () => {
            const { POST } = require("../courses/route"); // Importar dinámicamente

            // Mock de request
            const body = {
                id: "TEST-COURSE",
                name: "Curso de Prueba Jest",
                year: 2025,
                courseType: "Curso",
                status: "active"
            };

            // Usamos any para evitar conflictos de tipos con el MockManual
            const req = new (require("next/server").NextRequest)("http://localhost:3000/api/courses", {
                method: "POST",
                body: JSON.stringify(body),
            });

            // Mock de base de datos para simular que NO existe duplicado
            const mockGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });

            // Configurar el mock para soportar encadenamiento .where().where().get()
            const whereMock = jest.fn(() => ({
                where: jest.fn(() => ({
                    get: mockGet
                })),
                get: mockGet
            }));

            // Reiniciar el mock de collection para este test
            adminDb.collection.mockReturnValue({
                where: whereMock,
                doc: jest.fn(() => ({
                    id: "mock-auto-id", // Agregado porque se usa newDocRef.id
                    get: jest.fn().mockResolvedValue({ exists: false }),
                    set: jest.fn().mockResolvedValue(true)
                })),
                add: jest.fn()
            });

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.id).toBe("TEST-COURSE");
        });
    });

    /**
     * TEST 2: ELIMINAR CURSO
     */
    describe("DELETE /api/courses/[id] (Eliminar Curso)", () => {
        it("Debe eliminar un curso existente si se tienen permisos", async () => {
            const { DELETE } = require("../courses/[id]/route");

            const courseId = "TEST-COURSE";
            const req = new (require("next/server").NextRequest)(`http://localhost:3000/api/courses/${courseId}`, {
                method: "DELETE",
            });
            const params = Promise.resolve({ id: courseId });

            // Mock de existencia del curso
            adminDb.collection.mockReturnValue({
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ id: "TEST-COURSE", name: "Curso Test", driveFolderId: "folder-123" })
                    }),
                    delete: jest.fn().mockResolvedValue(true)
                })),
                get: jest.fn().mockResolvedValue({ docs: [] }), // para certificados asociados
                limit: jest.fn(() => ({ get: jest.fn() })),
                add: jest.fn() // Agregado para systemHistory
            });

            const response = await DELETE(req, { params });
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
        });
    });

    /**
     * TEST 3: AGREGAR CERTIFICADO
     */
    describe("POST /api/certificates (Crear Certificado)", () => {
        it("Debe crear un certificado correctamente", async () => {
            requireRole.mockResolvedValue({ email: "editor@test.com", role: "EDITOR" });

            const { POST } = require("../certificates/route");

            const body = {
                fullName: "Estudiante Prueba",
                courseName: "Curso Test",
                courseId: "CURSO-2025-01",
                courseType: "Curso",
                year: 2025,
                email: "test@student.com"
            };

            // Mock para Certificate POST (necesita 'where' y 'doc' con id)
            // Esto faltaba en la iteración anterior
            adminDb.collection.mockReturnValue({
                where: jest.fn(() => createQueryMock()),
                doc: jest.fn(() => ({
                    id: "mock-cert-id",
                    get: jest.fn().mockResolvedValue({ exists: false }),
                    set: jest.fn().mockResolvedValue(true)
                })),
                add: jest.fn()
            });

            const req = new (require("next/server").NextRequest)("http://localhost:3000/api/certificates", {
                method: "POST",
                body: JSON.stringify(body)
            });

            const response = await POST(req);

            // Si falla, mostramos el error
            if (response.status !== 201) {
                const err = await response.json();
                console.log("Error creando certificado:", err);
            }

            expect(response.status).toBe(201);
        });
    });

    /**
     * TEST 4: UPDATE BULK
     */
    describe("PUT /api/certificates/bulk (Actualización Masiva)", () => {
        it("Debe actualizar el estado de varios certificados", async () => {
            requireRole.mockResolvedValue({ email: "admin@test.com", role: "ADMIN" });
            const { PUT } = require("../certificates/bulk/route");

            const body = {
                ids: ["CERT-1", "CERT-2", "CERT-3"],
                deliveryStatus: "entregado"
            };

            // Mock simple para bulk
            adminDb.collection.mockReturnValue({
                doc: jest.fn(() => ({ id: "mock-id" })),
            });
            // El batch mock ya está en el mock global

            const req = new (require("next/server").NextRequest)("http://localhost:3000/api/certificates/bulk", {
                method: "PUT",
                body: JSON.stringify(body)
            });

            const response = await PUT(req);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
        });
    });

});
