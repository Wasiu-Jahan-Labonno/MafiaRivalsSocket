var express = require("express");
var router = express.Router();
const mong = require("./mong"); // Replace with the correct path
const mongod = mong();
// define the home page route
router.get("/global/like/:id", function (req, res) {
  res.send("Birds home page");
});
// define the about route
router.get("/global/dislike/:id", function (req, res) {
  res.send("About birds");
});
router.get("/global/flag/:id", function (req, res) {
  res.send("About birds");
});
/* router.get("/hello", function (req, res) {
  res.send("About fgfgf");
});
 */
router.get("/hello", function (req, res) {
  try {
    // Assuming you have usr, data, skd, and RPSC available in this route handler
    const usr = { ojk: { uid: 1, name: "Lebu" } };
    const data = "ok";
    const skd = "ojk";
    const RPSC = "janinna";

    // Call the intMng function with the provided arguments
    mongod.intMng(usr, data, skd, RPSC);

    res.send("Hello route executed successfully");
  } catch (error) {
    console.error("Error in intMng function:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
