import express from "express";
import sequelize from "./config/database.js";
import { DataTypes } from "sequelize";
import crypto from "crypto";
import cors from "cors";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import sessionConnect from "connect-session-sequelize";
import { User, Server } from "./models/index.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import driveRoutes from "./routes/drive.js";
import homeRoutes from "./routes/home.js";
import courseRoutes from "./routes/course.js";
import categoryRoutes from "./routes/category.js";
import instructorRoutes from "./routes/instructor.js";
import dashboardRoutes from "./routes/dashboard.js";
import userRoutes from "./routes/user.js";
import searchRoutes from "./routes/search.js";
import { populateUser } from "./middleware/owner.js";
import { promises as fsp } from "fs";
import path from "path";
import { ASSETS_PATH, WEB_PATH, PORT, KEYS_PATH } from "./config/path.js";
import { OIDC } from "./config/oidc.js";
const SequelizeStore = sessionConnect(session.Store);
const app = express();

const secretKey = async () => {
  const filepath = KEYS_PATH;
  try {
    const fileContent = await fsp.readFile(filepath, "utf8");
    const data = JSON.parse(fileContent);
    return data.expressSecret;
  } catch (error) {
    console.log("No key found generating new key");
  }
  const data = {};
  const newKey = crypto.randomBytes(16).toString("hex");
  data.expressSecret = newKey;
  await fsp.writeFile(filepath, JSON.stringify(data, null, 2));
  return newKey;
};
const expressSecret = await secretKey();
const syncdb = async () => {
  // sync() never alters existing tables, so add columns introduced later.
  const queryInterface = sequelize.getQueryInterface();
  if ((await queryInterface.showAllTables()).includes("Users")) {
    const columns = await queryInterface.describeTable("Users");
    if (!columns.oidcSub) {
      await queryInterface.addColumn("Users", "oidcSub", DataTypes.STRING);
    }
    const indexes = await queryInterface.showIndex("Users");
    const hasUniqueSub = indexes.some(
      (index) =>
        index.unique && index.fields.some((f) => f.attribute === "oidcSub"),
    );
    if (!hasUniqueSub) {
      await queryInterface.addIndex("Users", ["oidcSub"], { unique: true });
    }
  }
  await sequelize.sync({ logging: false });
  console.log("Database & tables created!");
  await Server.findOrCreate({
    where: { name: "VIDYA" },
    defaults: { name: "VIDYA" },
  });
};
syncdb();

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        const dummySalt = crypto.randomBytes(16).toString("hex");
        crypto.pbkdf2Sync(expressSecret, dummySalt, 1000, 64, "sha512");
        return done(null, false, { message: "Invalid credentials" });
      }
      let isPasswordValid;
      try {
        const inputHash = crypto
          .pbkdf2Sync(password, user.salt, 1000, 64, "sha512")
          .toString("hex");
        isPasswordValid = crypto.timingSafeEqual(
          Buffer.from(inputHash),
          Buffer.from(user.password),
        );
      } catch (err) {
        return done(err);
      }
      if (!isPasswordValid) {
        return done(null, false, { message: "Invalid credentials" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }),
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    console.error(error);
    const serverError = new Error("Internal server error");
    serverError.status = 500;
    done(serverError);
  }
});

app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, origin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(
  "/assets",
  express.static(ASSETS_PATH, {
    maxAge: "1y",
  }),
);
app.use(express.static(WEB_PATH));

app.use(
  session({
    secret: expressSecret,
    store: new SequelizeStore({ db: sequelize }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      // The OIDC callback is a cross-site redirect; strict would drop the session.
      sameSite: OIDC.enabled ? "lax" : "strict",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());
app.use(populateUser);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/drive", driveRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);

app.get("/isFirstStartUp", async (req, res) => {
  const server = await Server.findAll();
  res.status(200).json(server[0].isFirstStartUp);
});
app.get("*", (req, res) => {
  res.sendFile(path.join(WEB_PATH, "index.html"));
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
