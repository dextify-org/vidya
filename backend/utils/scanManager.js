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
let scanIntervalHours = 0;
let nextRunAt = null;

const sendEvent = (response, data) => {
  try {
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    clients.delete(response);
  }
};

const getSchedule = () => ({
  enabled: scanIntervalHours > 0,
  intervalHours: scanIntervalHours,
  nextRunAt,
});

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

const setSchedule = (intervalHours) => {
  const parsed = Number(intervalHours);
  const hours =
    Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;

  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }

  scanIntervalHours = hours;
  nextRunAt =
    hours > 0
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;

  if (hours > 0) {
    scheduleTimer = setInterval(() => {
      nextRunAt = new Date(
        Date.now() + scanIntervalHours * 60 * 60 * 1000,
      ).toISOString();
      startScan();
    }, hours * 60 * 60 * 1000);
    scheduleTimer.unref?.();
  }

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
  startScan,
  subscribe,
  unsubscribe,
  broadcast,
};
