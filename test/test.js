//モジュール
const express = require("express");
const app = express();
const PORT = 3030;
const mysql = require("mysql2/promise");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
app.set('view engine','ejs')

//ポートを開く
app.listen(PORT, () => {
    //console.log("connect");
});

app.use(bodyParser.json());

//DB接続
const con = mysql.createPool({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS",
    connectionLimit: 2,
    namedPlaceholders: true
    //multipleStatements:true
});

con.query("SET NAMES 'utf8mb4';");

app.get("/",(req,res) => {
    res.sendFile(__dirname + "/html/test.html");
});

app.post("/",(req,res) => {
    console.log(req.body);
})


//できる！
// con.query("select * from account;",(e,ac) => {
//     if(e) throw e;
//     //console.log(ac)
//     con.query("select * from entertainment_show where administrator_id = ?;"
//         ,[ac[1].account_id],(e,ac2) =>{
//         console.log(ac2);
//     });
    
// });



// "select roll_name,roll_id from roll where show_id = ?;"
//"select roll_name,roll_id from roll where show_id = ?;" + 
    // "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
    // from shift join entertainer using(entertainer_id) \
    // join roll using(roll_id) \
    // join entertainment_show as ES on ES.show_id = shift.show_id \
    // join time_table as tt using(tt_id) \
    // where shift.show_id = ?;" + 
    // "select distinct roll_name,entertainer_name,roll_id,entertainer_id \
    // from Shift join roll using(roll_id) join entertainer using(entertainer_id);" + 
    // "select * from entertainer;"
// con.query("select roll_name,roll_id from roll where show_id = ?;" + 
//     "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
//     from shift join entertainer using(entertainer_id) \
//     join roll using(roll_id) \
//     join entertainment_show as ES on ES.show_id = shift.show_id \
//     join time_table as tt using(tt_id) \
//     where shift.show_id = ?;" + 
//     "select distinct roll_name,entertainer_name,roll_id,entertainer_id \
//     from Shift join roll using(roll_id) join entertainer using(entertainer_id);" + 
//     "select * from entertainer;"
//         ,[1,1]
//         ,(e1,res2)=>{console.log(res2)});



// app.get("/test",(req,res) => {
//     let test = async() => {
//         let [rows] = await con.query("select * from roll where show_id = :id;" 
//             + "select * from shift where show_id = :id"
//             ,{id: 1})
//         res.json(rows);
//     }
//     test();
// })
// con.query("select roll_name,roll_id from roll where show_id = ?;" + 
//         "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
//         from shift join entertainer using(entertainer_id) \
//         join roll using(roll_id) \
//         join entertainment_show as ES on ES.show_id = shift.show_id \
//         join time_table as tt using(tt_id) \
//         where shift.show_id = ?;"
//         ,[1,1],(e,res)=>{
//             console.log(res)
//         })

// con.query("select N.notice_id,N.type_of_message,N.content,R.time_and_day,R.shift,R.report_id \
//                 from notice as N join report as R using(report_id) where show_id = ?;",
//                 [show.show_id],
//                 (e,r)=>{

// })


let update = async(ac) => {
    console.log(ac.pw)
    let new_pw = await bcrypt.hash(ac.pw, 12);
    console.log(new_pw)
    console.log("a")
    //autority:2 -> 管理アカウント, authority:1 -> サーバーアカウント
    await con.query("update account set pw = :pw where account_id = :id;",
        {id:ac.account_id,pw:new_pw}
    )
}

let test = async() => {
    let [res] = await con.query("select * from account;");
    
    res.forEach(ac => {
        if(ac.account_id != "test"){
            update(ac)
        }
    })

}

test();
