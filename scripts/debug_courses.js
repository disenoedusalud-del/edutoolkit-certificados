const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Intentar leer el base64 de .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/FIREBASE_ADMIN_SA_BASE64=(.+)/);

if (!match) {
    console.error('No se encontró FIREBASE_ADMIN_SA_BASE64 en .env.local');
    process.exit(1);
}

const saBase64 = match[1].trim().replace(/^"|"$/g, '');
const saJson = JSON.parse(Buffer.from(saBase64, 'base64').toString());

admin.initializeApp({
    credential: admin.credential.cert(saJson)
});

const db = admin.firestore();

async function checkCourses() {
    console.log('--- LISTADO DE CURSOS EN FIRESTORE ---');
    const snapshot = await db.collection('courses').get();
    console.log('Total cursos:', snapshot.size);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`DocID: "${doc.id}" | FieldID: "${data.id}" | Name: "${data.name}"`);
    });
    console.log('--------------------------------------');
}

checkCourses().catch(console.error);
