const mng = require("mongodb").MongoClient;
var moment = require("moment");
// Connection URL
const url = "mongodb://localhost:27017/mafia_gang";
const { sql, mysql } = require("./mfsql");

module.exports = function (usr, grp, msglst) {
  //console.log(usr);
  (this.intMng = function (usr, data, skd, RPSC) {
    ////////////mongo global chat data insert/////////
    if (usr[skd])
      if (usr[skd]["uid"])
        mng.connect(url, (err, db) => {
          console.log(db);
          if (err) throw err;
          dbo = db.db("mafia_gng");
          var dt = {
            usrid: usr[skd]["uid"],
            like: 0,
            dislike: 0,
            flag: 0,
            usrnm: usr[skd]["name"],
            msg: data,
            Stime: moment().format(),
          };
          dbo
            .collection("gblmsg")
            .insertOne(dt)
            .then((result) => {
              var tm = moment(dt.Stime, "YYYYMMDD HH:mm:ss").fromNow();
              dt.id = result.insertedId;
              dt.tm = tm;
              dt.rtm = dt.Stime;

              //RPSC(dt);
            });
          //dltmsggbl();
          db.close();
        });
  }),
    (this.dltmsggbl = function () {
      /////////delete 10 of global msg  if global msg is more then 80///////
      mng.connect(url, (err, db) => {
        if (err) throw err;
        dbo = db.db("mafia_gang");
        dbo.collection("gblmsg").estimatedDocumentCount({}, (err, rs) => {
          ///////count global msg///
          console.log(rs);
          if (rs >= 80) {
            dbo
              .collection("gblmsg")
              .find()
              .sort({ _id: 1 })
              .limit(10)
              .forEach(
                (
                  doc ///////delete msg by foreach/////////
                ) => {
                  dbo.collection("gblmsg").remove({ _id: doc._id });
                }
              );
          } else {
            console.log("80 not store yet");
          }
        });
      });
    });

  (this.MngDtget = function (clbk) {
    ///////mongo global chat data get//////////
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
            var tm = moment(dtas.Stime, "YYYYMMDD HH:mm:ss").fromNow();
            msglst.push({
              uid: dtas.usrid,
              msg: dtas.msg,
              Tm: tm,
              rtm: dtas.Stime,
              nm: dtas.usrnm,
              id: dtas._id,
            });
          });
          clbk(msglst);
          db.close();
        });
    });
  }),
    (this.RmmsgInt = function (usr, data, skd, cllbk) {
      //////////mongo Room chat insert///////////
      if (usr[skd])
        mng.connect(url, (err, db) => {
          if (err) throw err;
          dbo = db.db("mafia_gang");
          var dt = {
            usrid: usr[skd]["uid"],
            RmId: usr[skd]["RmID"],
            usrnm: usr[skd]["name"],
            msg: data.msg,
            typ: data.typ,
            Stime: moment().format(),
          }; //type 1 for msg///2for join req//3for item req///
          dbo
            .collection("rmmsg")
            .insertOne(dt)
            .then((respns) => {
              var tm = moment(dt.Stime, "YYYYMMDD HH:mm:ss").fromNow();
              dt.id = respns.insertedId;
              dt.tm = tm;
              dt.rtm = dt.Stime;
              dt.typ = data.typ;
              cllbk(dt);
            });
          db.close();
        });
    }),
    (this.ReqOrg = function (usr, data, skd, clbk) {
      console.log(data);
      if (usr[skd])
        mng.connect(url, (err, db) => {
          if (err) throw err;
          dbo = db.db("mafia_gang");
          var dt = {
            usrid: usr[skd]["uid"],
            RmId: data.rm,
            usrnm: usr[skd]["name"],
            msg: data.msg,
            typ: data.typ,
            Stime: moment().format(),
          }; //type 1 for msg///2for join req//3for item req///
          dbo
            .collection("rmmsg")
            .insertOne(dt)
            .then((respns) => {
              var tm = moment(dt.Stime, "YYYYMMDD HH:mm:ss").fromNow();
              dt.id = respns.insertedId;
              dt.tm = tm;
              dt.rtm = dt.Stime;
              clbk(dt);
            });
          db.close();
        });
    });
  (this.RmGtMsg = function (remd, skt, clbk) {
    ///////////////mongo room chat data get/////////////
    mng.connect(url, (err, db) => {
      if (err) throw err;
      dbo = db.db("mafia_gang");
      console.log("In the bnam of the USR = " + remd[skt]["RmID"] + " - end");
      dbo
        .collection("rmmsg")
        .find({ RmId: remd[skt]["RmID"] })
        .sort({ _id: -1 })
        .toArray((err, dt) => {
          if (err) throw err;
          Grpmsglst = [];
          dt.forEach((dtas) => {
            console.log(dtas);
            var tm = moment(dtas.Stime).fromNow();
            Grpmsglst.push({
              id: dtas._id,
              rmid: dtas.RmId,
              uid: dtas.usrid,
              nm: dtas.usrnm,
              msg: dtas.msg,
              Tm: tm,
              tp: dtas.typ,
            });
          });
          clbk(Grpmsglst);
          db.close();
        });
    });
  }),
    (this.StrUvUmsg = function (usr, data, skd, cllbk) {
      //////1V1 User Msg Store/////
      if (usr[skd])
        mng.connect(url, (err, db) => {
          if (err) throw err;
          dbo = db.db("mafia_gang");
          var dt = {
            sendid: parseInt(usr[skd]["uid"]),
            rcvid: parseInt(data["oid"]),
            sts: 0,
            msg: data.msg,
            sendtm: moment().format(),
          }; //type 1 for msg///2for join req//3for item req///
          dbo
            .collection("usermsg")
            .insertOne(dt)
            .then((respns) => {
              dt.id = respns.insertedId;
              cllbk(dt);
            });
          db.close();
        });
    });

  this.GetUvUmsg = function (remd, skt, clbk) {
    ////1V1 user Msg get ////
  };
  return this;
};

/* module.exports = {
  intMng,
  // ... (other exports)
}; */
