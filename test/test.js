//モジュール
const express = require("express");
const app = express();
const PORT = 3030;
const mysql = require("mysql2");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const ejs = require("ejs");
app.set('view engine','ejs')

//ポートを開く
// app.listen(PORT, () => {
//     //console.log("connect");
// });

//DB接続
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS",
    multipleStatements:true
});

con.query("SET NAMES 'utf8mb4';");


//できる！
con.query("select * from account;",(e,ac) => {
    if(e) throw e;
    //console.log(ac)
    con.query("select * from entertainment_show where administrator_id = ?;"
        ,[ac[1].account_id],(e,ac2) =>{
        console.log(ac2);
    });
    
});



// "select roll_name,roll_id from roll where show_id = ?;"

con.query("select roll_name,roll_id from roll where show_id = ?;" + 
        "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
        from shift join entertainer using(entertainer_id) \
        join roll using(roll_id) \
        join entertainment_show as ES on ES.show_id = shift.show_id \
        join time_table as tt using(tt_id) \
        where shift.show_id = ?;"
        ,[1,1],(e,res)=>{
            console.log(res)
        })
