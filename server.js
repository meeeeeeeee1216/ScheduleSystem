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

//promise
//https://qiita.com/tatsumi44/items/4b0fe912a49025591945
//await(非同期処理)
//https://qiita.com/yunity29/items/7ccc84d47e139340ecbc

//https://sidorares.github.io/node-mysql2/docs#array-results
///https://qiita.com/tatsumi44/items/4b0fe912a49025591945
//https://qiita.com/miyabisun/items/3a139f8f48aa34f6d566

//insertとかdeleteの後にはcommitをしろ
//結果を代入するためにpromiseをつかえ
//awaitはマルチスレッド


//モジュール
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require("mysql2/promise");
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

const con = mysql.createPool({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS",
    connectionLimit: 5
    //namedPlaceholders: true,
    //multipleStatements:true
});

con.query("SET NAMES 'utf8mb4';");


//静的ファイルパス指定
app.use("/public",express.static(path.join(__dirname,"/public")));

//json準備
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


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
    try{
        let [db_res] = await con.query("select count(*) from account where account_id = ? and PW = ?;",[req.body.account_id,req.body.PW]);
    } catch (err) {
        throw err;
    }

    if(db_res == 0){
        //ログイン失敗
        res.writeHead(302, {'Location': 'http://localhost:3000/sign-in'});
    }else{
        //成功
        //認証トークン生成
        //Coockieに保存
        //表示
        try{ 
            db_res = await con.query(
                "select show_id,show_name,administrator_id from entertainment_show where administrator_id = :ad_id;"
                ,{ad_id:req.body.account_id});
            res.render("list.ejs",{list:db_res,kind_org:req.originalUrl});
        }catch(err){
            throw err;
        }
    }           
})

//管理画面ホーム
app.get("/administrator-home",(req,res) => {
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
            con.commit(function(err) {
                if (err) { 
                connection.rollback(function() {
                    throw err;
                });
            }
            console.log("DB insert success")
            });
        });
    //サーバアカウントに申請通知を出す(未実装)
    //通知DBに申請通知を入れて参照させるイメージ？
    //完了画面の表示
    res.sendFile(__dirname + "/public/html/signup-end.html");
});


//ショー一覧画面
app.get("/show-home",(req,res) => {
    con.query("select show_id,show_name from entertainment_show;",function(error, response){
        res.render("list.ejs",{list: response,kind_org:req.originalUrl});
    })
});

//各ショーホーム画面(http://localhost:3000/show?show_id=)
app.get("/show",(req,res) => {
    //req.query => {show_id:"id"}
    con.query("select show_name from entertainment_show where show_id = ?;" + 
        "select roll_name,roll_id from roll where show_id = ?;" + 
        "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
        from shift join entertainer using(entertainer_id) \
        join roll using(roll_id) \
        join entertainment_show as ES on ES.show_id = shift.show_id \
        join time_table as tt using(tt_id) \
        where shift.show_id = ?;" ,
        [parseInt(req.query.show_id),parseInt(req.query.show_id),parseInt(req.query.show_id)]
        ,(e,db_res) => {
        res.render("show_home.ejs",{shift_res:db_res[2],rolls:db_res[1],
            show_name:db_res[0][0].show_name,show_id:req.query.show_id});
    });
});

//各ショー報告画面（http://localhost:3000/show-report?show_id=）
app.get("/show-report",(req,res) => {
    con.query("select show_name from entertainment_show where show_id = ?;" + 
        "select roll_name,roll_id from roll where show_id = ?;" + 
        "select distinct roll_name,entertainer_name,roll_id,entertainer_id \
        from Shift join roll using(roll_id) join entertainer using(entertainer_id);" + 
        "select * from entertainer;"
        ,[parseInt(req.query.show_id),parseInt(req.query.show_id)],
        (e,db_res) => {
            res.render("shift_report.ejs",
            {show_name:db_res[0][0].show_name,show_id:show.show_id,
                rolls:db_res[1],roll_cast:db_res[2],all_cast:db_res[3]});

    })
})

//報告受け取り(http://localhost:3000/show-report/end , post)
app.post("/show-report/end",(req,res) => {
    //報告種別、ショーの日時、手入力欄を削除してreq.bodyにシフト情報だけ残す
    var t = req.body.time;
    var type = req.body.other_type
    var other_content = null;
    var show_id = parseInt(req.body["show_id"]);
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
            [req.body,t,show_id],(error,r) => {
                if (error) throw error;
                con.commit(function(err) {
                if (err) { 
                connection.rollback(function() {
                    throw err;
                });
            }
            console.log("DB insert success")
            });
            report_id = r.insertId;
        });
        //登録したレコードのIDを取得
        // con.query('select last_insert_id();',(e,r) => {
        //     report_id = r;
        // });
    };
    //notice
    con.query('insert into notice (show_id,type_of_message,content,report_id) value (?,?,?,?);',
        [show_id,type,other_content,r],(e,r) =>{
            if (e) throw e;
            con.commit(function(err) {
                if (err) { 
                connection.rollback(function() {
                    throw err;
                });
            }
            console.log("DB insert success")
            });
        })
    res.sendFile(__dirname + "/public/html/shift_report_end.html")
});

//各ショーページ管理画面ホーム(表向きには削除はここでできる)
//http://localhost:3000/administrator?show_id=
app.get("/administrator",(req,res) => {
    con.query("select show_name from entertainment_show where show_id = ?;" +
        "select N.notice_id,N.type_of_message,N.content,\
        R.time_and_day,R.shift,R.report_id \
        from notice as N join report as R using(report_id) where show_id = ?;"
        ,[parseInt(req.query["show_id"]),parseInt(req.query["show_id"])]
        ,(e,db_res) => {
            res.render("show_administrator.ejs"
            ,{show_name:db_res[0][0].show_name,show_id:req.query.show_id,
                notices:db_res[1]});
    })
})

//各ショー管理画面の報告削除用POST
app.post("administrator/delete-notice",(req,res2) =>{
    //req.body.notice_idの報告を削除する
    if(req.body.report_id != null){
        con.query("delete from report where report_id = ?",[req.body.report_id]);
    }
    con.query("delete from notice where notice_id = ?",[req.body.notice_id]);
    
    

    //ショー管理ページにリダイレクトする
    res2.writeHead(302, {'Location': 'http://localhost:3000/administrator?' + req.body.show_id});

});

//報告詳細確認画面
// (http://localhost:3000/administrator/report-detail?show_id= & notice_id = )
app.get("administrator/report-detail",(req,res) => {
    con.query("select roll_name,roll_id from roll where show_id = ?;" +
        "select distinct roll.roll_name,entertainer.entertainer_name,roll.roll_id,entertainer.entertainer_id \
        from Shift join roll using(roll_id) join entertainer using(entertainer_id) \
        where show_id = ?;" + 
        "select day_and_time from time_table where show_id = ?;" +
        "select N.notice_id,N.type_of_message,N.content,\
        R.time_and_day,R.shift,R.report_id \
        from notice as N join report as R using(report_id) \
        where show_id = ? and notice_id = ?;"
        ,[parseInt(req.query.show_id),parseInt(req.query.show_id),parseInt(req.query.show_id)
        ,parseInt(req.query.show_id),parseInt(req.query.notice_id)],
        (e,db_res) => {
            res.render("shift_report_edit.ejs",
                {show_id:req.query.show_id,
                    rolls:db_res[0],roll_cast:db_res[1],tt:db_res[2]
                    ,shift:db_res[3][0].shift,td:db_res[3][0].time_and_day,
                    report_id:db_res[3][0].report_id});

        });
});

//notiが見れるように、notice_idをフォームで送るようにしてくれ
//受け取った報告の詳細表示
app.post("administrator/report-detail",(req,res) => {
    //報告編集確定・公開
    if(req.body["check-confirm"] == True){
        //シフト内容DBへ登録
        //req.body -> {time:時間,"roll_id":"entertainer_id" ...}
        //TTを登録
        con.query("insert into Time_Table (show_id,day_and_time) value (?,?)",
            [show.show_id,req.body.time]);
        //TT削除してシフト情報だけにする
        delete req.body.time
        con.query("select last_insert_ID()",(e,tt_id)=>{
            for(var roll_id in req.body){
                con.query("insert into shift (tt_id,roll_id,entertainer_id,show_id) value (?,?,?,?)",
                    [tt_id,parseInt(roll_id),parseInt(req.body[roll_id]),show.show_id]
                )
            }
        })

        //報告をDBから削除
        con.query("delete from report where report_id = ?",[noti.report_id]);
        con.query("delete from notice where notice_id = ?",[noti.notice_id]);
        //公開画面へ遷移　これだめなきがする
        res.writeHead(302, {'Location': 'http://localhost:3000/show/' + show.show_id});

    }else{
        //未登録キャスト登録
        con.query("select roll_name,roll_id from roll where show_id = ?;"
        ,[req.body.show_id],(e,rolls) => {
            rolls.forEach(roll => {
                //チェックボックスがチェックされてたらtrueになる
                if(req.body["edit-check" + roll.roll_id] == true){
                    //キャストをテーブルに登録
                    con.query("insert into entertainer (entertainer_name) value (?)"
                        ,[req.body["debut_new" + roll.roll_id]],
                    (e,i) =>{if(e) throw e;});
                    con.query("select last_insert_id()",(e,new_ent_id) =>{
                        noti.shift[roll.roll_id] = "debut";
                        noti.shift["debut" + element.roll_id] = new_ent_id;
                    });
                }
            });
        });
        con.query("select roll_name,roll_id from roll where show_id = ?;" +
        "select distinct roll.roll_name,entertainer.entertainer_name,roll.roll_id,entertainer.entertainer_id \
        from Shift join roll using(roll_id) join entertainer using(entertainer_id) \
        where show_id = ?;" + 
        "select day_and_time from time_table where show_id = ?;" +
        "select N.notice_id,N.type_of_message,N.content,\
        R.time_and_day,R.shift,R.report_id \
        from notice as N join report as R using(report_id) \
        where show_id = ? and notice_id = ?;"
        ,[parseInt(req.query.show_id),parseInt(req.query.show_id),parseInt(req.query.show_id)
        ,parseInt(req.query.show_id),parseInt(req.query.notice_id)],
        (e,db_res) => {
            res.render("shift_report_edit.ejs",
                {show_id:req.query.show_id,
                    rolls:db_res[0],roll_cast:db_res[1],tt:db_res[2]
                    ,shift:db_res[3][0].shift,td:db_res[3][0].time_and_day,
                    report_id:db_res[3][0].report_id});

        });
        
    }
});


//ポジション追加
//http://localhost:3000/administrator/crate-new-position?show_id=
app.get("administrator/create-new-position",(req,res) =>{
    con.query("select roll_name,roll_id from roll where show_id = ?;"+
        "select distinct roll.roll_name,entertainer.entertainer_name, \
        roll.roll_id,entertainer.entertainer_id \
        from Shift join roll using(roll_id) join entertainer using(entertainer_id) \
        where show_id = ?;" +
        "select * from entertainer;",
        [parseInt(req.query.show_id),parseInt(req.query.show_id)],
        (e,db_res)=>{
            res.render("shift_report_form_edit.ejs",{
                show_id:req.query.show_id, rolls:db_res[0], 
                roll_cast: db_res[1],all_cast:db_res[2]});
    });
});

//ポジション追加POST
app.post("administrator/create-new-position",(req,res) =>{

//＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝

//各ショー画面
con.query("select * from entertainment_show;",(e0,show_res)=>{
    if(e0) throw e0;
    console.log(show_res);
    show_res.forEach(show => {
        console.log(show.show_id)
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
        "select * from entertainer;"
        ,[show.show_id,show.show_id]
        ,(e1,res2)=>{
            console.log(res2);
            let roll_res = res2[0];
            let shift_res = res2[1];
            let roll_cast_res = res2[2];
            let all_cast_res = res2[3];

            //各ショーホーム画面（シフト表示）
            //shift rolls 辞書のまま
            //フロント側で形式を整えて表示
            app.get("/show/" + show.show_id,(req,res) => {
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
                                con.query("select day_and_time from time_table;",(e,tt_res) => {

                                })
                            });

                            app.post("/administrator/" + show.show_id + "/" + noti.report_id,(req,res2) => {
                                //報告編集確定・公開
                                if(req.body["check-confirm"] == True){
                                    //シフト内容DBへ登録
                                    //req.body -> {time:時間,"roll_id":"entertainer_id" ...}
                                    //TTを登録
                                    con.query("insert into Time_Table (show_id,day_and_time) value (?,?)",
                                        [show.show_id,req.body.time]);
                                    //TT削除してシフト情報だけにする
                                    delete req.body.time
                                    con.query("select last_insert_ID()",(e,tt_id)=>{
                                        for(var roll_id in req.body){
                                            con.query("insert into shift (tt_id,roll_id,entertainer_id,show_id) value (?,?,?,?)",
                                                [tt_id,parseInt(roll_id),parseInt(req.body[roll_id]),show.show_id]
                                            )
                                        }
                                    })

                                    //報告をDBから削除
                                    con.query("delete from report where report_id = ?",[noti.report_id]);
                                    con.query("delete from notice where notice_id = ?",[noti.notice_id]);
                                    //公開画面へ遷移
                                    res2.writeHead(302, {'Location': 'http://localhost:3000/show/' + show.show_id});

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
                                                noti.shift[roll.roll_id] = "debut";
                                                noti.shift["debut" + element.roll_id] = new_ent_id;
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

                    
                    });
            });




            //=================================================================================

            //報告フォームの編集（ポジション追加）
            app.get("administrator/" + show.show_id + "/form-edit",(req,res) =>{
                res.render("shift_report_form_edit.ejs",{
                    show_id:show.show_id, rolls:roll_res, 
                    roll_cast: roll_cast_res,all_cast:all_cast_res});
                });
            });

            app.post("administrator/" + show.show_id + "/form-edit",(req,res) =>{
                //最終インサート用クエリ
                let sql = "insert into shift (tt_id,roll_id,entertainer_id,show_id) value ( ?,?,?,?)"
                //役名登録
                con.query("insert into roll (roll_name,show_id) value (?,?)",
                    [req.body["position_name"],show.show_id]);
                con.query("select last_insert_ID()",(e,roll_id)=>{
                    //ってかどうにかなりませんかねここ
                    //ent:未登録
                    //inかundefinedか""かどれだろう
                    if(req.body in "ent_name_txt"){
                        con.query("insert into entertainer entertainer_name value ?",
                            [req.body["ent_name_text"]])
                        con.query("select last_insert_ID()",(e,entertainer_id)=>{
                            con.query("select count(*) from time_table where day_and_time = ?",
                            [req.body["time"]],(e,c)=>{
                            //ent:未登録,tt:未登録
                            if(c == 0){
                                con.query("insert into time_table (day_and_time,show_id) value (?,?)",
                                    [req.body["time"],show.show_id]
                                )
                                con.query("select last_insert_ID()",(e,tt_id)=>{
                                    con.query(sql,[tt_id,roll_id,entertainer_id,show.show_id])
                                })
                            //ent:未登録,tt:登録済み
                            }else{
                                con.query("select tt_id from Time_table where show_id = ? and day_and_time = ?"
                                    ,[show.show_id,req.body["time"]],(e,tt_id)=>{
                                        con.query(sql,[tt_id,roll_id,entertainer_id,show.show_id])
                                })
                            }
                            })
                        })
                    //ent:登録済み
                    }else{
                        con.query("select entertainer_id from entertainer where entertainer_id = ?",
                        [req.body["ent_name"]],(e,entertainer_id)=>{
                            con.query("select count(*) from time_table where day_and_time = ?",
                            [req.body["time"]],(e,c)=>{
                                //ent:登録済み,tt:未登録
                                if(c == 0){
                                    con.query("insert into time_table (day_and_time,show_id) value (?,?)",
                                        [req.body["time"],show.show_id]
                                    )
                                    con.query("select last_insert_ID()",(e,tt_id)=>{
                                        con.query(sql,[tt_id,roll_id,entertainer_id,show.show_id])
                                    })
                                //ent:登録済み,tt:登録済み
                                }else{
                                    con.query("select tt_id from Time_table where show_id = ? and day_and_time = ?"
                                        ,[show.show_id,req.body["time"]],(e,tt_id)=>{
                                            con.query(sql,[tt_id,roll_id,entertainer_id,show.show_id])
                                    })
                                }
                            })
                        })
                    }
                });
                //公開画面へ遷移
                res.writeHead(302, {'Location': 'http://localhost:3000/show/' + show.show_id});
            });


    });
});

//新ショー登録申請画面
app.get("administrator/show-reqest",(req,res)=>{
    res.render("new_show_reqest.ejs",{})
})


//演者一覧画面
app.get("/entertainer",(req,res) => {
    con.query("select entertainer_id,entertainer_name from entertainer;",function(error, response){
        res.render("list.ejs",{list:response,kind_org:req.originalUrl});
    })
});

//各演者画面
//ID１と２は不明と欠員なのでパス
con.query('select entertainer_id ,entertainer_name from entertainer;',function(error,response){
    if (error) throw error;
    for(let i = 0; i < response.length; i++){
        app.get("/entertainer/" + response[i].entertainer_id,(req,res) => {
            //URLから名前を拾ってhtmlは動的生成
            res.render("entertainer_home.ejs",{con:con,name:response[i].entertainer_name});
        });
    }
});

