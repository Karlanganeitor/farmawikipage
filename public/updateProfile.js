document.addEventListener("DOMContentLoaded", function() {
    const idUsuario = localStorage.getItem("id_usuario");  // ID del usuario; en una aplicación real, esto debería ser dinámico

    // Cargar opciones de regiones y comunas para el selector
    fetch(`http://localhost:3000/api/regiones_comunas`)
        .then(response => response.json())
        .then(data => {
            const regionSelect = document.getElementById("region");
            for (const region in data) {
                const option = document.createElement("option");
                option.value = region;
                option.textContent = region;
                regionSelect.appendChild(option);
            }
        })
        .catch(error => console.error("Error al cargar regiones:", error));

    // Cuando cambia la región, se cargan las comunas correspondientes
    document.getElementById("region").addEventListener("change", function() {
        const regionSelect = document.getElementById("region");
        const comunaSelect = document.getElementById("comuna");
        const selectedRegion = regionSelect.value;

        // Limpiar las comunas actuales
        comunaSelect.innerHTML = '<option selected>Seleccione una comuna</option>';

        // Cargar las comunas correspondientes
        fetch(`http://localhost:3000/api/regiones_comunas`)
            .then(response => response.json())
            .then(data => {
                const comunas = data[selectedRegion];
                if (comunas) {
                    comunas.forEach(comuna => {
                        const option = document.createElement("option");
                        option.value = comuna;
                        option.textContent = comuna;
                        comunaSelect.appendChild(option);
                    });
                }
            })
            .catch(error => console.error("Error al cargar comunas:", error));
    });

    // Manejo de envío del formulario para actualizar el perfil
    document.getElementById("profileForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const n_doc_identificacion = document.getElementById("n_doc_identificacion").value;
        const telefono = document.getElementById("telefono").value;
        const fecha_nac = document.getElementById("fecha_nac").value;
        const direccion = document.getElementById("direccion").value;
        const comuna = document.getElementById("comuna").value;

        // Enviar solicitud PUT al backend
        fetch(`http://localhost:3000/perfil/${idUsuario}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                n_doc_identificacion,
                telefono,
                fecha_nac,
                direccion,
                comuna
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Error al actualizar el perfil");
            }
            return response.json();
        })
        .then(data => {
            alert(data.message);
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Hubo un error al actualizar el perfil");
        });
    });
});
