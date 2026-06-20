const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (el HTML)
app.use(express.static(__dirname));

// 1. Conectar/Crear la base de datos SQLite
const db = new sqlite3.Database('./historial.db', (err) => {
    if (err) console.error(err.message);
    console.log('Conectado a la base de datos SQLite.');
});

db.run(`CREATE TABLE IF NOT EXISTS registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    accion TEXT NOT NULL,
    hora TEXT NOT NULL
)`);

const USUARIOS_VALIDOS = {
    "1234": "Carlos Mendoza",
    "5678": "Anna Gómez",
    "9012": "Admin SafeAccess"
};

// RUTA: Servir el index.html en la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// RUTA: Validar usuario e iniciar acción
app.post('/api/autenticar', (req, res) => {
    const { pin, accion } = req.body;
    const nombreUsuario = USUARIOS_VALIDOS[pin];
    
    if (!nombreUsuario) {
        return res.status(401).json({ error: "PIN de acceso incorrecto" });
    }

    const horaActual = new Date().toLocaleTimeString('es-EC', { timeZone: 'America/Guayaquil' });
    const stmt = db.prepare(`INSERT INTO registros (usuario, accion, hora) VALUES (?, ?, ?)`);
    stmt.run(nombreUsuario, accion, horaActual, (err) => {
        if (err) {
            console.error("Error al insertar en DB:", err.message);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        res.json({ success: true, usuario: nombreUsuario, hora: horaActual });
    });
    stmt.finalize();
});

// RUTA: Obtener el historial completo
app.get('/api/historial', (req, res) => {
    db.all(`SELECT usuario, accion, hora FROM registros ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            console.error("Error al consultar DB:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

cron.schedule('0 0 * * *', () => {
    db.run(`DELETE FROM registros`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('----------------------------------------------');
    console.log('SafeAccess Pro ONLINE');
    console.log(`Local: http://localhost:${PORT}`);
    console.log('----------------------------------------------');
});

