let testimonials = JSON.parse(localStorage.getItem("testimonios")) || [];

// Agregar Testimonios
document.getElementById("saveTestimonio").addEventListener("click", (e) => {
  e.preventDefault();

  //    Modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("testimonialModal")
  );

  //    Obtenemos los campos
  const name = document.getElementById("recipient-name").value.trim();
  const avatar = document.getElementById("recipient-avatar").value.trim();
  const profession = document
    .getElementById("recipient-profession")
    .value.trim();
  const testimonial = document.getElementById("testimonial-text").value.trim();

  //    Validación simple
  if (!name || !avatar || !profession || !testimonial) {
    Swal.fire({
      icon: "warning",
      title: "Atención",
      text: "Por favor completa todos los campos",
    });
    return;
  }

  //   Luego lo pasamos a objeto y lo guardamos en localstorage
  const newTestimonial = {
    name,
    avatar,
    profession,
    testimonial,
  };

  testimonials.push(newTestimonial);
  localStorage.setItem("testimonios", JSON.stringify(testimonials));

  console.log("Guardado ✅", testimonials);
  modal.hide();

  Swal.fire({
    icon: "success",
    title: "Atención",
    text: "Testimonio agregado satisfactoriamente",
  });

  //    Limpiamos los inputs
  document.getElementById("recipient-name").value = "";
  document.getElementById("recipient-avatar").value = "";
  document.getElementById("recipient-profession").value = "";
  document.getElementById("testimonial-text").value = "";

  cargarTestimonios();
});

function cargarTestimonios() {
  const carouselInner = document.querySelector(".carousel-inner");
  const carouselIndicators = document.querySelector(".carousel-indicators");

  //    Eliminamos los testimonios dinamicos por si se refresca la screen
  const dinamicos = carouselInner.querySelectorAll(".carousel-item.dinamic");
  dinamicos.forEach((el) => el.remove);

  const indicadoresDinamicos =
    carouselIndicators.querySelectorAll(".dynamic-indicator");
  indicadoresDinamicos.forEach((el) => el.remove());

  //    Ahora creamos nuevos elementos de manera dinamica
  testimonials.forEach((t, i) => {
    const newI = i + 4; //  4 porque estaticos son esos

    //  Creamos los indicadores dinamicos
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("dinamyc-indicator");
    button.setAttribute("data-bs-target", "#testimoniosCarousel");
    button.setAttribute("data-bs-slide-to", newI);
    button.setAttribute("aria-label", `Slide ${newI + 1}`);
    carouselIndicators.appendChild(button);

    //  Creamos los testimonios dinamicos
    const item = document.createElement("div");
    item.className = "carousel-item dynamic";
    item.innerHTML = `
          <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-8">
          <div class="testimonial-card card p-4 border-0 shadow-sm">
            <div class="d-flex align-items-center gap-3 mb-3">
              <img src="${t.avatar}" height="50" alt="Avatar Usuario" class="avatar" />
              <div>
                <div class="name fst-italic">${t.name}</div>
                <div class="role fw-bold">${t.profession}</div>
              </div>
            </div>
            <blockquote class="blockquote mb-0">
              <p class="quote">"${t.testimonial}"</p>
            </blockquote>
          </div>
        </div>
      </div>
    `;

    carouselInner.appendChild(item);
  });
}

//  Llamos a la funcion al cargar la view
document.addEventListener("DOMContentLoaded", cargarTestimonios());
