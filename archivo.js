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
    
    const sql = 'SELECT * FROM Perfil_user WHERE usuario_id = ?';
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

// -------------------------------------------Ruta para actualizar los datos del perfil-------------------------------------------
app.put('/perfil/:id_usuario', (req, res) => {
    const id_usuario = req.params.id_usuario;
    const { n_doc_identificacion, telefono, fecha_nac, direccion, region, comuna } = req.body;

    // Validación de los datos (si es necesario)
    if (!n_doc_identificacion || !telefono || !fecha_nac || !direccion || !region || !comuna) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Construir la consulta de actualización
    const sql = `UPDATE Perfil_user SET 
                    n_doc_identificacion = ?, 
                    telefono = ?, 
                    fecha_nac = ?, 
                    direccion = ?, 
                    region = ?, 
                    comuna = ? 
                 WHERE usuario_id = ?`;

    // Ejecutar la consulta
    db.query(sql, [n_doc_identificacion, telefono, fecha_nac, direccion, region, comuna, id_usuario], (err, results) => {
        if (err) {
            console.error('Error al actualizar el perfil:', err);
            return res.status(500).json({ message: 'Error en la base de datos' });
        }

        if (results.affectedRows === 0) {
            // Si no se actualizó ningún registro, eso puede indicar que el usuario no existe o que no hay cambios
            return res.status(404).json({ message: 'Perfil no encontrado o no se realizaron cambios' });
        }

        res.status(200).json({ message: 'Perfil actualizado correctamente' });
    });
});


//


// -------------------------------------------Iniciar el servidor-------------------------------------------
app.listen(3000, () => {
    console.log('Servidor Node.js corriendo en http://localhost:3000/login.html'); //el servidor esta corriendo en localhost:3000 pero le agregue el logint.html para que en la terminal me redirija automáticamente a la página login
});
