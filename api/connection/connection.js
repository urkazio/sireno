const mysql = require('mysql');

const mysqlConntection = mysql.createConnection({
    host:'localhost',
    user: 'root',
    password: '',
    database: 'sireno',
    port: '3306'
});

mysqlConntection.connect( err =>{
    if (err){
        console.log('Error en bd : ', err);
        return;
    }else{
        console.log('Database connected');
    }
});

module.exports = mysqlConntection;