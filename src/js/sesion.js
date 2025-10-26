function setupPasswordToggle(inputId, toggleButtonId, iconId) {
    const input = document.getElementById(inputId);
    const toggleButton = document.getElementById(toggleButtonId);
    const eyeIcon = document.getElementById(iconId);

    // Verificamos que los elementos existan en el DOM antes de adjuntar el listener
    if (toggleButton && input && eyeIcon) {
        toggleButton.addEventListener('click', function (e) {
            // Evita que el botón envíe el formulario si está dentro del <form>
            e.preventDefault(); 
            
            // Alternar el tipo (password/text)
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);

            // Alternar el ícono (requiere Font Awesome)
            if (type === 'text') {
                eyeIcon.classList.remove('fa-eye');
                eyeIcon.classList.add('fa-eye-slash');
            } else {
                eyeIcon.classList.remove('fa-eye-slash');
                eyeIcon.classList.add('fa-eye');
            }
        });
    }
}

// Configurar el toggle para el campo de Contraseña
setupPasswordToggle('logPassword', 'togglePassword', 'eyeIconPassword');

document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    // Obtener los campos de entrada
    const logEmailIn = document.getElementById("logEmail");
    const logPasswordIn = document.getElementById("logPassword");

    const logEmail = logEmailIn.value.trim();
    const logPassword = logPasswordIn.value.trim();

    // 1. Validar que no esten vacios
    if (!logEmail || !logPassword) {
        Swal.fire({
            icon: 'warning',
            title: '⚠️ Atención',
            text: 'Todos los campos son obligatorios'
        });
        return;
    }

    // 2. Obtener el ARRAY de usuarios del localstorage
    const users = JSON.parse(localStorage.getItem("users"));

    // 3. Validar que haya algún registro en el array
    if (!users || users.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: '⚠️ Atención',
            text: 'No hay usuarios registrados. Regístrate primero.'
        });
        return;
    }

    // 4. Buscar al usuario en el array que coincida con email y password
    const foundUser = users.find(user => 
        user.email.toLowerCase() === logEmail.toLowerCase() && 
        user.password === logPassword
    );

    // 5. Validar si encontramos un usuario
    if (foundUser) {
        // Éxito en el inicio de sesión
        Swal.fire({
            icon: 'success',
            title: '✅ Éxito',
            text: 'Inicio de sesión correcto',
            showConfirmButton: false, // Opcional: Oculta el botón OK
            timer: 2000 // Opcional: Cierra el modal automáticamente después de 2 segundos
        });
        
        // Guardamos el estado de login
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", JSON.stringify({ name: foundUser.name, email: foundUser.email }));

        // Redirigir después del tiempo de SweetAlert
        setTimeout(() => {
            window.location.href = "./home.html";

            // Limpiamos los campos
            logEmailIn.value = "";
            logPasswordIn.value = "";
        }, 2000);
    } else {
        // Error de credenciales
        Swal.fire({
            icon: 'error',
            title: '❌ Error',
            text: 'Credenciales incorrectas (Email o Contraseña)'
        });
        return;
    }
});