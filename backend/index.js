import express from "express";
import sequelize from "./config/database.js";
import cors from "cors";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import sessionConnect from "connect-session-sequelize";
import { User, Server, TagsAndBookmark } from "./models/index.js";
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
import path from "path";
import { ASSETS_PATH, WEB_PATH, PORT } from "./config/path.js";
import { consumePasswordWork } from "./security/password.js";
import { getSecuritySecrets } from "./security/secrets.js";
import {
  createBearerAuthenticator,
  verifyAndUpgradeUserPassword,
} from "./security/auth.js";
import {
  createRateLimiter,
  isRequestOriginAllowed,
  parseAllowedOrigins,
  rejectQueryAuthentication,
  securityHeaders,
} from "./security/http.js";
import { registerInitialAdministrator } from "./security/setup.js";
import {
  migrateFilesystemIdentityColumns,
  migrateTagOwnershipIndex,
} from "./security/migrations.js";
const SequelizeStore = sessionConnect(session.Store);
const app = express();
const HOST = process.env.HOST?.trim() || "127.0.0.1";
const allowedOrigins = parseAllowedOrigins();
const { expressSecret, jwtSecret } = await getSecuritySecrets();
const sessionStore = new SequelizeStore({ db: sequelize });

const syncdb = async () => {
  await sequelize.sync({ logging: false });
  await migrateTagOwnershipIndex(
    sequelize.getQueryInterface(),
    TagsAndBookmark.getTableName(),
  );
  await migrateFilesystemIdentityColumns(sequelize.getQueryInterface());
  console.log("Database & tables created!");
  await Server.findOrCreate({
    where: { name: "VIDYA" },
    defaults: { name: "VIDYA" },
  });
};
await syncdb();

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.scope("withPassword").findOne({
        where: { username },
      });
      if (!user) {
        consumePasswordWork(password);
        return done(null, false, { message: "Invalid credentials" });
      }

      const isPasswordValid = await verifyAndUpgradeUserPassword(
        user,
        password,
      );
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

const applyCors = cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
});

app.disable("x-powered-by");
app.use(securityHeaders);
app.use((req, res, next) => {
  if (!isRequestOriginAllowed(req, allowedOrigins)) {
    return res.status(403).json({ message: "Origin is not allowed" });
  }
  return applyCors(req, res, next);
});
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
    store: sessionStore,
    name: "connect.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure:
        process.env.SESSION_COOKIE_SECURE === "true" ? true : "auto",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());
app.use(createBearerAuthenticator(jwtSecret));
app.use(rejectQueryAuthentication);

const authenticationRateLimiter = createRateLimiter({ limit: 10 });
const setupRateLimiter = createRateLimiter({ limit: 5 });
app.use(
  ["/api/auth/login", "/api/auth/token"],
  authenticationRateLimiter,
);
app.post(
  "/api/admin/register",
  setupRateLimiter,
  registerInitialAdministrator,
);

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
  const server = await Server.findOne({ where: { name: "VIDYA" } });
  res.status(200).json(Boolean(server?.isFirstStartUp));
});
app.get("*", (req, res) => {
  res.sendFile(path.join(WEB_PATH, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: "Internal Server Error" });
});

export const shutdownApp = async () => {
  sessionStore.stopExpiringSessions();
  await sequelize.close();
};

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}`);
  });
}
