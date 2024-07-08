const express = require("express");
const Tweet = require("../models/tweet");
const mongoose = require('mongoose');
const Comment = require("../models/comment");
const uploader = require("../middleware/upload");
const { getFileStreamByFilename , deleteVoiceNode} = require('../middleware/grid')



const app = express();

let DATE = `${new Date().getDate()}-${new Date().getMonth() + 1}-${new Date().getFullYear()}`;
let TIME = `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;

const recursiveSearch = async (commentId, foundComments) => {
  let comment = await Comment.findById({ _id: commentId }).exec();
  foundComments.push(comment);

  if (comment && comment.commentId) {
    await recursiveSearch(comment.commentId, foundComments);
  }

  return foundComments;
};



app.post("/posttweets", uploader.single('audio'), (req, res) => {

  if (req.isAuthenticated()) {
    const unique_id = req.tweetId; 
    const tweet = {
      _id: unique_id,
      name: req.user.currentActiveAccount.user.name,
      username: req.user.currentActiveAccount.user.username,
      content: req.body.tweetContent,
      picture: req.user.currentActiveAccount.user.picture,
      likes: 0,
      comments: 0,
      date: DATE,
      time: TIME,
      likedBy: [],
      audio: req.file ? {
        file_id: unique_id,
        filename: unique_id.toString(),
        contentType: req.file.mimetype,
      } : null,
    };

    Tweet.create(tweet)
      .then((response) => {
        res.status(200).send({
          message: "Tweet has been posted.",
          postedTweet: response,
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

app.get("/gettweets", (req, res) => {
  if (req.isAuthenticated()) {
    Tweet.find(
      req.query.all === "true"
        ? {}
        : { username: req.query.customUser || req.user.currentActiveAccount.user.username },
    )
      .then((response) => {
        res.status(200).send({
          message: "Tweets are successfully send.",
          tweets: response == null ? [] : response,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error.",
        });
      });
  } else {
    console.log("Unauthorized fetching tweet request.");
    res.status(401).send({
      message: "Unauthorized.",
    });
  }
});


app.get("/gettweet/:tweetId", (req, res) => {

  if (req.isAuthenticated()) {
    Tweet.findById({ _id: req.params.tweetId })
      .then((doc) => {

        res.status(200).send({
          message: "Tweet is successfully sent.",
          tweet: doc
        })

      })
      .catch(
        (err) => {
          console.log(err);
          res.status(500).send({
            message: "Internal server error."
          })
        }
      )
  }
  else {
    console.log("Unauthorized fetching tweet request.");
    res.status(401).send({
      message: "Unauthorized."
    });
  }
})

app.post("/deletetweet", async(req, res) => {

  console.log(req.body);
  if (req.isAuthenticated()) {

    if(req.body.audio){
      console.log(req.body.audio.filename);
      await  deleteVoiceNode(req.body.audio.filename);
    }
    Tweet.deleteOne({ _id: req.body.tweetId })
      .then(() => {
        res.status(200).send({
          message: "Tweet has been deleted."
        })
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error."
        })
      })
  }
  else {
    res.status(401).send({
      message: "Unauthorized."
    });
  }
})

app.post("/liketweet", (req, res) => {

  if (req.isAuthenticated()) {
    const Model = req.body.isComment ? Comment : Tweet;
    Model.findOne({ _id: req.body.tweetId }) // could be a comment id bcz comment is treated as a tweet
      .then((doc) => {

        const userExists = (doc.likedBy.filter((username) => {
          return (username === req.user.username);
        }))

        if (userExists.length === 0) {
          Model.updateOne(
            { _id: req.body.tweetId },
            {
              likes: doc.likes + 1,
              $push: { likedBy: req.user.username }
            }
          )
            .then((response) => {
              res.status(200).send({
                message: "Likes incremented.",
                updatedLikes: doc.likes + 1
              })
            })
        }
        else {

          Model.updateOne(
            { _id: req.body.tweetId },
            {
              likes: doc.likes - 1,
              $pull: { likedBy: req.user.username }
            }
          )
            .then((response) => {
              res.status(200).send({
                message: "Likes decremented.",
                updatedLikes: doc.likes - 1
              })
            })
        }

      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error."
        })
      })
  }
  else {
    res.status(401).send({
      message: "Unauthorized."
    });
  }
})

app.post("/comment", uploader.single('audio'), (req, res) => {
  const unique_id = req.tweetId;
  if (req.isAuthenticated()) {
    const comment = {
      _id: unique_id,
      commentId: req.body.tweetId, // comment is treated as a tweet, so this could be comment id too
      name: req.user.name,
      username: req.user.username,
      content: req.body.tweetContent, // commentContent
      picture: req.user.picture,
      likes: 0,
      comments: 0,
      date: DATE,
      time: TIME,
      likedBy: [],
      audio: req.file ? {
        file_id: unique_id,
        filename: unique_id.toString(),
        contentType: req.file.mimetype,
      } : null,
    }

    Comment.create(comment)
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error"
        })
      })

    const Model = req.body.isComment ? Comment : Tweet;
    Model.findByIdAndUpdate({ _id: req.body.tweetId }, { comments: req.body.comments + 1 })
      .then((response) => {
        res.status(200).send({
          message: "Comment has been successfully posted.",
          updatedComments: req.body.comments + 1
        })
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error"
        })
      })
  }
  else {
    res.status(401).send({
      message: "Unauthorized."
    });
  }
})

app.post("/getcomments", (req, res) => {
  if (req.isAuthenticated()) {
    Comment.find({ commentId: req.body.tweetId }) // might be the commentId too
      .then((docs) => {
        res.status(200).send({
          message: "Commments are fetched successfully",
          comments: docs
        })
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send({
          message: "Internal server error."
        })
      })
  }
  else {
    res.status(401).send({
      message: "Unauthorized."
    });
  }
})

// app.get("/getcomments", (req, res) => {
//     if (req.isAuthenticated()) {
//         Comment.find({ commentId: req.body.tweetId }) // might be the commentId too
//             .then((docs) => {
//                 res.status(200).send({
//                     message: "Commments are fetched successfully",
//                     comments: docs
//                 })
//             })
//             .catch((err) => {
//                 console.log(err);
//                 res.status(500).send({
//                     message: "Internal server error."
//                 })
//             })
//     }
//     else {
//         res.status(401).send({
//             message: "Unauthorized."
//         });
//     }
// })

app.get("/getcomments/:tweetId", async (req, res) => {

  if (req.isAuthenticated()) {
    try {
      let foundComments = await recursiveSearch(req.params.tweetId, []);
      res.status(200).send({
        message: "Comments are successfully fetched.",
        comments: foundComments
      });
    }
    catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Internal server error."
      });
    }
  }
  else {
    res.status(401).send({
      message: "Unauthorized."
    });
  }
})


app.get("/getAudio/:filename", async (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    return res.status(404).send({ error: "Filename is required" });
  }

  try {
    const { buffer, contentType } = await getFileStreamByFilename(filename);
    res.setHeader("Content-Type", contentType || "audio/webm").status(200).send(buffer);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = app;