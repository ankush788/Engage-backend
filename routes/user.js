const express = require("express");
const User = require("../models/user");

const app = express();

const getUser = async (req, res, data) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send({ message: "Unauthorized." });
  }

  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    const currentActiveUser = await User.findOne({
      username: req.user.currentActiveAccount.user.username,
    });

    res.status(200).send({
      message: "User successfully fetched.",
      user,
      currentActiveUser,
      ...data,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Internal server error." });
  }
};

const getRandomUsers = (req, res) => {
  if (req.isAuthenticated()) {
    User.aggregate([
      {
        $match: {
          username: { $ne: req.user.currentActiveAccount.user.username },
          followedBy: {
            $not: {
              $elemMatch: {
                username: req.user.currentActiveAccount.user.username,
                name: req.user.currentActiveAccount.user.name,
                picture: req.user.currentActiveAccount.user.picture,
              },
            },
          },
        },
      },
      { $sample: { size: 4 } },
    ])
      .then((docs) => {
        res.status(200).send({
          message: "Users are successfully fetched.",
          randomUsers: docs,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error",
        });
      });
  } else {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
};

const searchUsers = (req, res, toSearch) => {
  if (req.isAuthenticated) {
    if (!toSearch) {
      return res.status(200).send({
        message: "Search term is required.",
        users: [],
      });
    }

    User.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { name: { $regex: `^${toSearch}`, $options: "i" } },
                { username: { $regex: `^${toSearch}`, $options: "i" } },
              ],
            },
            // { // excluding current user
            //   $nor: [{ name: req.user.currentActiveAccount.user.name }, { username: req.user.currentActiveAccount.user.username }],
            // },
          ],
        },
      },
    ])
      .then((docs) => {
        getUser(req, res, { users: docs });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error",
        });
      });
  } else {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
};

app.get("/getuser", (req, res) => {
  getUser(req, res, {});
});

app.get("/getusers", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.query.users === "random") {
      getRandomUsers(req, res);
    } else if (req.query.users === "current") {
      getUser(req, res);
    } else if (req.query.users === "search") {
      searchUsers(req, res, req.query.toSearch);
    } else {
      res.status(400).send({
        message: "User type not specified.",
      });
    }
  } else {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
});

app.post("/follow", (req, res) => {
  if (req.isAuthenticated) {
    let currUser = {
      name: req.user.currentActiveAccount.user.name,
      username: req.user.currentActiveAccount.user.username,
      // picture: req.user.currentActiveAccount.user.picture,
    };
    let userToFollow = {
      name: req.body.userToMap.name,
      username: req.body.userToMap.username,
      picture: req.body.userToMap.picture,
    };

    User.findOne({ username: userToFollow.username })
      .then((doc) => {
        const exists = doc.followedBy.filter((followedBy) => {
          return followedBy.username === currUser.username;
        });

        if (exists.length === 0) {
          // not following userToFollow
          User.findOneAndUpdate(
            { username: userToFollow.username },
            { $push: { followedBy: currUser } },
            { new: true }
          ).exec();
          User.findOneAndUpdate(
            { username: currUser.username },
            { $push: { follows: userToFollow } },
            { new: true }
          ).then((doc) => {
            res.status(200).send({
              message: "Follows Incremented",
              updatedFollows: doc.follows.length,
            });
          });
        } else {
          // following userToFollow already
          User.findOneAndUpdate(
            { username: userToFollow.username },
            { $pull: { followedBy: currUser } },
            { new: true }
          ).exec();
          User.findOneAndUpdate(
            { username: currUser.username },
            { $pull: { follows: userToFollow } },
            { new: true }
          ).then((doc) => {
            res.status(200).send({
              message: "Follows Decremented",
              updatedFollows: doc.follows.length,
            });
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error.",
        });
      });
  } else {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
});

app.get("/getfollows", (req, res) => {
  if (req.isAuthenticated()) {
    User.findOne({ username: req.user.currentActiveAccount.user.username })
      .then((doc) => {
        console.log(doc);
        res.status(200).send({
          message: "Followers and following are succesfully sent.",
          follows: doc.follows,
          followedBy: doc.followedBy,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error.",
        });
      });
  } else {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
});

app.post("/updateCurrentActiveUser", (req, res) => {
  if (req.isAuthenticated()) {
    const idx = req.body.idx;

    User.updateOne(
      { username: req.user.username },
      {
        $set: {
          currentActiveAccount: { user: req.user.activeAccounts[idx].user },
        },
      }
    )
      .then(async (result) => {
        const updatedUser = await User.findOne({
          username: req.user.activeAccounts[idx].user.username,
        });

        if (updatedUser) {
          res.status(200).send({
            message: "Current active account updated successfully.",
            updatedUser: updatedUser,
          });
        } else {
          res.status(404).send({
            message: "User not found.", 
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error.",
        });
      });
  } else {
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
});

module.exports = { app, getUser };
