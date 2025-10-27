let currentUser = JSON.parse(localStorage.getItem("currentUser"));

//  Si el usuario no esta registrado lo redireccionamos al index
if (!currentUser) {
  Swal.fire({
    icon: "error",
    title: "Atención",
    text: "Usted no se ha registrado en la plataform",
  }).then(() => {
    window.location.href = "index.html";
  });
}
