const body = document.getElementsByTagName("tbody");


//日付とってくる
const today_Y = now.getFullYear();
const today_M = now.getMonth();
const lastdate = new Date(today_Y, today_M + 1, 0).getDate();

//タイトル作る
const title = document.getElementById("calendar_title");
title.textContent = today_Y + "年" + (today_M + 1) + "月";

//一行目(日付一覧)
const dateArray = [
1,  2,  3,  4,  5,  6,  7,
8,  9, 10, 11, 12, 13, 14,
15, 16, 17, 18, 19, 20, 21,
22, 23, 24, 25, 26, 27, 28,
29, 30, 31, 32, 33, 34, 35,
36, 37, 38, 39, 40, 41, 42
]
const head = document.getElementById("calendar");
var dates = []
for(var i = 0; i < lastdate; i++){
    dates.push(document.createElement("th"))
    dates[i].innerText = today_M + 1 + "/" + dateArray[i];
    //縦書き
    dates[i].style.writingMode = "vertical-lr";
}


