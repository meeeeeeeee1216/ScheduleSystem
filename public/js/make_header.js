
        // <div class="header">
        //     <h1 id="title">
        //         ショーシフト管理システム
        //     </h1>
        //     <button id="signin" onclick="location.href='http://localhost:3000/sign-in'">管理者ログイン</button>
        //     <button id="signup" onclick="location.href='http://localhost:3000/sign-up'">管理アカウント作成申請</button>
        // </div>

const body_ele = document.getElementsByTagName("body");


const div_ele = document.createElement("header");
div_ele.class = "header";
div_ele.style.backgroundColor = "gray";
body_ele[0].appendChild(div_ele);

const title_ele = document.createElement("h1");
title_ele.id = "title";
title_ele.textContent = "ショーシフト管理システム";
title_ele.style.display = 'inline';
title_ele.addEventListener("click",() => {
  location.href = "http://localhost:3000/home"
})
div_ele.appendChild(title_ele);

const signin_ele = document.createElement("button");
signin_ele.id = "signin";

signin_ele.addEventListener("click",function(){
  location.replace("http://localhost:3000/sign-in?error=0");
}, false);
//チェック用
// signin_ele.onclick = "signin.html";
signin_ele.textContent = "管理者ログイン";
title_ele.style.padding = '0px 40px';
div_ele.appendChild(signin_ele);

const signup_ele = document.createElement("button");
signup_ele.id = "signup";

signup_ele.addEventListener("click",function(){
  location.replace("http://localhost:3000/sign-up");
}, false);
//チェック用
// signin_ele.onclick = "signup.html";
signup_ele.textContent = "管理者アカウント作成申請";
title_ele.style.padding = '0px 40px';
div_ele.appendChild(signup_ele);


