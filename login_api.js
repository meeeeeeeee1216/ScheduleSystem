const express = require("express");
const cookie_parser = require("cookieParser");
const jsonwebtoken = require("jsonwebtoken");

//ログイン、トークン生成
export const login = async() => {
    try{
        let [db_res] = await con.query("select * from account where account_id = :id;"
            ,{id:req.body.account_id});
        if(db_res.length == 1){
            //アカウントがある
            let isPWCorrect = await bcrypt.compare(req.body.PW,db_res[0].PW);
            if(!isPWCorrect){
                throw new Error();
            }else{
                //ログイン成功
                //トークン生成
                let token = sign({id:req.body.account_id},LOGIN_SECRET_KEY,{expirsIn:"2h"})
                //レスポンスに含める
                res.cookie("token",token,{
                    httpOnly: true,
                    secure: true
                });
                
            } 
        }else{
            throw new Error();
        }
    }catch{
        res.status(401).send("IDかパスワードが間違っています")
    }
};


export function check_token(req,res){
    try{
        const {token} = req.cookies;
        if(token == undefined){
            //ログインしてない
            throw new Error()
        }
    }catch{
        res.clearCookie("token");
        res.status(401).send("ログインされていません")
    }
}