const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b", CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const BACKEND_URL = (window.location.protocol === "file:" || window.location.origin === "null") ? "http://localhost:3000/api" : "/api";
let bleDevice = null, bleCharacteristic = null, currentUser = null, doors = { main: false, back: false };

// Variables para 3D
let scene, camera, renderer, controls;
let mainDoorGroup, backDoorGroup;
let targetRotationMain = 0, targetRotationBack = 0;

const ui = {
    login: document.getElementById('loginScreen'), main: document.getElementById('mainContent'),
    pin: document.getElementById('pinInput'), user: document.getElementById('userNameDisplay'),
    dot: document.getElementById('statusDot'), info: document.getElementById('userInfo'),
    hist: document.getElementById('historyList'), mini: document.getElementById('historyMini'),
    mainBtn: document.getElementById('mainDoorBtn'), backBtn: document.getElementById('backDoorBtn')
};

const toggleUI = (isLogged) => {
    ui.login.classList.toggle('hidden', isLogged);
    ui.main.classList.toggle('opacity-0', !isLogged); ui.main.classList.toggle('pointer-events-none', !isLogged);
    ui.info.classList.toggle('hidden', !isLogged);
    if (isLogged) {
        ui.user.innerText = currentUser.nombre;
        actualizarBotonesUI();
        setTimeout(init3D, 500); // Inicializar 3D después de que la UI sea visible
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('safeAccessUser');
    if (saved) { currentUser = JSON.parse(saved); toggleUI(true); }
    actualizarHistorialUI();

    // Registrar Service Worker para habilitar el soporte offline (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registrado con éxito:', reg))
            .catch(err => console.error('Error al registrar el Service Worker:', err));
    }
});

async function login() {
    const pin = ui.pin.value;
    if (!pin) return;
    try {
        const res = await fetch(`${BACKEND_URL}/autenticar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, accion: 'Ingreso al Sistema' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        currentUser = { pin, nombre: data.usuario };
        localStorage.setItem('safeAccessUser', JSON.stringify(currentUser));
        toggleUI(true); actualizarHistorialUI();
    } catch (err) { alert(err.message); }
}

const logout = () => { currentUser = null; localStorage.removeItem('safeAccessUser'); toggleUI(false); };

// --- Lógica 3D con Three.js ---
function init3D() {
    const container = document.getElementById('house-3d-container');
    if (!container || scene) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(8, 6, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 10);
    scene.add(dirLight);

    crearCasa();
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

function crearCasa() {
    const houseGroup = new THREE.Group();

    // Materiales
    const stoneMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8 }); // Gris piedra
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a }); // Negro/Oscuro
    const windowMat = new THREE.MeshPhongMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.6 });
    const garageMat = new THREE.MeshPhongMaterial({ color: 0x2d3748 });

    // Primer Piso (Base)
    const firstFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 4), stoneMat);
    firstFloor.position.y = 1.25;
    houseGroup.add(firstFloor);

    // Segundo Piso
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 3.5), stoneMat);
    secondFloor.position.set(-1, 3.5, 0);
    houseGroup.add(secondFloor);

    // Techos (Varios niveles para estilo lujoso)
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2, 4), roofMat);
    roof1.position.set(-1, 5, 0);
    roof1.rotation.y = Math.PI / 4;
    houseGroup.add(roof1);

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(3, 1.5, 4), roofMat);
    roof2.position.set(2, 3, 0);
    roof2.rotation.y = Math.PI / 4;
    houseGroup.add(roof2);

    // Garajes (Simulados)
    const garage1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), garageMat);
    garage1.position.set(1.8, 0.75, 2);
    houseGroup.add(garage1);
    const garage2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.1), garageMat);
    garage2.position.set(0.4, 0.75, 2);
    houseGroup.add(garage2);

    // Suelo / Base
    const floorMat = new THREE.MeshPhongMaterial({ color: 0x1e293b });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Puerta Principal (A la izquierda de los garajes)
    mainDoorGroup = new THREE.Group();
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x4a5568 });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.1), doorMat);
    doorMesh.position.set(0.4, 0.9, 0); 
    mainDoorGroup.add(doorMesh);
    mainDoorGroup.position.set(-1.5, 0, 2);
    houseGroup.add(mainDoorGroup);

    // Puerta Trasera (En el lateral o posterior)
    backDoorGroup = new THREE.Group();
    const backDoorMat = new THREE.MeshPhongMaterial({ color: 0x4a5568 });
    const backDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.1), backDoorMat);
    backDoorMesh.position.set(-0.4, 0.9, 0); 
    backDoorGroup.add(backDoorMesh);
    backDoorGroup.position.set(2.9, 0, 0);
    backDoorGroup.rotation.y = Math.PI / 2;
    houseGroup.add(backDoorGroup);

    scene.add(houseGroup);
}

function animate() {
    requestAnimationFrame(animate);
    if (!currentUser) return; // Optimización: no consumir recursos de GPU/CPU si la sesión no está activa
    controls.update();

    // Animación suave de las puertas
    mainDoorGroup.rotation.y += (targetRotationMain - mainDoorGroup.rotation.y) * 0.1;
    backDoorGroup.rotation.y += (targetRotationBack - backDoorGroup.rotation.y) * 0.1;

    renderer.render(scene, camera);
}

// --- Lógica de Control y Bluetooth ---
async function connectBLE() {
    if (!navigator.bluetooth) {
        alert("Bluetooth no compatible en este navegador.");
        return false;
    }
    try {
        console.log("Solicitando dispositivo Bluetooth...");
        bleDevice = await navigator.bluetooth.requestDevice({ 
            filters: [{ name: 'SafeAccess_IoT_Door' }], 
            optionalServices: [SERVICE_UUID] 
        });
        
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        const server = await bleDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        
        ui.dot.className = "w-2 h-2 rounded-full bg-green-500";
        document.querySelector('#connectionStatus span').innerText = "Conectado";
        actualizarBotonesUI(); 
        return true;
    } catch (e) { 
        console.error("Error BLE:", e);
        return false; 
    }
}

const onDisconnected = () => {
    ui.dot.className = "w-2 h-2 rounded-full bg-slate-500";
    document.querySelector('#connectionStatus span').innerText = "Desconectado";
    bleDevice = bleCharacteristic = null; actualizarBotonesUI();
};

function actualizarBotonesUI() {
    ['main', 'back'].forEach(type => {
        const btn = document.getElementById(`${type}DoorText`), ico = document.getElementById(`${type}DoorIcon`), st = document.getElementById(`${type}DoorState`);
        btn.innerText = doors[type] ? 'CERRAR' : 'ABRIR';
        ico.innerText = doors[type] ? 'lock_open' : 'lock';
        st.innerText = doors[type] ? 'Abierta' : 'Cerrada';
        st.className = `text-xs uppercase tracking-widest mt-1 font-bold ${doors[type] ? 'text-green-400' : (type==='main'?'text-primary':'text-secondary')}`;
    });
}

async function handleAction(type) {
    if (!currentUser) return;

    // Intentar conectar si no está conectado (Web Bluetooth requiere gesto de usuario, que es este click)
    if (!bleDevice?.gatt?.connected) {
        const conectado = await connectBLE();
        if (!conectado) {
            // Si el usuario cancela o falla, igual permitimos la simulación 3D
            console.log("No se pudo conectar al hardware, ejecutando solo simulación.");
        }
    }
    
    // Cambiar estado local (Simulación)
    doors[type] = !doors[type];
    
    // Actualizar Rotación 3D
    if (type === 'main') targetRotationMain = doors.main ? -Math.PI / 2 : 0;
    else targetRotationBack = doors.back ? Math.PI / 2 : 0;

    const action = `${doors[type] ? "Abrió" : "Cerró"} Puerta ${type === 'main' ? 'Principal' : 'Trasera'}`;
    
    // 1. Registrar en Backend
    try {
        await fetch(`${BACKEND_URL}/autenticar`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ pin: currentUser.pin, accion: action }) 
        });
        actualizarHistorialUI();
    } catch (e) { console.error("Error registro:", e); }

    // 2. Enviar a Hardware si está conectado
    if (bleDevice?.gatt.connected && bleCharacteristic) {
        try {
            const cmd = type === 'main' ? (doors.main ? 'A' : 'C') : (doors.back ? 'B' : 'D');
            await bleCharacteristic.writeValue(new TextEncoder().encode(cmd));
            console.log(`Comando '${cmd}' enviado al ESP32.`);
        } catch (e) { console.error("Error hardware:", e); }
    }

    actualizarBotonesUI();
}

ui.mainBtn.onclick = () => handleAction('main'); 
ui.backBtn.onclick = () => handleAction('back');

async function actualizarHistorialUI() {
    try {
        const res = await fetch(`${BACKEND_URL}/historial`), data = await res.json();
        ui.hist.innerHTML = data.map(r => `
            <div class="glass p-4 rounded-2xl flex justify-between items-center border border-white/5">
                <div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><span class="material-symbols-outlined text-slate-400 text-sm">person</span></div>
                <div><p class="font-display font-bold text-sm text-slate-200">${r.usuario}</p><p class="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">${r.hora}</p></div></div>
                <span class="text-[10px] px-3 py-1 rounded-full font-display font-bold tracking-wider ${r.accion.includes('Abrió') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-primary/10 text-primary border border-primary/20'}">${r.accion.toUpperCase()}</span>
            </div>`).join('') || '<p class="text-center text-slate-500 py-10">No hay actividad</p>';
        ui.mini.innerHTML = data.slice(0, 3).map(r => `<div class="flex justify-between items-center px-2 py-1 border-l-2 border-primary/30"><p class="text-xs text-slate-400"><span class="font-bold text-slate-200">${r.usuario}</span> - ${r.accion}</p><span class="text-[9px] text-slate-500 font-mono">${r.hora}</span></div>`).join('') || '<p class="text-xs text-slate-500">Sin actividad</p>';
    } catch (e) {}
}

const abrirHistorial = () => { const m = document.getElementById('historyModal'); m.classList.remove('pointer-events-none', 'opacity-0'); m.classList.add('flex'); };
const cerrarHistorial = () => document.getElementById('historyModal').classList.add('pointer-events-none', 'opacity-0');
