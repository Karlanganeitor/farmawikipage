const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');  // Para manejar solicitudes CORS
const path = require('path');  // Importa path para gestionar rutas


const app = express();
app.use(bodyParser.json());
app.use(cors());  // Permitir solicitudes desde el frontend

// Configura Express para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));


//------------------------------------------

// Configurar la conexión a MySQL
const db = mysql.createConnection({
    host: 'farmawiki.c5yew0gcemb0.sa-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 'adminadmin',
    database: 'FarmawikiBD',
    port: 3306 
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos MySQL:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL en AWS');
});

// -------------------------------------------Ruta para iniciar sesión-------------------------------------------
app.post('/login', (req, res) => {
    const { correo_elec, contrasena } = req.body;

    // Validar que el correo y la contraseña fueron proporcionados
    if (!correo_elec || !contrasena) {
        return res.status(400).json({ message: 'Faltan datos: correo_elec y contrasena son requeridos' });
    }

    // Buscar al usuario por su correo electrónico
    const sql = 'SELECT * FROM Usuario WHERE correo_elec = ?';
    db.query(sql, [correo_elec], async (err, results) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            return res.status(500).send('Error en la base de datos');
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Correo electrónico no registrado' });
        }

        const usuario = results[0];  // Obtenemos el usuario de la consulta

        // Comparamos la contraseña ingresada con la almacenada
        const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // Si la contraseña coincide, se considera un inicio de sesión exitoso
        res.status(200).json({ 
            message: 'Inicio de sesión exitoso', 
            nombre_usuario: usuario.nombre_usuario, 
            id_usuario: usuario.id_usuario, 
            func_salud: usuario.func_salud // Incluye el campo func_salud en la respuesta
        });
    });
});

// -------------------------------------------Ruta para registrar un nuevo usuario-------------------------------------------
// Ruta para registrar un nuevo usuario
app.post('/registro', async (req, res) => {
    const { nombre_usuario, correo_elec, contrasena } = req.body;

    if (!nombre_usuario || !correo_elec || !contrasena) {
        return res.status(400).json({ message: 'Faltan datos: nombre_usuario, correo_elec y contrasena son requeridos' });
    }

    try {
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Verificar si el correo ya está registrado
        const checkSql = 'SELECT * FROM Usuario WHERE correo_elec = ?';
        db.query(checkSql, [correo_elec], (err, results) => {
            if (err) {
                console.error('Error en la consulta SQL:', err);
                return res.status(500).send('Error en la base de datos');
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
            }

            // Insertar el nuevo usuario
            const sql = 'INSERT INTO Usuario (nombre_usuario, correo_elec, contrasena) VALUES (?, ?, ?)';
            db.query(sql, [nombre_usuario, correo_elec, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error en la inserción SQL:', err);
                    return res.status(500).send('Error al registrar el usuario');
                }

                const id_usuario = result.insertId; // ID del usuario registrado

                // Crear un perfil para el usuario
                const perfilSql = 'INSERT INTO Perfil_user (usuario_id) VALUES (?)';
                db.query(perfilSql, [id_usuario], (err, result) => {
                    if (err) {
                        console.error('Error al crear el perfil:', err);
                        return res.status(500).send('Error al crear el perfil');
                    }

                    // Responder que el registro fue exitoso
                    res.status(201).json({ 
                        message: 'Usuario registrado exitosamente', 
                        id_usuario 
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).send('Error en el servidor');
    }
});



// -------------------------------------------Ruta para registrar alergias -------------------------------------------
// Ruta para registrar alergias
app.post('/alergias', (req, res) => {
    const { tipo_alergia, descripcion, id_usuario } = req.body; // Asegúrate de que 'tipo_alergia' es el nombre correcto

    // Validar que los campos necesarios están presentes
    if (!tipo_alergia || !descripcion || !id_usuario) {
        return res.status(400).json({ message: 'Faltan datos: tipo_alergia, descripcion y id_usuario son requeridos' });
    }

    const sql = 'INSERT INTO Alergia (tipo_alergia, descripcion, usuario_id) VALUES (?, ?, ?)';  // Correcto: usando 'tipo_alergia'

    db.query(sql, [tipo_alergia, descripcion, id_usuario], (err, result) => {
        if (err) {
            console.error('Error en la consulta SQL al registrar alergia:', err); // Detalle del error
            return res.status(500).send('Error al registrar la alergia');
        }

        res.status(201).json({ message: 'Alergia registrada correctamente' });
    });
});



// -------------------------------------------Ruta para obtener los datos del perfil-------------------------------------------
app.get('/perfil/:id_usuario', (req, res) => {
    const id_usuario = req.params.id_usuario;
    
    const sql = `
        SELECT 
            u.nombre_usuario,
            p.n_doc_identificacion,
            p.telefono,
            p.fecha_nac,
            p.direccion,
            r.nombre_region AS region,
            c.nombre_comuna AS comuna
        FROM 
            Perfil_user p
        JOIN 
            Usuario u ON p.usuario_id = u.id_usuario
        JOIN 
            Comuna c ON p.comuna_id = c.id_comuna
        JOIN 
            Region r ON c.region_id = r.id_region
        WHERE 
            p.usuario_id = ?`;

    db.query(sql, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            return res.status(500).send('Error en la base de datos');
        }

        if (results.length === 0) {
            console.log(`No se encontró el perfil con usuario_id ${id_usuario}`);
            return res.status(200).json({});  // Enviar una respuesta vacía
        }

        const perfil = results[0];
        res.status(200).json({
            nombre_usuario: perfil.nombre_usuario,
            n_doc_identificacion: perfil.n_doc_identificacion,
            telefono: perfil.telefono,
            fecha_nac: perfil.fecha_nac,
            direccion: perfil.direccion,
            region: perfil.region,
            comuna: perfil.comuna
        });
    });
});



// -------------------------------------------Ruta para obtener los datos de alergias-------------------------------------------
// Ruta para obtener las alergias
app.get('/alergias/:id_usuario', (req, res) => {
    const id_usuario = req.params.id_usuario;

    // Consulta para obtener alergias usando la columna 'tipo_alergia'
    const sql = 'SELECT * FROM Alergia WHERE usuario_id = ?';
    db.query(sql, [id_usuario], (err, results) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            return res.status(500).send('Error en la base de datos');
        }

        res.status(200).json(results); // Retorna todas las alergias del usuario
    });
});


//-------------------------------------------Obtener region
// Endpoint para obtener regiones y comunas
app.get('/api/regiones_comunas', (req, res) => {
    const query = `
      SELECT Region.nombre_region AS region_nombre, Comuna.nombre_comuna AS comuna_nombre
      FROM Region
      LEFT JOIN Comuna ON Comuna.region_id = Region.id_region
      ORDER BY Region.nombre_region, Comuna.nombre_comuna
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error en la consulta:', err);
        res.status(500).send('Error en el servidor');
        return;
      }
  
      // Organizar los resultados en un objeto agrupado por región
      const data = {};
  
      results.forEach((row) => {
        const { region_nombre, comuna_nombre } = row;
  
        if (!data[region_nombre]) {
          data[region_nombre] = [];
        }
        data[region_nombre].push(comuna_nombre);
      });
  
      res.json(data);
    });
  });
  


// -------------------------------------------Ruta para actualizar los datos del perfil-------------------------------------------
// Ruta para obtener las regiones y comunas
app.get('/api/regiones_comunas', (req, res) => {
    const query = `
      SELECT Region.nombre_region AS region_nombre, Comuna.nombre_comuna AS comuna_nombre
      FROM Region
      LEFT JOIN Comuna ON Comuna.region_id = Region.id_region
      ORDER BY Region.nombre_region, Comuna.nombre_comuna
    `;
  
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            res.status(500).send('Error en el servidor');
            return;
        }

        const data = {};
        results.forEach((row) => {
            const { region_nombre, comuna_nombre } = row;
            if (!data[region_nombre]) {
                data[region_nombre] = [];
            }
            data[region_nombre].push(comuna_nombre);
        });
  
        res.json(data);
    });
});

// -----------------------------------------------Ruta para actualizar el perfil del usuario
app.put('/perfil/:id_usuario', (req, res) => {
    const id_usuario = req.params.id_usuario;
    const { n_doc_identificacion, telefono, fecha_nac, direccion, comuna } = req.body;

    if (!n_doc_identificacion || !telefono || !fecha_nac || !direccion || !comuna) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Primero, obtener el id_comuna correspondiente al nombre de la comuna
    const getComunaIdQuery = 'SELECT id_comuna FROM Comuna WHERE nombre_comuna = ?';

    db.query(getComunaIdQuery, [comuna], (err, result) => {
        if (err) {
            console.error('Error al obtener id_comuna:', err);
            return res.status(500).json({ message: 'Error al obtener la comuna' });
        }

        if (result.length === 0) {
            // Si no se encuentra la comuna en la base de datos
            return res.status(404).json({ message: 'Comuna no encontrada' });
        }

        // Obtenemos el id_comuna
        const id_comuna = result[0].id_comuna;

        // Ahora que tenemos el id_comuna, realizamos la actualización en Perfil_user
        const sql = `UPDATE Perfil_user SET 
                        n_doc_identificacion = ?, 
                        telefono = ?, 
                        fecha_nac = ?, 
                        direccion = ?, 
                        comuna_id = ? 
                     WHERE usuario_id = ?`;

        db.query(sql, [n_doc_identificacion, telefono, fecha_nac, direccion, id_comuna, id_usuario], (err, result) => {
            if (err) {
                console.error('Error al actualizar el perfil:', err);
                return res.status(500).json({ message: 'Error al actualizar el perfil' });
            }

            if (result.affectedRows === 0) {
                console.log('No se encontró ningún registro para actualizar.');
                return res.status(404).json({ message: 'No se encontró el usuario para actualizar' });
            }

            console.log('Perfil actualizado correctamente en la base de datos.');
            res.status(200).json({ message: 'Perfil actualizado correctamente' });
        });
    });
});




//----------------------------------------Ruta para registrar una nueva receta----------------------------
app.post('/receta', (req, res) => {
    console.log(req.body);  // Para ver qué datos llegan al backend

    const { fecha_emision, observaciones, medicamento, usuario_id } = req.body;

    console.log(medicamento);  // Verifica si los datos del medicamento llegan bien

    // Validaciones para asegurar que los campos requeridos no estén vacíos
    if (!fecha_emision || !observaciones || !medicamento || !usuario_id) {
        return res.status(400).json({ message: 'Faltan datos requeridos para la receta' });
    }

    if (!medicamento.nombre_comercial || !medicamento.nombre_generico) {
        return res.status(400).json({ message: 'El nombre comercial y genérico son obligatorios para el medicamento' });
    }

    // Insertar la receta en la tabla Receta
    const recetaSql = 'INSERT INTO Receta (fecha_emision, observaciones, usuario_id) VALUES (?, ?, ?)';
    db.query(recetaSql, [fecha_emision, observaciones, usuario_id], (err, result) => {
        if (err) {
            console.error('Error al registrar la receta:', err.message);
            return res.status(500).json({ message: 'Error al registrar la receta', error: err });
        }

        const recetaId = result.insertId;  // Obtenemos el ID de la nueva receta

        // Insertar los detalles de la receta en la tabla Detalle_receta
        const detalleSql = 'INSERT INTO Detalle_receta (receta_id, dosis, dias_tratamiento, unidades_medicamento, via_administracion) VALUES (?, ?, ?, ?, ?)';
        db.query(detalleSql, [recetaId, medicamento.dosis, medicamento.dias_tratamiento, medicamento.unidades_medicamento, medicamento.via_administracion], (err, result) => {
            if (err) {
                console.error('Error al registrar el detalle de la receta:', err.message);
                return res.status(500).json({ message: 'Error al registrar el detalle de la receta', error: err });
            }

            const detalleId = result.insertId;  // Este es el ID del detalle de la receta

            // Insertar el medicamento, usando el detalleId como det_rec_id
            const medicamentoSql = 'INSERT INTO Medicamento (nombre_comercial, nombre_generico, det_rec_id) VALUES (?, ?, ?)';
            db.query(medicamentoSql, [medicamento.nombre_comercial, medicamento.nombre_generico, detalleId], (err) => {
                if (err) {
                    console.error('Error al registrar el medicamento:', err.message);
                    return res.status(500).json({ message: 'Error al registrar el medicamento', error: err });
                }

                // Respuesta exitosa si todo ha salido bien
                res.status(201).json({ message: 'Receta registrada con éxito' });
            });
        });
    });
});


//-----------------------------------------
app.delete('/receta/:id_receta', (req, res) => {
    const { id_receta } = req.params;

    const deleteRecetaSql = `DELETE FROM Receta WHERE id_receta = ?`;

    db.query(deleteRecetaSql, [id_receta], (err, result) => {
        if (err) {
            console.error('Error al eliminar la receta:', err.message);
            return res.status(500).json({ message: 'Error al eliminar la receta', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Receta no encontrada' });
        }

        res.status(200).json({ message: 'Receta eliminada con éxito' });
    });
});

///-----------------------------------------------------





// Ruta para obtener las recetas de un usuario
app.get('/recetas/:usuario_id', (req, res) => {
    const { usuario_id } = req.params;

    const recetasSql = `
        SELECT Receta.*, Detalle_receta.*, Medicamento.nombre_comercial AS medicamento_nombre
        FROM Receta
        JOIN Detalle_receta ON Receta.id_receta = Detalle_receta.receta_id
        JOIN Medicamento ON Detalle_receta.id_det_receta = Medicamento.det_rec_id
        WHERE Receta.usuario_id = ?
    `;
    db.query(recetasSql, [usuario_id], (err, results) => {
        if (err) {
            console.error('Error al obtener las recetas:', err.message);
            return res.status(500).json({ message: 'Error al obtener las recetas', error: err });
        }

        res.status(200).json(results);
    });
});


//.-----------------------------------------------------
app.get('/buscar_usuario', async (req, res) => {
    const { id_usuario } = req.query;

    try {
        // Consulta para obtener información básica del usuario
        const usuarioQuery = `
            SELECT u.*, p.telefono, p.direccion 
            FROM Usuario u 
            LEFT JOIN Perfil_user p ON u.id_usuario = p.usuario_id 
            WHERE u.id_usuario = ?
        `;

        // Consulta para obtener recetas del usuario
        const recetasQuery = `
            SELECT r.id_receta, r.fecha_emision, r.observaciones, 
                   d.dosis, d.dias_tratamiento, d.unidades_medicamento, 
                   d.via_administracion, m.nombre_comercial, m.nombre_generico
            FROM Receta r
            JOIN Detalle_receta d ON r.id_receta = d.receta_id
            JOIN Medicamento m ON d.id_det_receta = m.det_rec_id
            WHERE r.usuario_id = ?
        `;

        // Consulta para obtener alergias del usuario
        const alergiasQuery = `
            SELECT tipo_alergia, descripcion 
            FROM Alergia 
            WHERE usuario_id = ?
        `;

        // Ejecutar todas las consultas
        const usuarioResult = await new Promise((resolve, reject) => {
            db.query(usuarioQuery, [id_usuario], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        const recetasResult = await new Promise((resolve, reject) => {
            db.query(recetasQuery, [id_usuario], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        const alergiasResult = await new Promise((resolve, reject) => {
            db.query(alergiasQuery, [id_usuario], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });

        // Validar si se encontró información del usuario
        if (!usuarioResult || usuarioResult.length === 0) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        // Construir la respuesta
        const usuario = usuarioResult[0];
        res.json({
            success: true,
            usuario: {
                ...usuario,
                recetas: recetasResult,
                alergias: alergiasResult,
            },
        });
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
///-----------------
app.get('/busqueda_p.html', (req, res) => {
    const { func_salud } = req.session.usuario; // Suponiendo que el rol está en la sesión
    if (func_salud !== 1) {
        return res.status(403).send('Acceso denegado');
    }
    res.sendFile(path.join(__dirname, 'busqueda_p.html'));
});


// Endpoint para buscar en la API de MedlinePlus
app.get('/api/search', (req, res) => {
    const term = req.query.term;

    if (!term) {
        return res.status(400).json({ error: 'Debe proporcionar un término de búsqueda' });
    }

    const apiUrl = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopicsSpanish&term=${encodeURIComponent(term)}`;

    // Usamos fetch para consultar la API externa
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la respuesta de la API: ${response.status}`);
            }
            return response.text(); // Obtener datos como texto XML
        })
        .then(data => {
            res.send(data); // Enviar la respuesta XML como texto al cliente
        })
        .catch(error => {
            console.error('Error al consultar la API:', error.message);
            res.status(500).json({ error: 'Error al consultar la API de MedlinePlus' });
        });
});

//-----------------------------------------------Recuperar contraseña

// Validar usuario
app.post('/api/validate-user', (req, res) => {
    const { email, phone } = req.body;

    console.log('Correo:', email); // Verifica el valor
    console.log('Teléfono:', phone); // Verifica el valor

    if (!email || !phone) {
        return res.status(400).json({ message: 'Email y teléfono son requeridos' });
    }

    const sql = `
        SELECT u.id_usuario 
        FROM Usuario u 
        JOIN Perfil_user p ON u.id_usuario = p.usuario_id 
        WHERE u.correo_elec = ? AND p.telefono = ?
    `;
    db.query(sql, [email, phone], (err, results) => {
        if (err) {
            console.error('Error en la consulta SQL:', err);
            return res.status(500).json({ message: 'Error en el servidor' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o datos incorrectos' });
        }

        res.status(200).json({ message: 'Usuario validado', userId: results[0].id_usuario });
    });
});



// Actualizar contraseña
app.post('/api/update-password', async (req, res) => {
    const { email, phone, newPassword } = req.body;

    // Generar el hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña en la base de datos usando JOIN
    const sql = `
        UPDATE Usuario u
        JOIN Perfil_user p ON u.id_usuario = p.usuario_id
        SET u.contrasena = ?
        WHERE u.correo_elec = ? AND p.telefono = ?
    `;
    
    db.query(sql, [hashedPassword, email, phone], (err, results) => {
        if (err) {
            console.error('Error al actualizar la contraseña:', err);
            return res.status(500).json({ message: 'Error en el servidor' });
        }
    
        if (results.affectedRows === 0) {
            console.log(`No se encontró ningún usuario con el correo ${email} y teléfono ${phone}`);
            return res.status(404).json({ message: 'Usuario no encontrado o datos incorrectos' });
        }
    
        res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    });
    
});

//Ruta para asignar Roles

app.post('/asignar_rol', (req, res) => {
    const { id_usuario, admin_id } = req.body; // admin_id es el usuario que realiza la solicitud

    if (!id_usuario || !admin_id) {
        return res.status(400).json({ success: false, message: 'IDs no proporcionados.' });
    }

    // Verificar si el usuario que realiza la solicitud es administrador
const checkAdminQuery = 'SELECT administrador FROM Usuario WHERE id_usuario = ?';
db.query(checkAdminQuery, [admin_id], (err, adminResults) => {
    if (err) {
        console.error('Error al verificar administrador:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }

    console.log('Resultado de verificación de administrador:', adminResults);

    if (adminResults.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuario administrador no encontrado.' });
    }

    if (adminResults[0].administrador !== 1) {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
    }

    // Si el usuario es administrador, actualizar func_salud del usuario objetivo
    const updateQuery = 'UPDATE Usuario SET func_salud = 1 WHERE id_usuario = ?';
    db.query(updateQuery, [id_usuario], (err, result) => {
        if (err) {
            console.error('Error al asignar el rol:', err);
            return res.status(500).json({ success: false, message: 'Error al asignar el rol.' });
        }

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Rol asignado exitosamente.' });
        } else {
            res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
    });
});

});





// -------------------------------------------Inicializar el servidor-------------------------------------------
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}/login.html`);
});


