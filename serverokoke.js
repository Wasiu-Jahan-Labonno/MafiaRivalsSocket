const express = require("express");
const app = express();
const path = require("path");
const server = require("http").createServer(app);
//var dateFormat = require("dateformat");

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5500", // Replace with your client's origin
    methods: ["GET", "POST"],
  },
});

/* const usr = [];
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
var msglst = []; */

/////////server listen port///////

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server listening at port %d", port);
});
/////////////////////////end here///////////////////

io.on("connection", (socket) => {
  console.log("A user connected");

  // Listen for messages from the client
  socket.on("message", (msg) => {
    console.log("Received message:", msg);

    // Broadcast the message to all connected clients
    io.emit("message", msg);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
