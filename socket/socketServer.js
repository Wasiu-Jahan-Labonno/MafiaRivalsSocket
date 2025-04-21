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
    const tokenWithQuotes = socket.handshake.auth.token || socket.handshake.headers.token;
    const token = tokenWithQuotes.replace(/^"(.+)"$/, '$1');
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
    io.emit('userStatusChange', {id: socket.userId, online: true});

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

    socket.on("joinRoom", async ({friendId}, callback) => {
      if (!friendId) {
        console.error("❌ No data received.");
        callback({ status: false, error });
        return;
      }

      const user2_id = Number(friendId);
      let user1_id = Number(socket.userId);

      if (!user1_id || !user2_id) {
        console.error("❌ Missing user1_id or user2_id", data);
        callback({ status: false, error });
        return;
      }

      if (
        !Number.isInteger(user1_id) ||
        !Number.isInteger(user2_id)
      ) {
        console.error("❌ User IDs must not be integers.");
        callback({ status: false, error });
        return;
      }

      try {
        if (!user1_id || !user2_id) {
          callback({ status: false, error });
          return;
        }
        
        let room = await sqlUtil.createRoom(user1_id, user2_id);

        // Check if the user is authorized to join
        if (
          ![room.user1_id, room.user2_id].includes(user1_id) &&
          ![room.user1_id, room.user2_id].includes(user2_id)
        ) {
          callback({ status: false, error });
          return;
        }
        // Join the room in Socket.io
        socket.join(room.room_uuid);
        const messages = await mongoUtil.getMessages(room.room_uuid);
        callback({ 
          status: true, 
          room: {
            room_uuid: room.room_uuid,
            self: room.user1_id,
            other: room.user2_id,
            online: onlineUserIdsSet.has(user2_id.toString()),
          },
          messages 
        });

        console.log(`✅ User ${user1_id} joined room: ${room.room_uuid}`);
      } catch (error) {
        console.error("❌ Error in joinRoom:", error);
        callback({ status: false, error });
      }
    });

    socket.on("sendMessage", async (messageData) => {
      const { message, receiverId, roomId } = messageData; // No room_uuid passed
      let senderId = socket.userId;
      try {
        // 🔎 Step 1: Fetch room information using sender & receiver IDs
        //let room = await sqlUtil.findRoom(senderId, receiverId);

        // 🛑 If room does not exist, stop here
        /* if (!room || !room.room_uuid) {
          console.log("❌ Room not found for these users.");
          socket.emit("error", { message: "Room does not exist." });
          return;
        } */

        // Extract the room UUID
        let room_uuid = roomId;

        // 🔎 Step 2: Ensure the sender is part of the room
        /* if (![room.user1_id, room.user2_id].includes(sender_id)) {
          console.log("❌ Sender is not part of the room.");
          socket.emit("error", { message: "Unauthorized sender." });
          return;
        } */

        // 🔎 Step 3: Save the message in MongoDB
        const {insertedId} = await mongoUtil.insertMessage(
          room_uuid,
          senderId,
          receiverId,
          message
        );

        // 🔎 Step 4: Emit the message to the room
        io.to(room_uuid).emit("newMessage", {
          _id: insertedId,
          room_uuid,
          senderId,
          receiverId,
          message,
          timestamp: new Date(),
        });

        console.log(
          `✅ Message from ${senderId} sent to ${receiverId}: ${message}`
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
      let senderId = socket.userId;
      let senderName = socket.userName; // Get the sender's name from the socket

      if (typeof type !== "string") {
        console.error("❌ Invalid type. It must be a string.");
        return socket.emit("error", {
          message: "Invalid type. It must be a string.",
        });
      }
      try {
        const {insertedId} = await mongoUtil.insertGlobalMessage(senderId, senderName, type, message);
        io.emit("newGlobalMessage", {
          _id: insertedId,
          senderId,
          senderName,
          message,
          type,
          timestamp: new Date(),
        });

        console.log(`🌍 Global message from ${senderName}: ${message}`);
      } catch (error) {
        console.error("❌ Error saving global message:", error);
        socket.emit("error", { message: "Failed to send global message." });
      }
    });

    // ✅ Get All Global Messages
    // 🟢 Get Global Messages (Public Chat)
    socket.on("getGlobalMessages", async (data, callback) => {
      const { type } = data;
      console.log(
        `📡 Request received for global messages of type: ${type || "all"}`
      );

      try {
        // Fetch messages from MongoDB
        const messages = await mongoUtil.getGlobalMessages(type);

        // Log full messages
        /* console.log(
          "📜 Sending global messages to client:",  
          JSON.stringify(messages, null, 2)
        ); */

        // Send the full message data correctly
        //socket.emit("globalMessageHistory", { messages });
        
      callback({ status: true, messages});
      } catch (error) {
        console.error("❌ Error fetching global messages:", error);
        callback({ status: false, error});
        /* socket.emit("error", {
          message: "Failed to retrieve global messages.",
        }); */
      }
    });
    //////// gang

    socket.on("gangMsgSend", async (data, callback) => {
      try {
        let {userId, userName} = socket;

        let condition = "WHERE mid = ?";
        let params = [userId];
        let gang = await sqlUtil.find("gang_members", condition, params);
        if (gang.length === 0) {
          console.error("No gang found for this GID.");
          return callback({ status: false, message: "No gang found for this user." });
        }
        const { message, uuid } = data;

        // ✅ Insert gang message into MongoDB
        const {insertedId} = await mongoUtil.insertGangMessage(
          uuid,
          userId,
          userName,
          message,
        );

        io.to(uuid).emit("newGangMessage", {
          _id: insertedId,
          roomId: uuid,
          senderId: userId,
          senderName: userName,
          message,
          timestamp: new Date(),
        });

        callback({ status: true, message: {
            _id: insertedId,
            roomId: uuid,
            senderId: userId,
            senderName: userName,
            message,
            timestamp: new Date(),
          } 
        });
      } catch (error) {
        console.error("❌ Detailed error during gangMegSend:", error);
        socket.emit("error", { message: "Failed to send gang message." });
      }
    });

    socket.on("getGangMessages", async (data, callback) => {
      try {
        socket.join(data.uuid);
        const messages = await mongoUtil.getMessagesForGang(data.uuid);
        // If messages exist, emit them
        callback({ status: true, messages});
      } catch (error) {
        console.error("❌ Error fetching gang messages:", error);
        callback({ status: false, error});
      }
    });

    //ChatList
    socket.on("fetchChatList", async (data, callback) => {
      try {
        const {userId, userName} = socket;
        const idList = await sqlUtil.fetchChatIdList(userId);
        const chatList = await mongoUtil.getLastMessages(idList);
        const merged = idList.map(user => {
          const lastMsg = chatList.find(msg => msg.room_uuid === user.room_uuid);
          return {
            ...user,
            objectId: lastMsg?._id || null,
            message: lastMsg?.message || null,
            timestamp: lastMsg?.timestamp || null,
            receiver: lastMsg?.receiverId || null,
            online: onlineUserIdsSet.has(user.id.toString()),
          };
        });
        callback({ status: true, chatList: merged });
        console.log("📜 Chat list fetched successfully:", merged);
      } catch (error) {
        console.error("❌ Error fetching chat list:", error);
        callback({ status: false, error});
      }
    });

    // 🟢 Handle user disconnection
    socket.on("disconnect", () => {
      onlineUserIdsSet.delete(userIdStr);
      io.emit(`return_online_status_${userIdStr}`, { online_status: false });
      io.emit('userStatusChange', {id: socket.userId, online: false});
      console.log(`❌ User ${userIdStr} disconnected.`);
    });
  });

  console.log("🚀 Socket.io Server running on port 3000");

  return io;
}

module.exports = { setupSocketServer, initializeMongoConnection };
