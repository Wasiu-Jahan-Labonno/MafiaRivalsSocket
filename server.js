/* const { createServer } = require("http");
const {
  setupSocketServer,
  initializeMongoConnection,
} = require("./socket/socketServer");
require("dotenv").config();

const server = createServer();
const io = setupSocketServer(server);

server.listen(process.env.port, async () => {
  await initializeMongoConnection();
  console.log(`Server running at Port: ${process.env.port}`);
});
 */
/* const { createServer } = require("http");
const {
  setupSocketServer,
  initializeMongoConnection,
} = require("./socket/socketServer");
const connectDB = require("./db"); // Import MongoDB connection function
require("dotenv").config();
const MongoUtil = require("../mongo/query");
const server = createServer();
const io = setupSocketServer(server);

(async () => {
  try {
    await connectDB(); // Connect to MongoDB
    console.log("✅ MongoDB Connection Established");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
  }
})();

const PORT = process.env.PORT || 3000;

// Check if the port is already in use
server
  .listen(PORT, async () => {
    await initializeMongoConnection();
    console.log(`🚀 Server running at Port: ${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ Port ${PORT} is already in use. Trying another port...`
      );
      const newPort = Math.floor(Math.random() * (4000 - 3001) + 3001); // Random port 3001-4000
      server.listen(newPort, async () => {
        await initializeMongoConnection();
        console.log(`🚀 Server running at Port: ${newPort}`);
      });
    } else {
      console.error("❌ Server Error:", err);
    }
  }); */

////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////

/* const { createServer } = require("http");
const {
  setupSocketServer,
  initializeMongoConnection,
} = require("./socket/socketServer");
require("dotenv").config();

const server = createServer();
const io = setupSocketServer(server);

server.listen(process.env.PORT || 3000, async () => {
  try {
    await initializeMongoConnection(); // Make sure this function initializes MongoDB connection
    console.log("✅ MongoDB Connection Established");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error);
  }
  console.log(`🚀 Server running at Port: ${process.env.PORT || 3000}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port is already in use. Trying another port...`);
    const newPort = Math.floor(Math.random() * (4000 - 3001) + 3001); // Random port 3001-4000
    server.listen(newPort, async () => {
      await initializeMongoConnection();
      console.log(`🚀 Server running at Port: ${newPort}`);
    });
  } else {
    console.error("❌ Server Error:", err);
  }
}); */

const { createServer } = require("http");
const {
  setupSocketServer,
  initializeMongoConnection,
} = require("./socket/socketServer");
require("dotenv").config();

const server = createServer();
const io = setupSocketServer(server);

server.listen(process.env.PORT || 3000, async () => {
  try {
    await initializeMongoConnection(); // Initialize MongoDB and MySQL connections
    console.log("✅ MongoDB and MySQL Connections Established");
  } catch (error) {
    console.error("❌ MongoDB or MySQL Connection Failed:", error);
  }
  console.log(`🚀 Server running at Port: ${process.env.PORT || 3000}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port is already in use. Trying another port...`);
    const newPort = Math.floor(Math.random() * (4000 - 3001) + 3001); // Random port 3001-4000
    server.listen(newPort, async () => {
      await initializeMongoConnection();
      console.log(`🚀 Server running at Port: ${newPort}`);
    });
  } else {
    console.error("❌ Server Error:", err);
  }
});
