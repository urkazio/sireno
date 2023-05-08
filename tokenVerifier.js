const express = require('express');
const tokenverifier = express();
const config = require('./config');
const jwt = require('jsonwebtoken');


function verifyToken(req, res, next) {

    if(!req.headers.authorization){
        return res.status(401).json('No autorizado')

    }else{
        // siguiendo la documentacion, el token tiene esta forma --> BEARER fbuweifewfndiweo ...
        // hay que quitar la palabra BEARER y el espacio en blanco
        const token = req.headers.authorization.substring(7);

        if (token==''){
            res.status(401).json('Token vacío');

        }else{
            const secretKey = config.secretKey;
            const content = jwt.verify(token, secretKey); //decodifica el token devolviendo los datos originales
            console.log(content);
            req.data = content; // colocar en el cuerpo del mensaje el token decodificado
            next(); //seguir con la ejecucion del metodo llamador
        }
    }

}

module.exports = { verifyToken: verifyToken };