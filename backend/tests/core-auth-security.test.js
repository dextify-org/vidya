import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createPasswordRecord,
  LEGACY_PASSWORD_ITERATIONS,
  PASSWORD_ITERATIONS,
  verifyPassword,
} from "../security/password.js";
import {
  createRateLimiter,
  isRequestOriginAllowed,
  parseAllowedOrigins,
  rejectQueryAuthentication,
  securityHeaders,
} from "../security/http.js";
import { loadOrCreateSecuritySecrets } from "../security/secrets.js";
import { toSafeUser } from "../security/user.js";
import { migrateTagOwnershipIndex } from "../security/migrations.js";
import { verifyAndUpgradeUserPassword } from "../security/auth.js";

test("password records use versioned PBKDF2-SHA512 with 210k iterations", () => {
  const record = createPasswordRecord("correct horse battery staple");

  assert.match(
    record.password,
    new RegExp(`^pbkdf2-sha512\\$1\\$${PASSWORD_ITERATIONS}\\$[a-f0-9]{128}$`),
  );
  assert.deepEqual(
    verifyPassword(
      "correct horse battery staple",
      record.password,
      record.salt,
    ),
    { valid: true, needsUpgrade: false },
  );
  assert.equal(
    verifyPassword("incorrect", record.password, record.salt).valid,
    false,
  );
});

test("password records reject missing password material", () => {
  assert.throws(
    () => createPasswordRecord(""),
    /Password must be a non-empty string/,
  );
  assert.throws(
    () => createPasswordRecord(undefined),
    /Password must be a non-empty string/,
  );
});

test("legacy password hashes remain valid and are marked for migration", () => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(
      "legacy password",
      salt,
      LEGACY_PASSWORD_ITERATIONS,
      64,
      "sha512",
    )
    .toString("hex");

  assert.deepEqual(verifyPassword("legacy password", hash, salt), {
    valid: true,
    needsUpgrade: true,
  });
});

test("successful legacy authentication persists the current password format", async () => {
  const password = "legacy password";
  const user = {
    salt: crypto.randomBytes(16).toString("hex"),
    updateCalls: 0,
    async update(values) {
      this.updateCalls += 1;
      const record = createPasswordRecord(values.password);
      this.password = record.password;
      this.salt = record.salt;
    },
  };
  user.password = crypto
    .pbkdf2Sync(
      password,
      user.salt,
      LEGACY_PASSWORD_ITERATIONS,
      64,
      "sha512",
    )
    .toString("hex");

  assert.equal(await verifyAndUpgradeUserPassword(user, password), true);
  assert.equal(user.updateCalls, 1);
  assert.deepEqual(verifyPassword(password, user.password, user.salt), {
    valid: true,
    needsUpgrade: false,
  });
});

test("security secrets persist independently with restrictive permissions", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "vidya-secrets-"));
  const filepath = path.join(directory, "keys.json");

  try {
    const first = await loadOrCreateSecuritySecrets(filepath);
    const second = await loadOrCreateSecuritySecrets(filepath);
    const persisted = JSON.parse(await readFile(filepath, "utf8"));
    const fileStats = await stat(filepath);

    assert.deepEqual(second, first);
    assert.equal(persisted.expressSecret, first.expressSecret);
    assert.equal(persisted.jwtSecret, first.jwtSecret);
    assert.notEqual(first.expressSecret, first.jwtSecret);
    if (process.platform !== "win32") {
      assert.equal(fileStats.mode & 0o777, 0o600);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CORS permits same-origin, configured origins, and origin-less clients", () => {
  const allowed = parseAllowedOrigins("https://courses.example.test");
  const request = (origin) => ({
    protocol: "http",
    get(name) {
      if (name === "Origin") return origin;
      if (name === "Host") return "127.0.0.1:31415";
      return undefined;
    },
  });

  assert.equal(isRequestOriginAllowed(request(undefined), allowed), true);
  assert.equal(
    isRequestOriginAllowed(
      request("http://127.0.0.1:31415"),
      allowed,
    ),
    true,
  );
  assert.equal(
    isRequestOriginAllowed(
      request("https://courses.example.test"),
      allowed,
    ),
    true,
  );
  assert.equal(
    isRequestOriginAllowed(request("https://attacker.example"), allowed),
    false,
  );
});

test("query tokens are rejected before route authentication", () => {
  const req = { query: { token: "secret", other: "value" } };
  let nextCalled = false;
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  rejectQueryAuthentication(req, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    message: "Authentication tokens must use the Authorization header",
  });
});

test("rate limiter bounds repeated attempts and supplies Retry-After", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
  const req = { ip: "127.0.0.1" };
  const response = {
    headers: {},
    statusCode: 200,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let accepted = 0;

  limiter(req, response, () => {
    accepted += 1;
  });
  limiter(req, response, () => {
    accepted += 1;
  });
  limiter(req, response, () => {
    accepted += 1;
  });

  assert.equal(accepted, 2);
  assert.equal(response.statusCode, 429);
  assert.deepEqual(response.body, { message: "Too many requests" });
  assert.match(response.headers["Retry-After"], /^\d+$/);
});

test("security headers restrict executable and embedded content", () => {
  const response = {
    headers: {},
    set(headers) {
      Object.assign(this.headers, headers);
    },
  };
  let nextCalled = false;

  securityHeaders({}, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.match(
    response.headers["Content-Security-Policy"],
    /object-src 'none'/,
  );
  assert.equal(response.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(response.headers["Permissions-Policy"].includes("camera=()"), true);
});

test("user DTO excludes credential and Sequelize metadata fields", () => {
  assert.deepEqual(
    toSafeUser({
      id: "user-1",
      username: "learner",
      role: "user",
      password: "hash",
      salt: "salt",
      createdAt: "not-public",
    }),
    { id: "user-1", username: "learner", role: "user" },
  );
});

test("legacy global tag uniqueness is migrated to per-user uniqueness", async () => {
  let indexes = [
    {
      name: "legacy_tags_unique",
      unique: true,
      fields: [{ attribute: "lectureId" }, { attribute: "type" }],
    },
  ];
  const removed = [];
  const added = [];
  const queryInterface = {
    async showIndex() {
      return indexes;
    },
    async removeIndex(tableName, name) {
      removed.push({ tableName, name });
      indexes = indexes.filter((index) => index.name !== name);
    },
    async addIndex(tableName, fields, options) {
      added.push({ tableName, fields, options });
    },
  };

  await migrateTagOwnershipIndex(queryInterface, "TagsAndBookmarks");

  assert.deepEqual(removed, [
    { tableName: "TagsAndBookmarks", name: "legacy_tags_unique" },
  ]);
  assert.deepEqual(added[0].fields, ["UserId", "lectureId", "type"]);
  assert.equal(added[0].options.unique, true);
});
