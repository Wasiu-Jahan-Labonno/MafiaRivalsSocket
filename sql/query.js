require("dotenv").config();
const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

class SqlUtil {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      port: process.env.SQL_PORT,
      database: process.env.SQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  // Find an existing room
  async findRoom(user1_id, user2_id) {
    const [rows] = await this.pool.query(
      `SELECT * FROM message_rooms 
             WHERE (user1_id = ? AND user2_id = ?) 
                OR (user1_id = ? AND user2_id = ?) 
             LIMIT 1`,
      [user1_id, user2_id, user2_id, user1_id]
    );
    return rows.length ? rows[0] : null;
  }
  async createRoom(user1_id, user2_id) {
    try {
      // Check if room already exists
      let existingRoom = await this.findRoom(user1_id, user2_id);
      if (existingRoom) {
        console.log("Room already exists:", existingRoom);
        return existingRoom; // Return existing room if found
      }

      const room_uuid = uuidv4(); // Generate a unique room UUID

      // Insert new room into database
      const [result] = await this.pool.query(
        "INSERT INTO message_rooms (room_uuid, user1_id, user2_id, created_at) VALUES (?, ?, ?, ?)",
        [room_uuid, user1_id, user2_id, new Date()]
      );

      console.log(`Room created with UUID: ${room_uuid}`);

      // Return the newly created room details
      return {
        id: result.insertId,
        room_uuid,
        user1_id,
        user2_id,
        created_at: new Date(),
      };
    } catch (error) {
      console.error("❌ Error creating room:", error);
      throw error; // Propagate error
    }
  }

  // Create a room if it doesn't exist
  /* async createRoom(user1_id, user2_id) {
    try {
    
      let existingRoom = await this.findRoom(user1_id, user2_id);
      if (existingRoom) {
        return existingRoom; // Return existing room
      }

      const room_uuid = uuidv4(); // Generate a unique room UUID

      // Insert new room into database
      const [result] = await this.pool.query(
        "INSERT INTO message_rooms (room_uuid, user1_id, user2_id,created_at) VALUES (?, ?, ?,?)",
        [room_uuid, user1_id, user2_id, new Date()]
      );

      // Return the newly created room details
      return { id: result.insertId, room_uuid, user1_id, user2_id, created_at };
    } catch (error) {
      console.error("❌ Error creating room:", error);
      throw error; // Propagate error
    }
  }
 */
  // Insert a message into the database
  async insertMessage(room_uuid, sender_id, message) {
    try {
      const [result] = await this.pool.query(
        "INSERT INTO messages (room_uuid, sender_id, message, created_at) VALUES (?, ?, ?, ?)",
        [room_uuid, sender_id, message, new Date()]
      );
      console.log(`✅ Message saved with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error("❌ Error saving message:", error);
      throw error;
    }
  }

  // Insert into a table
  async insert(table, columns, values) {
    const placeholders = values.map(() => "?").join(", ");
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const [result] = await this.pool.query(sql, values);
    return result.insertId; // Return the ID of the inserted row
  }

  // Find records from a table with an optional condition
  async find(table, condition = "", params = []) {
    const sql = `SELECT * FROM ${table} ${condition}`;
    const [results] = await this.pool.query(sql, params);
    return results;
  }

  ////
  // Retrieve chat history for a room
  async getChatHistory(room_uuid) {
    try {
      const [messages] = await this.pool.query(
        "SELECT * FROM messages WHERE room_uuid = ? ORDER BY created_at ASC",
        [room_uuid]
      );
      return messages;
    } catch (error) {
      console.error("❌ Error Fetching Chat History:", error);
      throw new Error("Failed to fetch chat history");
    }
  }

  // General query function
  async query(sql, params = []) {
    const [results] = await this.pool.query(sql, params);
    return results;
  }

  // Update records in a table
  async update(table, data, condition) {
    const updates = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const conditionClause = Object.keys(condition)
      .map((key) => `${key} = ?`)
      .join(" AND ");
    const sql = `UPDATE ${table} SET ${updates} WHERE ${conditionClause}`;
    const [result] = await this.pool.query(sql, [
      ...Object.values(data),
      ...Object.values(condition),
    ]);
    return result.affectedRows;
  }

  // Delete records from a table
  async delete(table, condition) {
    const sql = `DELETE FROM ${table} WHERE ${condition}`;
    const [result] = await this.pool.query(sql);
    return result.affectedRows;
  }

  // Join tables with a condition
  async findWithJoin(selectQuery, joinQuery, whereQuery = "", params = []) {
    const sql = `${selectQuery} ${joinQuery} ${whereQuery}`;
    const [results] = await this.pool.query(sql, params);
    return results;
  }

  // Update with a join
  async updateWithJoin(
    updateTable,
    updateData,
    joinQuery,
    whereQuery,
    params = []
  ) {
    const updates = Object.keys(updateData)
      .map((key) => `${updateTable}.${key} = ?`)
      .join(", ");
    const sql = `UPDATE ${updateTable} ${joinQuery} SET ${updates} ${whereQuery}`;
    const [result] = await this.pool.query(sql, [
      ...Object.values(updateData),
      ...params,
    ]);
    return result.affectedRows;
  }
}

module.exports = SqlUtil;
