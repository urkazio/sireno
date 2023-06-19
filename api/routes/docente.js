const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const config = require('../../config'); // importar el fichero que contiene la clave secreta para el token
const jwt = require('jsonwebtoken');



// metodo que verifica credenciales llamando a la bbdd
router.post('/getCampannas', (req, res) => {
  const { usuario } = req.body;

  dbQuery.getCampannasValidasDocente(usuario, (err, campannas) => {
    if (!err) {
      res.json(campannas);
    } else {
      res.json(err);
    }
  });
});




// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;