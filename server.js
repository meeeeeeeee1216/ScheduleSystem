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
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: 'pass1234',
    database: "SSS",
    connectionLimit: 5,
    namedPlaceholders: true
});


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

//トランザクション用関数
async function query(sql,datas,req,res){
    try{
        let con = await pool.getConnection();
        await con.beginTransaction();
        await con.query("SET NAMES 'utf8mb4';");
        let db_res = await con.query(sql,datas);
        if(sql.slice(0,5) == "insert"){
            await con.commit()
        }
        await con.release();
        return db_res
    }catch{
        //エラーが起こったらロールバック
        if(sql.slice(0,5) == "insert"){
            await con.rollback()
        }
        res.render("error.ejs",{url:req.originalUrl,show_id:req.body.show_id,kind:"DB"})
    }
}

//============================================================================
//アカウント関係
//管理アカウント申請
app.get("/sign-up",async(req,res) => {
    [ac_res] = await query("select * from account;",{},req,res);
    res.render("signup.ejs",{all_account:ac_res});
});

//アカウント申請確認画面
app.post("/sign-up/check",function(req,res){
    var form = req.body;
    res.render("signup-check.ejs", form);
});

//完了画面
app.post("/sign-up/end",async (req,res) => {
    //ハッシュ化
    req.body["PW"]  = await bcrypt.hash(req.body["PW"], 12);
    //テキスト化
    let content = JSON.stringify(req.body);
    //サーバアカウントに申請通知を出す
    await query(
        'INSERT INTO notice (show_id,type_of_message,content) values (1,"アカウント申請",:content);',
        {content:content},req,res);
    await query("select * from notice;",{},req,res);
    //完了画面の表示
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:null});
    }
);

//アカウント承認（serverアカウントのショー管理画面から承認GET）
app.get("/accept-request",async(req,res) => {
        let [request_res] = await query("select content from notice where notice_id = :notice_id",
            {notice_id:req.query.notice_id},req,res)
        let obj = JSON.parse(request_res[0].content);
        //アカウントの承認
        if(Object.keys(obj).includes("account_id")){
            //autority:2 -> 管理アカウント, authority:1 -> サーバーアカウント
            await query("insert into account (account_id,PW,SNS_id,authority,sns,mail) value (:id,:PW,:sns_id,2,:sns,:mail);",
                {id:obj.account_id,PW:obj.PW,sns_id:obj.SNS_id,mail:obj.mail,sns:parseInt(obj.SNS)},
                req,res
            )
        }else if(Object.keys(obj).includes("show_name")){
            await query("insert into entertainment_show (show_name) value (:name);",
                {name:obj["name"]},req,res
            )
        }
        //メール送信
        //https://blog.capilano-fw.com/?p=5673#i

        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:null});
    });

//ログイン画面
//error=> {0:通常アクセス,1:ID間違い,2:PWまちがい}
app.get("/sign-in",(req,res) => {
    res.render("signin.ejs",{error_flag :parseInt(req.query.error)});
});

//ログイン→管理画面へ遷移
app.post("/administrator-home",async(req,res) => {
        try{
            let con = await pool.getConnection();
            await con.beginTransaction();
            await con.query("SET NAMES 'utf8mb4';");
            let [db_res] = await con.query("select * from account where account_id = :id;"
                ,{id:req.body.account_id});
            await con.release();
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
                    //成功
                    res.redirect("/administrator-home")
                }else{
                    //pw間違い
                    res.redirect("/sign-in?error=2")
                } 
            }else{
                //ID間違い
                res.redirect("/sign-in?error=1")
            }

        }catch{
            //IDがない
            res.render("error.ejs",{url:req.originalUrl,show_id:req.body.show_id,kind:"DB"})
        }
});

//ログインチェックをする関数
function loginCheck(req,res){
    //req.cookies.token-> {id: account_id}
    try{
        //tokenがあるか否か
        let {token} = req.cookies;
        if(token == undefined){
            //ログインしてない
            res.render("error.ejs",{url:req.originalUrl,show_id:req.body.show_id,kind:"ログイン"})
        }else{
            //トークンがある(ログインしてる)
            jwt.verify(token,LOGIN_SECRET_KEY,function(e,d){
                if(e){
                    //認証NG
                    res.render("error.ejs",{url:req.originalUrl,show_id:req.body.show_id,kind:"ログイン"})
                }
            });
        }
    }catch{
        //認証NG
        res.render("error.ejs",{url:req.originalUrl,show_id:req.body.show_id,kind:"ログイン"})
    }
}

//管理画面ホーム
app.get("/administrator-home",async (req,res) => {
    //ログイン状態チェック
    loginCheck(req,res);
    //自分が管理者のショー管理画面一覧を表示
    let [db_res] = await query("select * \
        from entertainment_show;",{},req,res)
    res.render("list.ejs",{list: db_res,kind_org:req.originalUrl});
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
app.post("/show-admin/request-new",async(req,res) => {
    //ログインチェック
    loginCheck(req,res)
    let content = JSON.stringify(req.body);
    await query("insert into notice (type_of_message,content,show_id) value ('新ショー申請',:content,1);",
        {content:content},req,res
    )
});

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
const TT_SQL = "select * from time_table where show_id = :s_id;"
const ENT_SQL = "select * from entertainer;"
//noticeからそのショーのnoticeの一覧を持ってくる
const NOTI_SQL = "select * from notice where show_id = :s_id;"
const REPORT_SQL = "select * from report where report_id = :r_id;"

//reportがあるやつだけはこれで情報全部取得できる
const NOTI_REPO_SQL = "select N.notice_id,N.day_and_time,R.shift,R.type_of_report\
 from notice as N join report as R using(report_id) where show_id = :s_id;"


//=============================================================================================
//ショー関連　一般表示
//ショー一覧画面
app.get("/show-home",async(req,res) => {
    let [db_res] = await query("select show_id,show_name from entertainment_show \
        where show_id > 1;",{},req,res)
    res.render("list.ejs",{list: db_res,kind_org:req.originalUrl});
});

//各ショー画面(http://localhost:3000/show?show_id=)
app.get("/show",async(res,req) => {
    let [show_name] = await query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [shift_res] = await query(SHIFT_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [roll_res] = await query(ROLL_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [announce_res] = await query("select * from announce where show_id = :s_id",{s_id: parseInt(req.query.show_id)},req,res)
    res.render("show_home.ejs",{shift_res:shift_res,rolls:roll_res,
        announce:announce_res,
        show_name:show_name[0].show_name,show_id:req.query.show_id});
});

//各ショー報告画面（http://localhost:3000/show-report?show_id=2）
app.get("/show-report",async(req,res) => {
        let [show_name] = await query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [roll_res] = await query(ROLL_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [roll_cast_res] = await query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [cast_res] = await query(ENT_SQL,{},req,res);
        res.render("shift_report.ejs",
                {show_name:show_name[0].show_name,show_id:req.query.show_id,
                    rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res});
});

//報告受け取り(http://localhost:3000/show-report/end , post)
app.post("/show-report/end",async (req,res) => {
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
    let report_id = 1;
    //シフトの報告がある（reportに入れる)
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
        [r_res] = await query('insert into report \
            (shift,type_of_report) value (:shift,:type);',
            {shift:JSON.stringify(shift),type:JSON.stringify(types)},req,res);
        report_id = r_res.insertId;
    }
    //noticeに入れる
    await query("insert into notice \
        (show_id,type_of_message,content,report_id,day_and_time) value \
        (:s_id,:type,:cont,:r_id,:time);",
    {s_id:show_id, type: req.body.other_type, cont: other_content,time:t,r_id :report_id},req,res)
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:show_id});
})

//=================================================================================================
//各ショー管理側

//各ショーページ管理画面ホーム(表向きには削除はここでできる)
//http://localhost:3000/show-admin?show_id=2
app.get("/show-admin",async(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    let [show_name] = await query(SHOW_NAME_SQL,{s_id:parseInt(req.query.show_id)},req,res)
    let [noti_res] = await query(NOTI_SQL,{s_id:parseInt(req.query.show_id)},req,res)
    let [noti_repo_res] = await query(NOTI_REPO_SQL,{s_id:parseInt(req.query.show_id)},req,res)
    let [roll_res] = await query(ROLL_SQL,{s_id:parseInt(req.query.show_id)},req,res)
    let [all_cast_res] = await query(ENT_SQL,{},req,res);
    res.render("show_administrator.ejs"
        ,{show_name:show_name[0].show_name,show_id:req.query.show_id,
            notices:noti_res,noti_repo:noti_repo_res,
        all_cast:all_cast_res,rolls:roll_res});

})

//各ショー管理画面の報告削除
//http://localhost:3000/show-admin/delete-notice?notice_id=&show_id=&reoprt_id=
app.get("/show-admin/delete-notice",async(req,res) => {
        await query("delete from notice where notice_id = :n_id",
            {n_id: parseInt(req.query.notice_id)},req,res);
        if(req.query.report_id != "null"){
            await query("select report_id from report where report_id = :id",
                {id:parseInt(req.query.report_id)},req,res
            )
        }
    //ショー管理ページにリダイレクトする
    res.redirect("/show-admin?show_id=" + req.query.show_id);
});

//報告詳細確認（報告編集・公開）
// http://localhost:3000/show-admin/report-detail?show_id=2&report_id=2&notice_id=2
app.get("/show-admin/report-detail",async(req,res) => {
        //ログイン確認
        loginCheck(req,res);
        let [show_name] = await query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [roll_res] = await query(ROLL_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [roll_cast_res] = await query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [tt_res] = await query(TT_SQL,{s_id: parseInt(req.query.show_id)},req,res);
        let [cast_res] = await query(ENT_SQL,{},req,res);
        let [report_res] = await query(REPORT_SQL,{r_id:parseInt(req.query.report_id)},req,res)
        let [notice_res] = await query("select * from notice where notice_id = :n_id;"
            ,{n_id:parseInt(req.query.notice_id)},req,res)
         res.render("shift_report_edit.ejs",
                {title:"シフト報告の編集・公開",show_id:req.query.show_id,show_name:show_name[0].show_name,
                rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res,tt:tt_res
                ,shift:report_res[0].shift,shift_type:report_res[0].type_of_report,
                td:notice_res[0].day_and_time,
                report_id:report_res[0].report_id,notice_id:req.query.notice_id});
});


//シフト編集・公開POST
// http://localhost:3000/show-admin/report-detail
app.post("/show-admin/report-detail",async(req,res) => {
        //ログイン確認
        loginCheck(req,res);
        //shiftへ登録
        //req.body -> {time:時間,"roll_id":"entertainer_id" ...}
        //TTを登録
        let [ins_tt] = await query("insert into Time_Table (show_id,day_and_time) value (:s_id,:t);",
            {s_id: parseInt(req.body.show_id),t:req.body.time},req,res);
        //ポジション毎にShiftについか
        for(var roll_id in req.body){
            if(parseInt(req.body[roll_id]) != 1 && parseInt(req.body[roll_id]) != NaN){
                await query("insert into shift (tt_id,roll_id,entertainer_id,show_id) \
                    value (:tt_id,:r_id,:ent_id,:s_id);",
                    {tt_id:parseInt(ins_tt.insertId),
                    r_id:parseInt(roll_id),ent_id:parseInt(req.body[roll_id]),
                    s_id:parseInt(req.body.show_id)},req,res
                );
            }
        }
        //reportとnoticeを削除
        await query("delete from notice where report_id = :r_id;",
            {n_id:parseInt(req.body.report_id)},req,res);
        await query("delete from report where report_id = :r_id;",
            {r_id:parseInt(req.body.report_id)},req,res);
        //完了画面表示→ホーム画面へ遷移
        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
})

//ポジション追加フォーム
//http://localhost:3000/show-admin/create-position?show_id=1
app.get("/show-admin/create-position",async(req,res) => {
        //ログイン確認
        loginCheck(req,res);
        let [show_name] = await query(SHOW_NAME_SQL,{s_id:parseInt(req.query.show_id)},req,res)
        let [roll_res] = await query(ROLL_SQL,{s_id:parseInt(req.query.show_id)},req,res)
        let [roll_cast_res] = await query(ROLL_CAST_SQL,{s_id:parseInt(req.query.show_id)},req,res)
        let [cast_res] = await query(ENT_SQL,{},req,res)
        let [tt_res] = await query(TT_SQL,{s_id:parseInt(req.query.show_id)},req,res)
        res.render("create_position.ejs",{
            show_id:req.query.show_id, rolls:roll_res, show_name:show_name[0].show_name,
            tt:tt_res,all_cast:cast_res});
});

//ポジション追加POST
//http://localhost:3000/show-admin/create-position
app.post("/show-admin/create-position",async(req,res) => {
        //ログイン確認
        loginCheck(req,res);
        //役名登録
        let [ins_roll] = await query("insert into roll (roll_name,show_id) value (:name,:s_id)",
        {name:req.body["position_name"],s_id:req.body["show_id"]},req,res);
        //shiftに登録
        await query("insert into shift (tt_id,roll_id,entertainer_id,show_id) \
            value (:tt_id,:r_id,:ent_id,:s_id)",
            {tt_id:parseInt(req.body.time),r_id:ins_roll.insertId,
                ent_id:parseInt(req.body.ent_name),s_id:parseInt(req.body.show_id)},req,res)
        
        //完了画面表示→ショーホーム画面へ遷移
        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
});

//アナウンス追加
//http://localhost:3000/show-admin/announce?show_id=
app.get("/show-admin/announce",(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    res.render("announce_form.ejs",{show_id:req.query.show_id})
});

//アナウンス追加POST
app.post("/show-admin/announce",async (req,res) => {
    //ログイン確認
    loginCheck(req,res);
    //これ渡す値あってる？
    let today = new Date();
    let d = today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate();
    await query("insert into announce (d,show_id,title,content) value (:date,:s_id,:title,:content)",
        {s_id:parseInt(req.body.show_id),title:req.body.title,content:req.body.content,date:d}
    );
    //完了画面表示→ショーホーム画面へ遷移
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
});

//公開済みシフト編集
//ログインした状態で　http://localhost:3000/show?show_id=　に行くとここのリンクが表示される
//http://localhost:3000/show-admin/shift-edit?show_id= & tt_id= 
app.get("/show-admin/shift-edit",async(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    let [show_name] = await query(SHOW_NAME_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [roll_res] = await query(ROLL_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [roll_cast_res] = await query(ROLL_CAST_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [tt_res] = await query(TT_SQL,{s_id: parseInt(req.query.show_id)},req,res);
    let [cast_res] = await query(ENT_SQL,{},req,res);
    let [day_and_time] = await query("select day_and_time from Time_Table where tt_id = :tt_id"
        ,{tt_id:parseInt(req.query.tt_id)},req,res)
    let [shift_res] = await query("select shift.id,roll.roll_id,entertainer.entertainer_id \
    from shift join entertainer using(entertainer_id) \
    join roll using(roll_id) \
    join entertainment_show as ES on ES.show_id = shift.show_id \
    join time_table as tt using(tt_id) \
    where shift.show_id = :s_id && tt.tt_id = :tt_id;" 
    ,{s_id:parseInt(req.query.show_id),tt_id:parseInt(req.query.tt_id)},req,res);
    shift_res.forEach(shift => {
        render_shift[shift.roll_id] = shift.entertainer_id;
    })

    res.render("shift_report_edit.ejs",
        {title:"公開済みシフトの編集",show_id:req.query.show_id,show_name:show_name[0].show_name,
        rolls:roll_res,roll_cast:roll_cast_res,all_cast:cast_res,tt:tt_res
        ,shift:render_shift,td:day_and_time});
})

//公開済みシフト編集POST
app.post("/show-admin/shift-edit",async(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    let [tt_id] = await query("select tt_id from Time_table where day_and_time = :dt",
        {dt:req.body.time},req,res
    )
    delete req.body.time;
    //シフトテーブルの中身UPDATE
    for(let key in req.body){
        await query("update shift set entertainer_id = :ent_id \
            where tt_id = :t_id && roll_id = :r_id && show_id = :s_id;",
            {ent_id:parseInt(req.body[key]),r_id:parseInt(key),t_id:tt_id[0].tt_id,s_id:parseInt(req.body.show_id)}
        ,req,res);
    }
    //完了画面表示→ショーホーム画面へ遷移
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.show_id});
})


//==================================================================================
//演者関連画面

//演者一覧画面
//http://localhost:3000/entertainer-home
app.get("/entertainer-home",async(req,res) => {
        //ID１と２は不明と欠員なのでパス
        let [ent_res] = await query("select * from entertainer where entertainer_id > 2;",{},req,res)
        res.render("list.ejs",{list:ent_res,kind_org:req.originalUrl});
});

//外部報告
app.get("/entertainer/report",async(req,res) => {
        let [all_cast_res] =  await query(ENT_SQL,{},req,res);
        res.render("out_of_park_report.ejs",{all_cast:all_cast_res})
});

app.post("/entertainer/report",async(req,res) => {
    await query("insert into out_of_park_schedule \
        (entertainer_id,out_day,type_of) value (:id,:day,:type)",
    {id: parseInt(req.body.ent_id), type: req.body.type, day: req.body.dt},req,res);

    req.render("form_end_page.ejs",{url:req.originalUrl,show_id:ent_id})
})


//各演者画面
//http://localhost:3000/entertainer?entertainer_id=3&y=2025&m=7 (表示させる年月、y = 2025,m = 07など)
app.get("/entertainer",async(req,res) => {
    let [ent_res] = await query("select entertainer_name from entertainer \
        where entertainer_id = :ent_id;",{ent_id:parseInt(req.query.entertainer_id)},req,res)
        //WHERE date BETWEEN '2020-07-01 00:00:00' AND '2020-07-31 23:59:59';
    let start = req.query.y + "-" + req.query.m + "-01 00:00:00"
    let last_date = new Date(parseInt(req.query.y), parseInt(req.query.m), 0).getDate();
    let end = ""
    if(last_date < 10){
        end =  req.query.y + "-" + req.query.m + "-0" + last_date + " 23:59:59"
    }else{
        end =req.query.y + "-" + req.query.m + "-" + last_date + " 23:59:59"
    }
    let [shift_res] = await query("select tt.day_and_time,roll.roll_name,ES.show_name \
        from shift \
        join Time_table as tt using(tt_id) \
        join roll using(roll_id) \
        join entertainment_show as es on es.show_id = shift.show_id \
        where tt.day_and_time between :start and :end && entertainer_id = :id\
        order by tt.day_and_time asc;",{start:start,end:end,id:parseInt(req.query.entertainer_id)},req,res)
    res.render("entertainer_home.ejs",
        {name:ent_res[0].entertainer_name,shift:shift_res,m:parseInt(req.query.m),y:parseInt(req.query.y),
        ent_id:req.query.entertainer_id
        });
});

//以下要ログイン

//キャスト名変更（新人１などとして登録した人の名前が判明した場合などに使用）
app.get("/entertainer/rename",async(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    let [ent_res] = await query("select * from entertainer where entertainer_id > 2;",{},req,res);
    res.render("rename_entertainer.ejs",{all_cast:ent_res})
})

//キャスト名変更受け取り
app.post("/entertainer/rename",async(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    await query("update entertainer set entertainer_name = :name \
            where entertianer_id = :id;",
            {id:parseInt(req.body.before_name),name:req.body.after_name},req,res);
    //完了画面表示→enthome画面へ遷移
    res.render("form_end_page.ejs",{url:req.originalUrl,show_id:req.body.before_name});

});

//新人登録
//演者一覧から登録ー＞http://localhost:3000/entertainer/new-ent
//報告承認or編集or新ポジションからアクセスー＞
// http://localhost:3000/entertainer/new-ent?name= &redirect= 
app.get("/entertainer/new-ent",async(req,res) => {
    //ログイン確認
    loginCheck(req,res);
    [all_cast_res] = await query(ENT_SQL,{},req,res);
    res.render("create_new_entertainer.ejs",{all_cast: all_cast_res,name:req.query.name,
        redirect:req.query.redirect
    });
})

//新人登録POST
app.post("/entertainer/new-ent",async(req,res) => {
        //ログイン確認
        loginCheck(req,res);
        let [ent_id] = await query("insert into entertainer (entertainer_name,bio) value (:name,:bio);",
            {name:req.body.name,bio:req.body.bio},req,res)
        //完了画面表示→enthome画面へ遷移
        res.render("form_end_page.ejs",{url:req.originalUrl,show_id:ent_id.insertId,
            redirect:req.body.redirect
        });
})

