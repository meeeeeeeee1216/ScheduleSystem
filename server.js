//サーバー構築
// https://qiita.com/elu_jaune/items/eb354558d0dc39add152
//ページ遷移
//https://qiita.com/watsony/items/a6790d932d2f59589965
//Express
//https://qiita.com/nkjm/items/723990c518acfee6e473
//Express でHTMLを開く
//https://www.i-ryo.com/entry/2020/04/16/215205
//status code
//https://qiita.com/syumiwohossu/items/ead2726731b9016edc87
//getについて
//https://qiita.com/syumiwohossu/items/f9ee317f31adc3ad387b
//mysql
//https://www.sejuku.net/blog/74849


//モジュール
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require("mysql2");
const path = require("path");

//ポートを開く
app.listen(PORT, () => {
    console.log("connect");
});

//DB接続
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS"
});

//リンク作成
//ホーム画面
app.get('/',(req,res) => {
    console.log("home");
    res.sendFile(__dirname + "/html/home.html");
});

//ログイン画面
app.get("/sign-in",(req,res) => {
    res.sendFile(__dirname + "/html/signin.html");
});

//管理画面ホーム
app.get("/administrator",(req,res) => {
    res.sendFile(__dirname + "/html/administrator_page.html");
});

//管理アカウント申請
app.get("/sign-up",(req,res) => {
    res.sendFile(__dirname + "/html/signup.html");
});
app.get("/sign-up/check",(req,res) => {
    res.sendFile(__dirname + "/html/signup-check.html");
});
app.get("/sign-up/end",(req,res) => {
    res.sendFile(__dirname + "/html/signup-end.html");
});


//ショー一覧画面
app.get("/show",(req,res) => {
    res.sendFile(__dirname + "/html/list.html");
});

//各ショー画面
con.query('select name from entertainment_show;',function(error,response){
    if (error) throw error;
    console.log(response);
    for(let i = 0; i < response.length; i++){
        app.get("/show/" + response[i].name,(req,res) => {
            res.sendFile(__dirname + "/html/show_home.html");
        });
    }
});

//演者一覧画面
app.get("/entertainer",(req,res) => {
    res.sendFile(__dirname + "/html/list.html");
});

//各演者画面
con.query('select name from entertainer;',function(error,response){
    if (error) throw error;
    console.log(response);
    for(let i = 0; i < response.length; i++){
        app.get("/entertainer/" + response[i].name,(req,res) => {
            res.sendFile(__dirname + "/html/entertainer_home.html");
        });
    }
});



