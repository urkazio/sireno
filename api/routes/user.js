const express = require('express');
const router = express.Router();

const mysqlConntection = require('../connection/connection'); //importar la conexion a la base de datos

const jwt = require('jsonwebtoken');



router.post('/signin', (req,res)=>{
    const {user, pass} = req.body;

    mysqlConntection.query('select usuario,rol from usuarios where usuario=? and contrasena=?', //utilizar interrogantes para evitar inyeccion (docuemntacion mysql)
    [user, pass],  //reemplazar las interrogantes por sus valores

    (err,rows,fields)=>{
        if (!err){
            if(rows.length>0){
                //si el usuario existe hay que crear el token (para usar en angular)
                let userdata = JSON.stringify(rows[0]); // obetener el string de la respuesta de la peticion
                const token = jwt.sign(userdata, 'secretisimo666'); //jwt.sign(string, secret)
                res.json(token);  // devolver el token como respuesta
            }
            else{
                // si la respuesta es vacia (no existe el usuario)
                res.json('Usuario o clave incorrectos')
            }
        }else{
            console.log(err);
        }
    });
});



router.post('/test',verifyToken, (req,res)=>{ // esta funcion usa el middleware verifyToken()

    if (req.data.rol === 'docente'){
        res.json('Informacion secreta para docente');

    }else if (req.data.rol === 'alumno'){
        res.json('Informacion secreta para alumno');

    }else if (req.data.rol === 'admin'){
        res.json('Informacion secreta para admin');

    }
});



// funcion que verifica si se envia un token junto a la peticion y ademas es válido
function verifyToken(req,res,next){

    if(!req.headers.authorization){
        return res.status(401).json('No autorizado')

    }else{
        // siguiendo la documentacion, el token tiene esta forma --> BEARER fbuweifewfndiweo ...
        // hay que quitar la palabra BEARER y el espacio en blanco
        const token = req.headers.authorization.substring(7);

        if (token==''){
            res.status(401).json('Token vacío');

        }else{
            const content = jwt.verify(token, 'secretisimo666'); //decodifica el token devolviendo los datos originales
            console.log(content);
            req.data = content; // colocar en el cuerpo del mensaje el token decodificado
            next(); //seguir con la ejecucion del metodo llamador
        }
    }

}



// se exporta el ruter del usuario para poder usarlo desde app.js (todas las rutas)
module.exports = router;