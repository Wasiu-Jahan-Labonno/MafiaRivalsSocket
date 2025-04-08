module.exports = function (io) {
  const { sql, mysql, joinOrgRQ } = require("./mfsql");

  const usr = [];
  var msglst = [];
  const grp = [];
  const mong = require("./mong")(usr, grp, msglst);
  const usrCd = [];

  /////////// Socket Begin/////////////
  io.on("connect", (socket) => {
    console.log(mong);
    socket.on("usrinfo", (data) => {
      ///user information get  socket///////////

      sql.query(
        "SELECT gcarts.name, gcarts.id, gcarts.gngd FROM sessions INNER JOIN gcarts on gcarts.id = sessions.usid where sessions.jwttkn =" +
          mysql.escape(data),
        (err, reslt) => {
          if (err) throw err;

          if (reslt.length > 0) {
            if (reslt[0].gngd != "0") {
              sql.query(
                "SELECT * FROM gangs where id = " + mysql.escape(reslt[0].gngd),
                (err, result) => {
                  usr[socket.id] = {
                    sid: socket.id,
                    uid: reslt[0].id,
                    RmID: "grp" + result[0].rmid,
                    name: reslt[0].name,
                  };
                  console.log(usr.length + " new user connected");
                  console.log(usr[socket.id], " Connected!");
                }
              );
            } else {
              usr[socket.id] = {
                sid: socket.id,
                uid: reslt[0].id,
                name: reslt[0].name,
                RmID: "grp0",
              };
            }
            usrCd[reslt[0].id] = { sid: socket.id };
            socket.emit("scrCstbl", [data, socket.id]);
          } else {
            socket.emit("scrCstbl", "usr token Error");
          }
        }
      );
    });
    socket.on("callForGetGblbMsg", (msg) => {
      // Get Call for Globale Msg
      socket.join("global");
      // socket.leave(usr[socket.id]['RmID'])
      mong.MngDtget((clbk) => {
        ////global data emit to front end socket/////////// Responce for  for Globale Msg
        socket.emit("RspForGetGblbMsg", clbk);
      });
    });
    socket.on("pshGlbmsg", (msg) => {
      ////////global msg//////////
      mong.intMng(usr, msg, socket.id, (rsps) => {
        let Rm = {
          uid: rsps.usrid,
          msg: rsps.msg,
          Tm: rsps.tm,
          rtm: rsps.rtm,
          nm: rsps.usrnm,
          id: rsps._id,
        };
        socket.emit("RspForPushGblbMsg", Rm);
        socket.broadcast.to("global").emit("RspForPushGblbMsg", Rm);
      });
    });
    socket.on("inroom", (msg) => {
      ////////////socket room joining////////
      if (usr[socket.id]) {
        if (usr[socket.id]["RmID"] != "0") {
          if (!grp[usr[socket.id]["RmID"]]) {
            grp[usr[socket.id]["RmID"]] = [socket.id];
          } else {
            if (!grp[usr[socket.id]["RmID"]].includes(socket.id)) {
              grp[usr[socket.id]["RmID"]].push(socket.id);
            }
          }
          socket.join(usr[socket.id]["RmID"]);

          io.to(usr[socket.id]["RmID"]).emit(
            "grpmsg",
            "I havebeen JOin the " + socket.id
          );
          mong.RmGtMsg(usr, socket.id, (clbk) => {
            io.to(socket.id).emit("gtRmMsg", [usr[socket.id]["uid"], clbk]);
          });
        }
      }
    });

    socket.on("reqorg", (data) => {
      ///secret organization request in here////
      data.rm = "grp" + data.rm;
      mong.ReqOrg(usr, data, socket.id, (resp) => {
        let Rmsg = {
          uid: resp.usrid,
          msg: resp.msg,
          Tm: resp.tm,
          rtm: resp.rtm,
          nm: resp.usrnm,
          id: resp._id,
          typ: resp.typ,
        };
        Rmsg.typ = "mAskrqst";
        io.to(data.rm).emit("respnpushRMmsg", [resp.usrid, Rmsg]);
        console.log(data.rm, Rmsg);
      });
    });
    socket.on("pushRmsg", (data) => {
      mong.RmmsgInt(usr, data, socket.id, (rsps) => {
        console.log(rsps);
        let Rmmsg = {
          uid: rsps.usrid,
          msg: rsps.msg,
          Tm: rsps.tm,
          rtm: rsps.rtm,
          nm: rsps.usrnm,
          id: rsps._id,
          tp: rsps.typ,
        };
        console.log(rsps.typ);
        if (rsps.typ == 1) {
          Rmmsg.typ = "l";
        } else {
          Rmmsg.typ = "mJr";
        }

        // socket.broadcast.to(usr[socket.id]['RmID']).emit('respnpushRMmsg',Rmmsg)
        io.to(usr[socket.id]["RmID"]).emit("respnpushRMmsg", [
          usr[socket.id]["uid"],
          Rmmsg,
        ]);
      });
    });

    socket.on("rmvFrmGlbm", (wdtvs) => {
      /////remove user from global msg
      console.log("sthmp", wdtvs);
      socket.leave("global");
    });

    socket.on("orgRmv", (vallo) => {
      /////remove user from organization msg

      if (usr[socket.id]) {
        if (usr[socket.id]["RmID"] != "0") {
          socket.leave(usr[socket.id]["RmID"]);
        }
      }
    });

    socket.on("usr1v1", (data) => {
      /////1V1 user conversation store msg//////
      console.log(data);
      mong.StrUvUmsg(usr, data, socket.id, (rsps) => {
        console.log(rsps);
        if (usrCd[data.oid] == null) {
          console.log("msg store but not send");
        } else {
          io.to(usrCd[data.oid]["sid"]).emit("resintusrmsg", rsps);
          console.log("msg send in socket");
        }
      });
    });

    socket.on("getmsg", (data) => {
      ////getting uaser msg of specific user////
    });
    socket.on("notification", (msg) => {
      ////socket notification for all/////
      console.log(msg);
    });

    socket.on("ntfymsg", (data) => {
      if (usr[socket.id]) {
        console.log("room id", usr[socket.id]["RmID"]);
        io.to(socket.id).emit("ntmsg", data);
        socket.broadcast
          .to(usr[socket.id]["RmID"])
          .emit("respnpushRMmsg", data);
        console.log(data);
      }
    });

    socket.on("disconnectme", (reason) => {
      delete usr[socket.id];
      console.log(reason);
      socket.emit("Re - connect");
    });
  }); //////////global socket end here////////////
};
