function handleLogout() {
    Swal.fire({
        title: '¿Seguro que quieres salir?',
        text: "Tendrás que volver a ingresar tus credenciales.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#455a64', 
        cancelButtonColor: '#ddbf7c',
        confirmButtonText: 'Sí, Cerrar Sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Eliminar las claves de sesión de localStorage
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("currentUser");
            // Nota: Mantenemos 'users' y 'appData' para que los datos persistan
            
            Swal.fire({
                icon: 'success',
                title: 'Adiós!',
                text: 'Sesión cerrada correctamente.',
                showConfirmButton: false,
                timer: 1500
            });
            
            // Redirigir después del tiempo de SweetAlert
            setTimeout(() => {
                // Ajusta la ruta a tu archivo de inicio de sesión
                window.location.href = "../index.html"; 
            }, 1500);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault(); 
            handleLogout();
        });
    }
});