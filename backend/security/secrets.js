import crypto from "crypto";
import { promises as fsp } from "fs";
import path from "path";
import { KEYS_PATH } from "../config/path.js";

let secretsPromise;

const randomSecret = () => crypto.randomBytes(32).toString("hex");

const readExistingSecrets = async (filepath) => {
  try {
    const content = await fsp.readFile(filepath, "utf8");
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Security key file must contain a JSON object");
    }

    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`Unable to read security key file: ${error.message}`);
  }
};

export const loadOrCreateSecuritySecrets = async (filepath = KEYS_PATH) => {
  const existing = await readExistingSecrets(filepath);
  const secrets = {
    ...existing,
    expressSecret:
      typeof existing.expressSecret === "string" &&
      existing.expressSecret.length >= 32
        ? existing.expressSecret
        : randomSecret(),
    jwtSecret:
      typeof existing.jwtSecret === "string" && existing.jwtSecret.length >= 32
        ? existing.jwtSecret
        : randomSecret(),
  };

  if (
    secrets.expressSecret !== existing.expressSecret ||
    secrets.jwtSecret !== existing.jwtSecret
  ) {
    await fsp.mkdir(path.dirname(filepath), { recursive: true });
    const temporaryPath = `${filepath}.${process.pid}.tmp`;
    await fsp.writeFile(temporaryPath, JSON.stringify(secrets, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    try {
      await fsp.rename(temporaryPath, filepath);
    } catch (error) {
      if (!["EEXIST", "EPERM"].includes(error.code)) throw error;
      await fsp.writeFile(filepath, JSON.stringify(secrets, null, 2), {
        encoding: "utf8",
        mode: 0o600,
      });
      await fsp.unlink(temporaryPath);
    }
  }

  await fsp.chmod(filepath, 0o600);
  return {
    expressSecret: secrets.expressSecret,
    jwtSecret: secrets.jwtSecret,
  };
};

export const getSecuritySecrets = () => {
  secretsPromise ||= loadOrCreateSecuritySecrets();
  return secretsPromise;
};
