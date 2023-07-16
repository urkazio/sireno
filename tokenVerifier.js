const express = require('express');
const tokenverifier = express();
const config = require('./config');
const jwt = require('jsonwebtoken');
const dbQuery = require('./api/database/dbQuerys'); // Importa el archivo "dbQuery.js"


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
    const token = req.headers.authorization.substring(7);
    const secretKey = config.secretKey;
    const content = jwt.verify(token, secretKey);

    dbQuery.getRole(content["usuario"], (err, role) => {
        if (err) {
        console.error(err);
        return res.status(500).json("Error al obtener el rol del usuario");
        }
        if (role !== "0") {
        return res.status(401).json("No autorizado 2");
        }
        next();
    });
}

function verifyAlumno(req, res, next){
    const token = req.headers.authorization.substring(7);
    const secretKey = config.secretKey;
    const content = jwt.verify(token, secretKey);

    dbQuery.getRole(content["usuario"], (err, role) => {
        if (err) {
        console.error(err);
        return res.status(500).json("Error al obtener el rol del usuario");
        }
        if (role !== "1") {
        return res.status(401).json("No autorizado 2");
        }
        next();
    });
}

function verifyAdmin(req, res, next) {
 
    const token = req.headers.authorization.substring(7);
    const secretKey = config.secretKey;
    const content = jwt.verify(token, secretKey);

    dbQuery.getRole(content["usuario"], (err, role) => {
        if (err) {
        console.error(err);
        return res.status(500).json("Error al obtener el rol del usuario");
        }
        if (role !== "2") {
        return res.status(401).json("No autorizado 2");
        }
        next();
    });
}
  
module.exports = { verifyToken: 
    verifyToken, 
    verifyAlumno,
    verifyDocente,
    verifyAdmin };