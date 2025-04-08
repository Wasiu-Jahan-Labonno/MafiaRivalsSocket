const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const MongoUtil = require("../mongo/query");
const SqlUtil = require("../sql/query");
/* 
const mongoUtil = new MongoUtil();
const sqlUtil = new SqlUtil(); */

const JWT_SECRET_KEY = process.env.JWT_SECRET;

let onlineUserIdsSet = new Set();

/* async function initializeMongoConnection() {
  try {
    await mongoUtil.connect();
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
}
 */
let mongoUtil;

async function initializeMongoConnection() {
  try {
    mongoUtil = new MongoUtil();
    await mongoUtil.connect();
    console.log("✅ MongoDB Connection Established in socket server.");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed in socket server:", error);
  }
}

function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      allowedHeaders: ["token", "authorization"],
    },
  });

  // Middleware for token verification
  io.use((socket, next) => {
    const token = socket.handshake.headers["authorization"];
    jwt.verify(token, JWT_SECRET_KEY, (err, decode) => {
      if (err) {
        console.error(err);
        return next(new Error("Authentication Error"));
      }
      socket.userId = decode.id;
      socket.userName = decode.name;
      next();
    });
  });

  // Event handlers
  io.on("connection", async (socket) => {
    const userIdStr = socket.userId.toString();
    onlineUserIdsSet.add(userIdStr);

    io.emit(`return_online_status_${userIdStr}`, { online_status: true });

    socket.on("online_status_check", (data) => {
      const { target_user_id } = data;
      const targetUserIdStr = target_user_id?.toString();
      console.log("data", targetUserIdStr);
      const isOnline = onlineUserIdsSet.has(targetUserIdStr);
      io.emit(`return_online_status_${targetUserIdStr}`, {
        online_status: isOnline,
      });
    });

    socket.on("join_room", async (data) => {
      const { room_id } = data;
      const query = `where message_room_id='${room_id}'`;
      //   //   const checkRoom = await sqlUtil.find("request_listing_interests", query);
      //   if (checkRoom.length > 0) {
      socket.join(room_id);
      //   } else {
      //     io.emit("listen_error_" + userIdStr, { message: "404" });
      //   }
    });

    socket.on("get_message_data", async (data) => {
      const { page, per_page, room_id } = data;
      const getMessageData = await MongoUtil.findWithPagination(
        "messages",
        page ?? 1,
        per_page ?? 50,
        { room_id: room_id.toString() },
        { created_at: -1 }
      );
      io.to(room_id).emit("message_data", getMessageData);
    });

    /*     socket.on("message_1v1", async (data) => {
      const { room_id, message, receiver_id } = data;
      const messageDetails = {
        user_id: socket.userId,
        room_id: room_id,
        message: message,
        type: "message",
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      //   await mongoUtil.insertOne("messages", messageDetails);
      io.to(room_id).emit("message_1v1_receiver", messageDetails);

      //   if (!onlineUserIdsSet.has(receiver_id.toString())) {
      //     const senderId = socket.userId;
      //     systemQueue.add({
      //       type: "message_notification",
      //       details: { receiver_id, message_id, senderId },
      //     });
      //   }
    }); */

    socket.on("message_1v1", async (data) => {
      const { room_id, message, receiver_id } = data;
      const messageDetails = {
        user_id: socket.userId,
        room_id,
        message,
        type: "message",
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log("Inserting message:", messageDetails); // Log the message data for debugging

      try {
        const savedMessage = await MongoUtil.insertOne(
          "messages",
          messageDetails
        );
        if (savedMessage) {
          console.log("✅ Message Saved:", savedMessage);
          io.to(room_id).emit("message_1v1_receiver", savedMessage);
        } else {
          console.log("❌ Message Not Saved");
        }
      } catch (error) {
        console.error("❌ Error saving message:", error); // Log the error if any
      }
    });

    socket.on("disconnect", () => {
      onlineUserIdsSet.delete(userIdStr);
      io.emit(`return_online_status_${userIdStr}`, { online_status: false });
    });
  });

  return io;
}

module.exports = { setupSocketServer, initializeMongoConnection };

//////////////////////////////////////////////////////////////////////////////\
//////////////////////////////////////////////////////////////////////////////\
// //////////////////////////////////////////////////////////////////////////////\
////////////////////////////////////////////////////////////////////////////////\

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const MongoUtil = require("../mongo/query"); // Ensure MongoUtil is correct
const SqlUtil = require("../sql/query");

const JWT_SECRET_KEY = process.env.JWT_SECRET;

let onlineUserIdsSet = new Set();

let mongoUtil;
let sqlUtil = new SqlUtil(); // SQL Utility instance

async function initializeMongoConnection() {
  try {
    mongoUtil = new MongoUtil();
    await mongoUtil.connect();
    console.log("✅ MongoDB Connection Established in socket server.");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed in socket server:", error);
  }
}

function setupSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      allowedHeaders: ["token", "authorization"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.headers["authorization"];
    jwt.verify(token, JWT_SECRET_KEY, (err, decode) => {
      if (err) {
        console.error(err);
        return next(new Error("Authentication Error"));
      }
      socket.userId = decode.id;
      socket.userName = decode.name;
      next();
    });
  });

  io.on("connection", async (socket) => {
    const userIdStr = socket.userId.toString();
    onlineUserIdsSet.add(userIdStr);
    io.emit(`return_online_status_${userIdStr}`, { online_status: true });

    socket.on("online_status_check", (data) => {
      const { target_user_id } = data;
      const targetUserIdStr = target_user_id?.toString();
      const isOnline = onlineUserIdsSet.has(targetUserIdStr);
      io.emit(`return_online_status_${targetUserIdStr}`, {
        online_status: isOnline,
      });
    });

    socket.on("join_room", async (data) => {
      const { room_id } = data;
      const query = `WHERE message_room_id=?`;
      const params = [room_id];

      try {
        const checkRoom = await sqlUtil.find(
          "request_listing_interests",
          query,
          params
        );

        if (checkRoom.length > 0) {
          socket.join(room_id); // Room exists

          console.log("join room_id");
        } else {
          io.emit("listen_error_" + userIdStr, { message: "Room not found" });
          console.log("Room not found");
        }
      } catch (error) {
        console.error("Error checking room:", error);
        io.emit("listen_error_" + userIdStr, {
          message: "Error checking room",
        });
      }
    });

    socket.on("get_message_data", async (data) => {
      const { page, per_page, room_id } = data;
      try {
        const getMessageData = await mongoUtil.findWithPagination(
          "messages",
          page ?? 1,
          per_page ?? 50,
          { room_id: room_id.toString() },
          { created_at: -1 }
        );
        io.to(room_id).emit("message_data", getMessageData);
      } catch (error) {
        console.error("Error fetching message data:", error);
      }
    });

    socket.on("message_1v1", async (data) => {
      const { room_id, message } = data;
      const messageDetails = {
        user_id: socket.userId,
        room_id: room_id,
        message: message,
        type: "message",
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      try {
        await mongoUtil.insertOne("messages", messageDetails); // Insert message into MongoDB
        io.to(room_id).emit("message_1v1_receiver", messageDetails);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnect", () => {
      onlineUserIdsSet.delete(userIdStr);
      io.emit(`return_online_status_${userIdStr}`, { online_status: false });
    });
  });

  return io;
}

module.exports = { setupSocketServer, initializeMongoConnection };

const { createServer } = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid"); // Generate unique room IDs
require("dotenv").config();

const server = createServer();
const io = new Server(server, {
  cors: { origin: "*" }, // Allow all clients to connect
});

const rooms = {}; // Store rooms and users

io.on("connection", (socket) => {
  console.log("🔗 A user connected:", socket.id);

  // Generate a new room ID
  socket.on("create_room", () => {
    const roomId = uuidv4(); // Generate unique room ID
    rooms[roomId] = []; // Initialize room
    socket.emit("room_created", { roomId });
    console.log(`📌 Room ${roomId} created`);
  });

  // Join a room
  socket.on("join_room", ({ roomId, username }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].push({ id: socket.id, username });

      io.to(roomId).emit("user_joined", { username, roomId });
      console.log(`✅ ${username} joined Room: ${roomId}`);
    } else {
      socket.emit("error", { message: "Room not found!" });
    }
  });

  // Handle chat messages
  socket.on("send_message", ({ roomId, username, message }) => {
    if (rooms[roomId]) {
      io.to(roomId).emit("receive_message", { username, message });
      console.log(`💬 ${username}: ${message} in Room: ${roomId}`);
    }
  });

  // Leave Room
  socket.on("leave_room", ({ roomId, username }) => {
    socket.leave(roomId);
    rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id);
    io.to(roomId).emit("user_left", { username });
    console.log(`🚪 ${username} left Room: ${roomId}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
