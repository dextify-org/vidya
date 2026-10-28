import assert from "node:assert/strict";
import test from "node:test";
import {
  isAuthenticated,
  isOwnerOrAdmin,
} from "../middleware/owner.js";
import TagsAndBookmark from "../models/TagsAndBookmark.js";
import courseRouter from "../routes/course.js";
import { probeMediaDuration } from "../utils/media.js";

const createResponse = () => {
  const response = {
    body: null,
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

  return response;
};

const routeHandlers = (path) => {
  const layer = courseRouter.stack.find(
    (candidate) => candidate.route?.path === path,
  );

  assert.ok(layer, `Expected ${path} route to exist`);
  return layer.route.stack.map(({ handle }) => handle);
};

test("ffprobe receives a filename as an argument without shell interpretation", async () => {
  const maliciousFilename = "/courses/video.mp4; touch /tmp/vidya-poc";
  let invocation;

  const fakeExecFile = (executable, args, options, callback) => {
    invocation = { executable, args, options };
    callback(null, "123.5\n");
  };

  const duration = await probeMediaDuration(
    "/test/ffprobe",
    maliciousFilename,
    fakeExecFile,
  );

  assert.equal(duration, 123.5);
  assert.deepEqual(invocation, {
    executable: "/test/ffprobe",
    args: [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      maliciousFilename,
    ],
    options: { windowsHide: true },
  });
});

test("media routes authenticate before accessing files or models", () => {
  for (const path of [
    "/stream/:LectureId",
    "/download/:LectureId",
    "/content/:contentId",
    "/subtitle/:subtitleId",
  ]) {
    const handlers = routeHandlers(path);
    assert.equal(handlers[0], isAuthenticated);

    const response = createResponse();
    let nextCalled = false;
    handlers[0](
      { isAuthenticated: () => false },
      response,
      () => {
        nextCalled = true;
      },
    );

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.body, { message: "Authentication required" });
    assert.equal(nextCalled, false);
  }
});

test("Bearer-populated users remain authenticated without a session", () => {
  const response = createResponse();
  let nextCalled = false;

  isAuthenticated(
    {
      user: { id: "user-1" },
      isAuthenticated: () => false,
    },
    response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test("owner middleware accepts the Sequelize UserId field", async () => {
  const record = { id: "tag-1", UserId: "user-1" };
  const model = { findByPk: async () => record };
  const response = createResponse();
  const request = {
    params: {},
    body: { id: record.id },
    user: { id: record.UserId, role: "user" },
  };
  let nextCalled = false;

  await isOwnerOrAdmin(model)(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(request.ownedRecord, record);
});

test("owner middleware rejects another user's tag or bookmark", async () => {
  const model = {
    findByPk: async () => ({ id: "tag-1", UserId: "user-1" }),
  };
  const response = createResponse();

  await isOwnerOrAdmin(model)(
    {
      params: { id: "tag-1" },
      user: { id: "user-2", role: "user" },
    },
    response,
    () => assert.fail("next must not be called"),
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: "Access denied" });
});

test("tag uniqueness is scoped to the owning user", () => {
  const uniqueIndex = TagsAndBookmark.options.indexes.find(
    (index) => index.unique,
  );

  assert.deepEqual(uniqueIndex.fields, ["UserId", "lectureId", "type"]);
});
