


const id = form.account_id.value;
const pw = form.PW.value;
const sns_id = form.SNS_id.value;
const sns = form.SNS.value;
const mail = form.mail.value;


if(sns = "0"){
    sns_text = "X（旧Twitter）";
}else{
    sns_text = "Instagram"
}

const check_ele = document.getElementById("signin-form");

const check_text = document.createElement("h3");
check_text.textContent = "入力内容を確認してください";
check_ele.appendChild(check_text);

const check_id = document.createElement("p")
check_id.textContent = "アカウントID: " + id;
check_ele.appendChild(check_id);

const check_pw = document.createElement("p")
check_pw.textContent = "パスワード: " + "*"*length(pw);
check_ele.appendChild(check_pw);

const check_sns = document.createElement("p")
check_pw.textContent = "SNS: " + sns_id + "（" + sns_text + "アカウント）";
check_ele.appendChild(check_sns);

const check_mail = document.createElement("p")
check_pw.textContent = "mail: " + mail;
check_ele.appendChild(check_mail);
