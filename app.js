const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const tokenVerifier = require('./tokenVerifier'); // Importar el middleware verifyToken


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());



// RUTAS

const userRoute = require('./api/routes/user');
const alumRoute = require('./api/routes/alumno');
const docenteRoute = require('./api/routes/docente');
const adminRoute = require('./api/routes/admin');


app.use('/user', userRoute);
app.use('/alumno', tokenVerifier.verifyToken, tokenVerifier.verifyAlumno, alumRoute);
app.use('/docente', tokenVerifier.verifyToken, tokenVerifier.verifyDocente, docenteRoute);
app.use('/admin', tokenVerifier.verifyToken, tokenVerifier.verifyAdmin, adminRoute);





module.exports = app;