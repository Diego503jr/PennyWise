document.addEventListener("DOMContentLoaded", function () {
  async function loadHTML(elementId, filePath, callback) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error("No se pudo cargar el archivo HTML");

      const html = await response.text();
      document.getElementById(elementId).innerHTML = html;

      //  Ejecutamos el callback
      if (callback) callback();

      // Resalta el link activo si es el header
      if (elementId === "navbar") {
        const currentPath = window.location.pathname.split("/").pop();
        document.querySelectorAll("#navMenu .nav-link").forEach((link) => {
          const linkPath = link.getAttribute("href").split("/").pop();
          link.classList.toggle("active", linkPath === currentPath);
        });
      }
    } catch (err) {
      console.error(`Error al cargar ${elementId}:`, err);
    }
  }
  
  function waitForLogoutFunction(callback) {
    const interval = setInterval(() => {
      if (typeof window.handleLogout === "function") {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }

  //   Cargamos el nav y el footer
  loadHTML("navbar", "../componentes/navbar.html", () => {
    //  Agregamos el nombre del usuario al boton
    const nombreToButton = document.getElementById("btn-profile");
    //  Obtener usuario actual
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    if (nombreToButton && currentUser) {
      nombreToButton.textContent = currentUser.name;
    }

      waitForLogoutFunction(() => {
      const logoutBtn = document.getElementById("btn-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          window.handleLogout();
        });
      }
    });
  });
  loadHTML("footer", "../componentes/footer.html");
});
