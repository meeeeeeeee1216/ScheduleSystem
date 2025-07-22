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
    con.query("select count(*) from account where account_id = ? and PW = ?;",[req.body.account_id,req.body.PW],
    function(error,resp){
        if(error) throw error;
        if(resp == 0){
            //ログイン失敗
            res.writeHead(302, {'Location': 'http://localhost:3000/sign-in'});
        }else{
            //成功
             //認証トークン生成
            //Coockieに保存
            //表示
            con.query("select show_id,show_name,administrator_id from entertainment_show;",function(error, response){
                res.render("list.ejs",{list: response,kind_org:req.originalUrl});
            })
        }
    })
   
});

//管理画面ホーム
app.get("/administrator",(req,res) => {
    //ログイン状態チェック
    //ログアウトならログイン画面へ
    //自分が管理者のショー管理画面
    con.query("select show_id,show_name,administrator_id from entertainment_show;",function(error, response){
        res.render("list.ejs",{list: response,kind_org:req.originalUrl});
    })
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
con.query("select * from entertainment_show;",(e0,show_res)=>{
    if(e0) throw e0;
    show_res.forEach(show => {
        //このショーの役名一覧とシフトを取得
        con.query("select roll_name,roll_id from roll where show_id = ?;" + 
        "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
        from shift join entertainer using(entertainer_id) \
        join roll using(roll_id) \
        join entertainment_show as ES on ES.show_id = shift.show_id \
        join time_table as tt using(tt_id) \
        where shift.show_id = ?;" + 
        "select distinct roll_name,entertainer_name,roll_id,entertainer_id \
        from Shift join roll using(roll_id) join entertainer using(entertainer_id);" + 
        "select * from entertainer"
        ,[show.show_id,show.show_id]
        ,(e1,res2)=>{
            let roll_res = res2[0];
            let shift_res = res2[1];
            let roll_cast_res = res2[2];
            let all_cast_res = res2[3];

            //各ショーホーム画面（シフト表示）
            //shift rolls 辞書のまま
            //フロント側で形式を整えて表示
            app.get("/show/" + show.show_id,(req,res) => {
                res.render("show_home.ejs",{shift_res:shift_res,rolls:roll_res,
                    show_name:show.show_name,show_id:show.show_id});
            });
            
            //報告画面
            app.get("/show/" + show.show_id + "/report",(req,res) => {
                res.render("shift_report.ejs",
                {show_name:show.show_name,show_id:show.show_id,
                    rolls:roll_res,roll_cast:roll_cast_res,all_cast:all_cast_res});
            });

            //報告受け取り
            app.post("/show/" + show.show_id + "/report/end",(req,res) => {
                //報告種別、ショーの日時、手入力欄を削除してreq.bodyにシフト情報だけ残す
                var t = req.body.time;
                var type = req.body.other_type
                var other_content = null;
                if(type != "only_shift"){
                    other_content = req.body.other_content;
                }
                delete req.body.time,req.body.other_type,req.body.other_content

                //DBに登録
                //shift
                var report_id = null;
                //  シフト報告が含まれている報告だけshiftテーブルに登録する
                if(req.body != {}){
                    con.query('insert into report (shift,time_and_day,show_id) value (?,?,?);',
                        [req.body,t,show.show_id],(error,r) => {
                            if (error) throw error;
                    });
                    //登録したレコードのIDを取得
                    con.query('select last_insert_id();',(e,r) => {
                        report_id = r;
                    });
                };
                //notice
                con.query('insert into notice (show_id,type_of_message,content,report_id) value (?,?,?,?);',
                    [show.show_id,type,other_content,r],(e,r) =>{
                        if (e) throw e;
                    }
                );
                res.sendFile(__dirname + "/public/html/shift_report_end.html")
            });

            //各ショーページ管理画面ホーム(表向きには削除はここでできる)
            app.get("/administrator/" + show.show_id,(req,res) => {
                con.query("select N.notice_id,N.type_of_message,N.content,R.time_and_day,R.shift,R.report_id \
                from notice as N join report as R using(report_id) where show_id = ?;",
                [show.show_id],
                (e,r)=>{
                    //報告削除用post
                    app.post("administrator/delete-notice",(req,res2) =>{
                        //req.body.notice_idの報告を削除する
                        if(req.body.report_id != null){
                            con.query("delete from report where report_id = ?",[req.body.report_id]);
                        }
                        con.query("delete from notice where notice_id = ?",[req.body.notice_id]);
                        

                        //ショー管理ページにリダイレクトする
                        res2.writeHead(302, {'Location': 'http://localhost:3000/administrator/' + req.body.show_id});

                    });

                    //報告詳細（承認・編集）
                    r.forEach(noti => {
                        if(noti.report_id != null){
                            noti.shift = JSON.parse(noti.shift);

                            //詳細表示ボタンを押した遷移先
                            app.get("/administrator/" + show.show_id + "/" + noti.report_id,(req,res2) =>{
                                res2.render("shift_report_edit.ejs",
                                    {show_id:show.show_id,rolls:roll_res,roll_cast:roll_cast_res
                                        ,shift:noti.shift,td:noti.time_and_day,report_id:noti.report_id});
                            });

                            app.post("/administrator/" + show.show_id + "/" + noti.report_id,(req,res2) => {
                                //報告編集確定・公開
                                if(req.body["check-confirm"] == True){
                                    //シフト内容DBへ登録
                                    //報告をDBから削除
                                    //公開画面へ遷移
                                }else{
                                    //未登録キャスト登録
                                    roll.forEach(roll => {
                                        //チェックボックスがチェックされてたらtrueになる
                                        if(req.body["edit-check" + roll.roll_id] == true){
                                            //キャストをテーブルに登録
                                            con.query("insert into entertainer (entertainer_name) value (?)"
                                                ,[req.body["debut_new" + roll.roll_id]],
                                            (e,i) =>{if(e) throw e;});
                                            con.query("select last_insert_id()",(e,new_ent_id) =>{
                                                noti.shift[roll.roll_id] = new_ent_id;
                                            });
                                        }
                                    })
                                    res2.render("shift_report_edit.ejs",
                                        {show_id:show.show_id,rolls:roll_res,roll_cast:roll_cast_res
                                            ,report_id:noti.report_id
                                            ,shift:noti.shift,td:noti.time_and_day});
                                    
                                }
                            });
                        }
                    });

                    res.render("show_administrator.ejs"
                    ,{show_name:show.show_name,show_id:show.show_id,
                        notices:r});
                    });
            });


            //報告フォームの編集（ポジション追加）
            app.get("administrator/" + show.show_id + "/form-edit",(req,res) =>{
                res.render("shift_report_form_edit.ejs",{
                    show_id:show.show_id, rolls:roll_res, 
                    roll_cast: roll_cast_res,all_cast:all_cast_res});
                });
            });

            app.post("admimnistrator/"+ show.show_id + "/form-edit",(req,res) => {
                //リクエストをDBに登録
                let cast_id = null;
                let roll_id = null;
                //新ポジション
                if(req.body.type == "new-roll"){
                    con.query("insert into roll (roll_name,show_id) value (?,?)"
                        ,[req.body["text_position_name"],show.show_id]);
                    
                    //個々の判定inかundefinedかどっちだろう
                    if(req.body in "new_roll_text_entertainer_name"){
                        con.query("insert into entertainer entertainer_name value ?;",[req.body["new_roll_text_entertainer_name"]],(e,r));
                    }
                }else{
                    //デビュー
                    con.query("insert into roll (roll_name,show_id) value (?,?)"
                        ,[req.body["text_position_name"],show.show_id]);
                }
                
                    con.query("select tt_id from Time_table where day_and_time = ?",[req.body.time],(e,r) => {
                        con.query("insert into shift (tt_id,roll_id,entertainer_id,show_id) value (?,?,?,?)",
                            [r,])
                    })
                //再表示して反映
            });

            //新人キャスト登録
            function insert_entertainer(name){
                con.query("insert into entertainer entertainer_name value ?;",[name],(e,r) => {
                    if(e) throw e;
                    return con.query("select last_insert_id();")
                });
            };


    });
});


//これ、作り直しで…
// con.query("select roll_name,show_id,roll_id from roll;" + 
//     "select show_name,show_id from entertainment_show;" + 
//     "select  tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name,ES.show_id,tt.irregular_id,\
//     from shift join entertainer using(entertainer_id) \
//     join roll using(roll_id) \
//     join entertainment_show as ES on ES.show_id = shift.show_id \
//     join time_table as tt using(tt_id) \
//     join irregular using(irregular_id);" + 
//     "select distinct roll_name,entertainer_name,roll_id,entertainer_id from Shift join roll using(roll_id) join entertainer using(entertainer_id);",
//     function(error,response){
//     //イレギュラーを直接TTテーブルに書きこんで備考出力できるようにしたいのでDBをつくりかえてください
//     if (error) throw error;
//     for(let i = 0; i < response[1].length; i++){
//         var rolls = [];
//         var shift = {};
//         app.get("/show/" + response[1][i].show_id,(req,res) => {
//             //このショーの役名を一覧にする
//             for(var t = 0 ; t < response[0].length; t ++){
//                 if (response[0][t].show_id == response[1][i].show_id){
//                     rolls.push(response[0][t]);
//                     //shift[response[0][t].roll_name] = [];
//                 }
//             }
//             //シフトもこのショーだけにする
//             for(var t=0; t<response[2].length; t++){
//                 if(response[2][t].show_id == response[1][i].show_id){
//                     //日時をカギにして登録したい
//                     if(response[2][t].day_and_time in shift){
//                     }else{
//                         shift[response[2][t].day_and_time] = {};
//                     }
//                     //その中にさらに役名を鍵にして役者名を登録
//                     shift[response[2][t].day_time][response[2][t].roll_name] = response[2][t].entertainer_name;
//                 }
//             }
            
//             //報告ページ
//             app.get("/show/" + response[1][i].show_id + "/report",(req,res) => {
//                 res.render("show_report.ejs",{rolls:rolls,roll_cast:response[3], show_name:response[1][i].show_name,
//                     show_id:response[1][i].show_id
//                 });
//             });

//             //報告受け取り
//             app.post("/show/" + response[1][i].show_id + "/report/end",(req,res) => {
//                 var t = req.body.time;
//                 var type = req.body.other_type
//                 var other_content = null;
//                 if(type != "only_shift"){
//                     other_content = req.body.other_content;
//                 }
//                 delete req.body.time,req.body.other_type,req.body.other_content

//                 //シフト報告が含まれる
//                 var report_id = null;
//                 if(req.body != {}){
//                     con.query('insert into report (shift,time_and_day,show_id) value (?,?,?);',
//                         [req.body,t,response[1][i].show_id],(error,res) => {
//                             if (error) throw error;
//                         })
//                     con.query('select last_insert_id();',(e,r) => {
//                         report_id = r;
//                     })
//                 }
//                 con.query('insert into notice (show_id,type_of_message,content,report_id) value (?,?,?,?);',
//                     [response[1][i].show_id,type,other_content,r],(e,r) =>{
//                         if (e) throw e;
//                     }
//                 )

//                 // //時間を登録する(登録済みをまだはじけてない)
//                 // con.query('insert into Time_table day_and_time values ?',req.body.time ,(error, res) => {})
//                 // con.query('select tt_id from Time_table where day_and_time = ?' ,req.body.time,(error, res) => {tt_id = res[0].tt_id})
//                 // delete req.body.time
//                 // //手入力フォーム
//                 // con.query("insert into notice (show_id,type_of_message,content) value ( ?,?,?)",
//                 //     (response[1][i].show_id,req.body.other_type,req.body.other));
//                 // delete req.body.other_type,req.body.other
                
//                 // //シフト情報以外削除できてる状態
//                 // for(var key in req.body){
//                 //     con.query(
//                 //         'INSERT INTO shift (tt_id,roll_id, show_id, entertainer_id) values (?,?,?,?)',
//                 //         [tt_id,key,response[1][i].show_id,req.body[key]]
//                 //             ,(error, res) => {
//                 //                 console.log("DB insert success")
//                 //             }
//                 //     )
//                 // }
//             });

//             //URLから名前を拾ってhtmlは動的生成
//             res.render("show_home.ejs",{shift:shift,show_name:response[1][i].show_name,
//                 show_id:response[1][i].show_id,rolls:rolls,shift:shift});
            
//         });
//         //管理用ページ
//         app.get("/administrator/" + response[1][i].show_id,(req,res) => {
//             //シフト報告データの取得
//             con.query("select N.type_of_message,N.content,R.time_and_day,R.shift,R.report_id \
//                  from notice as N join report as R using(report_id) where show_id = ?;",
//                 [response[1][i].show_id],
//                 (e,r)=>{
//                     res.render("show_administrator.ejs"
//                     ,{show_name:response[1][i].show_name,show_id:response[1][i].show_id,
//                         notices:r});
//                     });
//         });

//         //報告承認用(id部分書き換えてね)
//         app.post("/administrator/" + response[1][i].show_id + "/" + "report_id",(req,res) => {
//             res.render("report_shift_ditail.ejs",{});
//         });

//     };
// });

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




