/**
 * Recupera el objeto del usuario actual de la sesión.
 * @returns {object | null} El objeto del usuario (name, email) o null.
 */
function getCurrentSessionUser() {
    const currentUserString = localStorage.getItem("currentUser");
    if (currentUserString) {
        try {
            return JSON.parse(currentUserString);
        } catch (e) {
            console.error("Error al parsear el usuario de localStorage:", e);
            return null;
        }
    }
    return null;
}

/**
 * Obtiene el array completo de usuarios registrados.
 * @returns {Array} El array de usuarios o un array vacío.
 */
function getAllUsers() {
    const usersString = localStorage.getItem("users");
    return usersString ? JSON.parse(usersString) : [];
}

/**
 * Carga los datos específicos para el usuario actual.
 * @param {string} email El email del usuario actual.
 * @returns {Array} Los datos de registros del usuario o un array vacío.
 */
function loadUserData(email) {
    const allDataString = localStorage.getItem("appData");
    if (!allDataString) return [];
    try {
        const allData = JSON.parse(allDataString);
        return allData[email.toLowerCase()] || [];
    } catch (e) {
        return [];
    }
}

// --- LÓGICA DE PERFIL ---

function loadProfileData() {
    const user = getCurrentSessionUser();
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

    if (!isLoggedIn || !user || !user.email) {
        Swal.fire({
            icon: 'warning',
            title: 'Acceso Denegado',
            text: 'Debes iniciar sesión para ver tu perfil.',
            showConfirmButton: false,
            timer: 2000
        });
        setTimeout(() => {
            window.location.href = "../index.html"; // Ajusta la ruta
        }, 2000);
        return;
    }

    // 1. Insertar datos personales
    const userNameElement = document.getElementById('profileUserName');
    const userEmailElement = document.getElementById('profileUserEmail');
    const displayNameElement = document.getElementById('displayName');

    if (userNameElement) userNameElement.textContent = user.name; 
    if (userEmailElement) userEmailElement.textContent = user.email;
    if (displayNameElement) displayNameElement.textContent = user.name;
}

// --- LÓGICA DE EDICIÓN DE DATOS ---

/**
 * Actualiza la información del usuario en el array global 'users' y en 'currentUser'.
 * @param {string} email Email del usuario (clave).
 * @param {object} updatedFields Campos a actualizar ({name: 'nuevo', password: 'nuevo'}).
 */
function updateUserInfo(email, updatedFields) {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) {
        Swal.fire('Error', 'Usuario no encontrado en la base de datos.', 'error');
        return false;
    }

    // Actualizar el array principal de usuarios
    users[userIndex] = { ...users[userIndex], ...updatedFields };
    localStorage.setItem("users", JSON.stringify(users));

    // Actualizar el estado de la sesión actual
    const newCurrentUser = { ...getCurrentSessionUser(), ...updatedFields };
    localStorage.setItem("currentUser", JSON.stringify(newCurrentUser));
    
    // Recargar los datos en la vista del perfil
    loadProfileData(); 
    return true;
}

function moveUserData(oldEmail, newEmail) {
    const allDataString = localStorage.getItem("appData");
    const allData = allDataString ? JSON.parse(allDataString) : {};

    const oldKey = oldEmail.toLowerCase();
    const newKey = newEmail.toLowerCase();
    
    // 1. Si existen datos para el email antiguo, moverlos a la nueva clave
    if (allData[oldKey]) {
        allData[newKey] = allData[oldKey]; // Copiar los datos
        delete allData[oldKey]; // Eliminar la clave antigua
        localStorage.setItem("appData", JSON.stringify(allData));
    }
}

// 1. Manejo de Cambio de Nombre
document.getElementById('editNameForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const user = getCurrentSessionUser();
    if (!user) return;

    const newName = document.getElementById('newName').value.trim();
    const verificationPassword = document.getElementById('nameVerificationPassword').value.trim();

    // Buscar el usuario con la contraseña
    const allUsers = getAllUsers();
    const userToVerify = allUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());

    if (userToVerify && userToVerify.password === verificationPassword) {
        if (updateUserInfo(user.email, { name: newName })) {
            Swal.fire('¡Éxito!', 'Nombre de usuario actualizado correctamente.', 'success');
            // Cierra el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editNameModal'));
            modal.hide();
        }
    } else {
        Swal.fire('Error', 'La contraseña actual es incorrecta.', 'error');
    }
});

// 2. Manejo de Cambio de Contraseña
document.getElementById('editPasswordForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const user = getCurrentSessionUser();
    if (!user) return;

    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmNewPassword = document.getElementById('confirmNewPassword').value.trim();

    // Validaciones
    if (newPassword.length < 6) {
        Swal.fire('Advertencia', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        Swal.fire('Error', 'La nueva contraseña y su confirmación no coinciden.', 'error');
        return;
    }
    
    // Buscar el usuario para verificar la contraseña anterior
    const allUsers = getAllUsers();
    const userToVerify = allUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());

    if (userToVerify && userToVerify.password === oldPassword) {
        if (updateUserInfo(user.email, { password: newPassword })) {
            Swal.fire('¡Éxito!', 'Contraseña actualizada correctamente.', 'success');
            // Cierra el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editPasswordModal'));
            modal.hide();
        }
    } else {
        Swal.fire('Error', 'La contraseña actual es incorrecta.', 'error');
    }
});

// 3. Manejo de Cambio de Email
document.getElementById('editEmailForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const user = getCurrentSessionUser();
    if (!user) return;

    const oldEmail = user.email;
    const newEmail = document.getElementById('newEmail').value.trim();
    const verificationPassword = document.getElementById('emailVerificationPassword').value.trim();

    // 1. Validar que el nuevo email sea diferente
    if (newEmail.toLowerCase() === oldEmail.toLowerCase()) {
        Swal.fire('Advertencia', 'El nuevo correo debe ser diferente al actual.', 'warning');
        return;
    }

    // 2. Verificar que el nuevo email no esté ya registrado por otro usuario
    const allUsers = getAllUsers();
    const existingUser = allUsers.find(u => u.email.toLowerCase() === newEmail.toLowerCase());
    if (existingUser) {
        Swal.fire('Error', 'El correo electrónico ingresado ya está registrado.', 'error');
        return;
    }

    // 3. Buscar el usuario actual para verificar la contraseña
    const userToVerify = allUsers.find(u => u.email.toLowerCase() === oldEmail.toLowerCase());

    if (userToVerify && userToVerify.password === verificationPassword) {
        
        // 4. Mover los datos de registro de la clave antigua a la nueva
        moveUserData(oldEmail, newEmail);

        // 5. Actualizar la información del usuario (array global y sesión)
        if (updateUserInfo(oldEmail, { email: newEmail })) {
            Swal.fire('¡Éxito!', 'Correo electrónico actualizado correctamente. Por favor, inicia sesión de nuevo.', 'success');
            
            // Cierra el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editEmailModal'));
            modal.hide();

            // Como la clave de la sesión cambió, forzamos el logout para que inicie sesión con el nuevo email
            // Usamos la función global del logout.js (asumiendo que está cargado)
            setTimeout(() => {
                handleLogout(); // Llama a la función del script logout.js
            }, 1500);
        }
    } else {
        Swal.fire('Error', 'La contraseña actual es incorrecta o no coincide.', 'error');
    }
});

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
});