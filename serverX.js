const http = require("http");
const express = require("express");
const morgan = require("morgan");
//const cors=require('cors');
const app = express();
//app.use(cors());
//app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var mongo = require("mongodb");
const server = http.createServer(app);
const path = require("path");
//var io=require('socket.io')(server);
/* var dbo;
var users=[],me=[]; */
var io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
// for latest version

///////////////mongo connection//////////////
var mongoose = require("mongoose");
var url = "mongodb://localhost:27017/chat";

const userRouter = require("./routes/user");

mongoose.connection.on("connected", () => {
  console.log("Mongo has connected succesfully");
});
mongoose.connection.on("reconnected", () => {
  console.log("Mongo has reconnected");
});
mongoose.connection.on("error", (error) => {
  console.log("Mongo connection has an error", error);
  mongoose.disconnect();
});
mongoose.connection.on("disconnected", () => {
  console.log("Mongo connection is disconnected");
});

//////////////////mongo insert msg/////////////////////////
function MgoIstdt(Bdb, col, dt) {
  mongo.connect(url, function (err, db) {
    // if (err) throw err;
    dbo = db.db(Bdb);
    // var data={name:'hassan',msg:"hello"}
    dbo.collection(col).insertOne(dt, function (err, res) {
      if (err) throw err;
      console.log("message inserted");
    });

    console.log("mongo connected");
    //let c=  db.collection('user_msg')
    db.close();
  });
}

////////////////mongo query for get data///////////
function MngoDatagt(dtb, col, data, resps) {
  mongo.connect(url, function (err, db) {
    dt = db.db(dtb);
    var mysort = { sdt: -1 };
    dt.collection(col)
      .find()
      .sort(mysort)
      .limit(5)
      .toArray(function (err, res) {
        if (err) throw err;
        resps(res);
      });
    db.close();
  });
}
//////////////////momngo end msg///////////////////

////////////////////mongo connection end here/////////////////////

////////////////////socket connection start here///////////////

io.on("connection", (socket) => {
  /*   socket.on('MafiaCtd', (p1)=>{
        console.log(p1);
      }); */
  // socket.emit('message', "Iam Snding Msg");
  console.log("socket connected to user" + "" + " soket id=" + socket.id);
  // console.log(socket);
});

/* 
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/////////////////socket connection end here////////////////
app.use(express.static(path.join(__dirname,'/html_css'))); 
app.use('/',userRouter); */
/* app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
 */

const port = 3000;

server.listen(port);
server.on("listening", () => {
  console.log("lisiting on port ", port);
});
