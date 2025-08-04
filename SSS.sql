DROP DATABASE SSS;
CREATE DATABASE SSS;
USE SSS;
SET NAMES 'utf8mb4';

-- authorityが1になったら承認（初期値NULL）
CREATE TABLE SSS.account ( 
account_id varchar(20) not null PRIMARY KEY,
pw varchar(50) not null,
mail text not null,
SNS_id varchar(30) not null,
SNS tinyint not null,
authority tinyint not null);

CREATE TABLE SSS.entertainment_show(
show_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
show_name VARCHAR(30) NOT NULL,
administrator_id varchar(20) NOT NULL,
FOREIGN KEY (administrator_id) references account(account_id));

-- CREATE TABLE SSS.co_editor(
-- show_id INT NOT NULL,
-- account_id varchar(30) NOT NULL,
-- PRIMARY KEY (show_id, account_id) ,
-- FOREIGN KEY (show_id) references entertainment_show(show_id),
-- FOREIGN KEY (account_id) references account(account_id));

CREATE TABLE SSS.roll(
roll_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
roll_name varchar(30) NOT NULL,
show_id INT NOT NULL,
memo text,
FOREIGN KEY (show_id) references entertainment_show(show_id));

-- CREATE TABLE SSS.irregular(
-- irregular_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
-- short_name varchar(30),
-- detail text);

-- 何時何分の回でどんなイレギュラーがあったか
CREATE TABLE SSS.time_table(
tt_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
show_id INT NOT NULL,
day_and_time DATETIME NOT NULL,
memo text,
FOREIGN KEY (show_id) references entertainment_show(show_id));

CREATE TABLE SSS.entertainer(
entertainer_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
entertainer_name VARCHAR(50) NOT NULL,
bio text);

CREATE TABLE SSS.out_of_park_schedule(
out_park_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
entertainer_id INT NOT NULL,
out_day DATE NOT NULL,
FOREIGN KEY (entertainer_id) references entertainer(entertainer_id));

-- 表示されるシフトの情報だけを入れたい
CREATE TABLE SSS.shift(
shift_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
tt_id INT NOT NULL,
roll_id INT NOT NULL,
entertainer_id INT,
show_id INT NOT NULL,
FOREIGN KEY (tt_id) references time_table(tt_id),
FOREIGN KEY (roll_id) references roll(roll_id),
FOREIGN KEY (entertainer_id) references entertainer(entertainer_id),
FOREIGN KEY (show_id) references entertainment_show(show_id));

-- 報告された情報
-- //shift -> {roll_id : ent_id or debut_cast_name}
-- //types -> {roll_id : type_id}
CREATE TABLE SSS.report(
    report_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    shift JSON NOT NULL,
    type_of_report JSON
);

CREATE TABLE SSS.notice(
    notice_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    show_id INT not null,
    type_of_message varchar(30) not null,
    content text,
    report_id INT,
    day_and_time DATETIME,
    FOREIGN KEY (show_id) references entertainment_show(show_id),
    FOREIGN KEY (report_id) references report(report_id)
);

-- アナウンス
CREATE TABLE SSS.announce(
    announce_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    d DATE NOT NULL,
    show_id INT NOT NULL,
    title text not null,
    content text not null,
    FOREIGN KEY (show_id) references entertainment_show(show_id)
);



-- レコード作成
INSERT INTO account(account_id, PW, SNS_id, authority,sns,mail) VALUE 
('server', 'pass_safety','server_sns',1,1,"mail0@samplemail.com"),
('show0', 'show_pass0000','show0_sns',2,1,"mail1@samplemail.com"),
('show1', 'show_pass1111','show1_sns',2,2,"mail2@samplemail.com"),
('show2', 'show_pass2222','show2_sns',2,2,"mail3@samplemail.com");

-- ID：１番はサーバーアカウント通知確認用
INSERT INTO entertainment_show (show_name,administrator_id)
VALUE
('request','server'),('restaurant_show','show0'),('escape_show','show1');

-- INSERT INTO co_editor (show_id,account_id)
-- VALUE
-- (1,'show2'),
-- (2,'show0');

INSERT INTO roll (roll_name,show_ID,memo)
VALUE
('A1役',1,NULL),	
('B1役',1,NULL),	
('C1役',1,NULL),	
('A2役',2,NULL),	
('B2役',2,NULL),	
('C2役',2,NULL),	
('D2役',2,NULL);

-- INSERT INTO irregular (short_name,detail)
-- VALUE
-- ('normal',NULL),
-- ('machine cancel',NULL),
-- ('thunder cancel',NULL),
-- ('temporary suspension',NULL);

-- 実際は報告された日時だけはいる（初回とシフチェン回だけみたいなイメージ）
INSERT INTO Time_Table (show_ID,day_and_time,memo)
VALUE
(1,'2025-06-10 10:00:00',null),
(1,'2025-06-10 11:20:00',null),
(1,'2025-06-10 13:20:00',null),
(1,'2025-06-10 14:40:00',null),
(1,'2025-06-10 16:40:00',null),
(1,'2025-06-10 18:40:00',null),
(2,'2025-06-10 10:00:00',null),
(2,'2025-06-10 11:45:00',null),
(2,'2025-06-10 13:00:00',null),
(2,'2025-06-10 14:15:00',null),
(2,'2025-06-10 15:30:00',null),
(2,'2025-06-10 16:45:00',null);

-- 不明と欠員は登録用にデフォルトセットする！
INSERT INTO entertainer (entertainer_name)
VALUE
('unknown'),
('vacancy'),
('A'),
('B'),
('C'),
('D'),
('E'),
('F'),
('G'),
('H'),
('I'),
('J'),
('K'),
('L'),
('M'),
('N');

INSERT INTO Shift (TT_ID,roll_ID,show_ID,entertainer_ID)
VALUE
(1,1,1,1),
(1,2,1,2),
(1,3,1,3),
(4,1,1,4),
(4,2,1,5),
(4,3,1,6),
(7,4,2,7),
(7,5,2,8),
(7,6,2,9),
(7,7,2,10),
(8,4,2,11),
(8,5,2,12),
(8,6,2,13),
(8,7,2,14);


-- CREATE TABLE SSS.report(
--     report_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
--     shift JSON NOT NULL,
--     time_and_day DATETIME NOT NULL,
--     show_id INT
-- );

-- CREATE TABLE SSS.notice(
--     notice_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
--     show_id INT not null,
--     type_of_message varchar(30) not null,
--     content text,
--     report_id INT,
--     FOREIGN KEY (show_id) references entertainment_show(show_id),
--     FOREIGN KEY (report_id) references report(report_id)
-- -- );
-- ('A1役',1,NULL),	
-- ('B1役',1,NULL),	
-- ('C1役',1,NULL),	
-- ('A2役',2,NULL),	
-- ('B2役',2,NULL),	
-- ('C2役',2,NULL),	
-- ('D2役',2,NULL);

--ID：１シフト報告のないnotice用
insert into report (shift)
VALUE
("{}");


