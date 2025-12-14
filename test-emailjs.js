// Script de prueba para EmailJS
// Ejecuta: node test-emailjs.js
// NOTA: Necesitas instalar dotenv primero: npm install dotenv

const fs = require('fs');
const path = require('path');
const emailjs = require('@emailjs/nodejs');

// Leer .env.local manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ No se encontró .env.local');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
  
  return env;
}

async function testEmailJS() {
  const env = loadEnv();
  const serviceId = env.EMAILJS_SERVICE_ID;
  const templateId = env.EMAILJS_TEMPLATE_ID;
  const privateKey = env.EMAILJS_PRIVATE_KEY || env.EMAILJS_PUBLIC_KEY;

  console.log('🔍 Verificando configuración...');
  console.log('Service ID:', serviceId);
  console.log('Template ID:', templateId);
  console.log('Private Key:', privateKey ? `${privateKey.substring(0, 10)}...` : 'NO CONFIGURADA');

  if (!serviceId || !templateId || !privateKey) {
    console.error('❌ Faltan variables de entorno');
    console.log('\nAsegúrate de tener en .env.local:');
    console.log('EMAILJS_SERVICE_ID=...');
    console.log('EMAILJS_TEMPLATE_ID=...');
    console.log('EMAILJS_PRIVATE_KEY=...');
    process.exit(1);
  }

  console.log('\n📧 Intentando enviar email de prueba...');
  
  try {
    const result = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: 'tu-email@ejemplo.com', // Cambia esto por tu email
        reset_link: 'https://ejemplo.com/reset-password?code=test123',
      },
      {
        publicKey: privateKey,
      }
    );

    console.log('✅ Email enviado exitosamente!');
    console.log('Status:', result.status);
    console.log('Text:', result.text);
  } catch (error) {
    console.error('❌ Error enviando email:');
    console.error('Message:', error.message);
    console.error('Text:', error.text);
    console.error('Status:', error.status);
    console.error('Response:', error.response);
    process.exit(1);
  }
}

testEmailJS();

