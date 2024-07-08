const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? `http://localhost:8000`
    : `https://engagebackend.vercel.app`;
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/auth/google/callback`,
    },
    async function (accessToken, refreshToken, profile, cb) {
      try {
        let user = await User.findOne({ username: profile.emails[0].value });

        if (!user) {
          user = new User({
            username: profile.emails[0].value,
            name: profile.displayName,
            joined: `${new Date().toLocaleString("default", {
              month: "long",
            })} ${new Date().getFullYear()}`,
            googleId: profile.id,
            picture: profile._json.picture,
            follows: [],
            followedBy: [],
            activeAccounts: [
              {
                user: {
                  name: profile.displayName,
                  username: profile.emails[0].value,
                  picture: profile._json.picture,
                },
              },
            ],
            currentActiveAccount: {
              user: {
                name: profile.displayName,
                username: profile.emails[0].value,
                picture: profile._json.picture,
              },
            },
          });

          await user.save();
        }

        return cb(null, user);
      } catch (err) {
        console.log("Error in registration of user.");
        console.log(err);
        return cb(err);
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
