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
const http = require("http");
const express = require("express");
const mysql = require("mysql");

const app = express();

//DB接続
//PW変更してね
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: '*********',
    database: "SSS"
});
con.connect((err) => {
    if (err) throw err
    console.log("Connected");
})





//リンク作成
//ホーム画面
app.get("/",(req,res) => {
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


//ショー一覧画面
app.get("/show",(req,res) => {
    res.sendFile(__dirname + "/html/show_list.html");
});
//各ショー画面
con.query('SELECT name FROM entertainment_show',function(error,response){
    console.log(response);
});

//演者一覧画面
app.get("/entertainer",(req,res) => {
    res.sendFile(__dirname + "/html/entertainer_list.html");
});


//ポートを開く
const port = 8080;
app.listen(port);
