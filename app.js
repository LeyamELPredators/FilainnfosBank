document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ESTADO GLOBAL DE LA APLICACIÓN
    // ===================================================================
    let todosLosClientes = [];
    let usuarioActual = null;
    let tokenInterval = null; // Para el setInterval del token
    let countdownInterval = null; // Para el contador de segundos
    let currentToken = null;
    const TOKEN_LIFESPAN = 30; // en segundos

    // ===================================================================
    // SELECTORES DE ELEMENTOS DEL DOM
    // ===================================================================
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const mainNav = document.querySelector('.main-nav');
    const cuentasListContainer = document.getElementById('cuentas-list-container');
    const cuentaDetalleContainer = document.getElementById('cuenta-detalle-container');
    const cuentasList = document.getElementById('cuentas-list');
    const detalleCuentaTitulo = document.getElementById('detalle-cuenta-titulo');
    const detalleCuentaMovimientos = document.getElementById('detalle-cuenta-movimientos');
    const btnVolver = document.getElementById('btn-volver');
    const transferPropiasForm = document.getElementById('transfer-propias-form');
    const transferForm = document.getElementById('transfer-form');
    // --- Elementos de Pagos ---
    const pagosListContainer = document.getElementById('pagos-list-container');
    const pagosList = document.getElementById('pagos-list');
    const pagoDetalleContainer = document.getElementById('pago-detalle-container');
    const configurarPagoContainer = document.getElementById('configurar-pago-container');
    const btnVolverPagos = document.getElementById('btn-volver-pagos');
    const formNuevoPago = document.getElementById('form-nuevo-pago');
    // --- Elementos de Nueva Cuenta ---
    const btnMostrarFormNuevaCuenta = document.getElementById('btn-mostrar-form-nueva-cuenta');
    const formNuevaCuenta = document.getElementById('form-nueva-cuenta');
    const btnCancelarNuevaCuenta = document.getElementById('btn-cancelar-nueva-cuenta');


    // ===================================================================
    // FUNCIÓN DE INICIALIZACIÓN
    // ===================================================================
    function init() {
        const usuarioLogueadoStr = sessionStorage.getItem('loggedInUser');
        const todosLosClientesStr = localStorage.getItem('infosBankData');
        if (!usuarioLogueadoStr || !todosLosClientesStr) {
            window.location.href = 'index.html';
            return;
        }
        try {
            todosLosClientes = JSON.parse(todosLosClientesStr);
            const infoUsuarioLogueado = JSON.parse(usuarioLogueadoStr);
            usuarioActual = todosLosClientes.find(cliente => cliente.id === infoUsuarioLogueado.id);
            if (!usuarioActual) throw new Error("Usuario no encontrado");

            if (!usuarioActual.pagosProgramados) {
                usuarioActual.pagosProgramados = [];
            }

        } catch (error) {
            console.error("Error crítico al cargar datos:", error);
            handleLogout();
            return;
        }
        setupEventListeners();
        renderizarVistaCompleta();
        switchView('cuentas');
    }

    // ===================================================================
    // LÓGICA DEL TOKEN DE SEGURIDAD
    // ===================================================================
    function generarNuevoToken() {
        currentToken = Math.floor(100000 + Math.random() * 900000).toString();
        document.querySelectorAll('.token-display').forEach(display => display.textContent = currentToken);
        document.querySelectorAll('.token-progress-bar').forEach(bar => {
            bar.classList.remove('animating');
            void bar.offsetWidth;
            bar.classList.add('animating');
        });
        let segundosRestantes = TOKEN_LIFESPAN;
        document.querySelectorAll('.token-timer').forEach(timer => timer.textContent = segundosRestantes);
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            segundosRestantes--;
            const tiempo = segundosRestantes > 0 ? segundosRestantes : 0;
            document.querySelectorAll('.token-timer').forEach(timer => timer.textContent = tiempo);
        }, 1000);
    }

    function iniciarCicloDelToken() {
        detenerCicloDelToken();
        generarNuevoToken();
        tokenInterval = setInterval(generarNuevoToken, TOKEN_LIFESPAN * 1000);
    }

    function detenerCicloDelToken() {
        clearInterval(tokenInterval);
        clearInterval(countdownInterval);
        document.querySelectorAll('.token-progress-bar').forEach(bar => bar.classList.remove('animating'));
    }

    // ===================================================================
    // CONFIGURACIÓN DE EVENTOS
    // ===================================================================
    function setupEventListeners() {
        logoutBtn.addEventListener('click', handleLogout);
        mainNav.addEventListener('click', handleNavClick);
        btnVolver.addEventListener('click', () => mostrarVistaListaCuentas());
        transferPropiasForm.addEventListener('submit', handleTransferenciaPropia);
        transferForm.addEventListener('submit', handleTransferenciaTerceros);
        document.getElementById('origen-cuenta-propia').addEventListener('change', actualizarOpcionesDestinoPropio);

        // Listeners de Pagos
        btnVolverPagos.addEventListener('click', handleVolverAPagos);
        formNuevoPago.addEventListener('submit', handleAgregarPagoProgramado);
        pagosListContainer.addEventListener('click', e => {
            if (e.target && e.target.id === 'btn-agregar-pago') {
                handleMostrarFormularioNuevoPago();
            }
        });
        pagosList.addEventListener('click', e => {
            const pagoResumen = e.target.closest('.pago-resumen');
            if (pagoResumen) {
                mostrarDetallePago(pagoResumen.dataset.pagoId);
            }
        });
        pagoDetalleContainer.addEventListener('click', e => {
            if (e.target && e.target.id === 'btn-volver-lista-pagos') {
                mostrarVistaListaPagos();
            }
        });
        pagoDetalleContainer.addEventListener('submit', e => {
            if (e.target && e.target.classList.contains('pago-programado-form')) {
                e.preventDefault();
                handlePagarServicio(e.target);
            }
        });

        // Listeners de Nueva Cuenta
        btnMostrarFormNuevaCuenta.addEventListener('click', handleMostrarFormNuevaCuenta);
        btnCancelarNuevaCuenta.addEventListener('click', handleCancelarNuevaCuenta);
        formNuevaCuenta.addEventListener('submit', handleCrearNuevaCuenta);
    }

    // ===================================================================
    // LÓGICA DE RENDERIZADO Y VISTAS
    // ===================================================================
    function renderizarVistaCompleta() {
        if (!usuarioActual) return;
        welcomeMessage.textContent = `Bienvenido, ${usuarioActual.nombre}`;
        renderizarListaDeCuentas();
        poblarSelectsDeTransferencia();
        poblarSelectDestinoTerceros();
        renderPagosView();
    }

    function renderizarListaDeCuentas() {
        cuentasList.innerHTML = '';
        if (!usuarioActual.cuentas || !Array.isArray(usuarioActual.cuentas)) return;
        usuarioActual.cuentas.forEach(cuenta => {
            const cuentaElement = document.createElement('div');
            cuentaElement.className = 'cuenta-resumen';
            cuentaElement.dataset.cuentaNumero = cuenta.numero;
            cuentaElement.innerHTML = `<div class="cuenta-info"><h4>${cuenta.tipo}</h4><p class="numero-cuenta">${cuenta.numero}</p></div><div class="cuenta-saldo"><p class="saldo">${formatearMoneda(cuenta.saldo)}</p></div><div class="cuenta-accion"><i class="fa fa-chevron-right"></i></div>`;
            cuentaElement.addEventListener('click', () => mostrarVistaDetalle(cuenta.numero));
            cuentasList.appendChild(cuentaElement);
        });
    }

    function mostrarVistaDetalle(numeroCuenta) {
        const cuenta = usuarioActual.cuentas.find(c => c.numero === numeroCuenta);
        if (!cuenta) return;
        detalleCuentaTitulo.textContent = `Movimientos de: ${cuenta.tipo}`;
        const movimientosHTML = (cuenta.movimientos && cuenta.movimientos.length > 0)
            ? crearHtmlDeMovimientos(cuenta.movimientos)
            : '<p class="no-movimientos">No hay movimientos recientes para esta cuenta.</p>';
        detalleCuentaMovimientos.innerHTML = movimientosHTML;
        cuentasListContainer.style.display = 'none';
        cuentaDetalleContainer.style.display = 'block';
    }

    function mostrarVistaListaCuentas() {
        cuentaDetalleContainer.style.display = 'none';
        cuentasListContainer.style.display = 'block';
        pagoDetalleContainer.style.display = 'none';
        pagosListContainer.style.display = 'block';
        configurarPagoContainer.style.display = 'none';
        formNuevaCuenta.style.display = 'none';
    }

    function crearHtmlDeMovimientos(movimientos) {
        const filas = movimientos.map(m => {
            let descripcion = '';
            if (m.tipo === 'Ingreso' || m.tipo === 'Egreso') {
                 descripcion = `${m.tipo} ${m.tipo === 'Ingreso' ? 'de' : 'a'} ...${m.ref.slice(-4)}`;
            } else if (m.tipo === 'Pago Servicio') {
                descripcion = `Pago ${m.ref}`;
            } else {
                descripcion = m.ref;
            }
            return `<li><span class="mov-fecha">${new Date(m.fecha).toLocaleDateString()}</span><span class="mov-tipo">${descripcion}</span><span class="mov-monto ${m.tipo.toLowerCase().replace(' ','-')}">${m.tipo.startsWith('Egr') || m.tipo.startsWith('Pago') ? '-' : '+'}${formatearMoneda(m.monto)}</span></li>`
        }).join('');
        return `<ul class="movimientos-list"><li class="mov-header"><span class="mov-fecha">Fecha</span><span class="mov-tipo">Descripción</span><span class="mov-monto">Monto</span></li>${filas}</ul>`;
    }

    // ===================================================================
    // LÓGICA DE CREACIÓN DE CUENTAS
    // ===================================================================
    function handleMostrarFormNuevaCuenta() {
        formNuevaCuenta.style.display = 'block';
        btnMostrarFormNuevaCuenta.style.display = 'none';
    }

    function handleCancelarNuevaCuenta() {
        formNuevaCuenta.style.display = 'none';
        btnMostrarFormNuevaCuenta.style.display = 'block';
        formNuevaCuenta.reset();
    }

    function handleCrearNuevaCuenta(e) {
        e.preventDefault();
        const feedback = formNuevaCuenta.querySelector('#nueva-cuenta-feedback');
        const nombreCuenta = document.getElementById('nombre-nueva-cuenta').value.trim();

        if (!nombreCuenta) {
            mostrarFeedback(feedback, 'El nombre de la cuenta es obligatorio.', false);
            return;
        }

        const nuevaCuenta = {
            numero: generarNumeroDeCuentaUnico(),
            tipo: nombreCuenta,
            saldo: 0,
            movimientos: []
        };

        usuarioActual.cuentas.push(nuevaCuenta);
        guardarDatos();
        renderizarVistaCompleta();
        mostrarFeedback(feedback, '¡Cuenta creada con éxito!', true);

        setTimeout(() => {
            handleCancelarNuevaCuenta();
            mostrarFeedback(feedback, '', true);
        }, 1500);
    }

    function generarNumeroDeCuentaUnico() {
        let nuevoNumero;
        let existe = true;
        const todasLasCuentas = todosLosClientes.flatMap(c => c.cuentas.map(acc => acc.numero));

        while (existe) {
            const p1 = Math.floor(1000 + Math.random() * 9000);
            const p2 = Math.floor(1000 + Math.random() * 9000);
            const p3 = Math.floor(1000 + Math.random() * 9000);
            const p4 = Math.floor(1000 + Math.random() * 9000);
            nuevoNumero = `${p1}-${p2}-${p3}-${p4}`;
            existe = todasLasCuentas.includes(nuevoNumero);
        }
        return nuevoNumero;
    }

    // ===================================================================
    // LÓGICA DE PAGOS
    // ===================================================================
    function renderPagosView() {
        pagosList.innerHTML = '';
        const buttonContainer = document.querySelector('#pagos-list-container .agregar-pago-container-btn');
        if (usuarioActual.pagosProgramados && usuarioActual.pagosProgramados.length > 0) {
            usuarioActual.pagosProgramados.forEach(pago => {
                const pagoElement = document.createElement('div');
                pagoElement.className = 'pago-resumen';
                pagoElement.dataset.pagoId = pago.idPago;
                pagoElement.innerHTML = `
                    <div class="pago-info">
                        <h4>${pago.servicio}</h4>
                        <p class="numero-cuenta">Contrato: ${pago.numeroCuentaServicio}</p>
                    </div>
                    <div class="pago-accion">
                        <i class="fa fa-chevron-right"></i>
                    </div>
                `;
                pagosList.appendChild(pagoElement);
            });
            buttonContainer.querySelector('#btn-agregar-pago').textContent = 'Programar Otro Pago';
        } else {
            pagosList.innerHTML = '<p class="no-pagos-lista">No tiene pagos de servicios programados.</p>';
            buttonContainer.querySelector('#btn-agregar-pago').textContent = 'Programar Nuevo Pago';
        }
        mostrarVistaListaPagos();
    }

    function mostrarDetallePago(pagoId) {
        const pago = usuarioActual.pagosProgramados.find(p => p.idPago === pagoId);
        if (!pago) return;

        pagosListContainer.style.display = 'none';
        configurarPagoContainer.style.display = 'none';
        pagoDetalleContainer.innerHTML = `
            <button id="btn-volver-lista-pagos" class="btn btn-secondary"><i class="fa fa-arrow-left"></i> Volver a la Lista</button>
            <div class="pago-programado-item">
                <form class="pago-programado-form" data-pago-id="${pago.idPago}">
                    <h4>${pago.servicio}</h4>
                    <p>Contrato: ${pago.numeroCuentaServicio}</p>
                    <div class="form-group">
                        <label for="origen-cuenta-pago-${pago.idPago}">Pagar desde:</label>
                        <select id="origen-cuenta-pago-${pago.idPago}" class="origen-cuenta-pago" required></select>
                    </div>
                    <div class="form-group">
                        <label for="monto-pago-${pago.idPago}">Monto a Pagar ($)</label>
                        <input type="number" id="monto-pago-${pago.idPago}" value="${pago.montoDefault.toFixed(2)}" step="0.01" min="0.01" required>
                    </div>
                    <div class="token-section">
                        <div class="token-header">
                            <h4>Token de Seguridad</h4>
                            <p>Nuevo token en <span class="token-timer">30</span>s</p>
                        </div>
                        <div class="token-display">------</div>
                        <div class="progress-bar-container">
                            <div class="token-progress-bar"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="token-input-pago-${pago.idPago}">Ingresar Token</label>
                        <input type="text" id="token-input-pago-${pago.idPago}" class="token-input-pago" required autocomplete="off" placeholder="Ingrese el token de 6 dígitos" maxlength="6">
                    </div>
                    <button type="submit" class="btn">Pagar</button>
                    <p class="feedback-message"></p>
                </form>
            </div>
        `;
        pagoDetalleContainer.style.display = 'block';

        const selectOrigen = pagoDetalleContainer.querySelector('.origen-cuenta-pago');
        usuarioActual.cuentas.forEach(cuenta => {
            selectOrigen.add(new Option(`${cuenta.tipo} (${formatearMoneda(cuenta.saldo)})`, cuenta.numero));
        });
        iniciarCicloDelToken();
    }

    function mostrarVistaListaPagos() {
        pagoDetalleContainer.style.display = 'none';
        configurarPagoContainer.style.display = 'none';
        pagosListContainer.style.display = 'block';
        detenerCicloDelToken();
    }

    function handleMostrarFormularioNuevoPago() {
        pagosListContainer.style.display = 'none';
        configurarPagoContainer.style.display = 'block';
    }

    function handleVolverAPagos() {
        configurarPagoContainer.style.display = 'none';
        pagosListContainer.style.display = 'block';
        renderPagosView();
    }

    function handleAgregarPagoProgramado(e) {
        e.preventDefault();
        const feedback = e.target.querySelector('#nuevo-pago-feedback');
        const nuevoPago = {
            idPago: `pago-${Date.now()}`,
            servicio: document.getElementById('servicio-pago').value,
            numeroCuentaServicio: document.getElementById('numero-cuenta-servicio').value.trim(),
            montoDefault: parseFloat(document.getElementById('monto-default-pago').value)
        };

        if (!nuevoPago.servicio || !nuevoPago.numeroCuentaServicio || isNaN(nuevoPago.montoDefault) || nuevoPago.montoDefault <= 0) {
            mostrarFeedback(feedback, 'Todos los campos son obligatorios y el monto debe ser positivo.', false);
            return;
        }

        usuarioActual.pagosProgramados.push(nuevoPago);
        guardarDatos();
        mostrarFeedback(feedback, '¡Servicio programado con éxito!', true);
        
        formNuevoPago.reset();
        setTimeout(() => {
            handleVolverAPagos();
        }, 1500);
    }

    function handlePagarServicio(form) {
        const pagoId = form.dataset.pagoId;
        const feedbackElem = form.querySelector('.feedback-message');
        const pagoProgramado = usuarioActual.pagosProgramados.find(p => p.idPago === pagoId);

        if (!pagoProgramado) return; // Should not happen

        const origenNum = form.querySelector('.origen-cuenta-pago').value;
        const monto = parseFloat(form.querySelector('input[type="number"]').value);
        const token = form.querySelector('.token-input-pago').value;

        if (token !== currentToken) return mostrarFeedback(feedbackElem, 'Token de seguridad inválido.', false);
        if (isNaN(monto) || monto <= 0) return mostrarFeedback(feedbackElem, 'El monto debe ser un número positivo.', false);

        const cuentaOrigen = usuarioActual.cuentas.find(c => c.numero === origenNum);
        if (cuentaOrigen.saldo < monto) return mostrarFeedback(feedbackElem, 'Saldo insuficiente.', false);

        // Process payment
        cuentaOrigen.saldo -= monto;
        const fecha = new Date().toISOString();
        cuentaOrigen.movimientos.unshift({ tipo: 'Pago Servicio', monto, ref: pagoProgramado.servicio, fecha });

        guardarDatos();
        poblarSelectsDeTransferencia(); // Update dropdowns in other views with new balance

        // Show success message and disable form
        mostrarFeedback(feedbackElem, 'Pago realizado con éxito.', true);
        generarNuevoToken(); // Invalidate the used token

        // Disable form elements to prevent re-submission
        form.querySelector('.origen-cuenta-pago').disabled = true;
        form.querySelector('input[type="number"]').disabled = true;
        form.querySelector('.token-input-pago').disabled = true;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Pagado';
    }

    // ===================================================================
    // LÓGICA DE NAVEGACIÓN Y TRANSFERENCIAS
    // ===================================================================
    function handleLogout() {
        detenerCicloDelToken();
        sessionStorage.clear();
        window.location.href = 'index.html';
    }

    function handleNavClick(e) {
        if (e.target.matches('.nav-btn')) {
            mostrarVistaListaCuentas();
            switchView(e.target.dataset.view);
        }
    }

    function handleTransferenciaPropia(e) {
        e.preventDefault();
        const form = e.target, feedback = form.querySelector('#transfer-propia-feedback');
        procesarTransferencia(form.querySelector('#origen-cuenta-propia').value, form.querySelector('#destino-cuenta-propia').value, parseFloat(form.querySelector('#monto-propio').value), true, null, feedback, form);
    }

    function handleTransferenciaTerceros(e) {
        e.preventDefault();
        const form = e.target, feedback = form.querySelector('#transfer-feedback');
        const tokenIngresado = form.querySelector('#token-input').value;
        procesarTransferencia(form.querySelector('#origen-cuenta').value, form.querySelector('#destino-cuenta').value, parseFloat(form.querySelector('#monto').value), false, tokenIngresado, feedback, form);
    }

    function procesarTransferencia(origenNum, destinoNum, monto, esPropia, token, feedbackElem, form) {
        if (!esPropia && token !== currentToken) return mostrarFeedback(feedbackElem, 'Token de seguridad inválido.', false);
        if (isNaN(monto) || monto <= 0) return mostrarFeedback(feedbackElem, 'El monto debe ser un número positivo.', false);
        if (!destinoNum || origenNum === destinoNum) return mostrarFeedback(feedbackElem, 'Las cuentas de origen y destino deben ser diferentes.', false);
        
        const cuentaOrigen = usuarioActual.cuentas.find(c => c.numero === origenNum);
        if (cuentaOrigen.saldo < monto) return mostrarFeedback(feedbackElem, 'Saldo insuficiente.', false);
        
        const cuentaDestino = esPropia
            ? usuarioActual.cuentas.find(c => c.numero === destinoNum)
            : todosLosClientes.flatMap(c => c.cuentas).find(acc => acc.numero === destinoNum);

        if (!cuentaDestino) return mostrarFeedback(feedbackElem, 'La cuenta de destino no existe.', false);

        const fecha = new Date().toISOString();
        cuentaOrigen.saldo -= monto;
        cuentaDestino.saldo += monto;
        cuentaOrigen.movimientos.unshift({ tipo: 'Egreso', monto, ref: cuentaDestino.numero, fecha });
        cuentaDestino.movimientos.unshift({ tipo: 'Ingreso', monto, ref: cuentaOrigen.numero, fecha });
        
        guardarDatos();
        renderizarVistaCompleta();
        
        mostrarFeedback(feedbackElem, 'Transferencia realizada con éxito.', true);
        form.reset();
        if (!esPropia) generarNuevoToken();
        setTimeout(() => { mostrarVistaListaCuentas(); switchView('cuentas'); }, 1500);
    }

    // ===================================================================
    // FUNCIONES AUXILIARES
    // ===================================================================
    function guardarDatos() {
        const indice = todosLosClientes.findIndex(c => c.id === usuarioActual.id);
        if (indice !== -1) todosLosClientes[indice] = usuarioActual;
        localStorage.setItem('infosBankData', JSON.stringify(todosLosClientes));
    }

    function poblarSelectsDeTransferencia() {
        const origenTerceros = document.getElementById('origen-cuenta');
        const origenPropia = document.getElementById('origen-cuenta-propia');
        [origenTerceros, origenPropia].forEach(sel => sel.innerHTML = '');
        usuarioActual.cuentas.forEach(cuenta => {
            const option = new Option(`${cuenta.tipo} (${formatearMoneda(cuenta.saldo)})`, cuenta.numero);
            origenTerceros.add(option.cloneNode(true));
            origenPropia.add(option.cloneNode(true));
        });
        actualizarOpcionesDestinoPropio();
    }

    function poblarSelectDestinoTerceros() {
        const destinoTercerosSelect = document.getElementById('destino-cuenta');
        destinoTercerosSelect.innerHTML = '';

        const cuentasDeOtros = todosLosClientes
            .filter(cliente => cliente.id !== usuarioActual.id)
            .flatMap(cliente =>
                cliente.cuentas.map(cuenta => ({...cuenta, nombreCliente: cliente.nombre}))
            );

        if (cuentasDeOtros.length === 0) {
            const option = new Option('No hay otras cuentas de destino disponibles', '');
            option.disabled = true;
            destinoTercerosSelect.add(option);
        } else {
            destinoTercerosSelect.add(new Option('Seleccione una cuenta de destino...', ''));
            cuentasDeOtros.forEach(cuenta => {
                const option = new Option(`${cuenta.nombreCliente} - ${cuenta.tipo} (...${cuenta.numero.slice(-4)})`, cuenta.numero);
                destinoTercerosSelect.add(option);
            });
        }
    }

    function actualizarOpcionesDestinoPropio() {
        const origenPropia = document.getElementById('origen-cuenta-propia');
        const destinoPropia = document.getElementById('destino-cuenta-propia');
        const origenSeleccionado = origenPropia.value;
        destinoPropia.innerHTML = '';
        usuarioActual.cuentas
            .filter(c => c.numero !== origenSeleccionado)
            .forEach(cuenta => {
                const option = new Option(`${cuenta.tipo} (${formatearMoneda(cuenta.saldo)})`, cuenta.numero);
                destinoPropia.add(option);
            });
    }

    function switchView(viewName) {
        const vistasConToken = ['terceros', 'pagos'];
        const vistaActivaEl = document.querySelector('.view.active');
        const vistaActiva = vistaActivaEl ? vistaActivaEl.id.replace('view-', '') : null;

        if (vistasConToken.includes(vistaActiva) && !vistasConToken.includes(viewName)) {
            detenerCicloDelToken();
        }

        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));

        if (viewName === 'pagos') {
            mostrarVistaListaPagos();
        } else if (vistasConToken.includes(viewName)) {
            iniciarCicloDelToken();
        }
    }

    function mostrarFeedback(element, message, isSuccess) {
        element.textContent = message;
        element.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
    }

    function formatearMoneda(value) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    init();
});