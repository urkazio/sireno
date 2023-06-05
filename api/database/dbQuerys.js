const mysqlConntection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const jwt = require('jsonwebtoken');
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token




function getUser(user, pass, rol, callback) {
  const iterations = 1000;
  const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations });

  mysqlConntection.query(
    'SELECT cod_usuario  FROM usuario WHERE cod_usuario  = ? AND contrasena = ?',
    [user, hash.toString()],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          const userData = {
            usuario: rows[0].usuario,
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



// exportar las funciones definidas en este fichero
module.exports = {
  getUser,
  getRole
};
