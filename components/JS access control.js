document.addEventListener("DOMContentLoaded", () => {

    console.log("🔐 Access Control iniciado");

    // 1. Verificar si existe una sesión
    const isLogged = localStorage.getItem("userSession");

    // Si el usuario está logueado no protegemos nada
    if (isLogged) {
        console.log("✅ Usuario autenticado");
        return;
    }

    console.log("👤 Visitante detectado");

    // 2. Obtener todos los elementos hijos del body
    const elementos = [...document.body.children];

    elementos.forEach(elemento => {

        const etiqueta = elemento.tagName.toLowerCase();

        // 3. Ignorar componentes públicos
        if (
            etiqueta === "pawpath-navbar" ||
            etiqueta === "pawpath-footer" ||
            etiqueta === "footer" ||
            etiqueta === "nav"
        ) {
            console.log("✅ Público:", etiqueta);
            return;
        }

        console.log("🔒 Protegido:", etiqueta);

        // 4. Proteger el contenido
        elemento.addEventListener("click", (e) => {

            e.preventDefault();
            e.stopPropagation();

            window.location.href = "/user/visitor/login/login.html";

        });

    });

});