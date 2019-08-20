let express = require('express');
let mysql = require('mysql');

const app = express();
//PORT
const port = process.env.PORT || 7000;

let connect = mysql.createConnection({
    host:"sql260.main-hosting.eu",
    user:"u788090918_admin",
    password:"Abc123456",
    database:"u788090918_tjomb"
});

/*
connect.connect(function(error){
    if(!!error){
        console.log('Error');
    }else{
        console.log('Connected');
    }
});
*/

app.get('/',(req,res)=>{
    connect.query("SELECT * FROM transaction_ledger",(err,rows,fields)=>{
        if(!!err){
            console.log('error in the query');
        }else{
            console.log('successful query');
            console.log(rows);
            res.json(rows);
        }
    }); 
});


app.listen(port, () => console.log(`Listening at port ${port}`));