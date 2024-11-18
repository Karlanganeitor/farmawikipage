
// Cargar el navbar y ocultar la opción de Buscar Pacientes si el usuario no es funcionario de salud
fetch('/navbar.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('navbar-container').innerHTML = html;

        // Ahora que el navbar está cargado, verificamos el valor de func_salud
        const funcSalud = parseInt(localStorage.getItem('func_salud'), 10);
        console.log("Valor de func_salud desde localStorage:", funcSalud);

        // Asegúrate de que el valor es un número
        if (isNaN(funcSalud)) {
            console.error('El valor de func_salud no es un número válido');
            return; // No continuar si no es un número válido
        }

        // Verifica que el valor sea 0 (si es 0, ocultamos la opción)
        if (funcSalud === 0) {
            const buscarPacienteNavItem = document.getElementById('buscarPacienteNavItem');
            if (buscarPacienteNavItem) {
                buscarPacienteNavItem.style.display = 'none'; // Oculta el elemento
            }
        }
    })
    .catch(err => console.error('Error cargando el navbar:', err));
