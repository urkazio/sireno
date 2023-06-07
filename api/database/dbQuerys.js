const mysqlConntection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token




function getUser(user, pass, rol, callback) {
  const iterations = 1000;
  const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations });

  mysqlConntection.query(
    'SELECT cod_usuario FROM usuario WHERE cod_usuario  = ? AND contrasena = ?',
    [user, hash.toString()],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const userData = {
            usuario: rows[0].cod_usuario,
            rol: rol
          };
          callback(null, userData);
        } else {
          callback('Usuario o clave incorrectos');
        }
      } else {
        callback(err);
      }
    }
  );
}

function getRole(user, callback) {

  mysqlConntection.query(
    'SELECT rol FROM usuario WHERE cod_usuario  = ?',
    [user],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const role = rows[0].rol;
          callback(null, role);
        } else {
          callback('Usuario o clave incorrectos');
        }
      } else {
        callback(err);
      }
    }
  );
}

function getCampanasValidasPorUsuario(usuario, callback) {
  const query = `
    SELECT c.cod_campana, c.nombre, c.fecha_fin, c.abierta_antes, c.cod_encuesta,
           sd.cod_situacion_docente, sd.cod_asignatura, a.nombre_asignatura, sd.cod_docente, d.nombre_docente,
           sd.num_curso, sd.año_curso, ac.fecha_hora_cierre
    FROM campana AS c
    JOIN situacion_docente AS sd ON c.cod_campana = sd.cod_campana
    JOIN alumno_situacion_doc AS asd ON sd.cod_situacion_docente = asd.cod_situacion_docente
    JOIN asignatura AS a ON sd.cod_asignatura = a.cod_asignatura
    JOIN docente AS d ON sd.cod_docente = d.cod_docente
    LEFT JOIN activacion_campana AS ac ON sd.cod_situacion_docente = ac.cod_situacion_docente
    WHERE asd.cod_alumno = ?
    AND c.fecha_ini <= NOW()
    AND (c.abierta_antes = 0 AND c.fecha_fin >= NOW() OR c.abierta_antes = 1 AND ac.fecha_hora_cierre >= NOW())
  `;

  mysqlConntection.query(query, [usuario], (err, rows, fields) => {
    if (!err) {
      const campanasValidas = rows.map((row) => {
        return {
          cod_campana: row.cod_campana,
          nombre_campana: row.nombre,
          fecha_fin: row.fecha_fin,
          abierta_antes: row.abierta_antes,
          cod_encuesta: row.cod_encuesta,
          cod_situacion_docente: row.cod_situacion_docente,
          cod_asignatura: row.cod_asignatura,
          nombre_asignatura: row.nombre_asignatura,
          cod_docente: row.cod_docente,
          nombre_docente: row.nombre_docente,
          num_curso: row.num_curso,
          año_curso: row.año_curso,
          fecha_fin_activacion: row.fecha_hora_cierre
        };
      });
      
      callback(null, campanasValidas);
    } else {
      callback(err);
    }
  });
}






// exportar las funciones definidas en este fichero
module.exports = {
  getUser,
  getRole,
  getCampanasValidasPorUsuario
};
