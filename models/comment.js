const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const Schema = mongoose.Schema;

const commentSchema = new mongoose.Schema({
  commentId: String, // could be tweetId if it is a direct comment
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

commentSchema.plugin(passportLocalMongoose);
commentSchema.plugin(findOrCreate);

module.exports = new mongoose.model("Comment", commentSchema);
