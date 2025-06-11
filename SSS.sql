CREATE DATABASE SSS;
USE SSS;

CREATE TABLE SSS.account ( 
account_id varchar(20) not null PRIMARY KEY,
pw varchar(50) not null,
SNS_id varchar(30) not null,
SNS tinyint not null,
bio varchar(500),
authority tinyint not null);

CREATE TABLE SSS.entertainment_show(
show_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
name VARCHAR(30) NOT NULL,
administrator_id varchar(20) NOT NULL,
FOREIGN KEY (administrator_id) references account(account_id));

CREATE TABLE SSS.co_editor(
show_id INT NOT NULL,
account_id varchar(30) NOT NULL,
PRIMARY KEY ( show_id, account_id) ,
FOREIGN KEY (show_id) references entertainment_show(show_id),
FOREIGN KEY (account_id) references account(account_id));

CREATE TABLE SSS.roll(
roll_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
name varchar(30) NOT NULL,
show_id INT NOT NULL,
memo text,
FOREIGN KEY (show_id) references entertainment_show(show_id));

CREATE TABLE SSS.irregular(
irregular_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
short_name varchar(30),
detail text);

CREATE TABLE SSS.time_table(
tt_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
show_id INT NOT NULL,
D DATE NOT NULL,
T TIME NOT NULL,
irregular_id INT NOT NULL,
FOREIGN KEY (show_id) references entertainment_show(show_id));

CREATE TABLE SSS.entertainer(
entertainer_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
name VARCHAR(50) NOT NULL,
image  TEXT);

CREATE TABLE SSS.out_of_park_schedule(
entertainer_id INT NOT NULL,
day DATE NOT NULL,
PRIMARY KEY (entertainer_id, day),
FOREIGN KEY (entertainer_id) references entertainer(entertainer_id));

CREATE TABLE SSS.shift(
tt_id INT NOT NULL,
roll_id INT NOT NULL,
entertainer_id INT,
show_id INT NOT NULL,
PRIMARY KEY (tt_id, roll_id),
FOREIGN KEY (tt_id) references time_table(tt_id),
FOREIGN KEY (roll_id) references roll(roll_id),
FOREIGN KEY (entertainer_id) references entertainer(entertainer_id),
FOREIGN KEY (show_id) references entertainment_show(show_id));


-- レコード作成
INSERT INTO account(account_id, PW, SNS_id, bio, authority,sns) VALUE 
('server', 'pass_safety','server_sns',NULL,1,1),
('show0', 'show_pass0000','show0_sns',NULL,2,1),
('show1', 'show_pass1111','show1_sns',NULL,2,2),
('show2', 'show_pass2222','show2_sns',NULL,2,2);

INSERT INTO entertainment_show (name,administrator_id)
VALUE
('restaurant_show','show0'),('escape_show','show1');

INSERT INTO co_editor (show_id,account_id)
VALUE
(1,'show2'),
(2,'show0');

INSERT INTO roll (name,show_ID,memo)
VALUE
('A役',1,NULL),	
('B役',1,NULL),	
('C役',1,NULL),	
('A役',2,NULL),	
('B役',2,NULL),	
('C役',2,NULL),	
('D役',2,NULL);

INSERT INTO irregular (short_name,detail)
VALUE
('通常開催',NULL),
('機材キャンセル','音響装置故障'),
('雷キャンセル','雷雲接近のため'),
('アドリブ再開','演出機材故障のため');

INSERT INTO Time_Table (show_ID,D,T,irregular_ID)
VALUE
(1,'2025-06-10','10:00:00',1),
(1,'2025-06-10','11:20:00',1),
(1,'2025-06-10','13:20:00',1),
(1,'2025-06-10','14:40:00',3),
(1,'2025-06-10','16:40:00',1),
(1,'2025-06-10','18:40:00',1),
(2,'2025-06-10','10:00:00',1),
(2,'2025-06-10','11:45:00',1),
(2,'2025-06-10','13:00:00',2),
(2,'2025-06-10','14:15:00',2),
(2,'2025-06-10','15:30:00',1),
(2,'2025-06-10','16:45:00',1);

INSERT INTO entertainer (name,image)
VALUE
('Ａさん',NULL),
('Ｂさん',NULL),
('Ｃさん',NULL),
('Ｄさん',NULL),
('Ｅさん',NULL),
('Ｆさん',NULL),
('Ｇさん',NULL),
('H',NULL),
('I',NULL),
('J',NULL),
('K',NULL),
('L',NULL),
('M',NULL),
('N',NULL);

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
