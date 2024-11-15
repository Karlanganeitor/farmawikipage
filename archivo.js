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
            id_usuario: usuario.id_usuario // Asegurarse de devolver el id_usuario
        });
    });
});

// -------------------------------------------Ruta para registrar un nuevo usuario-------------------------------------------
app.post('/registro', async (req, res) => {
    const { nombre_usuario, correo_elec, contrasena } = req.body;

    // Verificar que los campos necesarios están presentes
    if (!nombre_usuario || !correo_elec || !contrasena) {
        return res.status(400).json({ message: 'Faltan datos: nombre_usuario, correo_elec y contrasena son requeridos' });
    }

    try {
        // Hashear la contraseña antes de almacenarla
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

                const id_usuario = result.insertId; // Obtener el id del usuario recién insertado

                // Crear un perfil para el usuario
                const perfilSql = 'INSERT INTO Perfil_user (usuario_id) VALUES (?)';
                db.query(perfilSql, [id_usuario], (err, result) => {
                    if (err) {
                        console.error('Error al crear el perfil:', err);
                        return res.status(500).send('Error al crear el perfil');
                    }

                    // Insertar una alergia predeterminada para el usuario
                    const alergiaSql = 'INSERT INTO Alergia (tipo_alergia, descripcion, usuario_id) VALUES (?, ?, ?)';
                    db.query(alergiaSql, ['  ', ' ', id_usuario], (err, result) => {
                        if (err) {
                            console.error('Error al registrar la alergia:', err);
                            return res.status(500).send('Error al registrar la alergia');
                        }

                        // Todo fue exitoso, responder al cliente
                        res.status(201).json({ message: 'Usuario registrado, perfil y alergia predeterminada creados exitosamente' });
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



// -------------------------------------------Inicializar el servidor-------------------------------------------
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}/login.html`);
});
