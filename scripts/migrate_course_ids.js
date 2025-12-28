const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/FIREBASE_ADMIN_SA_BASE64=(.+)/);
const saBase64 = match[1].trim().replace(/^"|"$/g, '');
const saJson = JSON.parse(Buffer.from(saBase64, 'base64').toString());

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(saJson)
    });
}

const db = admin.firestore();

async function migrateCourseIds() {
    console.log('--- INICIANDO MIGRACIÓN DE IDS DE CURSOS ---');
    const snapshot = await db.collection('courses').get();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const oldId = doc.id;

        // Solo migrar si tiene edición y año
        if (data.year && data.edition) {
            const initials = oldId.split('-')[0];
            const newId = `${initials}-${data.edition}-${data.year}`;

            if (oldId !== newId) {
                console.log(`Migrando: ${oldId} -> ${newId}`);

                // Crear nuevo documento
                await db.collection('courses').doc(newId).set({
                    ...data,
                    id: newId, // Actualizar el campo interno también
                    updatedAt: new Date().toISOString()
                });

                // Borrar antiguo
                await db.collection('courses').doc(oldId).delete();

                // OPCIONAL: Actualizar certificados que apunten a este curso?
                // No es necesario porque los certificados usan su propio courseId (prefix) 
                // pero buscamos el curso por ese prefix. Al corregir el ID del curso, 
                // el buscador de la importación lo encontrará.
            }
        }
    }
    console.log('--- MIGRACIÓN COMPLETADA ---');
}

migrateCourseIds().catch(console.error);
