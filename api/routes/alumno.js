const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"
const tokenVerifier = require('../../tokenVerifier'); // Importar el middleware verifyToken





// metodo que verifica credenciales llamando a la bbdd
router.post('/getCampannas', (req, res) => {
  const { usuario, rol } = req.body;
  console.log("datos:" +usuario +" "+ rol);


  dbQuery.getCampanasValidasPorUsuario(usuario, (err, campanasValidas) => {
    if (!err) {
      res.json(campanasValidas);
    } else {
      res.json(err);
    }
  });
});



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;