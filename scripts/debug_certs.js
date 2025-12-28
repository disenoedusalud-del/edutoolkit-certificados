const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/FIREBASE_ADMIN_SA_BASE64=(.+)/);
const saBase64 = match[1].trim().replace(/^"|"$/g, '');
const saJson = JSON.parse(Buffer.from(saBase64, 'base64').toString());

admin.initializeApp({
    credential: admin.credential.cert(saJson)
});

const db = admin.firestore();

async function checkCertificates() {
    console.log('--- MUESTRA DE CERTIFICADOS ---');
    const snapshot = await db.collection('certificates').limit(10).get();
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`FullName: "${data.fullName}" | CourseID (Cert): "${data.courseId}"`);
    });
    console.log('-------------------------------');
}

checkCertificates().catch(console.error);
