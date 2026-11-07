import path from "path";
import { CourseFolder, Server } from "../models/index.js";
import {
  normalizePath,
  scanForDirectory,
  syncCourseDirectory,
} from "../controllers/courseController.js";

const clients = new Set();

let scanState = {
  running: false,
  progress: 0,
  phase: "",
  startedAt: null,
  finishedAt: null,
  totalCourses: 0,
  processedCourses: 0,
  error: null,
};

let scheduleTimer = null;
let startupRunDone = false;
let nextRunAt = null;
let scheduleConfig = {
  trigger: "disabled",
  intervalValue: 6,
  intervalUnit: "hours",
  time: "02:00",
  days: [0],
};

const TRIGGERS = new Set([
  "disabled",
  "interval",
  "daily",
  "weekly",
  "startup",
]);
const INTERVAL_UNITS = { minutes: 60 * 1000, hours: 60 * 60 * 1000 };
const STARTUP_DELAY_MS = 10 * 1000;
const MAX_INTERVAL_MINUTES = 30 * 24 * 60;

const sendEvent = (response, data) => {
  try {
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    clients.delete(response);
  }
};

const getSchedule = () => ({
  enabled: scheduleConfig.trigger !== "disabled",
  trigger: scheduleConfig.trigger,
  intervalValue: scheduleConfig.intervalValue,
  intervalUnit: scheduleConfig.intervalUnit,
  time: scheduleConfig.time,
  days: [...scheduleConfig.days],
  nextRunAt,
  lastRunAt: scanState.finishedAt || null,
});

const normalizeSchedule = (input = {}) => {
  const requestedTrigger = String(input.trigger ?? "").toLowerCase();
  const trigger = TRIGGERS.has(requestedTrigger) ? requestedTrigger : "disabled";

  const parsedMinutes = Number(input.intervalValue);
  const intervalValue = Number.isFinite(parsedMinutes) && parsedMinutes > 0
    ? Math.min(Math.round(parsedMinutes), MAX_INTERVAL_MINUTES)
    : 0;
  const intervalUnit = Object.prototype.hasOwnProperty.call(
    INTERVAL_UNITS,
    String(input.intervalUnit),
  )
    ? String(input.intervalUnit)
    : "hours";

  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.time ?? ""))
    ? String(input.time)
    : "02:00";

  const days = Array.isArray(input.days)
    ? [
        ...new Set(
          input.days
            .map((day) => Number(day))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        ),
      ].sort((a, b) => a - b)
    : [];

  if (trigger === "interval" && intervalValue <= 0) {
    return { error: "Interval value must be greater than zero" };
  }

  if (trigger === "weekly" && days.length === 0) {
    return { error: "Select at least one day of the week" };
  }

  return {
    config: {
      trigger,
      intervalValue,
      intervalUnit,
      time,
      days: days.length ? days : [0],
    },
  };
};

const computeNextRun = (config, fromMs = Date.now()) => {
  switch (config.trigger) {
    case "interval":
      return fromMs + config.intervalValue * INTERVAL_UNITS[config.intervalUnit];
    case "startup":
      return fromMs + STARTUP_DELAY_MS;
    case "daily": {
      const [hours, minutes] = config.time.split(":").map(Number);
      const next = new Date(fromMs);
      next.setHours(hours, minutes, 0, 0);
      if (next.getTime() <= fromMs) next.setDate(next.getDate() + 1);
      return next.getTime();
    }
    case "weekly": {
      const [hours, minutes] = config.time.split(":").map(Number);
      const base = new Date(fromMs);
      base.setHours(hours, minutes, 0, 0);

      for (let offset = 0; offset <= 7; offset += 1) {
        const candidate = new Date(base);
        candidate.setDate(base.getDate() + offset);
        if (!config.days.includes(candidate.getDay())) continue;
        if (candidate.getTime() > fromMs) return candidate.getTime();
      }
      return null;
    }
    default:
      return null;
  }
};

const scheduleNext = () => {
  if (scheduleTimer) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }

  if (scanState.running) {
    nextRunAt = null;
    return;
  }

  if (scheduleConfig.trigger === "startup" && startupRunDone) {
    nextRunAt = null;
    broadcast();
    return;
  }

  const next = computeNextRun(scheduleConfig);
  nextRunAt = next ? new Date(next).toISOString() : null;

  if (next === null) {
    broadcast();
    return;
  }

  const delay = Math.max(next - Date.now(), 0);
  scheduleTimer = setTimeout(() => {
    scheduleTimer = null;
    if (scheduleConfig.trigger === "startup") startupRunDone = true;
    if (!startScan()) scheduleNext();
  }, delay);
  scheduleTimer.unref?.();

  broadcast();
};

const getStatus = () => ({ ...scanState });

const statusPayload = () => ({
  ...getStatus(),
  schedule: getSchedule(),
});

const broadcast = (data = statusPayload()) => {
  for (const response of [...clients]) {
    sendEvent(response, data);
  }
};

const subscribe = (request, response) => {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders?.();
  clients.add(response);
  sendEvent(response, statusPayload());

  const removeClient = () => {
    clients.delete(response);
  };

  request.on("close", removeClient);
  response.on("close", removeClient);
};

const unsubscribe = (response) => {
  clients.delete(response);
};

const collectScanJobs = async () => {
  const folders = await CourseFolder.findAll();
  const jobs = [];

  for (const folder of folders) {
    try {
      const directories = await scanForDirectory(folder.directory);
      for (const directory of directories) {
        jobs.push({
          folderId: folder.id,
          directory: normalizePath(directory),
        });
      }
    } catch (error) {
      console.error(`[scan] unable to read ${folder.directory}:`, error.message);
    }
  }

  return jobs;
};

const runScan = async () => {
  try {
    const jobs = await collectScanJobs();

    scanState.totalCourses = jobs.length;
    scanState.phase = jobs.length
      ? "Scanning course folders"
      : "No course folders found";
    broadcast();

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      const folderName = path.basename(job.directory) || job.directory;

      scanState.phase = `Scanning ${folderName} (${index + 1}/${jobs.length})`;
      broadcast();

      try {
        await syncCourseDirectory(job.directory, job.folderId);
      } catch (error) {
        console.error(`[scan] failed to scan ${job.directory}:`, error.message);
      }

      scanState.processedCourses = index + 1;
      scanState.progress = Math.round(((index + 1) / jobs.length) * 100);
      broadcast();
    }

    const finishedAt = new Date().toISOString();
    await Server.update(
      { lastScanAt: finishedAt },
      { where: { name: "VIDYA" } },
    );

    scanState.running = false;
    scanState.progress = 100;
    scanState.phase = "Scan complete";
    scanState.finishedAt = finishedAt;
    broadcast();
  } catch (error) {
    console.error("[scan] scan failed:", error);
    scanState.running = false;
    scanState.phase = "Scan failed";
    scanState.error = error.message;
    scanState.finishedAt = new Date().toISOString();
    broadcast();
  } finally {
    scheduleNext();
  }
};

const startScan = () => {
  if (scanState.running) return false;

  scanState = {
    running: true,
    progress: 0,
    phase: "Starting scan",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    totalCourses: 0,
    processedCourses: 0,
    error: null,
  };

  broadcast();
  runScan();
  return true;
};

const setSchedule = (input) => {
  const { config, error } = normalizeSchedule(
    typeof input === "number" ? { trigger: "interval", intervalValue: input, intervalUnit: "hours" } : input,
  );

  if (error) {
    throw Object.assign(new Error(error), { status: 400 });
  }

  scheduleConfig = config;
  startupRunDone = false;
  scheduleNext();

  return getSchedule();
};

const heartbeat = setInterval(() => {
  for (const response of [...clients]) {
    try {
      response.write(": ping\n\n");
    } catch (error) {
      clients.delete(response);
    }
  }
}, 25000);
heartbeat.unref?.();

export const scanManager = {
  getStatus,
  getSchedule,
  setSchedule,
  normalizeSchedule,
  computeNextRun,
  startScan,
  subscribe,
  unsubscribe,
  broadcast,
};
