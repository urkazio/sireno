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
            req.body = Object.assign({}, req.body, content); // concatenar en el cuerpo del mensaje el token decodificado
            next(); //seguir con la ejecucion del metodo llamador
        }
    }

}


function verifyDocente(req, res, next){
    const { rol } = req.body;

    if (rol !== "0") {
        return res.status(401).json('No autorizado 0')
    }
    console.log("es docente");
    next();
}

function verifyAlumno(req, res, next){
    const { rol } = req.body;

    if (rol !== "1") {
        return res.status(401).json('No autorizado 1')
    }
    console.log("es alumno");
    next();
}

function verifyAdmin(req, res, next){
    const { rol } = req.body;

    if (rol !== "2") {
        return res.status(401).json('No autorizado 2')
    }
    console.log("es admin");
    next();
}

module.exports = { verifyToken: 
    verifyToken, 
    verifyAlumno,
    verifyDocente,
    verifyAdmin };