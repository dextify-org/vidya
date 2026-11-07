import { execFile, execFileSync, spawn } from "child_process";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);

const isWindows = os.platform() === "win32";
const isMac = os.platform() === "darwin";
const isLinux = os.platform() === "linux";

const isRunnable = (binary) => {
  try {
    execFileSync(binary, ["-version"], {
      stdio: "ignore",
      timeout: 5000,
      windowsHide: true,
    });
    return true;
  } catch (error) {
    return false;
  }
};

const resolveBinary = (packageName, binaryName) => {
  try {
    const installer = require(packageName);
    if (
      installer?.path &&
      fs.existsSync(installer.path) &&
      isRunnable(installer.path)
    ) {
      return installer.path;
    }
  } catch (error) {
    console.warn(
      `[transcode] ${packageName} binary unavailable, falling back to "${binaryName}" on PATH`,
    );
  }
  return binaryName;
};

export const ffmpegPath = resolveBinary("@ffmpeg-installer/ffmpeg", "ffmpeg");
export const ffprobePath = resolveBinary("@ffprobe-installer/ffprobe", "ffprobe");

const bitrateLadder = [
  { id: "2160p", height: 2160, bitrate: 40000000 },
  { id: "1440p", height: 1440, bitrate: 16000000 },
  { id: "1080p", height: 1080, bitrate: 8000000 },
  { id: "720p", height: 720, bitrate: 5000000 },
  { id: "480p", height: 480, bitrate: 2500000 },
  { id: "360p", height: 360, bitrate: 1000000 },
  { id: "240p", height: 240, bitrate: 500000 },
  { id: "144p", height: 144, bitrate: 300000 },
];

const audioBitrate = 128000;
const seekBoundaryEpsilon = 0.25;

const metadataCache = new Map();

const getFileStamp = (filePath) => {
  const stats = fs.statSync(filePath);
  return `${stats.size}:${stats.mtime.getTime()}`;
};

const runFile = (binary, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      {
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
        ...options,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stderr }));
          return;
        }
        resolve(stdout);
      },
    );
  });

const parseRate = (rate) => {
  if (!rate || typeof rate !== "string") return 0;
  const [num, den] = rate.split("/").map(Number);
  if (!num || !den) return Number(rate) || 0;
  return num / den;
};

const getRotation = (stream) => {
  const sideData = Array.isArray(stream.side_data_list)
    ? stream.side_data_list.find((entry) => typeof entry.rotation === "number")
    : null;

  if (sideData) return Math.abs(sideData.rotation) % 180;
  if (stream.tags?.rotate) return Math.abs(Number(stream.tags.rotate)) % 180;
  return 0;
};

const normalizeMetadata = (probe, filePath) => {
  const videoStream = (probe.streams || []).find(
    (stream) => stream.codec_type === "video" && stream.disposition?.attached_pic !== 1,
  );
  const audioStream = (probe.streams || []).find(
    (stream) => stream.codec_type === "audio",
  );

  if (!videoStream) return null;

  const sourceWidth = Number(videoStream.width) || 0;
  const sourceHeight = Number(videoStream.height) || 0;
  const rotated = getRotation(videoStream) === 90;
  const width = rotated ? sourceHeight : sourceWidth;
  const height = rotated ? sourceWidth : sourceHeight;

  const fps =
    parseRate(videoStream.avg_frame_rate) ||
    parseRate(videoStream.r_frame_rate) ||
    30;

  return {
    path: filePath,
    width,
    height,
    sourceWidth,
    sourceHeight,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 30,
    duration: parseFloat(probe.format?.duration) || 0,
    videoCodec: videoStream.codec_name || "unknown",
    videoBitrate: parseInt(videoStream.bit_rate, 10) || 0,
    audioCodec: audioStream?.codec_name || null,
    hasAudio: Boolean(audioStream),
    pixelFormat: videoStream.pix_fmt || "yuv420p",
  };
};

export const probeMedia = async (filePath, { force = false } = {}) => {
  if (!fs.existsSync(filePath)) return null;

  const stamp = getFileStamp(filePath);
  const cached = metadataCache.get(filePath);
  if (!force && cached && cached.stamp === stamp) {
    return cached.metadata;
  }

  const stdout = await runFile(ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    filePath,
  ]);

  const metadata = normalizeMetadata(JSON.parse(stdout), filePath);
  if (metadata) {
    metadataCache.set(filePath, { stamp, metadata });
  }
  return metadata;
};

const scaleBitrateForFps = (bitrate, fps) => {
  const multiplier = fps >= 50 ? 1.5 : 1;
  return Math.round(bitrate * multiplier);
};

const createTranscodeProfile = (preset, metadata) => {
  const bitrate = scaleBitrateForFps(preset.bitrate, metadata.fps);
  const height = Math.min(preset.height, metadata.height);

  return {
    id: preset.id,
    label: preset.id,
    kind: "transcode",
    height,
    width: Math.round((metadata.width / metadata.height) * height) || metadata.width,
    bitrate,
    maxrate: Math.round(bitrate * 1.25),
    bufsize: Math.round(bitrate * 2),
    fps: metadata.fps,
  };
};

const createOriginalProfile = (metadata) => {
  const nearest =
    [...bitrateLadder]
      .reverse()
      .find((preset) => preset.height >= metadata.height) ||
    bitrateLadder[bitrateLadder.length - 1];
  const bitrate = Math.max(
    scaleBitrateForFps(nearest.bitrate, metadata.fps),
    metadata.videoBitrate || 0,
  );

  return {
    id: "original",
    label: "Original",
    kind: "transcode",
    height: metadata.height,
    width: metadata.width,
    bitrate,
    maxrate: Math.round(bitrate * 1.25),
    bufsize: Math.round(bitrate * 2),
    fps: metadata.fps,
    isOriginal: true,
  };
};

export const buildQualityProfiles = (metadata) => {
  const standardProfiles = bitrateLadder.filter(
    (preset) => preset.height <= metadata.height,
  ).map((preset) => createTranscodeProfile(preset, metadata));

  const profiles = [
    {
      id: "auto",
      label: "Auto",
      kind: "auto",
      height: null,
      width: null,
      bitrate: null,
      maxrate: null,
      bufsize: null,
      fps: metadata.fps,
    },
    ...standardProfiles,
    createOriginalProfile(metadata),
    {
      id: "direct",
      label: "Direct Play",
      kind: "direct",
      height: metadata.height,
      width: metadata.width,
      bitrate: metadata.videoBitrate || null,
      maxrate: null,
      bufsize: null,
      fps: metadata.fps,
    },
  ];

  return profiles;
};

export const getQualityProfiles = async (filePath) => {
  const metadata = await probeMedia(filePath);
  if (!metadata) return null;

  return {
    metadata,
    profiles: buildQualityProfiles(metadata),
  };
};

export const resolveProfile = (profiles, profileId) => {
  if (!profiles || !profileId) return null;
  return profiles.find((profile) => profile.id === profileId) || null;
};

export const resolveAutoProfile = (profiles, bandwidthBps = 0) => {
  const candidates = profiles.filter(
    (profile) => profile.kind === "transcode" && !profile.isOriginal,
  );
  if (!candidates.length) {
    return profiles.find((profile) => profile.kind === "transcode") || null;
  }

  if (bandwidthBps > 0) {
    const affordable = candidates.find(
      (profile) => profile.bitrate <= bandwidthBps * 0.8,
    );
    if (affordable) return affordable;
    return candidates[candidates.length - 1];
  }

  return (
    candidates.find((profile) => profile.id === "720p") ||
    candidates.find((profile) => profile.height <= 720) ||
    candidates[0]
  );
};

const testSources = {
  nvenc: ["-c:v", "h264_nvenc", "-preset", "medium", "-pix_fmt", "yuv420p"],
  qsv: ["-c:v", "h264_qsv", "-pix_fmt", "nv12"],
  amf: ["-c:v", "h264_amf", "-quality", "balanced", "-pix_fmt", "yuv420p"],
  videotoolbox: ["-c:v", "h264_videotoolbox", "-pix_fmt", "yuv420p"],
};

const vaapiDevice = "/dev/dri/renderD128";

let encoderPromise = null;

const getEncoderCandidates = () => {
  if (isWindows) {
    return [
      { name: "h264_nvenc", key: "nvenc" },
      { name: "h264_qsv", key: "qsv" },
      { name: "h264_amf", key: "amf" },
    ];
  }
  if (isMac) {
    return [{ name: "h264_videotoolbox", key: "videotoolbox" }];
  }
  if (isLinux) {
    const candidates = [
      { name: "h264_nvenc", key: "nvenc" },
      { name: "h264_qsv", key: "qsv" },
    ];
    if (fs.existsSync(vaapiDevice)) {
      candidates.splice(1, 0, {
        name: "h264_vaapi",
        key: "vaapi",
        device: vaapiDevice,
      });
    }
    return candidates;
  }
  return [];
};

const listEncoders = async () => {
  try {
    const stdout = await runFile(ffmpegPath, ["-hide_banner", "-encoders"]);
    return new Set(
      stdout
        .split("\n")
        .map((line) => line.trim().split(/\s+/)[1])
        .filter(Boolean),
    );
  } catch (error) {
    console.warn("[transcode] unable to list ffmpeg encoders:", error.message);
    return new Set();
  }
};

const testEncoder = async (candidate) => {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=black:s=320x240:r=30:d=0.3",
    "-frames:v",
    "3",
  ];

  if (candidate.key === "vaapi") {
    args.push("-vaapi_device", candidate.device, "-vf", "format=nv12,hwupload");
    args.push("-c:v", candidate.name, "-f", "null", "-");
  } else {
    args.push(...(testSources[candidate.key] || ["-c:v", candidate.name]));
    args.push("-f", "null", "-");
  }

  try {
    await runFile(ffmpegPath, args, { timeout: 12000 });
    return true;
  } catch (error) {
    console.info(
      `[transcode] hardware encoder ${candidate.name} unavailable: ${
        (error.stderr || error.message || "").toString().trim().split("\n").pop()
      }`,
    );
    return false;
  }
};

const detectEncoder = async () => {
  const available = await listEncoders();
  const candidates = getEncoderCandidates().filter((candidate) =>
    available.has(candidate.name),
  );

  for (const candidate of candidates) {
    if (await testEncoder(candidate)) {
      console.log(`[transcode] using hardware encoder ${candidate.name}`);
      return {
        name: candidate.name,
        hardware: true,
        key: candidate.key,
        device: candidate.device || null,
      };
    }
  }

  console.log("[transcode] falling back to software encoder libx264");
  return { name: "libx264", hardware: false, key: "libx264", device: null };
};

export const getVideoEncoder = () => {
  if (!encoderPromise) {
    encoderPromise = detectEncoder().catch((error) => {
      console.error("[transcode] encoder detection failed:", error);
      return { name: "libx264", hardware: false, key: "libx264", device: null };
    });
  }
  return encoderPromise;
};

export const warmUpVideoEncoder = () => {
  getVideoEncoder().catch(() => {});
};

const getScaleFilter = (encoder, height) => {
  if (encoder.key === "vaapi") {
    return `format=nv12,hwupload,scale_vaapi=w=-2:h=${height}`;
  }
  return `scale=-2:${height}:flags=lanczos`;
};

const getVideoCodecArgs = (encoder, profile, metadata, gopSeconds = 2) => {
  const args = ["-c:v", encoder.name];
  const gop = Math.max(
    1,
    Math.round((profile.fps || metadata.fps || 30) * gopSeconds),
  );

  switch (encoder.key) {
    case "nvenc":
      args.push(
        "-preset",
        "medium",
        "-b:v",
        String(profile.bitrate),
        "-maxrate",
        String(profile.maxrate),
        "-bufsize",
        String(profile.bufsize),
        "-pix_fmt",
        "yuv420p",
      );
      break;
    case "qsv":
      args.push(
        "-preset",
        "veryfast",
        "-b:v",
        String(profile.bitrate),
        "-maxrate",
        String(profile.maxrate),
        "-bufsize",
        String(profile.bufsize),
        "-pix_fmt",
        "nv12",
      );
      break;
    case "amf":
      args.push(
        "-quality",
        "balanced",
        "-b:v",
        String(profile.bitrate),
        "-maxrate",
        String(profile.maxrate),
        "-bufsize",
        String(profile.bufsize),
        "-pix_fmt",
        "yuv420p",
      );
      break;
    case "videotoolbox":
      args.push(
        "-b:v",
        String(profile.bitrate),
        "-maxrate",
        String(profile.maxrate),
        "-bufsize",
        String(profile.bufsize),
        "-pix_fmt",
        "yuv420p",
      );
      break;
    case "vaapi":
      args.push(
        "-b:v",
        String(profile.bitrate),
        "-maxrate",
        String(profile.maxrate),
        "-bufsize",
        String(profile.bufsize),
      );
      break;
    default:
      args.push(
        "-preset",
        "veryfast",
        "-profile:v",
        "main",
        "-pix_fmt",
        "yuv420p",
        "-b:v",
        String(profile.bitrate),
        "-maxrate",
        String(profile.maxrate),
        "-bufsize",
        String(profile.bufsize),
      );
  }

  args.push("-g", String(gop), "-keyint_min", String(gop), "-sc_threshold", "0");

  return args;
};

const clampStart = (start, duration) => {
  const parsed = Number(start);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (!duration || !Number.isFinite(duration)) return parsed;
  return Math.min(
    Math.max(parsed, 0),
    Math.max(duration - seekBoundaryEpsilon, 0),
  );
};

export const buildTranscodeArgs = ({
  input,
  profile,
  metadata,
  encoder,
  start = 0,
}) => {
  const args = ["-hide_banner", "-loglevel", "error", "-nostdin"];
  const seek = clampStart(start, metadata.duration);

  if (seek > 0) {
    args.push("-ss", seek.toFixed(3));
  }

  args.push("-i", input);
  args.push("-map", "0:v:0");
  if (metadata.hasAudio) args.push("-map", "0:a:0?");
  args.push("-sn", "-dn");

  if (encoder.key === "vaapi" && encoder.device) {
    args.push("-vaapi_device", encoder.device);
  }

  args.push("-vf", getScaleFilter(encoder, profile.height));
  args.push(...getVideoCodecArgs(encoder, profile, metadata));

  if (metadata.hasAudio) {
    args.push(
      "-c:a",
      "aac",
      "-b:a",
      String(audioBitrate),
      "-ac",
      "2",
      "-ar",
      "48000",
    );
  } else {
    args.push("-an");
  }

  args.push(
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "-flush_packets",
    "1",
    "-f",
    "mp4",
    "pipe:1",
  );

  return { args, seek };
};

export const spawnTranscode = ({ input, profile, metadata, encoder, start }) => {
  const { args, seek } = buildTranscodeArgs({
    input,
    profile,
    metadata,
    encoder,
    start,
  });

  const child = spawn(ffmpegPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 8192) stderr = stderr.slice(-8192);
  });

  child.on("error", (error) => {
    console.error("[transcode] failed to start ffmpeg:", error.message);
  });

  child.on("close", (code) => {
    if (code !== 0 && code !== null && stderr.trim()) {
      console.error(`[transcode] ffmpeg exited with code ${code}: ${stderr.trim()}`);
    }
  });

  return { child, seek };
};

export const hlsSegmentDuration = 4;

export const buildHlsArgs = ({
  input,
  profile,
  metadata,
  encoder,
  start = 0,
  segmentDuration = hlsSegmentDuration,
  playlistPath,
  segmentFilename,
}) => {
  const args = ["-hide_banner", "-loglevel", "error", "-nostdin"];
  const seek = clampStart(start, metadata.duration);

  if (seek > 0) {
    args.push("-ss", seek.toFixed(3));
  }

  args.push("-i", input);
  args.push("-map", "0:v:0");
  if (metadata.hasAudio) args.push("-map", "0:a:0?");
  args.push("-sn", "-dn");

  if (encoder.key === "vaapi" && encoder.device) {
    args.push("-vaapi_device", encoder.device);
  }

  args.push("-vf", getScaleFilter(encoder, profile.height));
  args.push(...getVideoCodecArgs(encoder, profile, metadata, segmentDuration));

  args.push(
    "-sc_threshold",
    "0",
    "-force_key_frames",
    `expr:gte(t,n_forced*${segmentDuration})`,
  );

  if (metadata.hasAudio) {
    args.push(
      "-c:a",
      "aac",
      "-b:a",
      String(audioBitrate),
      "-ac",
      "2",
      "-ar",
      "48000",
    );
  } else {
    args.push("-an");
  }

  args.push(
    "-f",
    "hls",
    "-hls_time",
    String(segmentDuration),
    "-hls_playlist_type",
    "event",
    "-hls_list_size",
    "0",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    segmentFilename,
    playlistPath,
  );

  return { args, seek };
};

export const spawnHlsTranscode = ({
  input,
  profile,
  metadata,
  encoder,
  start,
  playlistPath,
  segmentFilename,
}) => {
  const { args, seek } = buildHlsArgs({
    input,
    profile,
    metadata,
    encoder,
    start,
    playlistPath,
    segmentFilename,
  });

  const child = spawn(ffmpegPath, args, {
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 16384) stderr = stderr.slice(-16384);
  });

  return { child, seek, getStderr: () => stderr };
};
