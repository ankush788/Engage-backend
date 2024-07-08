const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");

const userSchema = new mongoose.Schema({
  name: String,
  joined: String,
  username: String,
  password: String,
  googleId: String,
  picture: String,
  follows: [
    {
      name: String,
      username: String,
      picture: String,
    },
  ],
  followedBy: [
    {
      name: String,
      username: String,
      picture: String,
    },
  ],
  activeAccounts: [
    {
      user: {
        name: String,
        username: String,
        picture: String,
      },
    },
  ],
  currentActiveAccount: {
    user: {
      name: String,
      username: String,
      picture: String,
    },
  },
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
userSchema.methods.resetUser = async function () {
  this.currentActiveAccount = {
    user: {
      name: this.name,
      username: this.username,
      picture: this.picture,
    },
  };
  this.activeAccounts = [{ user: this.currentActiveAccount.user }];
  await this.save();
};


module.exports = new mongoose.model("User", userSchema);
