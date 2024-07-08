const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const Comment = require("./comment");
const Schema = mongoose.Schema;

const tweetSchema = new mongoose.Schema({
  name: String,
  username: String,
  content: String,
  likes: Number,
  comments: Number,
  date: String,
  time: String,
  likedBy: [String], // emails of users
  picture: String,
  audio: {
    file_id: {
      type: Schema.Types.ObjectId,
    },
    filename: String,
    contentType: String,
  },
});

tweetSchema.plugin(passportLocalMongoose);
tweetSchema.plugin(findOrCreate);

module.exports = new mongoose.model("Tweet", tweetSchema);
