
//モジュール
const express = require("express");
const app = express();
const PORT = 3000;
const mysql = require("mysql2/promise");
const path = require("path");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie_parser = require("cookie-parser");
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
});

con.query("SET NAMES 'utf8mb4';");

//静的ファイルパス指定
app.use("/public",express.static(path.join(__dirname,"/public")));

//json準備
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(cookie_parser());

//環境変数にしたい
const LOGIN_SECRET_KEY = "SECRET_KEY";

//=======================================================================

//ホーム画面
app.get('/home',(req,res) => {
    res.render("home.ejs");
});


//============================================================================
//アカウント関係
//管理アカウント申請
app.get("/sign-up",(req,res) => {
    let sign_up = async() => {
        let [ac_res] = await con.query("select * from account");
        res.render("signup.ejs",{all_account:ac_res});
    }
    sign_up()
});

//アカウント申請確認画面
app.post("/sign-up/check",function(req,res){
    var form = req.body;
    res.render("signup-check.ejs", form);
});

//完了画面
app.post("/sign-up/end",function(req,res){
    let insert_notice = async () => {
        //ハッシュ化
        req.body["PW"]  = await bcrypt.hash(req.body["PW"], 12);
        console.log(req.body);
        //テキスト化
        let content = JSON.stringify(req.body);
        console.log(content)
        //サーバアカウントに申請通知を出す
        await con.query(
            'INSERT INTO notice (show_id,type_of_message,content) values (1,"アカウント申請",:content)',
            {content:content}
        );
        let [insert_res] = await con.query("select * from notice;");
        console.log(insert_res);
    }
    insert_notice();
    //完了画面の表示
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:null});
});

//アカウント承認（serverアカウントのショー管理画面から承認GET）
app.get("/accept-request",(req,res) => {
    let accept = async() => {
        console.log(req.query.notice_id)
        let [request_res] = await con.query("select content from notice where notice_id = :notice_id",
            {notice_id:req.query.notice_id})
        let obj = JSON.parse(request_res[0].content);
        console.log(typeof obj);
        console.log(Object.keys(obj));
        //アカウントの承認
        if(Object.keys(obj).includes("account_id")){
            //autority:2 -> 管理アカウント, authority:1 -> サーバーアカウント
            await con.query("insert into account (account_id,PW,SNS_id,authority,sns,mail) value (:id,:PW,:sns_id,2,:sns,:mail);",
                {id:obj.account_id,PW:obj.PW,sns_id:obj.SNS_id,mail:obj.mail,sns:parseInt(obj.SNS)}
            )
        }else if(Object.keys(obj).includes("show_name")){
            await con.query("insert into entertainment_show (show_name) value (:name);",
                {name:obj["name"]}
            )
        }
        //メール送信
        //https://blog.capilano-fw.com/?p=5673#i

        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:null});
    }
    accept();
})

//ログイン画面
app.get("/sign-in",(req,res) => {
    res.render("signin.ejs",{error_flag :parseInt(req.query.error)});
});

//ログイン→管理画面へ遷移
app.post("/administrator-home",function(req,res){
    //アカウント照合
    let login = async() => {
        try{
            let [db_res] = await con.query("select * from account where account_id = :id;"
                ,{id:req.body.account_id});
            if(db_res.length == 1){
                //アカウントがある
                let isPWCorrect = await bcrypt.compare(req.body.PW,db_res[0].pw);
                if(isPWCorrect == true){
                    //ログイン成功
                    //トークン生成
                    let Payload = {
                        id: req.body.account_id
                    };
                    const Options = {
                        algorithm: 'HS256',
                        expiresIn: '2h',
                    };
                    let token = jwt.sign(Payload,LOGIN_SECRET_KEY,Options);
                    //cookieにかく
                    res.cookie("token",token,{
                        httpOnly: true,
                        secure: true
                    });
                    res.redirect("/administrator-home")
                }else{
                    throw new Error("パスワードが間違っています");
                } 
            }else{
                throw new Error("IDが存在しません");
            }

        }
        catch{
             res.status(401).send("IDかパスワードが間違っています")
        }
    };
    login();
});

//ログインチェックをする関数
function loginCheck(req,res){
    //req.cookies.token-> {id: account_id}
    try{
        //tokenがあるか否か
        let {token} = req.cookies;
        if(token == undefined){
            //ログインしてない
            throw new Error();
        }else{
            //トークンがある(ログインしてる)
            jwt.verify(token,LOGIN_SECRET_KEY,function(e,d){
                if(e){
                    //認証NG
                    throw e;
                }
            });
        }
    }catch{
        res.status(401).send("再度ログインしてください")
    }
}

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
    loginCheck(req,res);
    ad_home();
});

//新ショー作成申請
app.get("/show-admin/request-new",(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    //IDを送る
    // res.render("new_show_request.ejs",{account_id:req.account_id})
    res.render("new_show_request.ejs")
});

//新ショー作成申請POST
app.post("/show-admin/request-new",(req,res) => {
    let request_show = async() => {
        let content = JSON.stringify(req.body);
        await con.query("insert into notice (type_of_message,content,show_id) value ('新ショー申請',:content,1);",
            {content:content}
        )
    }
    //ログインチェック
    loginCheck(req,res)
    request_show();
})

//=========================================================================================
//ショー関連sql
const SHOW_NAME_SQL = "select show_name from entertainment_show where show_id = :s_id;"
const ROLL_SQL = "select roll_name,roll_id from roll where show_id = :s_id;"
const SHIFT_SQL = "select tt.day_and_time,tt.tt_id,roll.roll_name,entertainer.entertainer_name,ES.show_name \
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
//noticeからそのショーのnoticeの一覧を持ってくる
const NOTI_SQL = "select * from notice where show_id = :s_id;"
//noticeからreportのデータを持ってくる
// const REPORT_SQL =  "select N.notice_id,N.day_and_time,R.shift,R.report_id \
//         from notice as N join report as R using(report_id) \
//         where R.report_id = :r_id;"
// const REPORT_SQL = "select * from report where reoprt_id = :r_id;"

//notice一覧
// const NOTI_SQL = "select * from notice where show_id = :s_id;"
//reportがあるやつだけはこれで情報全部取得できる
const NOTI_REPO_SQL = "select N.notice_id,N.day_and_time,R.shift,R.type_of_report\
 from notice as N join report as R using(report_id) where show_id = :s_id;"


//=============================================================================================
//ショー関連　一般表示
//ショー一覧画面
app.get("/show-home",(req,res) => {
    let show_home = async() => {
        let [db_res] = await con.query("select show_id,show_name from entertainment_show \
            where show_id > 1;")
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
        let [announce_res] = await con.query("select * from announce where show_id = :s_id",{s_id: parseInt(req.query.show_id)})
        res.render("show_home.ejs",{shift_res:shift_res,rolls:roll_res,
            announce:announce_res,
            show_name:show_name[0].show_name,show_id:req.query.show_id});
    }
    show();
});

//各ショー報告画面（http://localhost:3000/show-report?show_id=2）
app.get("/show-report",(req,res) => {
    let show_report = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)});
        let [cast_res] = await con.query(ENT_SQL);
        res.render("shift_report.ejs",
                {show_name:show_name[0].show_name,show_id:req.query.show_id,
                    rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res});
    }
    show_report()
})

//報告受け取り(http://localhost:3000/show-report/end , post)
app.post("/show-report/end",(req,res) => {
    console.log(req.body);
    //報告種別、ショーの日時、手入力欄を削除してreq.bodyにシフト情報だけ残す
    //t -> "yyyy/mm/dd tt:mm:ss"
    var t = req.body.time;
    delete req.body.time;
    t = t.toLocaleString();
    
    var other_content = null;
    var show_id = parseInt(req.body["show_id"]);
    if(req.body.other_type != "only_shift"){
        other_content = req.body.other_content;
    }

    //DBに登録
    let insert_report = async() =>{
        let report_id = 1;
        //シフトの報告がある（shiftに入れる)
        if("only_other" in req.body == false){
            //shift -> {roll_id : ent_id or debut_cast_name}
            //types -> {roll_id : type_id}
            let types = {};
            let shift = {};
            for(let key in req.body){
                if(key.split("_")[1] == "type" && key.split("_")[0] != "other"){
                    types[key.split("_")[0]] = req.body[key];
                    shift[key.split("_")[0]] = req.body[key.split("_")[0]][parseInt(req.body[key]) -1]
                }
            }
            // console.log(shift)
            // console.log(types)
            await con.query('insert into report \
                (shift,type_of_report) value (:shift,:type);',
                {shift:JSON.stringify(shift),type:JSON.stringify(types)});
            let [r_res] = await con.query("select last_insert_id();")
            report_id = r_res[0]["last_insert_id()"];
        }
        //noticeに入れる
        let [n_res] = await con.query("insert into notice \
            (show_id,type_of_message,content,report_id,day_and_time) value \
            (:s_id,:type,:cont,:r_id,:time);",
        {s_id:show_id, type: req.body.other_type, cont: other_content,time:t,r_id :report_id})
    }
    insert_report();
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:show_id});
})

//=================================================================================================
//各ショー管理側

//各ショーページ管理画面ホーム(表向きには削除はここでできる)
//http://localhost:3000/show-admin?show_id=2
app.get("/show-admin",(req,res) => {
    let show_admin = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id:parseInt(req.query.show_id)})
        let [noti_res] = await con.query(NOTI_SQL,{s_id:parseInt(req.query.show_id)})
        let [noti_repo_res] = await con.query(NOTI_REPO_SQL,{s_id:parseInt(req.query.show_id)})
        let [roll_res] = await con.query(ROLL_SQL,{s_id:parseInt(req.query.show_id)})
        let [all_cast_res] = await con.query(ENT_SQL);
        console.log(noti_res)
        res.render("show_administrator.ejs"
            ,{show_name:show_name[0].show_name,show_id:req.query.show_id,
                notices:noti_res,noti_repo:noti_repo_res,
            all_cast:all_cast_res,rolls:roll_res});
    }
    //ログイン確認
    loginCheck(req,res);
    show_admin();

})

//各ショー管理画面の報告削除
//http://localhost:3000/show-admin/delete-notice?notice_id=&show_id=&reoprt_id=
app.get("/show-admin/delete-notice",(req,res) =>{
    //req.body.notice_idの報告を削除する
    let delete_notice = async() => {
        await con.query("delete from notice where notice_id = :n_id",
            {n_id: parseInt(req.query.notice_id)});
        console.log(req.query.report_id)
        console.log(typeof req.query.report_id)
        if(req.query.report_id != "null"){
            await con.query("select report_id from report where report_id = :id",
                {id:parseInt(req.query.report_id)}
            )
        }
    }
    delete_notice();
    //ショー管理ページにリダイレクトする
    res.redirect("/show-admin?show_id=" + req.query.show_id);

});

//報告詳細確認画面
// http://localhost:3000/show-admin/report-detail?show_id=2&report_id=2 
app.get("/show-admin/report-detail",(req,res) => {
    let report_detail = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)});
        let [tt_res] = await con.query(TT_SQL,{s_id: parseInt(req.query.show_id)});
        let [cast_res] = await con.query(ENT_SQL);
        let [report_res] = await con.query(REPORT_SQL,{r_id:parseInt(req.query.report_id)})

         res.render("shift_report_edit.ejs",
                {title:"シフト報告の編集・公開",show_id:req.query.show_id,show_name:show_name[0].show_name,
                rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res,tt:tt_res
                ,shift:report_res[0].shift,td:report_res[0].day_and_time,
                report_id:report_res[0].report_id,notice_id:req.query.notice_id});
    }
    report_detail()
});


//未登録を登録したあとに編集ページに戻ると、デビューが登録済みの表示になっちゃうので、
//ステータスかなんかをやっぱりつけてやるべきかも
//不明（誰だかわからない）をinsertしちゃうと、後から追加報告されたものを反映させたときにupdateしなきゃいけないので、
//不明（id：１）はinsertしない
//つまり表示は空欄になる
//シフト編集・公開POST
// http://localhost:3000/show-admin/report-detail
app.post("/show-admin/report-detail",(req,res) => {
    let insert_shift = async() => {
        console.log(req.body)
        //シフト内容DBへ登録
        //req.body -> {time:時間,"roll_id":"entertainer_id" ...}
        //TTを登録
        let [ins_tt] = await con.query("insert into Time_Table (show_id,day_and_time) value (:s_id,:t)",
            {s_id: parseInt(req.body.show_id),t:req.body.time});
        //TT削除してシフト情報だけにする
        delete req.body.time,req.body["check-conform"]
        //ポジション毎にShiftについか
        for(var roll_id in req.body){
            if(parseInt(req.body[roll_id]) != 1){
                await con.query("insert into shift (tt_id,roll_id,entertainer_id,show_id) \
                    value (:tt_id,:r_id,:ent_id,:s_id)",
                    {tt_id:parseInt(ins_tt.insertId),
                    r_id:parseInt(roll_id),ent_id:parseInt(req.body[roll_id]),
                    s_id:parseInt(req.body.show_id)}
                );
            }
        }
        //reportとnoticeを削除
        await con.query("delete from report where report_id = :r_id",
            {r_id:parseInt(req.body.report_id)});
        await con.query("delete from notice where report_id = :r_id",
            {n_id:parseInt(req.body.report_id)});

        //完了画面表示→ホーム画面へ遷移
        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});;
    }

    let insert_ent = async(roll) => {
        //チェックボックスがチェックされてたら変更したところ
        //req.body -> {time:時間,"roll_id":"entertainer_id" or "debut_new"...}
        if(req.body["edit-check" + roll.roll_id] == true){
            delete req.body["edit-check" + roll.roll_id]
            //キャストをテーブルに登録
            let [ins_ent] = await con.query("insert into entertainer (entertainer_name) value (:ent_name)"
                ,{ent_name:req.body["debut_new" + roll.roll_id]})

            let [repot_res] = await con.query("* from report where report_id = :r_id",
                {r_id:req.body.report_id}
            )
            
            return ins_ent.insertId
        }
    }
    //ログイン確認
    loginCheck(req,res);
    //報告公開
    if(req.body["check-confirm"] == true){ 
        insert_shift();
    //未登録キャスト登録
    }else{
        async() => {
            let [rolls] = await con.query(ROLL_SQL,{s_id:req.body.show_id});
            rolls.forEach(roll => {
                let ent_id = insert_ent(roll);
                req.body.shift[roll.roll_id] = "debut";
                req.body.shift["debut" + element.roll_id] = ent_id;
            })
            await con.commit(function(err){
                if(err) throw err;
                con.rollback()
            })
            //render
            let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.body.show_id)});
            let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.body.show_id)});
            let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.body.show_id)});
            let [tt_res] = await con.query(TT_SQL,{s_id: parseInt(req.body.show_id)});
            let [cast_res] = await con.query(ENT_SQL);

            let td = req.body.time;
            let report_id = req.body.report_id;
            let show_id = req.body.show_id;
            delete req.body.time, req.body.report_id,req.body.show_id ;
            
            res.render("shift_report_edit.ejs",
                {title:"シフト報告の編集・公開",show_id:show_id,show_name:show_name,
                rolls:roll_res,roll_cast:roll_cast_res,tt:tt_res,all_cast:cast_res
                ,shift:req.body,td:td,
                report_id:report_id}
            );

        }
    }
})

//ポジション追加フォーム
//http://localhost:3000/show-admin/create-position?show_id=1
app.get("/show-admin/create-position",(req,res) =>{
    let create_position = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id:parseInt(req.query.show_id)})
        let [roll_res] = await con.query(ROLL_SQL,{s_id:parseInt(req.query.show_id)})
        let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id:parseInt(req.query.show_id)})
        let [cast_res] = await con.query(ENT_SQL)
        res.render("create_position.ejs",{
            show_id:req.query.show_id, rolls:roll_res, show_name:show_name[0].show_name,
            roll_cast: roll_cast_res,all_cast:cast_res});
    }
    //ログイン確認
    loginCheck(req,res);
    create_position();
});

//ポジション追加POST
//http://localhost:3000/show-admin/create-position
app.post("/show-admin/create-position",(req,res) => {
    let insert_new_roll = async() => {
        //役名登録
        let [ins_roll] = await con.query("insert into roll (roll_name,show_id) value (:name,:s_id)",
        {name:req.body["position_name"],s_id:req.body["show_id"]});
        //inかundefinedか""かどれだろう
        let ent_id = null;
        let tt_id = null;
        //新人デビューだった場合
        if(req.body in "ent_name_txt"){
            let [ins_ent] = await con.query("insert into entertainer entertainer_name value :ent_name",
                {ent_name:req.body["ent_name_text"]})
            ent_id = ins_ent.insertId;
        }else{
            let [ins_ent] = await con.query("select entertainer_id from entertainer\
                 where entertainer_id = :name",{name:req.body["ent_name"]})
            ent_id = ins_ent.entertainer_id;
        }
        //tt登録判定
        let [tt_res] = await con.query("select count(*) from time_table where day_and_time = :td",
                {td:req.body["time"]})
        if(tt_res["count(*)"] == 0){
            //未登録
            let [ins_tt] = await con.query("insert into time_table (day_and_time,show_id) value (:dt,:s_id)",
                        {dt:req.body["time"],s_id:parseInt(req.body.show_id)});
            tt_id = ins_tt.insertId;
        }else{
            //登録済み
            let [ins_tt] = await con.query("select tt_id from Time_table where show_id = :s_id \
                 and day_and_time = :td"
                        ,{s_id:parseInt(req.body.show_id),td:req.body["time"]});
            tt_id = ins_tt.tt_id
        }
        //shiftに登録
        await con.query("insert into shift (tt_id,roll_id,entertainer_id,show_id) \
            value (:tt_id,:r_id,:ent_id,:s_id)",
            {tt_id:tt_id,r_id:ins_roll.insertId,ent_id:ent_id,s_id:parseInt(req.body.show_id)})
        
        //完了画面表示→ショーホーム画面へ遷移
        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
    }
    //ログイン確認
    loginCheck(req,res);
    insert_new_roll();
});

//アナウンス追加
app.get("/show-admin/announce",(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    res.render("announce_form.ejs",{show_id:req.query.show_id})
});

//アナウンス追加POST
app.post("/show-admin/announce",(req,res) => {
    let insert_announce = async () => {
        let today = new Date();
        let d = today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate();
        await con.query("insert into announce (d,show_id,title,content) value (:date,:s_id,:title,:content)",
            {s_id:parseInt(req.body.show_id),title:req.body.title,content:req.body.content,date:d}
        );
    }
    //ログイン確認
    loginCheck(req,res);
    insert_announce();
    //完了画面表示→ショーホーム画面へ遷移
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
});

//公開済みシフト編集
//ログインした状態で　http://localhost:3000/show?show_id=　に行くとここのリンクが表示される
//http://localhost:3000/show-admin/shift-edit?show_id= & tt_id= 
app.get("/show-admin/shift-edit",(req,res) => {
    let shift_edit = async() => {
        let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.query.show_id)});
        let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)});
        let [tt_res] = await con.query(TT_SQL,{s_id: parseInt(req.query.show_id)});
        let [cast_res] = await con.query(ENT_SQL);
        let [day_and_time] = await con.query("select day_and_time from Time_Table where tt_id = :tt_id"
            ,{tt_id:parseInt(req.query.tt_id)})
        let [shift_res] = await con.query("select shift.id,roll.roll_id,entertainer.entertainer_id \
        from shift join entertainer using(entertainer_id) \
        join roll using(roll_id) \
        join entertainment_show as ES on ES.show_id = shift.show_id \
        join time_table as tt using(tt_id) \
        where shift.show_id = :s_id && tt.tt_id = :tt_id;" 
        ,{s_id:parseInt(req.query.show_id),tt_id:parseInt(req.query.tt_id)});

        let render_shift = {}
        shift_res.forEach(shift => {
            render_shift[shift.roll_id] = shift.entertainer_id;
        })

        res.render("shift_report_edit.ejs",
            {title:"公開済みシフトの編集",show_id:req.query.show_id,show_name:show_name[0].show_name,
            rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res,tt:tt_res
            ,shift:render_shift,td:day_and_time});
    }
    //ログイン確認
    loginCheck(req,res);
    shift_edit();
})

//公開済みシフト編集POST
app.post("/show-admin/shift-edit",(req,res) => {
    let change_shift = async() => {
        let [tt_id] = await con.query("select tt_id from Time_table where day_and_time = :dt",
            {dt:req.body.time}
        )
        delete req.body.time;
        //シフトテーブルの中身UPDATE
        for(let key in req.body){
            let [update_res] = await con.query("update shift set entertainer_id = :ent_id \
                where tt_id = :t_id && roll_id = :r_id && show_id = :s_id;",
                {ent_id:parseInt(req.body[key]),r_id:parseInt(key),t_id:tt_id[0].tt_id,s_id:parseInt(req.body.show_id)}
            );
        }
        //完了画面表示→ショーホーム画面へ遷移
        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
    }
    //ログイン確認
    loginCheck(req,res);
    //編集確定
    if(req.body["check-confirm"] == true){ 
        change_shift();
    //未登録キャスト登録(まだ書き換えてない)
    }else{
        async() => {
            let [rolls] = await con.query(ROLL_SQL,{s_id:req.body.show_id});
            rolls.forEach(roll => {
                let ent_id = insert_ent(roll);
                req.body.shift[roll.roll_id] = "debut";
                req.body.shift["debut" + element.roll_id] = ent_id;
            })
            await con.commit(function(err){
                if(err) throw err;
                con.rollback()
            })
            //render
            let [show_name] = await con.query(SHOW_NAME_SQL,{s_id: parseInt(req.body.show_id)});
            let [roll_res] = await con.query(ROLL_SQL,{s_id: parseInt(req.body.show_id)});
            let [roll_cast_res] = await con.query(ROLL_CAST_SQL,{s_id: parseInt(req.body.show_id)});
            let [tt_res] = await con.query(TT_SQL,{s_id: parseInt(req.body.show_id)});
            let [cast_res] = await con.query(ENT_SQL);

            let td = req.body.time;
            let report_id = req.body.report_id;
            let show_id = req.body.show_id;
            delete req.body.time, req.body.report_id,req.body.show_id ;
            
            res.render("shift_report_edit.ejs",
                {title:"シフト報告の編集・公開",show_id:show_id,show_name:show_name,
                rolls:roll_res,roll_cast:roll_cast_res,tt:tt_res,all_cast:cast_res
                ,shift:req.body,td:td,
                report_id:report_id}
            );

        }
    }
    
})


//==================================================================================
//演者関連画面

//演者一覧画面
//http://localhost:3000/entertainer-home
app.get("/entertainer-home",(req,res) => {
    let entertainer_home = async() => {
        //ID１と２は不明と欠員なのでパス
        let [ent_res] = await con.query("select * from entertainer where entertainer_id > 2;")
        res.render("list.ejs",{list:ent_res,kind_org:req.originalUrl});
    }
    entertainer_home();
});

//外部報告
app.get("/entertainer/report",(req,res) => {
    let ent_report = async() => {
        let [all_cast_res] =  await con.query(ENT_SQL);
        res.render("out_of_park_report.ejs",{all_cast:all_cast_res})
    }
    ent_report();
});

app.post("/entertainer/report",(req,res) => {
    let insert_db = async() => {
        await con.query("insert into out_of_park_schedule \
            (entertainer_id,out_day,type_of) value (:id,:day,:type)",
        {id: parseInt(req.body.ent_id), type: req.body.type, day: req.body.dt});

        req.render("form_end_page.ejs",{url:req.originalUrl,show_id:ent_id})
    }
    insert_db()
})


//各演者画面
//http://localhost:3000/entertainer?entertainer_id=3&y=2025&m=7 (表示させる年月、y = 2025,m = 07など)
app.get("/entertainer",(req,res)=>{
    let entertainer = async() => {
        let [ent_res] = await con.query("select entertainer_name from entertainer \
            where entertainer_id = :ent_id;",{ent_id:parseInt(req.query.entertainer_id)})
            //WHERE date BETWEEN '2020-07-01 00:00:00' AND '2020-07-31 23:59:59';
        let start = req.query.y + "-" + req.query.m + "-01 00:00:00"
        let last_date = new Date(parseInt(req.query.y), parseInt(req.query.m), 0).getDate();
        let end = ""
        if(last_date < 10){
            end =  req.query.y + "-" + req.query.m + "-0" + last_date + " 23:59:59"
        }else{
            end =req.query.y + "-" + req.query.m + "-" + last_date + " 23:59:59"
        }
        let [shift_res] = await con.query("select tt.day_and_time,roll.roll_name,ES.show_name \
            from shift \
            join Time_table as tt using(tt_id) \
            join roll using(roll_id) \
            join entertainment_show as es on es.show_id = shift.show_id \
            where tt.day_and_time between :start and :end && entertainer_id = :id\
            order by tt.day_and_time asc;",{start:start,end:end,id:parseInt(req.query.entertainer_id)})
        res.render("entertainer_home.ejs",
            {name:ent_res[0].entertainer_name,shift:shift_res,m:parseInt(req.query.m),y:parseInt(req.query.y),
            ent_id:req.query.entertainer_id
            });
    }
    entertainer();
});

//以下要ログイン

//キャスト名変更（新人１などとして登録した人の名前が判明した場合などに使用）
app.get("/entertainer/rename",(req,res) => {
    //ログイン判定（ショー管理アカウントを持っていればすべてのキャストの名称を変更できる）
    let rename = async() => {
        let [ent_res] = await con.query("select * from entertainer where entertainer_id > 2;");
        res.render("rename_entertainer.ejs",{all_cast:ent_res})
    }
    //ログイン確認
    loginCheck(req,res);
    rename()
})

//キャスト名変更受け取り
app.post("/entertainer/rename",(req,res) => {
    let rename = async() => {
        await con.query("update entertainer set entertainer_name = :name \
                where entertianer_id = :id;",
                {id:parseInt(req.body.before_name),name:req.body.after_name});
    }
    //ログイン確認
    loginCheck(req,res);
    rename();
    //完了画面表示→enthome画面へ遷移
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.before_name});

});

//新人登録
app.get("entertainer/new-ent",(req,res) => {
    let create_new_ent = async() => {
        [all_cast_res] = await con.query(ENT_SQL);
        res.render("create_new_entertaier.ejs",{all_cast: all_cast_res});
    }
    //ログイン確認
    loginCheck(req,res);
    create_new_ent();
})

//新人登録POST
app.post("entertainer/new-ent",(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    //完了画面表示→enthome画面へ遷移
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.ent_id});
})

