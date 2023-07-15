const express = require('express');
const router = express.Router();
const dbQuery = require('../database/dbQuerys'); // Importa el archivo "dbQuery.js"


router.post('/getCampannas', (req, res) => {
  
    dbQuery.getCampannasValidasAdmin((err, campannas) => {
      if (!err) {
        res.json(campannas);
      } else {
        res.json(err);
      }
    });
});
  

// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;