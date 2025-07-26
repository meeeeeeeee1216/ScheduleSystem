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
    connectionLimit: 5,
    namedPlaceholders: true
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

//=======================================================================

//ホーム画面
app.get('/home',(req,res) => {
    res.sendFile(__dirname + "/public/html/home.html");
});


//============================================================================
//アカウント関係
//管理アカウント申請
app.get("/sign-up",(req,res) => {
    res.sendFile(__dirname + "/public/html/signup.html");
    //確認画面
    app.post("/sign-up/check",function(req,res){
        var form = req.body;
        res.render("signup-check.ejs", form);
    });

    //完了画面
    //DB登録、サーバアカウントに通知送信、authorityが1になったら承認（初期値NULL）
    app.post("/sign-up/end",function(req,res){
        //サーバアカウントに申請通知を出す(未実装)
        let signup = async() => {
            let [db_res] = await con.query(
                'INSERT INTO account (account_id, PW, SNSid, sns, mail) values (?,?,?,?,?)',
                [req.body.account_id,req.body.PW,req.body.SNS_id,
                req.body.SNS,req.body.mail]
            )
            await con.commit(function(err){
                if(err) throw err;
                con.rollback()
            })
        }
        signup();
        //完了画面の表示
        res.sendFile(__dirname + "/public/html/signup-end.html");
    });
});

//ログイン画面
app.get("/sign-in",(req,res) => {
    console.log(req.query.error);
    res.render("signin.ejs",{error_flag :parseInt(req.query.error)});
});

//ログイン→管理画面へ遷移
app.post("/administrator-home",function(req,res){
    //  log(req.body);
    //アカウント照合
    let sign_in = async() => {
        let [db_res] = await con.query("select count(*) from account where account_id = ? and PW = ?;"
            ,[req.body.account_id,req.body.PW]);
        console.log(db_res[0]["count(*)"]);
        if(db_res[0]["count(*)"] == 0){
            //ログイン失敗
            res.writeHead(302, {'Location': 'http://localhost:3000/sign-in?error=1'});
        }else{
            //成功
            //認証トークン生成
            //Coockieに保存
            //表示
            try{ 
                [db_res] = await con.query(
                    "select show_id,show_name,administrator_id from entertainment_show where administrator_id = :ad_id;"
                    ,{ad_id:req.body.account_id});
                res.render("list.ejs",{list:db_res,kind_org:req.originalUrl});
            }catch(err){
                throw err;
            }
        }
    };
    sign_in(con);  
});

//管理画面ホーム
app.get("/administrator-home",(req,res) => {
    //ログイン状態チェック
    //ログアウトならログイン画面へ
    //自分が管理者のショー管理画面一覧を表示
    let ad_home = async() => {
        let [db_res] = await con.query("select show_id,show_name,administrator_id \
            from entertainment_show;")
        res.render("list.ejs",{list: db_res,kind_org:req.originalUrl});
    }
    ad_home()
});

//=========================================================================================
//ショー関連sql
const SHOW_NAME_SQL = "select show_name from entertainment_show where show_id = :s_id;"
const ROLL_SQL = "select roll_name,roll_id from roll where show_id = :s_id;"
const SHIFT_SQL = "select tt.day_and_time,roll.roll_name,entertainer.entertainer_name,ES.show_name \
        from shift join entertainer using(entertainer_id) \
        join roll using(roll_id) \
        join entertainment_show as ES on ES.show_id = shift.show_id \
        join time_table as tt using(tt_id) \
        where shift.show_id = :s_id;" 
const ROLL_CAST_SQL = "select distinct roll_name,entertainer_name,roll_id,entertainer_id \
        from Shift join roll using(roll_id) join entertainer using(entertainer_id) \
        where roll.show_id = :s_id;" 
const TT_SQL = "select day_and_time from time_table where show_id = :s_id;"
const ENT_SQL = "select * from entertainer;"
//noticeからそのショーのnoticeとreportの一覧を持ってくる
const NOTI_SQL = "select N.notice_id,N.type_of_message,N.content,\
        N.time_and_day,R.shift,R.report_id \
        from notice as N join report as R using(report_id) where N.show_id = :s_id;"
//noticeからreportのデータを持ってくる
const REPORT_SQL =  "select N.notice_id,N,time_and_day,R.shift,R.report_id \
        from notice as N join report as R using(report_id) \
        where R.report_id = :r_id;"


//=============================================================================================
//ショー関連　表示側
//ショー一覧画面
app.get("/show-home",(req,res) => {
    let show_home = async() => {
        let [db_res] = await con.query("select show_id,show_name from entertainment_show;")
        res.render("list.ejs",{list: db_res,kind_org:req.originalUrl});
    }
    show_home()
});

//各ショー画面(http://localhost:3000/show?show_id=)
app.get("/show",(req,res) => {
    //req.query => {show_id:"id"}
    let show = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)});
        let [shift_res] = await con.query(SHIFT_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.query.show_id)});
        res.render("show_home.ejs",{shift_res:shift_res,rolls:roll_res,
            show_name:show_name[0].show_name,show_id:req.query.show_id});
    }
    show();
});

//各ショー報告画面（http://localhost:3000/show-report?show_id=）
app.get("/show-report",(req,res) => {
    let show_report = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)});
        let [cast_res] = await con.query(ENT_SQL,{s_id: parseInt(req.query.show_id)});
        res.render("shift_report.ejs",
                {show_name:show_name[0].show_name,show_id:req.query.show_id,
                    rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res});
    }
    show_report()
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
    //req.body => {roll_id:ent_id}

    //DBに登録
    let insert_report = async() =>{
        var report_id = null;
        //シフトの報告がある（shiftに入れる)
        if(req.body != {}){
            let [r_res] = await con.query('insert into report \
                (shift,time_and_day,show_id) value (:shift,:time,:s_id);',
                {shift:req.body,time:t,s_id:show_id});
            report_id = r_res.insertID;
        }
        //noticeに入れる
        let [n_res] = await con.query("insert into notice \
            (show_id,type_of_message,content,report_id) value \
            (:s_id,:type,:cont,:r_id);",
        {s_id:show_id, type: type, cont: other_content,r_id :report_id})

        await con.commit();
    }
    insert_report();
    res.sendFile(__dirname + "/public/html/shift_report_end.html")
})

//=================================================================================================
//各ショー管理側

//各ショーページ管理画面ホーム(表向きには削除はここでできる)
//http://localhost:3000/show-admin?show_id=
app.get("/show-admin",(req,res) => {
    let show_admin = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id:parseInt(req.query.show_id)})
        let [noti_res] = await con.query(NOTI_SQL,{s_id:parseInt(req.query.show_id)})
        res.render("show_administrator.ejs"
            ,{show_name:show_name[0].show_name,show_id:req.query.show_id,
                notices:noti_res});
    } 
    show_admin();

})

//各ショー管理画面の報告削除用POST
//http://localhost:3000/show-admin/delete-notice
app.post("show-admin/delete-notice",(req,res) =>{
    //req.body.notice_idの報告を削除する
    let delete_notice = async() => {
        if(req.body.report_id != null){
            await con.query("delete from report where report_id = :r_id",
                {r_id: parseInt(req.body.report_id)});
        }
        await con.query("delete from notice where notice_id = :n_id",
            {n_id: parseInt(req.body.notice_id)});
        
        await con.commit();
    }
    delete_notice();
    //ショー管理ページにリダイレクトする
    res.writeHead(302, {'Location': 'http://localhost:3000/administrator?show_id=' + req.body.show_id});

});

//報告詳細確認画面
// http://localhost:3000/show-admin/report-detail?show_id= & report_id = 
app.get("show-admin/report-detail",(req,res) => {
    let report_detail = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)});
        let [tt_res] = await con.query(TT_SQL,{s_id: parseInt(req.query.show_id)});
        let [cast_res] = await con.query(ENT_SQL,{s_id: parseInt(req.query.show_id)});
        let [report_res] = await con.query(REPORT_SQL,{r_id:parseInt(req.query.report_id)})

         res.render("shift_report_edit.ejs",
                {show_id:req.query.show_id,show_name:show_name[0].show_name,
                rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res,tt:tt_res
                ,shift:JSON.parse(report_res[0].shift),td:report_res[0].time_and_day,
                report_id:report_res[0].report_id});
    }
    report_detail()
});

//notiが見れるように、notice_idをフォームで送るようにしてくれ
//シフト編集・公開POST
// http://localhost:3000/show-admin/report-detail
app.post("administrator/report-detail",(req,res) => {
    let insert_shift = async() => {
        //シフト内容DBへ登録
        //req.body -> {time:時間,"roll_id":"entertainer_id" ...}
        //TTを登録
        let [ins_tt] = await con.query("insert into Time_Table (show_id,day_and_time) value (:s_id,:t)",
            {s_id: parseInt(req.body.show_id),t:req.body.time});
        //TT削除してシフト情報だけにする
        delete req.body.time
        //ポジション毎にShiftについか
        for(var roll_id in req.body){
            await con.query("insert into shift (tt_id,roll_id,entertainer_id,show_id) \
                value (:tt_id,:r_id,:ent_id,:s_id)",
                {tt_id:parseInt(ins_tt.insertId),
                r_id:parseInt(roll_id),ent_id:parseInt(req.body[roll_id]),
                s_id:parseInt(req.body.show_id)}
            );
        }
        //reportとnoticeを削除
        await con.query("delete from report where report_id = :r_id",
            {r_id:parseInt(req.body.report_id)});
        await con.query("delete from notice where notice_id = :n_id",
            {n_id:parseInt(req.body.notice_id)});
        //公開画面へ遷移
        res.writeHead(302, {'Location': 'http://localhost:3000/show?show_id=' + req.body.show_id});
    }

    let insert_ent = async(roll) => {
        //チェックボックスがチェックされてたら変更したところ
        //req.body -> {time:時間,"roll_id":"entertainer_id" or "debut_new"...}
        if(req.body["edit-check" + roll.roll_id] == true){
            //キャストをテーブルに登録
            let [ins_ent] = await con.query("insert into entertainer (entertainer_name) value (:ent_name)"
                ,{ent_name:req.body["debut_new" + roll.roll_id]})

            let [noti_res] = await con.query("* from notice where report_id = :r_id",
                {r_id:req.body.report_id}
            )
            
            return ins_ent.insertId
        }
    }

    
    //報告公開
    if(req.body["check-confirm"] == True){ 
        insert_shift();
    //未登録キャスト登録
    }else{
        async() => {
            let [rolls] = await con.query(ROLL_SQL,{s_id:req.body.show_id});
            rolls.forEach(roll => {
                let ent_id = insert_ent(roll);
                noti.shift[roll.roll_id] = "debut";
                noti.shift["debut" + element.roll_id] = new_ent_id;
            })
        }
    }
})

//
