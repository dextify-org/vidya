import crypto from "crypto";
import { promises as fsp } from "fs";
import { KEYS_PATH } from "./path.js";

const loadSecrets = async () => {
  let data = {};
  try {
    const fileContent = await fsp.readFile(KEYS_PATH, "utf8");
    data = JSON.parse(fileContent);
  } catch (error) {
    console.log("No security keys file found, generating new keys...");
  }

  let modified = false;

  if (
    !data.expressSecret ||
    typeof data.expressSecret !== "string" ||
    data.expressSecret.length < 16
  ) {
    data.expressSecret = crypto.randomBytes(32).toString("hex");
    modified = true;
  }

  if (
    !data.jwtSecret ||
    typeof data.jwtSecret !== "string" ||
    data.jwtSecret.length < 16
  ) {
    data.jwtSecret = crypto.randomBytes(32).toString("hex");
    modified = true;
  }

  if (modified) {
    await fsp.writeFile(KEYS_PATH, JSON.stringify(data, null, 2));
  }

  return data;
};

const secrets = await loadSecrets();
export const expressSecret = secrets.expressSecret;
export const jwtSecret = secrets.jwtSecret;
export default secrets;

