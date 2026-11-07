import { Router } from "express";
import { isAuthenticated, verifyQueryToken } from "../middleware/owner.js";
import {
  Category,
  Course,
  Lecture,
  LectureProgress,
  Section,
  TrackingSystem,
  Instructor,
  PathFile,
  User,
  TagsAndBookmark,
  CourseProgress,
} from "../models/index.js";
import fs, { promises as fsp } from "fs";
import path from "path";
import {
  getQualityProfiles,
  resolveProfile,
  resolveAutoProfile,
  getVideoEncoder,
  spawnTranscode,
} from "../utils/transcode.js";
import {
  openHlsSession,
  getHlsSession,
  sendHlsPlaylist,
  sendHlsSegment,
} from "../utils/hlsSession.js";
const router = Router();
const videoQualityPattern = /^(direct|auto|original|\d{3,4}p)$/;
const convertSRTToWebVTT = (srtContent) => {
  return [
    "WEBVTT\n",
    ...srtContent
      .trim()
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((cue) => {
        const lines = cue.split("\n").filter((l) => l.trim());
        if (lines.length < 3) return null;
        const timecode = lines[1]
          .replace(/,/g, ".")
          .replace(/(\d+:\d+:\d+).(\d+)/g, "$1.$2")
          .replace(/ /g, "");
        return `${timecode}\n${lines.slice(2).join("\n")}`;
      })
      .filter(Boolean),
  ].join("\n\n");
};

const timestampToSeconds = (timestamp) => {
  const match = timestamp
    .trim()
    .match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\.(\d{3})$/);
  if (!match) return null;
  const [, hours = "0", minutes, seconds, milliseconds] = match;
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(seconds, 10) +
    parseInt(milliseconds, 10) / 1000
  );
};

const secondsToTimestamp = (seconds) => {
  const totalMs = Math.round(Math.max(0, seconds) * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    `${String(secs).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`,
  ].join(":");
};

const shiftWebVTT = (content, offset) => {
  if (!offset || offset <= 0) return content;

  const [header, ...cues] = content.trim().split(/\n{2,}/);
  const shiftedCues = cues
    .map((cue) => {
      const lines = cue.split("\n");
      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex === -1) return null;

      const [startRaw, endRaw] = lines[timingIndex]
        .split("-->")
        .map((value) => value.trim().split(/\s+/)[0]);
      const start = timestampToSeconds(startRaw);
      const end = timestampToSeconds(endRaw);
      if (start === null || end === null) return null;

      const shiftedStart = start - offset;
      const shiftedEnd = end - offset;
      if (shiftedEnd <= 0) return null;

      lines[timingIndex] = `${secondsToTimestamp(Math.max(0, shiftedStart))} --> ${secondsToTimestamp(shiftedEnd)}`;
      return lines.join("\n");
    })
    .filter(Boolean);

  return [header, ...shiftedCues].join("\n\n");
};

const streamVideoFile = (req, res, videoPath) => {
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": fileSize,
    "Accept-Ranges": "bytes",
    "Content-Type": "video/mp4",
  });

  fs.createReadStream(videoPath).pipe(res);
};

const findVideoLecture = async (lectureId) => {
  const lecture = await Lecture.findByPk(lectureId);
  if (!lecture?.path || !fs.existsSync(lecture.path)) return null;
  return lecture;
};

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const course = await Course.findAll();
    res.status(200).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/player", isAuthenticated, async (req, res) => {
  try {
    const { CourseId } = req.body;
    const UserId = req.user.id;
    const courseData = await Course.findByPk(CourseId, {
      include: [
        {
          model: Section,
          as: "sections",
          attributes: ["id", "cleanedName", "order", "duration"],
          include: {
            model: Lecture,
            as: "lectures",
            attributes: [
              "id",
              "content",
              "type",
              "order",
              "cleanedName",
              "subtitles",
              "duration",
            ],
            include: {
              model: LectureProgress,
              as: "lectureprogresses",
              where: { UserId },
              attributes: ["hasCompleted", "progress"],
              required: false,
            },
          },
        },
        {
          model: CourseProgress,
          as: "courseprogresses",
          where: { UserId },
          required: false,
        },
      ],
      order: [
        [{ model: Section, as: "sections" }, "order", "ASC"],
        [
          { model: Section, as: "sections" },
          { model: Lecture, as: "lectures" },
          "order",
          "ASC",
        ],
      ],
      attributes: ["id", "cleanedName", "description"],
    });
    const preferences = {
      deflang: req.user.deflang,
      defvideo: req.user.defvideo,
    };
    res.json([courseData, preferences]);
  } catch (error) {
    console.error(error);
  }
});
const getCourseData = async (CourseId) => {
  try {
    const [courseone, categories, instructor] = await Promise.all([
      Course.findByPk(CourseId, {
        include: [
          {
            model: Section,
            as: "sections",
            attributes: ["id", "cleanedName", "order", "duration"],
            include: {
              model: Lecture,
              as: "lectures",
              attributes: ["id", "type", "order", "cleanedName", "duration"],
            },
          },
          { model: CourseProgress, as: "courseprogresses" },
          { model: Category, as: "category" },
          { model: Instructor, as: "instructors" },
        ],
        order: [
          [{ model: Section, as: "sections" }, "order", "ASC"],
          [
            { model: Section, as: "sections" },
            { model: Lecture, as: "lectures" },
            "order",
            "ASC",
          ],
        ],
        attributes: ["id", "cleanedName", "description", "photo", "duration"],
      }),
      Category.findAll(),
      Instructor.findAll(),
    ]);

    return {
      course: courseone || {},
      categories: categories || [],
      instructors: instructor || [],
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fetch course data");
  }
};

router.post("/individual", isAuthenticated, async (req, res) => {
  try {
    const { CourseId } = req.body;

    const courseData = await getCourseData(CourseId);
    res.json({ ...courseData, role: req.user.role });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch course data");
  }
});
router.post("/lectureprogress", isAuthenticated, async (req, res) => {
  const { lectureId, courseId } = req.body;
  const userId = req.user.id;
  try {
    const lectureprogress = await LectureProgress.findOne({
      where: { LectureId: lectureId, CourseId: courseId, UserId: userId },
    });
    res.json(lectureprogress);
  } catch (error) {
    console.error(error);
    res.status(404).send("progress not found");
  }
});
router.get(
  "/stream/:LectureId",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    const lecture = await findVideoLecture(req.params.LectureId);
    if (!lecture) {
      return res.status(404).send("Video not found");
    }

    streamVideoFile(req, res, lecture.path);
  }
);

router.get(
  "/qualities/:LectureId",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    try {
      const lecture = await findVideoLecture(req.params.LectureId);
      if (!lecture) {
        return res.status(404).send("Video not found");
      }

      const quality = await getQualityProfiles(lecture.path);
      if (!quality) {
        return res.status(415).send("Unsupported video format");
      }

      res.setHeader("Cache-Control", "no-store");
      res.json({
        profiles: quality.profiles,
        source: {
          width: quality.metadata.width,
          height: quality.metadata.height,
          fps: quality.metadata.fps,
          duration: quality.metadata.duration,
          codec: quality.metadata.videoCodec,
          bitrate: quality.metadata.videoBitrate,
        },
      });
    } catch (error) {
      console.error("Error resolving video qualities:", error);
      res.status(500).send("Internal server error");
    }
  }
);

const sendHlsFailure = (res, error) => {
  if (res.headersSent) {
    res.end();
    return;
  }
  const status = Number(error?.status) || 500;
  console.error("HLS stream error:", error?.message || error);
  res.status(status).json({
    message: error?.message || "HLS stream error",
    code: error?.code || "HLS_ERROR",
  });
};

const openSessionForLecture = async (req, res) => {
  const lecture = await findVideoLecture(req.params.LectureId);
  if (!lecture) {
    res.status(404).send("Video not found");
    return null;
  }

  const quality = await getQualityProfiles(lecture.path);
  if (!quality) {
    res.status(415).send("Unsupported video format");
    return null;
  }

  const requestedProfile = String(req.query.profile || "auto");
  const profile =
    requestedProfile === "auto"
      ? resolveAutoProfile(quality.profiles)
      : resolveProfile(quality.profiles, requestedProfile);

  if (!profile) {
    res.status(400).json({ message: "Invalid quality profile" });
    return null;
  }

  if (profile.kind === "direct") {
    streamVideoFile(req, res, lecture.path);
    return null;
  }

  return openHlsSession({
    lectureId: lecture.id,
    lecturePath: lecture.path,
    profile,
    metadata: quality.metadata,
    start: req.query.start,
    viewer: req.query.viewer,
  });
};

router.get(
  "/hls/session/:sid/playlist.m3u8",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    const session = getHlsSession(req.params.sid);
    if (!session) {
      return res.status(404).send("HLS session not found");
    }

    try {
      await sendHlsPlaylist(req, res, session, { token: req.query.token });
    } catch (error) {
      sendHlsFailure(res, error);
    }
  }
);

router.get(
  "/hls/session/:sid/:segment",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    const session = getHlsSession(req.params.sid);
    if (!session) {
      return res.status(404).send("HLS session not found");
    }

    try {
      await sendHlsSegment(req, res, session, req.params.segment);
    } catch (error) {
      sendHlsFailure(res, error);
    }
  }
);

router.get(
  "/hls/:LectureId/playlist.m3u8",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    try {
      const session = await openSessionForLecture(req, res);
      if (!session) return;
      await sendHlsPlaylist(req, res, session, { token: req.query.token });
    } catch (error) {
      sendHlsFailure(res, error);
    }
  }
);

router.get(
  "/transcode/:LectureId",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    try {
      const lecture = await findVideoLecture(req.params.LectureId);
      if (!lecture) {
        return res.status(404).send("Video not found");
      }

      const quality = await getQualityProfiles(lecture.path);
      if (!quality) {
        return res.status(415).send("Unsupported video format");
      }

      const requestedProfile = String(req.query.profile || "auto");
      const profile =
        requestedProfile === "auto"
          ? resolveAutoProfile(quality.profiles)
          : resolveProfile(quality.profiles, requestedProfile);

      if (!profile) {
        return res.status(400).json({ message: "Invalid quality profile" });
      }

      if (profile.kind === "direct") {
        return streamVideoFile(req, res, lecture.path);
      }

      const encoder = await getVideoEncoder();
      const { child, seek } = spawnTranscode({
        input: lecture.path,
        profile,
        metadata: quality.metadata,
        encoder,
        start: req.query.start,
      });

      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-store",
        "Accept-Ranges": "none",
        "X-Stream-Start": seek.toFixed(3),
        "X-Stream-Profile": profile.id,
        "X-Video-Duration": String(quality.metadata.duration || 0),
        "X-Video-Height": String(profile.height),
      });

      const stopTranscode = () => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      };

      req.on("close", stopTranscode);
      res.on("close", stopTranscode);
      child.stdout.on("error", (error) => {
        if (error.code !== "EPIPE") {
          console.error("Transcode stream error:", error);
        }
      });
      child.on("error", () => res.end());

      child.stdout.pipe(res);
    } catch (error) {
      console.error("Error transcoding video:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      } else {
        res.end();
      }
    }
  }
);

router.get(
  "/download/:LectureId",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    try {
      const { LectureId } = req.params;
      const lecture = await Lecture.findByPk(LectureId);

      if (!lecture || !lecture.path) {
        return res.status(404).send("File not found");
      }
      const filePath = lecture.path;

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();

      res.setHeader("Content-Length", fileSize);

      if (fileExtension === ".pdf") {
        res.setHeader("Content-Type", "application/pdf");
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName}"`
        );
      }

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("error", (error) => {
        console.error("Error streaming file:", error);
        res.status(500).end();
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).send("Internal server error");
    }
  }
);
router.get(
  "/content/:contentId",
  verifyQueryToken,
  isAuthenticated,
  async (req, res) => {
    try {
      const { contentId } = req.params;
      const content = await PathFile.findByPk(contentId);

      if (!content || !content.path) {
        return res.status(404).send("File not found");
      }
      const filePath = content.path;

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const fileName = path.basename(filePath);

      res.setHeader("Content-Length", fileSize);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("error", (error) => {
        console.error("Error streaming file:", error);
        res.status(500).end();
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).send("Internal server error");
    }
  }
);
router.get("/subtitle/:subtitleId", async (req, res) => {
  try {
    const { subtitleId } = req.params;
    const subtitle = await PathFile.findByPk(subtitleId);

    if (!subtitle || !subtitle.path) {
      return res.status(404).send("File not found");
    }
    const filePath = subtitle.path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const fileExtension = path.extname(filePath).toLowerCase();
    const offset = Math.max(0, parseFloat(req.query.start) || 0);

    res.setHeader("Content-Type", "text/vtt");
    if (fileExtension === ".srt") {
      const srtContent = await fsp.readFile(filePath, "utf8");
      const webVTTContent = convertSRTToWebVTT(srtContent);
      res.send(shiftWebVTT(webVTTContent, offset));
    } else {
      const vttContent = await fsp.readFile(filePath, "utf8");
      res.send(shiftWebVTT(vttContent, offset));
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send("Internal server error");
  }
});
router.post(
  "/progress/lecturetogglecomplete",
  isAuthenticated,
  async (req, res) => {
    const { LectureId, CourseId } = req.body;
    try {
      await TrackingSystem.toggleLectureComplete(
        req.user.id,
        LectureId,
        CourseId
      );
      res.status(201).send("Lecture Progress Updated");
    } catch (error) {
      console.error(error);
      res.status(500);
    }
  }
);
router.post(
  "/progress/lecturetogglenotcomplete",
  isAuthenticated,
  async (req, res) => {
    const { LectureId, CourseId } = req.body;
    try {
      await TrackingSystem.toggleLectureNotComplete(
        req.user.id,
        LectureId,
        CourseId
      );
      res.status(201).send("Lecture Progress Updated");
    } catch (error) {
      console.error(error);
      res.status(500);
    }
  }
);
router.post("/progress/courseprogress", isAuthenticated, async (req, res) => {
  const { CourseId, progress, hasCompleted } = req.body;
  try {
    await TrackingSystem.updateCourseProgress(
      req.user.id,
      CourseId,
      progress,
      hasCompleted
    );
    res.status(201).send("Course Progress Updated");
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});
router.post("/pin", isAuthenticated, async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;
  try {
    await User.update({ featuredCourse: courseId }, { where: { id: userId } });
    res.status(200).send("course added to featured course");
  } catch (error) {
    console.error(error);
    res.status(500).send("internal server error");
  }
});
router.post("/progress/watchtime", isAuthenticated, async (req, res) => {
  const { seconds, lectureId, courseId, progress } = req.body;
  const userId = req.user.id;
  try {
    await TrackingSystem.updateWatchTime(
      userId,
      seconds,
      lectureId,
      progress,
      courseId
    );
    res.status(201).send("Lecture Progress Updated");
  } catch (error) {
    console.error(error);
    res.status(500);
  }
});
router.post("/subtitle/preference", isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { language } = req.body;
  try {
    const user = await User.findByPk(userId);
    await user.update({ deflang: language });
    res.status(204).send("Subtitle preference updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("internal server error");
  }
});

router.post("/video/preference", isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { quality } = req.body;

  if (typeof quality !== "string" || !videoQualityPattern.test(quality)) {
    return res.status(400).send("Invalid video quality preference");
  }

  try {
    const user = await User.findByPk(userId);
    await user.update({ defvideo: quality });
    res.status(204).send("Video quality preference updated successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("internal server error");
  }
});

router.post("/tagsandbookmark", isAuthenticated, async (req, res) => {
  const UserId = req.user.id;
  const { lectureId, name, type, courseId, courseName } = req.body;

  try {
    await TagsAndBookmark.create({
      UserId,
      lectureId,
      name,
      type,
      courseId,
      courseName,
    });
    res.status(201).send("created successfully");
  } catch (error) {
    console.error(error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: `This lecture already has a "${req.body.type}" tag`,
      });
    }
    res.status(500).send("internal server error");
  }
});
export default router;
