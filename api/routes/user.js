const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token
const jwt = require('jsonwebtoken');



// metodo que verifica credenciales llamando a la bbdd
router.post('/signin', (req, res) => {
  const { user, pass, rol } = req.body;

  dbQuery.getUser(user, pass, rol, (err, userData) => {
    if (!err) {
      const secretKey = config.secretKey;
      const token = jwt.sign(userData, secretKey);
      res.json(token);
    } else {
      res.json(err);
    }
  });
});

router.post('/getrole', (req, res) => {
  //const { user, pass } = req.body;
  const { user } = req.body;

  dbQuery.getRole(user, (err, role) => {
    if (!err) {
      res.json(role);
    } else {
      res.json(err);
    }
  });
});



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;