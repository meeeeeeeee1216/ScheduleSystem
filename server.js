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
const fs = require("fs");
const ejs = require("ejs");
app.set('view engine','ejs')

//ポートを開く
app.listen(PORT, () => {
    console.log("connect");
});

//DB接続
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS",
    multipleStatements:true
});

con.query("SET NAMES 'utf8mb4';");


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
    res.sendFile(__dirname + "/public/html/home.html");
});

//ログイン画面
app.get("/sign-in",(req,res) => {
    res.sendFile(__dirname + "/public/html/signin.html");
});

//ログイン→管理画面へ遷移
app.post("/administrator",function(req,res){
    //  log(req.body);
    //アカウント照合
    //認証トークン生成
    //Coockieに保存
    //表示
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
    var form = req.body;
    res.render("signup-check.ejs", form);
});

//確認画面からDB登録、サーバアカウントに通知送信、authorityが1になったら承認（初期値NULL）
app.post("/sign-up/end",function(req,res){
    //insertなぜかできない？cmdから見るとデータ入ってないけど、成功ログは出てる
    con.query(
        'INSERT INTO account (account_id, PW, SNSid, sns, mail) values (?,?,?,?,?)',
        [req.body.account_id,req.body.PW,req.body.SNS_id,
            req.body.SNS,req.body.mail],(error, res) => {
                console.log("DB insert success")
            }
    )
    //サーバアカウントに申請通知を出す(未実装)
    //通知DBに申請通知を入れて参照させるイメージ？
    //完了画面の表示
    res.sendFile(__dirname + "/public/html/signup-end.html");
});


//ショー一覧画面
app.get("/show",(req,res) => {
    con.query("select show_id,show_name from entertainment_show;",function(error, response){
        res.render("list.ejs",{list: response,kind_org:req.originalUrl});
    })
});

//各ショー画面
//役名一覧とショー一覧を同時に取得、後からそのショーの役名一覧を作ってフロントに送る
con.query("select roll_name,show_id from roll;" + 
    "select show_name,show_id from entertainment_show;" + 
    "select  tt.d,tt.t,roll.roll_name,entertainer.entertainer_name,ES.show_name,ES.show_id\
    from shift join entertainer using(entertainer_id) \
    join roll using(roll_id) \
    join entertainment_show as ES on ES.show_id = shift.show_id \
    join time_table as tt using(tt_id);" + 
    "select distinct roll_name,entertainer_name from Shift join roll using(roll_id) join entertainer using(entertainer_id);",
    function(error,response){
    if (error) throw error;
    console.log(response);
    for(let i = 0; i < response[1].length; i++){
        var rolls = [];
        var shift = {};
        app.get("/show/" + response[1][i].show_id,(req,res) => {


            //このショーの役名を一覧にする
            for(var t = 0 ; t < response[0].length; t ++){
                if (response[0][t].show_id == response[1][i].show_id){
                    rolls.push(response[0][t].roll_name);
                    shift[response[0][t].roll_name] = [];
                }
            }
            //シフトもこのショーだけにする
            for(var t=0; t<response[2].length; t++){
                if(response[2][t].show_id == response[1][i].show_id){
                    shift[response[2][t].roll_name].push(response[2][t]);
                }
            }
            
            //報告ページ
            app.get("/show/" + response[1][i].show_id + "/report",(req,res) => {
                res.render("show_report.ejs",{rolls:rolls,roll_cast:response[3], show_name:response[1][i].show_name,
                    show_id:response[1][i].show_id
                });
            });

            //報告受け取り
            app.post("/show/" + response[1][i].show_id + "/report/end",(req,res) => {
                //時間を登録する(登録済みをまだはじけてない)
                con.query('insert into Time_table day_and_time values ?',req.body.time ,(error, res) => {})
                con.query('select tt_id from Time_table where day_and_time = ?' ,req.body.time,(error, res) => {tt_id = res[0].tt_id})
                delete req.body.time
                //手入力フォーム
                con.query("")
                //役のid持ってくる
                req.body.
                con.query(
                    'INSERT INTO account (tt_id,roll_id, show_id, entertainer_id) values (?,?,?,?)',
                    [tt_id,roll_id,response[1][i].show_id,entertainer_id]
                        ,(error, res) => {
                            console.log("DB insert success")
                        }
                )
            });

            //URLから名前を拾ってhtmlは動的生成
            //役で区分けじゃなくて日付で分けると簡略化できそうだよ～～～～～
            res.render("show_home.ejs",{shift:shift,show_name:response[1][i].show_name,
                show_id:response[1][i].show_id,rolls:rolls});
            
        });
    }
});

//演者一覧画面
app.get("/entertainer",(req,res) => {
    con.query("select entertainer_id,entertainer_name from entertainer;",function(error, response){
        res.render("list.ejs",{list: response,kind_org:req.originalUrl});
    })
});

//各演者画面
con.query('select entertainer_id ,entertainer_name from entertainer;',function(error,response){
    if (error) throw error;
    for(let i = 0; i < response.length; i++){
        app.get("/entertainer/" + response[i].entertainer_id,(req,res) => {
            //URLから名前を拾ってhtmlは動的生成
            res.render("entertainer_home.ejs",{con:con,name:response[i].entertainer_name});
        });
    }
});



