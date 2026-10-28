import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import request from "supertest";

const dataPath = await mkdtemp(
  path.join(os.tmpdir(), "vidya-http-security-"),
);
process.env.NODE_ENV = "test";
process.env.VIDYA_DATA_PATH = dataPath;
process.env.CORS_ALLOWED_ORIGINS = "https://trusted.example";

const { app, shutdownApp } = await import("../index.js");

after(async () => {
  await shutdownApp();
  await rm(dataPath, { recursive: true, force: true });
});

test("HTTP security workflow", async (t) => {
  let administrator;

  await t.test("rejects untrusted browser origins", async () => {
    await request(app)
      .get("/isFirstStartUp")
      .set("Origin", "https://attacker.example")
      .expect(403, { message: "Origin is not allowed" });

    const trusted = await request(app)
      .get("/isFirstStartUp")
      .set("Origin", "https://trusted.example")
      .expect(200);
    assert.equal(trusted.headers["access-control-allow-origin"], "https://trusted.example");
  });

  await t.test("allows only one concurrent initial administrator", async () => {
    const responses = await Promise.all([
      request(app).post("/api/admin/register").send({
        username: "admin-one",
        password: "correct horse battery staple",
        folders: [],
      }),
      request(app).post("/api/admin/register").send({
        username: "admin-two",
        password: "another correct horse battery staple",
        folders: [],
      }),
    ]);

    assert.deepEqual(
      responses.map(({ status }) => status).sort(),
      [200, 409],
    );
    const successful = responses.find(({ status }) => status === 200);
    assert.equal(successful.body.user.role, "admin");
    assert.equal("password" in successful.body.user, false);
    assert.equal("salt" in successful.body.user, false);
    administrator =
      successful.body.user.username === "admin-one"
        ? {
            username: "admin-one",
            password: "correct horse battery staple",
          }
        : {
            username: "admin-two",
            password: "another correct horse battery staple",
          };
  });

  await t.test("sanitizes login and enforces current-password changes", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send(administrator)
      .expect(200);
    assert.equal("password" in login.body.user, false);
    assert.equal("salt" in login.body.user, false);

    await agent
      .post("/api/auth/password-change")
      .send({
        currentPassword: "incorrect",
        newPassword: "new correct horse battery staple",
      })
      .expect(401);

    await agent
      .post("/api/auth/password-change")
      .send({
        currentPassword: administrator.password,
        newPassword: "new correct horse battery staple",
      })
      .expect(201);

    await request(app)
      .post("/api/auth/login")
      .send(administrator)
      .expect(401);
    await request(app)
      .post("/api/auth/login")
      .send({
        username: administrator.username,
        password: "new correct horse battery staple",
      })
      .expect(200);
  });

  await t.test("rejects authentication tokens in URLs", async () => {
    await request(app)
      .get("/api/course/stream/not-a-lecture")
      .query({ token: "leaked-token" })
      .expect(400, {
        message: "Authentication tokens must use the Authorization header",
      });
  });
});
