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
setupPasswordToggle('password', 'togglePassword', 'eyeIconPassword');

// Configurar el toggle para el campo de Confirmar Contraseña
setupPasswordToggle('confirmPassword', 'toggleConfirmPassword', 'eyeIconConfirm');

// Funciones de validación
function emailValidation(email) {
  const regx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regx.test(email);
}

function passValidation(pass) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(pass);
}

function passMatch(pass, confPass) {
  return pass === confPass;
}

// Registro
document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!name || !email || !password || !confirmPassword) {
    Swal.fire({
      icon: 'warning',
      title: 'Atención',
      text: 'Por favor completa todos los campos'
    });
    return;
  }

  if (!emailValidation(email)) {
    Swal.fire({
      icon: 'warning',
      title: 'Email inválido',
      text: 'Por favor ingresa un correo válido'
    });
    return;
  }

  if (!passValidation(password)) {
    Swal.fire({
      icon: 'warning',
      title: 'Contraseña débil',
      html: 'Debe contener:<br>- Minúscula<br>- Mayúscula<br>- Número<br>- Mínimo 8 caracteres'
    });
    return;
  }

  if (!passMatch(password, confirmPassword)) {
    Swal.fire({
      icon: 'warning',
      title: 'Contraseñas no coinciden',
      text: 'Por favor verifica tus contraseñas'
    });
    return;
  }

  // Guardar múltiples usuarios en LocalStorage
  let users = JSON.parse(localStorage.getItem('users')) || [];

  // Validar correo duplicado
  const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    Swal.fire({
      icon: 'error',
      title: 'Correo ya registrado',
      text: 'Por favor usa otro correo'
    });
    return;
  }

  // Agregar usuario
  users.push({ name, email, password });
  localStorage.setItem('users', JSON.stringify(users));

  Swal.fire({
    icon: 'success',
    title: 'Registro exitoso',
    text: 'Usuario registrado correctamente'
  }).then(() => {
    window.location.href = "./sesion.html";
  });

  // Limpiar campos
  document.getElementById("registerForm").reset();
});
