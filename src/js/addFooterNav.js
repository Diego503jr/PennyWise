document.addEventListener("DOMContentLoaded", function () {
  async function loadHTML(elementId, filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error("No se pudo cargar el archivo HTML");

      const html = await response.text();
      document.getElementById(elementId).innerHTML = html;

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

  //   Cargamos el nav y el footer
  loadHTML("navbar", "./componentes/navbar.html");
  loadHTML("footer", "./componentes/footer.html");
});
