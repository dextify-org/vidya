import fs, { promises as fsp } from "fs";
import path from "path";
import crypto from "crypto";

import { DATA_PATH } from "../config/path.js";
import {
  getVideoEncoder,
  spawnHlsTranscode,
  hlsSegmentDuration,
} from "./transcode.js";

const CACHE_ROOT = path.join(DATA_PATH, "transcode-cache");
const SESSIONS_DIR = path.join(CACHE_ROOT, "sessions");
const LOCK_PATH = path.join(CACHE_ROOT, "instance.lock");

const GRACE_MS = 45_000;
const SWEEP_INTERVAL_MS = 5_000;
const FIRST_SEGMENT_TIMEOUT_MS = 25_000;
const SEGMENT_WAIT_MS = 2_000;
const MAX_ACTIVE_SESSIONS = 3;
const MIN_FREE_BYTES = 512 * 1024 * 1024;
const PLAYLIST_READ_RETRIES = 4;
const AUDIO_BITRATE = 128000;
const SEGMENT_PATTERN = /^seg\d{5}\.ts$/;

const sessions = new Map();

let sweeper = null;
let lockOwned = false;

export { hlsSegmentDuration };

export class HlsSessionError extends Error {
  constructor(message, status = 500, code = "HLS_ERROR") {
    super(message);
    this.name = "HlsSessionError";
    this.status = status;
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const now = () => Date.now();

const ensureSessionsDir = async () => {
  await fsp.mkdir(SESSIONS_DIR, { recursive: true });
};

const segmentPath = (session, name) => path.join(session.dir, name);

const readPlaylist = async (session) => {
  for (let attempt = 0; attempt < PLAYLIST_READ_RETRIES; attempt += 1) {
    try {
      const content = await fsp.readFile(session.playlistPath, "utf8");
      const lines = content.split("\n").map((line) => line.trim());
      const lastLine = [...lines].reverse().find(Boolean) || "";
      const looksComplete =
        content.startsWith("#EXTM3U") &&
        (SEGMENT_PATTERN.test(lastLine.split("?")[0]) ||
          lastLine.startsWith("#EXT-X-ENDLIST") ||
          lastLine.startsWith("#EXTINF"));
      if (looksComplete) return content;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await sleep(60);
  }
  return "#EXTM3U\n";
};

const parseSegments = (playlist) =>
  playlist
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("?")[0])
    .filter((name) => SEGMENT_PATTERN.test(name));

const playlistListsSegment = (playlist, name) =>
  parseSegments(playlist).includes(name);

const isAlive = (session) =>
  Boolean(session) && !session.destroying && session.status !== "failed";

const isEncoding = (session) =>
  isAlive(session) &&
  Boolean(session.child) &&
  session.child.exitCode === null;

const findReusableSession = (lectureId, profileId, start) => {
  for (const session of sessions.values()) {
    if (
      isAlive(session) &&
      session.lectureId === lectureId &&
      session.profileId === profileId &&
      Math.abs(session.start - start) < 0.5
    ) {
      return session;
    }
  }
  return null;
};

const estimateSessionBytes = (profile, metadata, start) => {
  const duration = Number(metadata.duration) || 0;
  const remaining =
    duration > 0 ? Math.max(0, duration - (Number(start) || 0)) : 0;
  const bitrate =
    (Number(profile.bitrate) || 0) + (metadata.hasAudio ? AUDIO_BITRATE : 0);
  return Math.ceil((bitrate / 8) * remaining * 1.2) + 32 * 1024 * 1024;
};

const assertFreeSpace = async (bytes) => {
  let stats;
  try {
    stats = await fsp.statfs(SESSIONS_DIR);
  } catch (error) {
    return;
  }

  const free = Number(stats.bavail) * Number(stats.bsize);
  if (!Number.isFinite(free) || free <= 0) return;

  if (free < bytes + MIN_FREE_BYTES) {
    const neededGb = ((bytes + MIN_FREE_BYTES) / 1024 ** 3).toFixed(1);
    throw new HlsSessionError(
      `Not enough free disk space for this quality (needs about ${neededGb} GB). Free up space or pick a lower quality.`,
      507,
      "HLS_NO_SPACE",
    );
  }
};

const waitForFirstSegment = async (session) => {
  const deadline = now() + FIRST_SEGMENT_TIMEOUT_MS;

  while (now() < deadline) {
    if (session.status === "failed") {
      throw new HlsSessionError(
        session.error || "Transcoding failed",
        500,
        "HLS_TRANSCODE_FAILED",
      );
    }

    const playlist = await readPlaylist(session);
    if (parseSegments(playlist).length > 0) {
      session.status = "ready";
      session.firstSegmentAt = now();
      return session;
    }

    await sleep(80);
  }

  destroySession(session, "startup-timeout");
  throw new HlsSessionError(
    "Timed out waiting for the transcode to start",
    504,
    "HLS_TIMEOUT",
  );
};

export const openHlsSession = async ({
  lectureId,
  lecturePath,
  profile,
  metadata,
  start = 0,
  viewer = null,
}) => {
  const startValue = Math.max(0, Number(start) || 0);

  const reusable = findReusableSession(lectureId, profile.id, startValue);
  if (reusable) {
    reusable.lastSeen = now();
    return reusable;
  }

  if (viewer) {
    for (const other of [...sessions.values()]) {
      if (other.lectureId === lectureId && other.viewerId === viewer) {
        destroySession(other, "superseded");
      }
    }
  }

  const active = [...sessions.values()].filter(isEncoding).length;
  if (active >= MAX_ACTIVE_SESSIONS) {
    throw new HlsSessionError(
      "Too many concurrent transcodes. Close another player tab and try again.",
      429,
      "HLS_BUSY",
    );
  }

  await ensureSessionsDir();
  await assertFreeSpace(estimateSessionBytes(profile, metadata, startValue));

  const encoder = await getVideoEncoder();
  const sid = crypto.randomUUID();
  const dir = path.join(SESSIONS_DIR, sid);

  await fsp.mkdir(dir, { recursive: true });

  const session = {
    sid,
    dir,
    lectureId,
    lecturePath,
    viewerId: viewer || null,
    profileId: profile.id,
    profileLabel: profile.label || profile.id,
    start: startValue,
    status: "starting",
    error: null,
    child: null,
    playlistPath: path.join(dir, "index.m3u8"),
    createdAt: now(),
    lastSeen: now(),
    firstSegmentAt: null,
    activeRequests: 0,
    destroying: false,
  };

  sessions.set(sid, session);

  const { child, seek, getStderr } = spawnHlsTranscode({
    input: lecturePath,
    profile,
    metadata,
    encoder,
    start: startValue,
    playlistPath: session.playlistPath,
    segmentFilename: path.join(dir, "seg%05d.ts"),
  });

  session.child = child;
  session.seek = seek;

  child.on("error", (error) => {
    session.status = "failed";
    session.error = error.message;
    console.error(`[hls] ffmpeg failed to start for ${sid}:`, error.message);
  });

  child.on("close", (code) => {
    session.exitCode = code;
    if (session.destroying) return;
    if (code !== 0 && code !== null) {
      const tail = (getStderr() || "").trim().split("\n").pop();
      session.status = "failed";
      session.error = tail || `ffmpeg exited with code ${code}`;
      console.error(`[hls] session ${sid} failed:`, session.error);
    }
  });

  try {
    await waitForFirstSegment(session);
  } catch (error) {
    destroySession(session, "startup-failed");
    throw error;
  }

  return session;
};

export const getHlsSession = (sid) => sessions.get(sid) || null;

const destroySession = (session, reason) => {
  if (!session || session.destroying) return Promise.resolve();
  session.destroying = true;
  sessions.delete(session.sid);

  const { child } = session;
  if (child && !child.killed && child.exitCode === null) {
    child.kill("SIGKILL");
  }

  const exited = new Promise((resolve) => {
    if (!child || child.exitCode !== null) return resolve();
    const timer = setTimeout(resolve, 1500);
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });

  return exited
    .then(() =>
      fsp.rm(session.dir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      }),
    )
    .catch((error) => {
      console.warn(
        `[hls] unable to remove session ${session.sid} (${reason}):`,
        error.message,
      );
    })
    .finally(() => {
      console.log(
        `[hls] session ${session.sid} (${session.profileLabel}) closed: ${reason}`,
      );
    });
};

const sweep = () => {
  const timestamp = now();
  for (const session of [...sessions.values()]) {
    if (session.activeRequests > 0 || session.destroying) continue;
    if (timestamp - session.lastSeen < GRACE_MS) continue;
    destroySession(session, "idle");
  }
};

const trackRequest = (session, res) => {
  session.activeRequests += 1;
  session.lastSeen = now();

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    session.activeRequests = Math.max(0, session.activeRequests - 1);
    session.lastSeen = now();
  };

  res.on("close", release);
  res.on("finish", release);
  return release;
};

export const sendHlsPlaylist = async (req, res, session, { token } = {}) => {
  trackRequest(session, res);

  const playlist = await readPlaylist(session);
  if (!parseSegments(playlist).length && session.status === "failed") {
    throw new HlsSessionError(
      session.error || "Transcoding failed",
      500,
      "HLS_TRANSCODE_FAILED",
    );
  }

  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  const host = req.get("host");
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http")
    .split(",")[0]
    .trim();
  const baseUrl = host ? `${proto}://${host}` : "";
  const rewritten = playlist
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const name = trimmed.split("?")[0];
      if (!SEGMENT_PATTERN.test(name)) return line;
      return `${baseUrl}/api/course/hls/session/${session.sid}/${name}${query}`;
    })
    .join("\n");

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.setHeader("Cache-Control", "no-store");
  res.send(rewritten);
};

export const sendHlsSegment = async (req, res, session, name) => {
  trackRequest(session, res);

  if (!SEGMENT_PATTERN.test(name)) {
    res.status(400).json({ message: "Invalid segment name" });
    return;
  }

  const deadline = now() + SEGMENT_WAIT_MS;
  let available = playlistListsSegment(await readPlaylist(session), name);
  while (!available && now() < deadline && session.status !== "failed") {
    await sleep(80);
    available = playlistListsSegment(await readPlaylist(session), name);
  }

  if (session.status === "failed" && !available) {
    res.status(500).json({
      message: session.error || "Transcoding failed",
      code: "HLS_TRANSCODE_FAILED",
    });
    return;
  }

  if (!available) {
    res.status(404).json({ message: "Segment not ready" });
    return;
  }

  let stat;
  try {
    stat = await fsp.stat(segmentPath(session, name));
  } catch (error) {
    res.status(404).json({ message: "Segment not found" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "video/mp2t",
    "Content-Length": stat.size,
    "Cache-Control": "no-store",
  });

  const stream = fs.createReadStream(segmentPath(session, name));
  stream.on("error", (error) => {
    if (error.code !== "EPIPE") {
      console.error("[hls] segment stream error:", error.message);
    }
    res.end();
  });
  stream.pipe(res);
};

const readLockPid = async () => {
  try {
    const content = await fsp.readFile(LOCK_PATH, "utf8");
    const pid = Number(content.trim());
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch (error) {
    return null;
  }
};

const isProcessAlive = (pid) => {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};

const lockedByOtherInstance = async () => {
  const pid = await readLockPid();
  return Boolean(pid && pid !== process.pid && isProcessAlive(pid));
};

const writeLock = async () => {
  await fsp.writeFile(LOCK_PATH, String(process.pid));
};

const removeLock = async () => {
  if (!lockOwned) return;
  lockOwned = false;
  try {
    const pid = await readLockPid();
    if (pid === process.pid) await fsp.unlink(LOCK_PATH);
  } catch (error) {
  }
};

const wipeSessions = async () => {
  let entries = [];
  try {
    entries = await fsp.readdir(SESSIONS_DIR);
  } catch (error) {
    return;
  }

  await Promise.all(
    entries.map((entry) =>
      fsp
        .rm(path.join(SESSIONS_DIR, entry), {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 100,
        })
        .catch((error) => {
          console.warn(`[hls] unable to clear ${entry}:`, error.message);
        }),
    ),
  );
};

export const initHlsSessions = async () => {
  await ensureSessionsDir();

  if (await lockedByOtherInstance()) {
    console.warn(
      "[hls] another VIDYA instance owns the transcode scratch directory; skipping startup wipe",
    );
  } else {
    await writeLock();
    lockOwned = true;
    await wipeSessions();
  }

  if (!sweeper) {
    sweeper = setInterval(sweep, SWEEP_INTERVAL_MS);
    sweeper.unref?.();
  }

  process.once("exit", () => {
    for (const session of sessions.values()) {
      if (session.child && session.child.exitCode === null) {
        session.child.kill("SIGKILL");
      }
    }
  });
};

export const shutdownHlsSessions = async () => {
  if (sweeper) {
    clearInterval(sweeper);
    sweeper = null;
  }

  await Promise.all(
    [...sessions.values()].map((session) =>
      destroySession(session, "shutdown"),
    ),
  );

  await removeLock();
};

export const hlsSessionCount = () => sessions.size;
