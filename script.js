document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO DE LA APLICACIÓN ---
    let clientes = [];
    let usuarioActual = null;

    // --- SELECTORES DEL DOM ---
    const appContainer = document.getElementById('app-container');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const cuentasList = document.getElementById('cuentas-list');
    const transferForm = document.getElementById('transfer-form');
    const origenCuentaSelect = document.getElementById('origen-cuenta');
    const destinoCuentaInput = document.getElementById('destino-cuenta');
    const montoInput = document.getElementById('monto');
    const transferFeedback = document.getElementById('transfer-feedback');

    // --- INICIALIZACIÓN Y CONTROL DE ACCESO ---
    function init() {
        const loggedInUserStr = sessionStorage.getItem('loggedInUser');
        const allClientsStr = localStorage.getItem('infosBankData');

        if (!loggedInUserStr || !allClientsStr) {
            // Si no hay sesión o no hay datos, redirigir al login
            window.location.href = 'index.html';
            return;
        }

        usuarioActual = JSON.parse(loggedInUserStr);
        clientes = JSON.parse(allClientsStr);
        
        // Asegurarse de que el usuario de la sesión existe en la base de datos principal
        const userInDB = clientes.find(c => c.id === usuarioActual.id);
        if (!userInDB) {
            alert('Error de consistencia de datos. Cerrando sesión.');
            handleLogout();
            return;
        }
        // Usar la versión de la DB para tener los datos más frescos
        usuarioActual = userInDB;

        renderApp();
    }

    // --- MANEJO DE EVENTOS ---
    logoutBtn.addEventListener('click', handleLogout);
    transferForm.addEventListener('submit', handleTransfer);

    function handleLogout() {
        sessionStorage.removeItem('loggedInUser');
        window.location.href = 'index.html';
    }

    // --- LÓGICA DE TRANSFERENCIAS ---
    function handleTransfer(e) {
        e.preventDefault();
        const origenNumero = origenCuentaSelect.value;
        const destinoNumero = destinoCuentaInput.value.trim();
        const monto = parseFloat(montoInput.value);

        if (isNaN(monto) || monto <= 0) {
            showTransferFeedback('El monto debe ser un número positivo.', false);
            return;
        }
        if (origenNumero === destinoNumero) {
            showTransferFeedback('La cuenta de origen y destino no pueden ser la misma.', false);
            return;
        }

        const cuentaOrigen = usuarioActual.cuentas.find(c => c.numero === origenNumero);

        if (cuentaOrigen.saldo < monto) {
            showTransferFeedback('Saldo insuficiente para realizar la transferencia.', false);
            return;
        }

        let cuentaDestino = null;
        let clienteDestino = null;

        for (const cliente of clientes) {
            const encontrada = cliente.cuentas.find(c => c.numero === destinoNumero);
            if (encontrada) {
                cuentaDestino = encontrada;
                clienteDestino = cliente;
                break;
            }
        }

        if (!cuentaDestino) {
            showTransferFeedback('La cuenta de destino no existe.', false);
            return;
        }

        cuentaOrigen.saldo -= monto;
        cuentaDestino.saldo += monto;

        const fecha = new Date().toISOString();
        cuentaOrigen.movimientos.push({ tipo: 'Egreso', monto, destino: destinoNumero, fecha });
        cuentaDestino.movimientos.push({ tipo: 'Ingreso', monto, origen: origenNumero, fecha });

        saveData();
        renderApp();
        transferForm.reset();
        showTransferFeedback('Transferencia realizada con éxito.', true);
    }

    // --- RENDERIZADO DE LA UI ---
    function renderApp() {
        welcomeMessage.textContent = `Bienvenido, ${usuarioActual.nombre}`;
        
        cuentasList.innerHTML = '';
        origenCuentaSelect.innerHTML = '';
        transferFeedback.textContent = '';

        usuarioActual.cuentas.forEach(cuenta => {
            const cuentaElement = document.createElement('div');
            cuentaElement.className = 'cuenta';
            cuentaElement.innerHTML = `
                <h4>${cuenta.tipo}</h4>
                <p class="numero-cuenta">${cuenta.numero}</p>
                <p class="saldo">${formatCurrency(cuenta.saldo)}</p>
            `;
            cuentasList.appendChild(cuentaElement);

            const optionElement = document.createElement('option');
            optionElement.value = cuenta.numero;
            optionElement.textContent = `${cuenta.tipo} - ${cuenta.numero}`;
            origenCuentaSelect.appendChild(optionElement);
        });
    }

    // --- PERSISTENCIA DE DATOS ---
    function saveData() {
        // Actualizar el usuario actual dentro del array de clientes
        const userIndex = clientes.findIndex(c => c.id === usuarioActual.id);
        if (userIndex !== -1) {
            clientes[userIndex] = usuarioActual;
        }
        localStorage.setItem('infosBankData', JSON.stringify(clientes));
    }

    // --- FUNCIONES DE FEEDBACK Y UTILIDADES ---
    function showTransferFeedback(message, isSuccess) {
        transferFeedback.textContent = message;
        transferFeedback.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
    }

    function formatCurrency(value) {
        // Cambiado a Dólares (USD)
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    // --- INICIAR LA APLICACIÓN ---
    init();
});