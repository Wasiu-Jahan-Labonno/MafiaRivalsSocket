require("dotenv").config();
const mysql = require("mysql2/promise");

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

  async query(sql, params) {
    const [results] = await this.pool.query(sql, params);
    return results;
  }

  async find(table, condition = "") {
    const sql = `SELECT * FROM ${table} ${condition}`;
    return await this.query(sql);
  }

  async update(table, data, condition) {
    const updates = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");
    const conditionClause = Object.keys(condition)
      .map((key) => `${key} = ?`)
      .join(" AND ");
    const sql = `UPDATE ${table} SET ${updates} WHERE ${conditionClause}`;

    return await this.query(sql, [
      ...Object.values(data),
      ...Object.values(condition),
    ]);
  }

  async delete(table, condition) {
    const sql = `DELETE FROM ${table} WHERE ${condition}`;

    return await this.query(sql);
  }

  async findWithJoin(selectQuery, joinQuery, whereQuery = "") {
    const sql = `${selectQuery} ${joinQuery} ${whereQuery}`;
    return await this.query(sql);
  }

  async updateWithJoin(updateTable, updateData, joinQuery, whereQuery) {
    const updates = Object.keys(updateData)
      .map((key) => `${updateTable}.${key} = ?`)
      .join(", ");
    const sql = `UPDATE ${updateTable} ${joinQuery} SET ${updates} ${whereQuery}`;
    return await this.query(sql, Object.values(updateData));
  }

  async findAsArray(table, where = "", column = "id") {
    const sql = `SELECT * FROM ${table} where ${where} and deleted_at is null`;
    const results = await this.query(sql);
    return results.map((row) => row[column]);
  }

  async findAsArrayforFCM(table, where = "", column = "id") {
    let whereClause = where
      ? `WHERE ${where} AND deleted_at IS NULL`
      : "WHERE deleted_at IS NULL";
    const sql = `SELECT ${column} FROM ${table} ${whereClause} ORDER BY id DESC LIMIT 1`;
    const results = await this.query(sql);
    return results.map((row) => row[column]);
  }

  async insert(table, columns, values) {
    const placeholders = values.map(() => "?").join(", ");
    const sql = `INSERT INTO ${table} ${columns} VALUES (${placeholders})`;
    return await this.query(sql, values);
  }
}

module.exports = SqlUtil;
