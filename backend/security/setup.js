import { promises as fsp } from "fs";
import path from "path";
import { Transaction } from "sequelize";
import sequelize from "../config/database.js";
import { CourseFolder, Server, User } from "../models/index.js";
import { scan } from "../controllers/index.js";
import { regenerateAndLogin } from "./auth.js";
import { toSafeUser } from "./user.js";

const validateFolders = async (folders) => {
  if (!Array.isArray(folders)) {
    const error = new Error("folders must be an array");
    error.status = 400;
    throw error;
  }

  const normalizedFolders = await Promise.all(
    folders.map(async (folder) => {
      if (typeof folder !== "string" || folder.trim().length === 0) {
        const error = new Error("Each course folder must be a valid path");
        error.status = 400;
        throw error;
      }

      const directory = path.normalize(folder);
      let stats;
      try {
        stats = await fsp.stat(directory);
      } catch {
        const error = new Error(`Course folder is not accessible: ${directory}`);
        error.status = 400;
        throw error;
      }

      if (!stats.isDirectory()) {
        const error = new Error(`Course folder is not a directory: ${directory}`);
        error.status = 400;
        throw error;
      }

      return {
        directory,
        lastModified: stats.mtime,
        lastChecked: new Date(),
      };
    }),
  );

  if (
    new Set(normalizedFolders.map(({ directory }) => directory)).size !==
    normalizedFolders.length
  ) {
    const error = new Error("Course folders must be unique");
    error.status = 400;
    throw error;
  }

  return normalizedFolders;
};

const scanCourses = async () => {
  let scanWarning;
  let statusCode = 200;

  const scanResponse = {
    status(code) {
      statusCode = code;
      return this;
    },
    send(message) {
      if (statusCode >= 400) scanWarning = String(message);
      return this;
    },
  };

  await scan({}, scanResponse);
  return scanWarning;
};

export const registerInitialAdministrator = async (req, res) => {
  try {
    const { username, password, folders } = req.body || {};
    if (
      typeof username !== "string" ||
      username.trim().length === 0 ||
      typeof password !== "string" ||
      password.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    const validatedFolders = await validateFolders(folders);

    const user = await sequelize.transaction(
      { type: Transaction.TYPES.IMMEDIATE },
      async (transaction) => {
        const server = await Server.findOne({
          where: { name: "VIDYA" },
          transaction,
        });

        if (!server || !server.isFirstStartUp) {
          const error = new Error("Initial setup has already been completed");
          error.status = 409;
          throw error;
        }

        const administrator = await User.create(
          {
            username: username.trim(),
            password,
            role: "admin",
          },
          { transaction },
        );

        if (validatedFolders.length > 0) {
          await CourseFolder.bulkCreate(validatedFolders, { transaction });
        }

        const [updatedRows] = await Server.update(
          { isFirstStartUp: false },
          {
            where: { id: server.id, isFirstStartUp: true },
            transaction,
          },
        );

        if (updatedRows !== 1) {
          const error = new Error("Initial setup has already been completed");
          error.status = 409;
          throw error;
        }

        return administrator;
      },
    );

    const warnings = [];
    const scanWarning = await scanCourses();
    if (scanWarning) warnings.push(scanWarning);

    try {
      await regenerateAndLogin(req, user);
    } catch (error) {
      console.error("Automatic login after setup failed:", error);
      warnings.push(
        "Administrator created, but automatic login failed. Sign in manually.",
      );
    }

    return res.status(200).json({
      message: "Registration successful",
      user: toSafeUser(user),
      ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
    });
  } catch (error) {
    const isClientError =
      error.name === "SequelizeValidationError" ||
      error.name === "SequelizeUniqueConstraintError";
    const status = error.status || (isClientError ? 400 : 500);
    if (status >= 500) console.error(error);
    return res.status(status).json({
      error: status >= 500 ? "Initial setup failed" : error.message,
    });
  }
};
