//モジュール
const mysql = require("mysql2");

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS"
});

const kind_org = location.pathname;
var kind = "";
var sql = "";
if (kind_org === "/show"){
    kind = "show";
}else{
    kind = "entertainer"
}

const title = document.getElementByID("sub-tite");
if(kind === "show"){
    title.textContext = "ショー一覧"
    sql = "entertainment_show";
}else{
    title.textContext = "キャスト一覧";
    sql = "entertainer"    
}

con.query('select name from ' + sql + ';',function(error,response){
    if (error) throw error;
    const li = document.getElementByID("list");
    const ul = [];
    const a = [];

    for(let i = 0; i < response.length; i++){
        ul[i] = document.createElement("li");
        a[i] = document.createElement("a");
        a.href = "http://localhost:3000/${kind}" + response[i].name;
        ul[i].appendChild(a[i]);
        li.appendChild(ul[i]);
    }
});