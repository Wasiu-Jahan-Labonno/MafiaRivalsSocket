var mysql = require('mysql');
const date = require('date-and-time')
var sql = mysql.createConnection({
    host: " ",
    user: "root",
    password: "Mafia2022@#",
    database: 'mafia_final'
});

module.exports = {
    sql: sql,
    mysql: mysql,


    joinOrgRQ: (usrid, orgid, calback) => {
        const now = new Date();
        const value = date.format(now, 'YYYY-MM-DD HH:mm:ss');
        sql.query("SELECT gngtyp,name FROM gangs WHERE gangs.id=" + mysql.escape(orgid), (err, rsn) => {
            if (err) throw err
            if (rsn[0].gngtyp == 1) {
                st = 1
            } else {
                st = 0;
            }
            sql.query("SELECT gngd FROM gcarts WHERE gcarts.id=" + mysql.escape(usrid), (err, respn) => {
                if (err) throw err
                if (respn[0].gngd == 0) {
                    sql.query("INSERT INTO gang_members (gid,mid,gpstn,psts,sts,reqtm,etm) VALUES ('" + orgid + "','" + usrid + "','3','0','" + st + "','" + value + "','" + value + "')", (err, res) => {
                        if (err) throw err
                        if (st = 1) {
                            sql.query("UPDATE gcarts SET gngd='" + orgid + "' WHERE gcarts.id='" + usrid + "'", (err, res) => {
                                if (err) throw err
                                console.log(res);
                                calback('You are Successfully join ' + rsn[0].name + ' gang');
                            })
                        }
                    })

                } else {
                    calback('You are already in Gang');
                }
            })

        })
    }

}