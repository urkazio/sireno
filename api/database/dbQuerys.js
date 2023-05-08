const mysqlConntection = require('./connection'); // Importa tu archivo de conexión a MySQL
const CryptoJS = require("crypto-js");
const jwt = require('jsonwebtoken');
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token




function getUser(user, pass, callback) {
  const iterations = 1000;
  const hash = CryptoJS.PBKDF2(pass, config.saltHash, { keySize: 256/32, iterations });

  mysqlConntection.query(
    'SELECT usuario, rol FROM usuarios WHERE usuario = ? AND contrasena = ?',
    [user, hash.toString()],
    (err, rows, fields) => {
      if (!err) {
        if (rows.length > 0) {
          let userdata = JSON.stringify(rows[0]);
          const secretKey = config.secretKey;
          const token = jwt.sign(userdata, secretKey);
          callback(null, token);
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
  getUser
};
