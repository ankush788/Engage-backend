require("dotenv").config();
const express = require("express");
const FRONTEND_URL = require("./urlConfig");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const findOrCreate = require("mongoose-findorcreate");
const cors = require("cors");
const path = require("path");

const passportSetup = require("./passport");
const User = require("./models/user");
const authRoute = require("./routes/auth");
const tweetRoute = require("./routes/tweet");
const { app: userRoute } = require("./routes/user"); // importing "app" as variable name "userRoute"

const app = express();

app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.set("trust proxy", 1);
app.use(
  cors({
    origin: `${FRONTEND_URL}`,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

mongoose.connect(process.env.DATABASE_URL);

const store = new MongoDBSession({
  uri: process.env.DATABASE_URL,
  collection: "sessions",
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 604800000,
      secure: process.env.NODE_ENV !== "development" ? false : true,
      sameSite: process.env.NODE_ENV !== "development" ? "lax" : "none",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(User.createStrategy());

app.use("/auth", authRoute);
app.use("/tweet", tweetRoute);
app.use("/user", userRoute);

app.get("/test", (req, res) => {
  res.status(404).send({
    message: "Server is up and running.",
  });
});

app.get("*", (req, res) => {
  res.status(404).send({
    message: "Not Found",
  });
});

app.listen(8000, () => {
  console.log("App listening on port 8000");
});
