const express = require("express");
const app = express();
const path = require("path");
const server = require("http").createServer(app);
const route = require("./featurs/route");
const cors = require("cors");
const socketIO = require("socket.io");
require("dotenv").config();

// Set up the socket.io server
/* const io = socketIO(server, {
  pingTimeout: 60000, //waiting time for user
  cors: {
    origin: "*",
    methods: "*",
    credentials: true,
  },
});
 */
app.use(cors());
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: "*",
  },
});
app.use(route);

const port = process.env.APP_PORT || 3000;
server.listen(port, () => {
  console.log("sss", process.env.APP_PORT);
  console.log("Server listening at port %d", port);
});

/////////// Socket Begin/////////////
io.on("connection", (socket) => {
  console.log("2 user connected");

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
