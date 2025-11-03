let isLoggedIn = JSON.parse(localStorage.getItem("isLoggedIn"));

//  Si el usuario no esta registrado lo redireccionamos al index
if (!isLoggedIn) {
  Swal.fire({
    icon: "error",
    title: "Atención",
    text: "Usted no se ha registrado en la plataforma",
  }).then(() => {
    window.location.href = "../../index.html";
  });
}
