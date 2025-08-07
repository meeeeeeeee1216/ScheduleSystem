function render(){

  const body = document.getElementsByTagName("tbody");

  const today_Y = parseInt(document.getElementById("year").value);
  const today_M = parseInt(document.getElementById("month").value) - 1;
  //最初の曜日
  const firstday = new Date(today_Y, today_M, 1).getDay();
  //最後の日付
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
    let shift_text = ""
    //シフトを持ってくる
    let shift = document.getElementsByName(dateArray[i]+"-shift");
    shift.forEach(s=> {
      shift_text += s.innerText;
    })
    // for(let s=0;s.length;s++){
    //   console.log("a")
    //   console.log(shift[s])
    //   shift_text += shift[s].innerText;
    // }
    //枠追加
    tmp.push(document.createElement("td"));
    //範囲内だったら文字を入れる
    if(dateArray[i] >= 1 && dateArray[i] <= lastdate){
        tmp[tmp.length -1].innerText = dateArray[i] + "日"  + shift_text;
        tmp[tmp.length -1].id = toString(dateArray[i]);
    }
    rows[rows.length -1].appendChild(tmp[tmp.length -1]);
    //金曜日にきたら一列tbodyに追加
    if(i%7 == 6){
      body[0].appendChild(rows[rows.length -1]);
    }
  }
}

render();





