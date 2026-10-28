import crypto from "crypto";

export const PASSWORD_ALGORITHM = "pbkdf2-sha512";
export const PASSWORD_VERSION = 1;
export const PASSWORD_ITERATIONS = 210_000;
export const PASSWORD_KEY_LENGTH = 64;
export const LEGACY_PASSWORD_ITERATIONS = 1_000;

const parsePasswordHash = (storedHash) => {
  if (typeof storedHash !== "string") return null;

  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== PASSWORD_ALGORITHM) return null;

  const version = Number.parseInt(parts[1], 10);
  const iterations = Number.parseInt(parts[2], 10);
  const hash = parts[3];

  if (
    !Number.isSafeInteger(version) ||
    !Number.isSafeInteger(iterations) ||
    iterations <= 0 ||
    !/^[a-f0-9]+$/i.test(hash)
  ) {
    return null;
  }

  return { version, iterations, hash };
};

const derivePassword = (password, salt, iterations) =>
  crypto
    .pbkdf2Sync(
      String(password),
      salt,
      iterations,
      PASSWORD_KEY_LENGTH,
      "sha512",
    )
    .toString("hex");

const hashesMatch = (actual, expected) => {
  if (
    typeof actual !== "string" ||
    typeof expected !== "string" ||
    actual.length !== expected.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(actual, "hex"),
    Buffer.from(expected, "hex"),
  );
};

export const createPasswordRecord = (password) => {
  if (typeof password !== "string" || password.length === 0) {
    throw new TypeError("Password must be a non-empty string");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = derivePassword(password, salt, PASSWORD_ITERATIONS);

  return {
    salt,
    password: [
      PASSWORD_ALGORITHM,
      PASSWORD_VERSION,
      PASSWORD_ITERATIONS,
      hash,
    ].join("$"),
  };
};

export const verifyPassword = (password, storedHash, salt) => {
  if (typeof salt !== "string" || salt.length === 0) {
    return { valid: false, needsUpgrade: false };
  }

  const parsed = parsePasswordHash(storedHash);
  if (parsed) {
    if (
      parsed.version !== PASSWORD_VERSION ||
      parsed.iterations > 1_000_000
    ) {
      return { valid: false, needsUpgrade: false };
    }

    const actual = derivePassword(password, salt, parsed.iterations);
    return {
      valid: hashesMatch(actual, parsed.hash),
      needsUpgrade: parsed.iterations < PASSWORD_ITERATIONS,
    };
  }

  if (!/^[a-f0-9]{128}$/i.test(storedHash || "")) {
    return { valid: false, needsUpgrade: false };
  }

  const actual = derivePassword(password, salt, LEGACY_PASSWORD_ITERATIONS);
  return {
    valid: hashesMatch(actual, storedHash),
    needsUpgrade: true,
  };
};

export const consumePasswordWork = (password) => {
  derivePassword(
    password,
    "00000000000000000000000000000000",
    PASSWORD_ITERATIONS,
  );
};
