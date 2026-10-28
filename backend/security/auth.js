import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import {
  consumePasswordWork,
  verifyPassword,
} from "./password.js";

export const createBearerAuthenticator = (jwtSecret) => async (
  req,
  res,
  next,
) => {
  if (req.user) return next();

  const authorization = req.get("Authorization");
  if (!authorization) return next();

  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) return next();

  try {
    const decoded = jwt.verify(match[1], jwtSecret, {
      algorithms: ["HS256"],
    });
    if (typeof decoded !== "object" || typeof decoded.id !== "string") {
      return next();
    }

    req.user = await User.findByPk(decoded.id);
  } catch {
    // Authentication guards produce the endpoint's normal 401 response.
  }

  return next();
};

export const regenerateAndLogin = (req, user) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) return reject(regenerateError);

      return req.login(user, (loginError) => {
        if (loginError) return reject(loginError);
        return resolve();
      });
    });
  });

export const verifyAndUpgradeUserPassword = async (user, password) => {
  const verification = verifyPassword(password, user.password, user.salt);
  if (!verification.valid) {
    if (verification.needsUpgrade) consumePasswordWork(password);
    return false;
  }

  if (verification.needsUpgrade) {
    await user.update({ password });
  }

  return true;
};
