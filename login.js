
document.addEventListener('DOMContentLoaded', () => {
    // --- SELECTORES DEL DOM ---
    const loginForm = document.getElementById('login-form');
    const usuarioInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const togglePassword = document.getElementById('toggle-password');

    const importBtn = document.getElementById('importar-btn');
    const exportBtn = document.getElementById('exportar-btn');
    const importFile = document.getElementById('import-file');
    const importFeedback = document.getElementById('import-feedback');

    // --- ESTADO DE LA APLICACIÓN ---
    let clientes = [];

    // --- DATOS DE DEMO ---
    function obtenerCuentasDemo() {
        return [
            {
                "id": 101,
                "usuario": "ana.gomez",
                "password": "demo123",
                "nombre": "Ana Gómez (Demo)",
                "cuentas": [
                    { "numero": "9999-8888-7777-6661", "tipo": "Cuenta Principal", "saldo": 7800.50, "movimientos": [] },
                    { "numero": "9999-8888-7777-6662", "tipo": "Cuenta de Viajes", "saldo": 12340.00, "movimientos": [] }
                ],
                "pagosProgramados": []
            },
            {
                "id": 102,
                "usuario": "carlos.diaz",
                "password": "demo456",
                "nombre": "Carlos Díaz (Demo)",
                "cuentas": [
                    { "numero": "9999-8888-7777-6663", "tipo": "Cuenta Corriente", "saldo": 4250.00, "movimientos": [] }
                ],
                "pagosProgramados": []
            }
        ];
    }

    // --- INICIALIZACIÓN ---
    function inicializarDatos() {
        const cuentasDemo = obtenerCuentasDemo();
        const datosGuardadosStr = localStorage.getItem('infosBankData');
        let cuentasGuardadas = [];

        if (datosGuardadosStr) {
            try {
                cuentasGuardadas = JSON.parse(datosGuardadosStr);
            } catch (e) {
                console.error("Datos en localStorage corruptos:", e);
                cuentasGuardadas = []; // Si hay un error, empezamos de cero
            }
        }

        // Unir las cuentas guardadas y las de demo, evitando duplicados por ID
        const mapaDeCuentas = new Map(cuentasGuardadas.map(c => [c.id, c]));
        cuentasDemo.forEach(demo => {
            if (!mapaDeCuentas.has(demo.id)) {
                mapaDeCuentas.set(demo.id, demo);
            }
        });

        clientes = Array.from(mapaDeCuentas.values());
        showImportFeedback('Cuentas de demo y/o guardadas listas.', true);
    }

    // --- MANEJO DE EVENTOS ---
    loginForm.addEventListener('submit', handleLogin);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', handleImport);
    exportBtn.addEventListener('click', handleExport);
    togglePassword.addEventListener('click', handleTogglePassword);

    // --- LÓGICA DE AUTENTICACIÓN ---
    function handleTogglePassword() {
        // Cambiar la visibilidad de la contraseña
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        // Cambiar el icono
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    }

    function handleLogin(e) {
        e.preventDefault();
        const usuario = usuarioInput.value.trim();
        const password = passwordInput.value.trim();
        loginError.textContent = '';

        if (clientes.length === 0) {
            loginError.textContent = 'No hay datos de clientes cargados.';
            return;
        }

        const user = clientes.find(c => c.usuario === usuario && c.password === password);

        if (user) {
            sessionStorage.setItem('loggedInUser', JSON.stringify(user));
            // Guardar el estado actual (que puede incluir datos importados + demo) en localStorage
            localStorage.setItem('infosBankData', JSON.stringify(clientes));
            window.location.href = 'app.html';
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos.';
        }
    }

    // --- GESTIÓN DE DATOS (IMPORT/EXPORT) ---
    function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const datosImportados = JSON.parse(e.target.result);
                if (Array.isArray(datosImportados) && datosImportados.every(c => c.usuario && c.password && c.cuentas)) {
                    clientes = datosImportados;
                    localStorage.setItem('infosBankData', JSON.stringify(clientes));
                    showImportFeedback('Datos importados y guardados correctamente. Refresca la página para asegurar la consistencia.', true);
                    // Opcional: re-inicializar para unir con las cuentas demo
                    inicializarDatos();
                } else {
                    throw new Error('El formato del archivo JSON no es válido.');
                }
            } catch (error) {
                showImportFeedback(`Error al importar: ${error.message}`, false);
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    }

    function handleExport() {
        if (clientes.length === 0) {
            showImportFeedback('No hay datos para exportar.', false);
            return;
        }

        const dataStr = JSON.stringify(clientes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'infosbank_data.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showImportFeedback('Datos exportados con éxito.', true);
    }

    function showImportFeedback(message, isSuccess) {
        importFeedback.textContent = message;
        importFeedback.className = `feedback-message ${isSuccess ? 'good' : 'error'}`;
    }

    // Iniciar la aplicación
    inicializarDatos();
});
