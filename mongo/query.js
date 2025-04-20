require("dotenv").config();
const { MongoClient } = require("mongodb");

class MongoUtil {
  constructor() {
    const dbName = process.env.MONGO_DATABASE;
    const user = encodeURIComponent(process.env.MONGO_USER_NAME);
    const password = encodeURIComponent(process.env.MONGO_USER_PASSWORD);
    const host = process.env.MONGO_HOST;
    const port = process.env.MONGO_PORT;
    // Create MongoDB URL with Authentication if Credentials Exist
    const url = "mongodb://localhost:27017/";

    this.dbName = dbName;
    this.client = new MongoClient(url);
    this.db = null;
  }
  async insertMessage(room_uuid, senderId, receiverId, message) {
    await this.connect();
    const collection = this.db.collection("messages");
    return await collection.insertOne({
      room_uuid,
      senderId,
      receiverId,
      message,
      timestamp: new Date(),
    });
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
      console.error("❌ MongoDB Connection Failed:", error);
    }
  }

  /* async getMessages(sender_id, receiver_id) {
    if (!this.db) await this.connect();
    try {
      const collection = this.db.collection("messages");

      // Find messages where sender & receiver match (in either order)
      return await collection
        .find({
          $or: [
            { sender_id, receiver_id },
            { sender_id: receiver_id, receiver_id: sender_id }, // Reverse order
          ],
        })
        .sort({ timestamp: 1 })
        .toArray(); // Sort by timestamp (oldest first)
    } catch (error) {
      console.error("❌ Error retrieving messages:", error);
      return [];
    }
  } */
  /**
   * Close the MongoDB connection
   */

  /**
   * Insert a single document into a collection
   */
  async insertOne(collectionName, document) {
    if (!this.db) await this.connect();
    try {
      const collection = this.db.collection(collectionName);
      const result = await collection.insertOne(document);
      return result;
    } catch (error) {
      console.error("❌ Error inserting document:", error);
    }
  }

  /**
   * Insert multiple documents into a collection
   */
  async insertMany(collectionName, documents) {
    if (!this.db) await this.connect();
    try {
      const collection = this.db.collection(collectionName);
      return await collection.insertMany(documents);
    } catch (error) {
      console.error("❌ Error inserting multiple documents:", error);
    }
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    collectionName,
    page,
    pageSize,
    query = {},
    sort = {}
  ) {
    if (!this.db) await this.connect(); // Ensure db connection
    try {
      const collection = this.db.collection(collectionName);
      return await collection
        .find(query)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    } catch (error) {
      console.error("❌ Error fetching paginated documents:", error);
    }
  }
  async findAll(collectionName, query = {}, sort = {}) {
    if (!this.db) await this.connect();
    try {
      const collection = this.db.collection(collectionName);
      return await collection.find(query).sort(sort).toArray();
    } catch (error) {
      console.error("❌ Error fetching all documents:", error);
      return [];
    }
  }
  /**
   * Update a document in a collection
   */
  async update(collectionName, filter, update) {
    if (!this.db) await this.connect();
    try {
      const collection = this.db.collection(collectionName);
      return await collection.updateOne(filter, { $set: update });
    } catch (error) {
      console.error("❌ Error updating document:", error);
    }
  }

  /**
   * Delete a document from a collection
   */
  async delete(collectionName, filter) {
    if (!this.db) await this.connect();
    try {
      const collection = this.db.collection(collectionName);
      return await collection.deleteOne(filter);
    } catch (error) {
      console.error("❌ Error deleting document:", error);
    }
  }

  /** ✅ Insert Global Message */
  async insertGlobalMessage(senderId, senderName, type, message) {
    await this.connect();
    const collection = this.db.collection("global_messages"); // Collection for global messages
    return await collection.insertOne({
      senderId,
      senderName,
      message,
      type,
      timestamp: new Date(),
    });
  }

  /** ✅ Fetch Private Messages */
  async getMessages(room_uuid) {
    await this.connect();
    const collection = this.db.collection("messages");
    return await collection
      .find({ room_uuid })
      .sort({ timestamp: -1 })
      .toArray();
  }

  /** ✅ Fetch Global Messages */
  async getGlobalMessages(type) {
    try {
      // Ensure collection is initialized
      if (!this.db.collection("global_messages")) {
        console.error("❌ Error: Messages collection is not initialized");
        return [];
      }

      console.log(`📡 Fetching global messages with type: ${type || "all"}`);

      const query = type ? { type } : {};
      const messages = await this.db
        .collection("global_messages")
        .find(query)
        .sort({ timestamp: -1 })
        .toArray();

      console.log(
        `📜 Retrieved ${messages.length} global messages from MongoDB`
      );
      return messages;
    } catch (error) {
      console.error("❌ Error fetching global messages from MongoDB:", error);
      return [];
    }
  }

  async insertGangMessage(userId, userName, message, gid) {
    await this.connect();
    const collection = this.db.collection("gang_messages");
    return await collection.insertOne({
      senderId: userId,
      senderName: userName,
      message,
      gid,
      timestamp: new Date(),
    });
  }

  async getMessagesForGang(gid) {
    try {
      await this.connect(); // Ensure connected to MongoDB
      const collection = this.db.collection("gang_messages");

      // Fetch all messages for the given `gid`
      const messages = await collection
        .find({ gid: gid }) // Filter messages by `gid`
        .sort({ timestamp: -1 }) // Sort by timestamp (Newest first)
        .toArray();
      // Return the fetched messages
      return messages;
    } catch (error) {
      console.error("❌ Error fetching gang messages:", error);
      return [];
    }
  }

  //Fetch Last messages for uuids
  async getLastMessages(data) {
    try {
      await this.connect();
      const collection = this.db.collection("messages");
      const promises = data.map(async uuid => {
        const msg = await collection
          .find({ room_uuid: uuid.room_uuid })
          .sort({ timestamp: -1 })
          .limit(1)
          .toArray();
    
        return msg[0] || null;
      });
    
      return await Promise.all(promises);
    } catch (error) {
      console.error("❌ Error fetching last messages:", error);
      return [];
    }
  };

  /** ✅ Fetch Gang Chat Messages */
  /*  async getGangMessages(gang_id) {
    await this.connect();
    return await this.db
      .collection("gang_messages")
      .find({ gang_id })
      .sort({ timestamp: 1 })
      .toArray();
  }
 */
  async close() {
    await this.client.close();
    console.log("🛑 MongoDB Connection Closed");
  }
}

/* module.exports = new MongoUtil(); */ // Export a single instance

module.exports = MongoUtil;
