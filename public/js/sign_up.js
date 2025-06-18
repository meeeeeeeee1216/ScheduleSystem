// チェック用データ
// const id = 'ID';
// const pw = 'PASS';
// const sns_id = 'snsid';
// var sns = 0;
// const mail = 'email@mail.com';

if(sns = "0"){
    sns_text = "X（旧Twitter）";
}else{
    sns_text = "Instagram"
}
//表示文章
const check_ele = document.getElementById("signin-form");

const check_text = document.createElement("h3");
check_text.textContent = "入力内容を確認してください";
check_ele.appendChild(check_text);

const check_id = document.createElement("p")
check_id.textContent = "アカウントID: " + id;
check_ele.appendChild(check_id);

const check_pw = document.createElement("p")
check_pw.textContent = "パスワード: " + "*".repeat(pw.length);
check_ele.appendChild(check_pw);

const check_sns = document.createElement("p")
check_sns.textContent = "SNS: " + sns_id + "（" + sns_text + "アカウント）";
check_ele.appendChild(check_sns);

const check_mail = document.createElement("p")
check_mail.textContent = "mail: " + mail;
check_ele.appendChild(check_mail);

//送信用フォームデータ挿入
const id_form = document.getElementsByName("account_id");
id_form[0].value = id;
const pw_form = document.getElementsByName("PW");
pw_form[0].value = pw;
const snsID_form = document.getElementsByName("SNS_id");
snsID_form[0].value = sns_id;
const sns_form = document.getElementsByName("SNS");
sns_form[0].value = sns;
const mail_form = document.getElementsByName("mail");
mail_form[0].value = mail;


