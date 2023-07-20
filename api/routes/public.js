const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"



// metodo que verifica si la campaña de una situacion docente es activa
router.post('/isActiva', (req, res) => {
    const { cod_situacion_docente } = req.body;
  
    dbQuery.isActiva(cod_situacion_docente, (err, isActive) => {
      if (!err) {
        res.json(isActive);
      } else {
        res.json(err);
      }
    });
  });
  



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;