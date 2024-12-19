// const mongoose = require('mongoose');

// const itemSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   amount: {
//     type: String,
//     required: true,
//   },
//   product: {
//     type: String,
//     required: false,
//   },
//   image: {
//     type: String,
//     required: false,
//   },
//   date: {
//     type: Date,
//     required: true,
//   },
//   time: {
//     type: String,
//     required: true,
//   }
// });


// const Item = mongoose.model('Item', itemSchema);

// module.exports = Item;  
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: String, required: true },
  product: { type: String },
  image: { type: String },
  date: { type: Date, default: Date.now },
  time: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // New field
});

const Item = mongoose.model("Item", ItemSchema);

module.exports = Item;  