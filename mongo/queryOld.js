require("dotenv").config();
const { MongoClient } = require("mongodb");

class MongoUtil {
  constructor() {
    const dbName = process.env.MONGO_DATABASE;
    const user = encodeURIComponent(process.env.MONGO_USER_NAME);
    const password = encodeURIComponent(process.env.MONGO_USER_PASSWORD);
    const host = process.env.MONGO_HOST;
    const port = process.env.MONGO_PORT;

    const url = "mongodb://localhost:27017/";

    this.dbName = dbName;
    this.client = new MongoClient(url);
    this.db = null;
  }

  /**
   * connect to databse of mongo client
   */
  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
  }

  /**
   * close the connection for mongo client
   * it will close connection after
   */
  async close() {
    await this.client.close();
  }

  /**
   * insert single data only
   * @param {*} collectionName
   * @param {*} document
   * @returns
   */
  async insertOne(collectionName, document) {
    const collection = this.db.collection(collectionName);
    const insertResult = await collection.insertOne(document);
    if (insertResult.acknowledged) {
      // Fetch the inserted document to ensure all data is returned
      const insertedDocument = await collection.findOne({
        _id: insertResult.insertedId,
      });
      return insertedDocument;
    } else {
      throw new Error("Insert not acknowledged");
    }
  }

  /**
   * insert many data at once
   * @param {*} collectionName
   * @param {*} documents
   * @returns
   */
  async insertMany(collectionName, documents) {
    const collection = this.db.collection(collectionName);
    const insertResult = await collection.insertMany(documents);
    return insertResult;
  }

  /**
   * get data with pagination
   *
   * @param {*} collectionName
   * @param {*} page
   * @param {*} pageSize
   * @param {*} query
   * @returns
   */
  async findWithPagination(
    collectionName,
    page,
    pageSize,
    query = {},
    sort = {}
  ) {
    const collection = this.db.collection(collectionName);
    const skip = (page - 1) * pageSize;
    const documents = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return documents;
  }

  /**
   * update data on a collection
   * @param {*} collectionName
   * @param {*} filter
   * @param {*} update
   * @returns
   */
  async update(collectionName, filter, update) {
    const collection = this.db.collection(collectionName);
    const updateCmd = update.$set ? update : { $set: update };
    const updateResult = await collection.updateOne(filter, updateCmd);
    return updateResult;
  }

  /**
   * delete a data
   * @param {*} collectionName
   * @param {*} filter
   * @returns
   */
  async delete(collectionName, filter) {
    // await this.connect();
    // try {
    const collection = this.db.collection(collectionName);
    const deleteResult = await collection.deleteOne(filter);
    return deleteResult;
    // } finally {
    //     await this.close();
    // }
  }
}

module.exports = MongoUtil;
