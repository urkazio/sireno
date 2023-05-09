const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token
const jwt = require('jsonwebtoken');



// metodo que verifica credenciales llamando a la bbdd
router.post('/signin', (req, res) => {
  console.log(req.body);
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
  const { user, pass } = req.body;

  dbQuery.getRole(user, pass, (err, role) => {
    if (!err) {
      res.json(role);
    } else {
      res.json(err);
    }
  });
});





router.post('/test', (req, res) => {

    if (req.data.rol === '0'){
        return res.status(200).json('Informacion secreta para docente');

    }else if (req.data.rol === '1'){
        return res.status(200).json('Informacion secreta para alumno');

    }else if (req.data.rol === '2'){
        return res.status(200).json('Informacion secreta para admin');

    }
});



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;