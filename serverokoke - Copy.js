const express = require("express");
const app = express();
const path = require("path");
const server = require("http").createServer(app);
var dateFormat = require("dateformat");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const usr = [];
const mng = require("mongodb").MongoClient;

// Connection URL
const url = "mongodb://localhost:27017";
// Create a new MongoClient

var mysql = require("mysql");

var sql = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "backendmafia",
});
var msglst = [];

/////////server listen port///////
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server listening at port %d", port);
});
/////////////////////////end here///////////////////

/////////// Socket Begin/////////////
io.on("connect", (socket) => {
  console.log("new user connected");

  socket.on("usrinfo", (data) => {
    ///user information get get
    //console.log(data)
    sql.query(
      "SELECT * FROM sessions INNER JOIN users ON sessions.usid=users.id INNER JOIN gcarts ON sessions.usid=gcarts.id  WHERE sessions.jwttkn=" +
        mysql.escape(data),
      function (err, reslt) {
        //console.log(reslt);

        // sql.query("SELECT * FROM gangs JOIN gcarts ON gangs.id=gcarts ")

        if (err) throw err;
        if (reslt != null) {
          if (reslt[0].gngd != 0) {
            sql.query(
              "SELECT * FROM gangs JOIN gcarts ON gangs.id=gcarts.gngd WHERE gcarts.id=" +
                mysql.escape(reslt[0].usid),
              function (err, result) {
                usr[socket.id] = {
                  sid: socket.id,
                  uid: reslt[0].usid,
                  RmID: result[0].rmid,
                  name: reslt[0].name,
                };
              }
            );
            //console.log(usr[socket.id])
          } else {
            usr[socket.id] = {
              sid: socket.id,
              uid: reslt[0].usid,
              name: reslt[0].name,
              RmID: 0,
            };
            // console.log(socket.id);
          }
        }
      }
    );

    console.log("MYSQL Connected!");
  });
  MngDtget((clbk) => {
    socket.emit("gblrcv", clbk);
  });

  socket.on("gblmsg", (msg) => {
    ////////global msg//////////
    console.log(msg);

    intMng(msg, socket.id);
  });

  socket.on("joinroom", (msg) => {});
});

function intMng(data, skd) {
  if (usr[skd])
    mng.connect(url, (err, db) => {
      if (err) throw err;
      dbo = db.db("mafia_gang");
      console.log(usr);
      var dt = {
        usrid: usr[skd]["uid"],
        usrnm: usr[skd]["name"],
        msg: data,
        Stime: dateFormat(Date.now(), "yyyy-mm-dd h:MM:ss"),
      };
      console.log(dt);
      dbo.collection("gblmsg").insertOne(dt, function (err, res) {
        if (err) throw err;
        console.log("message inserted");
      });
      db.close();
    });
}

function MngDtget(clbk) {
  mng.connect(url, (err, db) => {
    if (err) throw err;
    dbo = db.db("mafia_gang");
    dbo
      .collection("gblmsg")
      .find()
      .sort({ _id: -1 })
      .toArray((err, dt) => {
        if (err) throw err;
        msglst = [];
        dt.forEach((dtas) => {
          msglst.push({
            unid: dtas.id,
            uid: dtas.usrid,
            msg: dtas.msg,
            Tm: dtas.Stime,
            nm: dtas.usrnm,
          });
        });
        clbk(msglst);
        db.close();
      });
  });
}

function RmmsgInt(data, skd) {
  /////room msg insert
  if (usr[skd])
    mng.connect(url, (err, db) => {
      if (err) throw err;
      dbo = db.db("mafia_gang");
      console.log(usr);
      var dt = {
        usrid: usr[skd]["uid"],
        RmId: "",
        usrnm: usr[skd]["name"],
        msg: data,
        Stime: dateFormat(Date.now(), "yyyy-mm-dd h:MM:ss"),
      };
      console.log(dt);
      dbo.collection("rmmsg").insertOne(dt, function (err, res) {
        if (err) throw err;
        console.log("Room message inserted");
      });
      db.close();
    });
}
