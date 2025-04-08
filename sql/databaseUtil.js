require("dotenv").config();
const mysql = require("mysql2/promise");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");

// MongoDB Schema
const mongoose = require("mongoose");
const messageRoomSchema = new mongoose.Schema(
  {
    room_id: String, // UUID
    user1_id: Number,
    user2_id: Number,
  },
  { timestamps: true }
);
const MessageRoomMongo = mongoose.model("MessageRoom", messageRoomSchema);

class DatabaseUtil {
  constructor() {
    // ✅ Initialize MySQL Pool
    this.sqlPool = mysql.createPool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      port: process.env.SQL_PORT,
      database: process.env.SQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // ✅ MongoDB Connection
    const mongoUrl = "mongodb://localhost:27017/";
    this.mongoClient = new MongoClient(mongoUrl);
    this.db = null;

    this.connectMongo();
  }

  /**
   * ✅ Connect to MongoDB
   */
  async connectMongo() {
    try {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db(process.env.MONGO_DATABASE);
      console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
      console.error("❌ MongoDB Connection Failed:", error);
    }
  }

  // --------------------------------------------------
  // ✅ MySQL Methods
  // --------------------------------------------------

  async query(sql, params = []) {
    const [results] = await this.sqlPool.query(sql, params);
    return results;
  }

  async find(table, condition = "", params = []) {
    return await this.query(`SELECT * FROM ${table} ${condition}`, params);
  }

  async update(table, data, condition) {
    const updates = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const conditionClause = Object.keys(condition)
      .map((key) => `${key} = ?`)
      .join(" AND ");
    return await this.query(
      `UPDATE ${table} SET ${updates} WHERE ${conditionClause}`,
      [...Object.values(data), ...Object.values(condition)]
    );
  }

  async delete(table, condition) {
    return await this.query(`DELETE FROM ${table} WHERE ${condition}`);
  }

  async insert(table, columns, values) {
    const placeholders = values.map(() => "?").join(", ");
    return await this.query(
      `INSERT INTO ${table} ${columns} VALUES (${placeholders})`,
      values
    );
  }

  // --------------------------------------------------
  // ✅ Room Management (MySQL + MongoDB)
  // --------------------------------------------------

  /**
   * Find a room in MySQL
   */
  async findRoom(user1_id, user2_id) {
    const [rows] = await this.sqlPool.query(
      `SELECT * FROM message_rooms 
             WHERE (user1_id = ? AND user2_id = ?) 
                OR (user1_id = ? AND user2_id = ?) 
             LIMIT 1`,
      [user1_id, user2_id, user2_id, user1_id]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Create a room in MySQL and store in MongoDB
   */
  async createRoomIfNotExists(user1_id, user2_id) {
    let room = await this.findRoom(user1_id, user2_id);
    if (room) {
      console.log("✅ Room Exists:", room.id);
      return room;
    }

    // Generate a unique room UUID
    const room_id = uuidv4();

    // Insert into MySQL
    await this.sqlPool.query(
      `INSERT INTO message_rooms (id, user1_id, user2_id) VALUES (?, ?, ?)`,
      [room_id, user1_id, user2_id]
    );

    console.log("✅ New Room Created:", room_id);

    // Save in MongoDB
    const mongoRoom = new MessageRoomMongo({ room_id, user1_id, user2_id });
    await mongoRoom.save();

    return { id: room_id, user1_id, user2_id };
  }

  // --------------------------------------------------
  // ✅ MongoDB Methods
  // --------------------------------------------------

  /**
   * Insert a single document into MongoDB
   */
  async insertOne(collectionName, document) {
    if (!this.db) await this.connectMongo();
    try {
      return await this.db.collection(collectionName).insertOne(document);
    } catch (error) {
      console.error("❌ MongoDB Insert Error:", error);
    }
  }

  /**
   * Find all documents in MongoDB
   */
  async findAll(collectionName, query = {}, sort = {}) {
    if (!this.db) await this.connectMongo();
    try {
      return await this.db
        .collection(collectionName)
        .find(query)
        .sort(sort)
        .toArray();
    } catch (error) {
      console.error("❌ MongoDB Find Error:", error);
      return [];
    }
  }

  /**
   * Update a document in MongoDB
   */
  async updateOne(collectionName, filter, update) {
    if (!this.db) await this.connectMongo();
    try {
      return await this.db
        .collection(collectionName)
        .updateOne(filter, { $set: update });
    } catch (error) {
      console.error("❌ MongoDB Update Error:", error);
    }
  }

  /**
   * Delete a document from MongoDB
   */
  async deleteOne(collectionName, filter) {
    if (!this.db) await this.connectMongo();
    try {
      return await this.db.collection(collectionName).deleteOne(filter);
    } catch (error) {
      console.error("❌ MongoDB Delete Error:", error);
    }
  }
}

// ✅ Export Singleton Instance
module.exports = DatabaseUtil;
