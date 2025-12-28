const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const headers = [
    "Nombre Completo",
    "ID del Curso",
    "Identificación",
    "Email",
    "Teléfono",
    "Ubicación Física",
    "Estado",
    "Origen"
];

const data = [
    headers,
    ["Juan Pérez", "NUT-1-2025", "0801-1990-12345", "juan@ejemplo.com", "50499887766", "Tomo 1 Caja 5", "en_archivo", "nuevo"],
    ["María García", "SALUD-2024", "", "maria@ejemplo.com", "50488776655", "", "entregado", "historico"]
];

const targetDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Generar CSV (usando ; como separador que es mejor para Excel en español)
const csvContent = data.map(row => row.join(';')).join('\n');
fs.writeFileSync(path.join(targetDir, 'plantilla_certificados.csv'), '\ufeff' + csvContent, 'utf8');

// 2. Generar XLSX (La opción más segura)
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
XLSX.writeFile(wb, path.join(targetDir, 'plantilla_certificados.xlsx'));

console.log('Plantillas generadas correctamente en public/templates/');
