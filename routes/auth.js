const FRONTEND_URL = require("../urlConfig");
const express = require("express");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const User = require("../models/user");
const { passwordStrength } = require("check-password-strength");
const { getUser } = require("./user");

const app = express();

const handleAlreadyLoggedIn = async (req, res, user) => {
  let isGoogleLogin = user ? true : false;
  user =
    user ||
    new User({
      username: req.body.username,
    });
  try {
    const foundUser = await User.findOne({ username: user.username }); // found the user to be appended in activeAccounts
    const userExists = req.user.activeAccounts.some(
      (account) => account.user.username === user.username
    );
    if (!userExists) {
      req.user.activeAccounts.push({ user: foundUser });
    }
    req.user.currentActiveAccount = {
      user: {
        name: foundUser.name,
        username: foundUser.username,
        picture: foundUser.picture,
      },
    };

    await User.findOneAndUpdate({ username: req.user.username }, req.user, {
      new: true,
    }).then((parentUser) => {
      let userIdx = parentUser.activeAccounts.findIndex(
        (account) =>
          account.user.username ===
          parentUser.currentActiveAccount.user.username
      );
      if (isGoogleLogin) {
        return res.redirect(`${FRONTEND_URL}/u/${userIdx}/home`);
      } else {
        getUser(req, res, { loggedIn: true });
        // send parent user as well as updated user here
        // res.status(200).send({
        //   loggedIn: true,
        //   message: "User updated successfully",
        //   parentUser: parentUser,
        // });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      loggedIn: false,
      message: "Error updating user.",
      error: err,
    });
  }
};

app.get("/pre-google", (req, res) => {
  req.session.preLoggedIn = req.isAuthenticated();
  res.status(200).send({ message: "Session set up for OAuth" });
});

app.get(
  "/google",
  (req, res, next) => {
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user) => {
    if (err || !user) {
      return res.redirect(`${FRONTEND_URL}/failure`);
    }

    if (req.session.preLoggedIn == true) {
      handleAlreadyLoggedIn(req, res, user);
    } else {
      req.login(user, (err) => {
        if (err) {
          return res.redirect(`${FRONTEND_URL}/failure`);
        }

        let userIdx = user.activeAccounts.findIndex(
          (account) =>
            account.user.username === user.currentActiveAccount.user.username
        );
        return res.redirect(`${FRONTEND_URL}/u/${userIdx}/home`);
      });
    }
  })(req, res, next);
});

app.post("/signup", (req, res) => {
  User.find({ username: req.body.username })
    .then((response) => {
      if (response[0] === undefined) {
        if (passwordStrength(req.body.password).value === "Too weak") {
          res.status(403).send({
            registered: false,
            message: "Too weak password",
          });
          return;
        }

        User.register(
          {
            username: req.body.username,
            name: req.body.name,
            joined: `${new Date().toLocaleString("default", {
              month: "long",
            })} ${new Date().getFullYear()}`,
            follows: [],
            followedBy: [],
            activeAccounts: [
              {
                user: {
                  name: req.body.name,
                  username: req.body.username,
                },
              },
            ],
            currentActiveAccount: {
              user: {
                name: req.body.name,
                username: req.body.username,
              },
            },
          },
          req.body.password,
          function (err, user) {
            if (user) {
              res.status(200).send({
                registered: true,
                message: "Registration successful.",
                user: user,
                cookies: req.cookies,
              });
            } else {
              console.log(err);
              res.status(500).send({
                registered: false,
                message: "Registration failed.",
                error: err,
              });
            }
          }
        );
      } else {
        res.status(403).send({
          registered: false,
          message: "Email already in use",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send({
        registered: false,
        message: "Registration failed.",
        error: err,
      });
    });
});

app.post("/login", async (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  let alreadyLoggedIn = req.isAuthenticated();

  passport.authenticate("local", (err, user, info) => {
    if (!user || err) {
      return res.status(401).send({
        loggedIn: false,
        message: "Authentication failure.",
        error: err,
      });
    }

    if (alreadyLoggedIn) {
      return handleAlreadyLoggedIn(req, res);
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(401).send({
          loggedIn: false,
          message: "Login failure.",
          error: err,
        });
      }
      getUser(req, res, {
        loggedIn: true,
        message: "Login Successful",
      });
    });
  })(req, res);
});

app.get("/login/success", (req, res) => {
  try {
    if (req.isAuthenticated()) {
      
      getUser(req, res, {});
    } else {
      res.send({
        loggedIn: false,
        message: "Not Logged In.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Internal server error.",
    });
  }
});

app.get("/login/failure", (req, res) => {
  res.status(401).send({
    loggedIn: false,
    message: "Login failure.",
  });
});

app.post("/logout", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) throw new Error("User not found");

    user.resetUser();

    req.logout((err) => {
      if (!err) {
        res.status(200).send({ message: "Successful logout" });
      } else {
        console.error("Error during logout:", err.message);
      }
    });
  } catch (err) {
    console.error("Error during logout:", err.message);
    res.status(500).send({ message: "Error during logout" });
  }
});

module.exports = app;