const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const MongoUtil = require("../mongo/query");
const SqlUtil = require("../sql/query");
const { v4: uuidv4 } = require("uuid"); // Generate unique room IDs

const JWT_SECRET_KEY = process.env.JWT_SECRET;

let onlineUserIdsSet = new Set();
let mongoUtil; // ✅ Fixed Syntax Error
let sqlUtil = new SqlUtil(); // ✅ SQL Utility instance

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
    console.log("🔒 Socket authentication token:", token); // Log the token
    jwt.verify(token, JWT_SECRET_KEY, (err, decode) => {
      if (err) {
        console.error(err);
        return next(new Error("Authentication Error"));
      }
      socket.userId = decode.id; // Set userId from JWT token
      socket.userName = decode.name; // Set userName from JWT token
      console.log(`✅ User authenticated. User ID: ${socket.userId}`); // Log the userId
      next();
    });
  });

  io.on("connection", async (socket) => {
    const userIdStr = socket.userId.toString();
    onlineUserIdsSet.add(userIdStr);
    io.emit(`return_online_status_${userIdStr}`, { online_status: true });

    console.log(`✅ User ${userIdStr} connected.`); // Log user connection

    // Online status check
    socket.on("online_status_check", (data) => {
      const { target_user_id } = data;
      const targetUserIdStr = target_user_id?.toString();
      const isOnline = onlineUserIdsSet.has(targetUserIdStr);
      io.emit(`return_online_status_${targetUserIdStr}`, {
        online_status: isOnline,
      });
    });

    socket.on("createRoom", async (data) => {
      // Debugging for received data
      if (!data) {
        console.error("❌ No data received.");
        socket.emit("error", { message: "No data received." });
        return;
      }

      if (!data.user1_id || !data.user2_id) {
        console.error("❌ Missing user1_id or user2_id", data);
        socket.emit("error", {
          message: "User ID and recipient ID are required.",
        });
        return;
      }

      let { user1_id, user2_id } = data;
      // Ensure `user1_id` and `user2_id` are numbers
      user1_id = Number(user1_id);
      user2_id = Number(user2_id);

      if (isNaN(user1_id) || isNaN(user2_id)) {
        console.error("❌ User ID and recipient ID must be valid numbers");
        socket.emit("error", { message: "Invalid user ID or recipient ID" });
        return;
      }

      try {
        // Call the createRoom method to insert the room data into the database
        const room = await sqlUtil.createRoom(user1_id, user2_id);

        if (room) {
          // Emit the created room data to the client
          socket.emit("roomCreated", {
            roomId: room.id,
            roomUuid: room.room_uuid,
            user1_id: room.user1_id,
            user2_id: room.user2_id,
            created_at: room.created,
          });
        } else {
          socket.emit("error", { message: "Room creation failed." });
        }
      } catch (error) {
        console.error("❌ Error in createRoom:", error);
        socket.emit("error", {
          message: "Error creating room. Please try again.",
        });
      }
    });

    socket.on("joinRoom", async (data) => {
      /*     const { user2_id } = data;
      let user1_id = socket.userId; */
      const { user2_id } = data;
      let user1_id = socket.userId;
      console.log(user2_id, user1_id);

      if (!data) {
        console.error("❌ No data received.");
        socket.emit("error", { message: "No data received." });
        return;
      }
      if (!user1_id || !data.user2_id) {
        console.error("❌ Missing user1_id or user2_id", data);
        socket.emit("error", {
          message: "User ID and recipient ID are required.",
        });
        return;
      }

      if (
        !Number.isInteger(Number(user1_id)) ||
        !Number.isInteger(Number(user2_id))
      ) {
        console.error("❌ User IDs must not be integers.");
        socket.emit("error", { message: "User IDs must not be integers." });
        return;
      }

      // Convert user1_id and user2_id to numbers if they are not integers

      try {
        if (!user1_id || !user2_id) {
          socket.emit("error", { message: "Invalid user IDs." });
          return;
        }

        // Check if the room exists
        let room = await sqlUtil.findRoom(user1_id, user2_id);

        if (!room) {
          // Create a new room if not found
          room = await sqlUtil.createRoom(user1_id, user2_id);
          console.log(`🆕 New room created: ${room.room_uuid}`);
        } else {
          socket.emit("error", {
            message: "You already have a room with this user.",
          });
          return;
        }

        // Check if the user is authorized to join
        if (
          ![room.user1_id, room.user2_id].includes(user1_id) &&
          ![room.user1_id, room.user2_id].includes(user2_id)
        ) {
          socket.emit("error", {
            message: "You are not authorized to join this room.",
          });
          return;
        }

        // Join the room in Socket.io
        socket.join(room.room_uuid);
        socket.emit("roomJoined", {
          room_uuid: room.room_uuid,
          user1_id: room.user1_id,
          user2_id: room.user2_id,
          created_at: room.created_at,
        });

        console.log(`✅ User ${user1_id} joined room: ${room.room_uuid}`);
      } catch (error) {
        console.error("❌ Error in joinRoom:", error);
        socket.emit("error", { message: "Error joining the room. Try again." });
      }
    });

    socket.on("sendMessage", async (messageData) => {
      const { message, receiver_id } = messageData; // No room_uuid passed
      let sender_id = socket.userId;
      try {
        // 🔎 Step 1: Fetch room information using sender & receiver IDs
        let room = await sqlUtil.findRoom(sender_id, receiver_id);

        // 🛑 If room does not exist, stop here
        if (!room || !room.room_uuid) {
          console.log("❌ Room not found for these users.");
          socket.emit("error", { message: "Room does not exist." });
          return;
        }

        // Extract the room UUID
        let room_uuid = room.room_uuid;

        console.log(`✅ Room found: ${room_uuid}`);

        // 🔎 Step 2: Ensure the sender is part of the room
        if (![room.user1_id, room.user2_id].includes(sender_id)) {
          console.log("❌ Sender is not part of the room.");
          socket.emit("error", { message: "Unauthorized sender." });
          return;
        }

        // 🔎 Step 3: Save the message in MongoDB
        await mongoUtil.insertMessage(
          room_uuid,
          sender_id,
          receiver_id,
          message
        );

        // 🔎 Step 4: Emit the message to the room
        io.to(room_uuid).emit("newMessage", {
          sender_id,
          receiver_id,
          message,
          created_at: new Date(),
        });

        console.log(
          `✅ Message from ${sender_id} sent to ${receiver_id}: ${message}`
        );
      } catch (error) {
        console.error("❌ Error saving message:", error);
        socket.emit("error", { message: "Failed to send message." });
      }
    });
    socket.on("getMessages", async (data) => {
      const { user2_id } = data;
      let user1_id = socket.userId;
      try {
        // Step 1: Fetch the room from the SQL database
        let room = await sqlUtil.findRoom(user1_id, user2_id);

        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Step 2: Fetch messages from MongoDB for the room
        const messages = await mongoUtil.getMessages(room.room_uuid);

        console.log(JSON.stringify(messages, null, 2));
        // Step 3: Send the room and messages data back to the client
        socket.emit("roomMessages", {
          room_uuid: room.room_uuid,
          user1_id: room.user1_id,
          user2_id: room.user2_id,
          created_at: room.created_at,
          messages: messages,
        });

        console.log(`✅ Fetched messages for room: ${room.room_uuid}`);
      } catch (error) {
        console.error("❌ Error fetching messages:", error);
        socket.emit("error", { message: "Error fetching messages." });
      }
    });

    // ✅ Send a Global Message
    socket.on("sendGlobalMessage", async ({ type, message }) => {
      let sender_id = socket.userId;

      if (typeof type !== "string") {
        console.error("❌ Invalid type. It must be a string.");
        return socket.emit("error", {
          message: "Invalid type. It must be a string.",
        });
      }
      try {
        await mongoUtil.insertGlobalMessage(sender_id, type, message);

        io.emit("newGlobalMessage", {
          sender_id,
          message,
          type,
          created_at: new Date(),
        });

        console.log(`🌍 Global message from ${sender_id}: ${message}`);
      } catch (error) {
        console.error("❌ Error saving global message:", error);
        socket.emit("error", { message: "Failed to send global message." });
      }
    });

    // ✅ Get All Global Messages
    // 🟢 Get Global Messages (Public Chat)
    socket.on("getGlobalMessages", async (data) => {
      const { type } = data;
      console.log(
        `📡 Request received for global messages of type: ${type || "all"}`
      );

      try {
        // Fetch messages from MongoDB
        const messages = await mongoUtil.getGlobalMessages(type);

        // Log full messages
        console.log(
          "📜 Sending global messages to client:",
          JSON.stringify(messages, null, 2)
        );

        // Send the full message data correctly
        socket.emit("globalMessageHistory", { messages });
      } catch (error) {
        console.error("❌ Error fetching global messages:", error);
        socket.emit("error", {
          message: "Failed to retrieve global messages.",
        });
      }
    });
    //////// gang

    socket.on("gangMegSend", async (data) => {
      try {
        const { gid, message } = data;

        if (!gid || !message) {
          return socket.emit("error", {
            message: "GID and message are required",
          });
        }

        const sender_id = socket.userId;

        // ✅ Check if gang exists in MySQL
        const [rows] = await sqlUtil.query(
          "SELECT mid FROM gang_members WHERE gid = ?",
          [gid]
        );

        if (rows.length === 0) {
          return socket.emit("error", {
            message: "Gang ID not found in the database.",
          });
        }

        // ✅ Insert gang message into MongoDB
        const result = await mongoUtil.insertGangMessage(
          gid,
          sender_id,
          message
        );

        console.log(
          `✅ Gang message sent by ${sender_id} to GID ${gid}: ${message}`
        );

        io.emit("newGangMessage", {
          sender_id,
          gid,
          message,
          created_at: new Date(),
        });
      } catch (error) {
        console.error("❌ Detailed error during gangMegSend:", error);
        socket.emit("error", { message: "Failed to send gang message." });
      }
    });

    socket.on("getGangMessages", async (data) => {
      try {
        const { gid } = data;

        let condition = "WHERE id = ?";
        let params = [gid];
        let gang = await sqlUtil.find("gangs", condition, params);

        if (gang.length === 0) {
          console.error("No gang found for this GID.");
          return socket.emit("error", {
            message: "No gang found for this GID.",
          });
        }
        const messages = await mongoUtil.getMessagesForGang(gid);
        if (messages.length === 0) {
          console.error("No messages available for this gang.");
          socket.emit("noMessages", {
            message: "No messages available for this gang.",
          });
        }

        // If messages exist, emit them
        socket.emit("gangMessages", {
          gid,
          messages,
        });
        console.log(messages);
      } catch (error) {
        console.error("❌ Error fetching gang messages:", error);
        socket.emit("error", { message: "Failed to fetch gang messages." });
      }
    });

    // 🟢 Handle user disconnection
    socket.on("disconnect", () => {
      onlineUserIdsSet.delete(userIdStr);
      io.emit(`return_online_status_${userIdStr}`, { online_status: false });
      console.log(`❌ User ${userIdStr} disconnected.`);
    });
  });

  console.log("🚀 Socket.io Server running on port 3000");

  return io;
}

module.exports = { setupSocketServer, initializeMongoConnection };
