document.getElementById('searchForm').addEventListener('submit', async function (e) {
    e.preventDefault(); // Evita que la página se recargue
    const userId = document.getElementById('userId').value;

    try {
        // Realiza la solicitud al servidor
        const response = await fetch(`http://localhost:3000/buscar_usuario?id_usuario=${userId}`);
        const data = await response.json();

        // Verifica si la solicitud fue exitosa
        if (data.success) {
            displayUserInfo(data.usuario);
        } else {
            alert(data.message || 'Usuario no encontrado');
        }
    } catch (error) {
        console.error('Error al obtener datos:', error);
        alert('Ocurrió un error al procesar la solicitud.');
    }
});

// Función para mostrar la información del usuario
function displayUserInfo(usuario) {
    // Muestra la sección de información
    document.getElementById('userInfo').style.display = 'block';

    // Detalles del usuario
    const userDetails = `
        <p><strong>Nombre:</strong> ${usuario.nombre_usuario}</p>
        <p><strong>Teléfono:</strong> ${usuario.telefono}</p>
        <p><strong>Dirección:</strong> ${usuario.direccion}</p>
    `;
    document.getElementById('userDetails').innerHTML = userDetails;

    // Recetas
    const recetasList = usuario.recetas.map(receta => `
        <div class="card">
            
            <p><strong>Fecha Emisión:</strong> ${receta.fecha_emision}</p>
            <p><strong>Observaciones:</strong> ${receta.observaciones}</p>
            <p><strong>Medicamento:</strong> ${receta.nombre_comercial} (${receta.nombre_generico})</p>
            <p><strong>Dosis:</strong> ${receta.dosis}</p>
            <p><strong>Días de Tratamiento:</strong> ${receta.dias_tratamiento}</p>
            <p><strong>Vía de Administración:</strong> ${receta.via_administracion}</p>
        </div>
    `).join('');
    document.getElementById('recetasList').innerHTML = recetasList || '<p>No hay recetas asociadas.</p>';

    // Alergias
    const alergiasList = usuario.alergias.map(alergia => `
        <div class="card">
            <p><strong>Tipo de Alergia:</strong> ${alergia.tipo_alergia}</p>
            <p><strong>Descripción:</strong> ${alergia.descripcion}</p>
        </div>
    `).join('');
    document.getElementById('alergiasList').innerHTML = alergiasList || '<p>No hay alergias asociadas.</p>';
}