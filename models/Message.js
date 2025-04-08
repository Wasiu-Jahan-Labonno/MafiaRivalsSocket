const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  room_id: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "message" },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
