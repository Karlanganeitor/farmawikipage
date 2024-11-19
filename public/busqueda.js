document.addEventListener('DOMContentLoaded', () => {
    // Función para obtener el término de búsqueda de la URL
    function getQueryParameter(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Obtener el término de búsqueda
    const searchTerm = getQueryParameter('term');

    if (searchTerm) {
        fetch(`/api/search?term=${encodeURIComponent(searchTerm)}`)
            .then(response => response.text())
            .then(data => parseXML(data))
            .catch(error => console.error('Error al realizar la búsqueda:', error));
    } else {
        document.getElementById('results').innerHTML = '';
    }

    function parseXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        const documents = xmlDoc.getElementsByTagName('document');
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = ''; // Limpiar resultados previos

        if (documents.length > 0) {
            Array.from(documents).forEach(doc => {
                const titleElement = doc.querySelector('content[name="title"]');
                const snippetElement = doc.querySelector('content[name="snippet"]');
                const url = doc.getAttribute('url');

                const title = titleElement ? titleElement.textContent : 'Sin título';
                const snippet = snippetElement ? snippetElement.textContent : 'Sin descripción';

                const itemDiv = document.createElement('div');
                itemDiv.classList.add('result-item');
                itemDiv.innerHTML = `
                    <h3><a href="${url}" target="_blank">${title}</a></h3>
                    <p>${snippet}</p>
                `;

                resultsDiv.appendChild(itemDiv);
            });
        } else {
            resultsDiv.innerHTML = '<p>No se encontraron resultados.</p>';
        }
    }

    document.getElementById('searchButton').addEventListener('click', () => {
        const searchTerm = document.getElementById('searchTerm').value.trim();

        if (searchTerm) {
            // Redirigir a buscador.html pasando el término de búsqueda como parámetro
            window.location.href = `buscador.html?term=${encodeURIComponent(searchTerm)}`;
        } else {
            alert('Por favor ingresa un término de búsqueda.');
        }
    });
});
