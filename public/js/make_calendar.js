function render(){

  const body = document.getElementsByTagName("tbody");

  const today_Y = now.getFullYear();
  const today_M = now.getMonth();
  const firstday = new Date(today_Y, today_M, 1).getDay();
  const lastdate = new Date(today_Y, today_M + 1, 0).getDate();

  const title = document.getElementById("calendar_title");
  title.textContent = today_Y + "年" + (today_M + 1) + "月";

  // 枠の数,曜日に合わせてずらす
  const dateArray = [
    1,  2,  3,  4,  5,  6,  7,
    8,  9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28,
    29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42
  ].map(function (date) {
    return date - firstday
  });

  var rows = [];
  for(var i = 0; i < dateArray.length; i++){
    //週の切り替え
    if(i%7 == 0){
      var tmp = [];
      rows.push(document.createElement("tr"));
    }
    //枠追加
    tmp.push(document.createElement("td"));
    //範囲内だったら文字を入れる
    if(dateArray[i] >= 1 && dateArray[i] <= lastdate){
        tmp[tmp.length -1].innerText = dateArray[i] + "日" + "\n" + "予定が入る";
    }
    rows[rows.length -1].appendChild(tmp[tmp.length -1]);
    //金曜日にきたら一列tbodyに追加
    if(i%7 == 6){
      body[0].appendChild(rows[rows.length -1]);
    }
  }
}

function reset_calendar(){
  var body = document.getElementsByTagName("tbody");
  body[0].remove();
  const table = document.getElementsByTagName("table");
  body = document.createElement("tbody");
  table[0].appendChild(body);
}


var now = new Date();
//前の月
document.getElementById("prev").addEventListener("click",() => {
  reset_calendar()
  now.setMonth(now.getMonth() -1)
  render();
});

//次の月
document.getElementById("next").addEventListener("click",() => {
  reset_calendar();
  now.setMonth(now.getMonth()  + 1);
  console.log(now.getFullYear());
  console.log(now.getMonth());
  console.log(now.getDate());
  render();
});
render(0);





