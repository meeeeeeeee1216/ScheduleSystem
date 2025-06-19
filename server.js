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
//メールの自動送信
//https://qiita.com/whopper1962/items/85f11e19cf30ec30ce61
//cookie
//https://qiita.com/whopper1962/items/88c1eb7c3dfeb813ea4d


//モジュール
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require("mysql2");
const path = require("path");
const bodyParser = require("body-parser");

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

module.exports = {mysql,con};

//静的ファイルパス指定
app.use("/public",express.static(path.join(__dirname,"/public")));

//json準備
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//リンク作成
//ホーム画面
app.get('/',(req,res) => {
    console.log("home");
    res.sendFile(__dirname + "/public/html/home.html");
});

//ログイン画面
app.get("/sign-in",(req,res) => {
    res.sendFile(__dirname + "/public/html/signin.html");
});

//ログイン→管理画面へ遷移
app.post("/administrator",function(req,res){
    //console.log(req.body);
    //アカウント照合
    //認証トークン生成
    //Coockieに保存
    module.exports = req.body;
    //表示
    res.sendFile(__dirname + "/public/html/signup-check.html");
});

//管理画面ホーム
app.get("/administrator",(req,res) => {
    //ログイン状態チェック
    //ログアウトなら登録画面へ
    res.sendFile(__dirname + "/public/html/administrator_page.html");
});

//管理アカウント申請
app.get("/sign-up",(req,res) => {
    res.sendFile(__dirname + "/public/html/signup.html");
});

//アカウント申請情報取得
//確認画面に情報を送信
app.post("/sign-up/check",function(req,res){
    //console.log(req.body);
    // // データ処理（例: データを加工）
    // const processedData = {
    //     message: `Data received: ${receivedData.message}`,
    //     receivedAt: new Date()
    // };

    // // JSON形式でレスポンスを返す
    // res.json(processedData);

    //表示
    // res.formData(req.body);
    res.sendFile(__dirname + "/public/html/signup-check.html");
});

//確認画面からDB登録、サーバアカウントに通知送信、authorityが1になったら承認（初期値NULL）
app.post("/sign-up/end",function(req,res){
    console.log(req.body);
    con.query(
        'INSERT INTO account (account_id, PW, SNSid, sns, mail) values (?,?,?,?,?)',
        [req.body.account_id,req.body.PW,req.body.SNS_id,
            req.body.SNS,req.body.mail],(error, res) => {
                //サーバアカウントに申請通知を出す(未実装)
                //通知DBに申請通知を入れて参照させるイメージ？
                //完了画面の表示
                res.sendFile(__dirname + "public/html/signup-end.html");
            }
    )
});


//ショー一覧画面
app.get("/show",(req,res) => {
    res.render(__dirname + "/public/html/list.html",con);
});

//各ショー画面
con.query('select name from entertainment_show;',function(error,response){
    if (error) throw error;
    console.log(response);
    for(let i = 0; i < response.length; i++){
        app.get("/show/" + response[i].name,(req,res) => {
            //URLから名前を拾ってhtmlは動的生成
            res.render(__dirname + "/public/html/show_home.html",con);
        });
    }
});

//演者一覧画面
app.get("/entertainer",(req,res) => {
    res.render(__dirname + "/public/html/list.html",con);
});

//各演者画面
con.query('select name from entertainer;',function(error,response){
    if (error) throw error;
    console.log(response);
    for(let i = 0; i < response.length; i++){
        app.get("/entertainer/" + response[i].name,(req,res) => {
            //URLから名前を拾ってhtmlは動的生成
            res.render(__dirname + "/public/html/entertainer_home.html",con);
        });
    }
});



