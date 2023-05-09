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
//app.use('/user', tokenVerifier.verifyToken, userRoute);
app.use('/user', userRoute);


module.exports = app;