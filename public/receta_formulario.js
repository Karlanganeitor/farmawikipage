document.addEventListener("DOMContentLoaded", () => {
    const recetaForm = document.getElementById("recetaForm");
    const recetasTable = document.getElementById("recetasTable").getElementsByTagName('tbody')[0];
    const logoutBtn = document.getElementById("logoutBtn");

    // Obtén el ID del usuario desde el localStorage
    const usuarioId = localStorage.getItem("id_usuario");
    if (!usuarioId) {
        // Si no hay usuario autenticado, redirigir al login
        window.location.href = "login.html";
    }

    // Función para registrar una nueva receta
    recetaForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fecha_emision = document.getElementById("fecha_emision").value;
        const observaciones = document.getElementById("observaciones").value;
        const medicamento_nombre = document.getElementById("medicamento_nombre").value;
        const medicamento_dosis = document.getElementById("medicamento_dosis").value;
        const dias_tratamiento = document.getElementById("dias_tratamiento").value;
        const unidades_medicamento = document.getElementById("unidades_medicamento").value;
        const via_administracion = document.getElementById("via_administracion").value;

        const recetaData = {
            fecha_emision,
            observaciones,
            medicamento: {
                nombre: medicamento_nombre,
                dosis: medicamento_dosis,
                dias_tratamiento,
                unidades_medicamento,
                via_administracion
            },
            usuario_id: usuarioId
        };

        try {
            const response = await fetch("http://localhost:3000/receta", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(recetaData)
            });

            const result = await response.json();
            if (response.ok) {
                alert("Receta registrada con éxito.");
                cargarRecetas(); // Recargar las recetas registradas
            } else {
                alert("Error al registrar la receta: " + result.message);
            }
        } catch (error) {
            console.error("Error en la solicitud:", error);
            alert("Hubo un problema al registrar la receta.");
        }
    });
    async function eliminarReceta(idReceta) {
        if (confirm("¿Estás seguro de que deseas eliminar esta receta?")) {
            try {
                const response = await fetch(`http://localhost:3000/receta/${idReceta}`, {
                    method: "DELETE",
                });
    
                const result = await response.json();
                if (response.ok) {
                    alert("Receta eliminada con éxito.");
                    cargarRecetas(); // Recargar las recetas después de eliminar
                } else {
                    alert("Error al eliminar la receta: " + result.message);
                }
            } catch (error) {
                console.error("Error al eliminar la receta:", error);
                alert("Hubo un problema al eliminar la receta.");
            }
        }
    }
    
    // Función para cargar las recetas registradas
    async function cargarRecetas() {
        try {
            const response = await fetch(`http://localhost:3000/recetas/${usuarioId}`);
            
            const recetas = await response.json();
            
            // Limpiar la tabla antes de agregar nuevas filas
            recetasTable.innerHTML = "";

            recetas.forEach(receta => {
                const row = recetasTable.insertRow();
                row.insertCell(0).textContent = receta.fecha_emision;
                row.insertCell(1).textContent = receta.observaciones;
                row.insertCell(2).textContent = receta.medicamento_nombre;
                row.insertCell(3).textContent = receta.dosis;
                row.insertCell(4).textContent = receta.dias_tratamiento;
                row.insertCell(5).textContent = receta.unidades_medicamento;
                row.insertCell(6).textContent = receta.via_administracion;


                 // Agregar el botón de eliminar
                const deleteCell = row.insertCell(7);
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Eliminar";
                deleteButton.classList.add("btn", "btn-danger");
                deleteButton.onclick = () => eliminarReceta(receta.id_receta);
                deleteCell.appendChild(deleteButton);
            });
        } catch (error) {
            console.error("Error al cargar las recetas:", error);
        }
    }
    
    // Cargar las recetas al cargar la página
    cargarRecetas();

    // Cerrar sesión
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("id_usuario");
        window.location.href = "login.html";
    });
});
