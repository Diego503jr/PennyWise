function handleLogout() {
  Swal.fire({
    title: '¿Seguro que quieres salir?',
    text: "Tendrás que volver a iniciar sesión.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#455a64',
    cancelButtonColor: '#ddbf7c',
    confirmButtonText: 'Sí, cerrar sesión',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      // Eliminar datos de sesión
      localStorage.removeItem("isLoggedIn");
      Swal.fire({
        icon: 'success',
        title: 'Sesión cerrada',
        text: 'Has cerrado sesión correctamente.',
        showConfirmButton: false,
        timer: 1500
      });

      setTimeout(() => {
        window.location.href = "../../index.html";
      }, 1500);
    }
  });
}

  window.handleLogout = handleLogout;

