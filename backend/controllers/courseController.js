import path from "path";
import os from "os";
import fs, { promises as fsp } from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  CourseFolder,
  Lecture,
  Section,
  Course,
  PathFile,
} from "../models/index.js";
import { probeMediaDuration } from "../utils/media.js";
import ffprobe from "@ffprobe-installer/ffprobe";
const isWindows = os.platform() === "win32";
const ffprobePath = ffprobe.path;
const pathCache = {
  entries: new Map(),
  reset() {
    this.entries = new Map();
  },
  async getPathId(filePath) {
    const existingPathFile = await PathFile.findOne({
      where: { path: filePath },
    });

    if (existingPathFile) {
      this.entries.set(filePath, existingPathFile.id);
      return existingPathFile.id;
    }

    if (this.entries.has(filePath)) {
      return this.entries.get(filePath);
    }

    const newId = uuidv4();
    this.entries.set(filePath, newId);
    return newId;
  },
  getAllEntries() {
    return Array.from(this.entries.entries()).map(([path, id]) => ({
      id: id,
      path: path,
    }));
  },
};
const durationCache = {
  cache: new Map(),
  async initialize() {
    this.cache = new Map();
  },
  get(filePath) {
    if (!this.cache.has(filePath) || !fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const cached = this.cache.get(filePath);

    if (cached.size === stats.size && cached.mtime === stats.mtime.getTime()) {
      return cached.duration;
    }

    return null;
  },
  set(filePath, duration) {
    if (!fs.existsSync(filePath)) return;

    const stats = fs.statSync(filePath);
    this.cache.set(filePath, {
      size: stats.size,
      mtime: stats.mtime.getTime(),
      duration,
    });
  },
  async save() {},
};

const normalizePath = (inputPath) => {
  if (!inputPath) return isWindows ? "C:\\" : "/";
  if (isWindows) {
    if (inputPath.match(/^[A-Za-z]:$/)) {
      return `${inputPath}\\`;
    }
    const normalized = path.normalize(inputPath);
    return normalized.endsWith("\\") ? normalized : `${normalized}\\`;
  }
  return path.normalize(inputPath);
};

const getSourceId = (filePath) => {
  const stats = fs.statSync(filePath);
  if (!Number.isInteger(stats.ino) || stats.ino === 0) return null;
  return `${stats.dev}:${stats.ino}`;
};

const VIDEO_EXT = new Set([".mp4", ".mkv", ".avi", ".mov"]);
const CONTENT_EXT = new Set([".html", ".txt", ".pdf", ".zip", ".md"]);
const SUB_EXT = new Set([".vtt", ".srt"]);

const naturalSort = (files) => {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return files.sort((a, b) => collator.compare(a, b));
};

const cleanNameCourse = (filename) => {
  return filename
    .replace(/^\d+[\d.-]*\s*[-.]?\s*/, "")
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/^[^-]+-\s*/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\[[^\]]+\]\s*$/, "")
    .trim();
};

const cleanName = (filename) => {
  return filename
    .replace(/^\d+[\d.-]*\s*[-.]?\s*/, "")
    .replace(/\.[^.]+$/, "")
    .trim();
};

const parseBaseNumber = (filename) => {
  const match = filename.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const groupFiles = (files) => {
  const groups = new Map();
  files.forEach((file) => {
    const base = parseBaseNumber(file);
    if (base === null) return;
    if (!groups.has(base)) {
      groups.set(base, {
        main: null,
        contents: [],
        subtitles: [],
      });
    }
    const ext = path.extname(file).toLowerCase();
    const group = groups.get(base);
    if (VIDEO_EXT.has(ext)) {
      group.main = file;
    } else if (SUB_EXT.has(ext)) {
      group.subtitles.push(file);
    } else if (CONTENT_EXT.has(ext) && !group.main) {
      group.main = group.main || file;
    } else if (CONTENT_EXT.has(ext)) {
      group.contents.push(file);
    }
  });
  return groups;
};

const getVideoDurations = async (filePaths) => {
  const existingFiles = filePaths.filter((fp) => fs.existsSync(fp));

  const results = {};
  const filesToProcess = [];

  for (const filePath of existingFiles) {
    const cachedDuration = durationCache.get(filePath);
    if (cachedDuration !== null) {
      results[filePath] = cachedDuration;
    } else {
      filesToProcess.push(filePath);
    }
  }

  const concurrencyLimit = 10;

  for (let i = 0; i < filesToProcess.length; i += concurrencyLimit) {
    const chunk = filesToProcess.slice(i, i + concurrencyLimit);
    const promises = chunk.map(async (filePath) => {
      try {
        const duration = await probeMediaDuration(ffprobePath, filePath);
        results[filePath] = duration;
        durationCache.set(filePath, duration);
      } catch (error) {
        console.error(`Error getting duration for ${filePath}:`, error);
        results[filePath] = 0;
      }
    });

    await Promise.all(promises);
  }

  await durationCache.save();

  return results;
};

const updateSectionDuration = async (sectionId) => {
  const lectures = await Lecture.findAll({
    where: { SectionId: sectionId },
  });

  const totalDuration = lectures.reduce(
    (sum, lecture) => sum + (lecture.duration || 0),
    0,
  );

  await Section.update(
    { duration: totalDuration },
    { where: { id: sectionId } },
  );

  return totalDuration;
};

const updateCourseDuration = async (courseId) => {
  const sections = await Section.findAll({
    where: { CourseId: courseId },
  });

  const totalDuration = sections.reduce(
    (sum, section) => sum + (section.duration || 0),
    0,
  );

  await Course.update({ duration: totalDuration }, { where: { id: courseId } });

  return totalDuration;
};

const collectPathIdsForLecture = (lecture) => {
  const pathIds = new Set();

  if (lecture.content && Array.isArray(lecture.content)) {
    lecture.content.forEach((item) => {
      if (item.pathId) pathIds.add(item.pathId);
    });
  }

  if (lecture.subtitles && Array.isArray(lecture.subtitles)) {
    lecture.subtitles.forEach((item) => {
      if (item.pathId) pathIds.add(item.pathId);
    });
  }

  return Array.from(pathIds);
};

const collectPathIdsForSection = async (sectionId) => {
  const lectures = await Lecture.findAll({ where: { SectionId: sectionId } });

  const pathIds = new Set();
  lectures.forEach((lecture) => {
    collectPathIdsForLecture(lecture).forEach((id) => pathIds.add(id));
  });

  return Array.from(pathIds);
};

const syncCourseDirectory = async (coursedirectory, courseFolderId) => {
  pathCache.reset();
  await durationCache.initialize();

  const usedPathIds = new Set();
  const directory = normalizePath(coursedirectory);

  if (!fs.existsSync(directory)) {
    const course = await Course.findOne({ where: { directory } });
    if (course) {
      await deleteCourse(course.id);
      console.log(`Deleted course: ${course.cleanedName}`);
    }
    return null;
  }

  const courseSourceId = getSourceId(directory);
  let course = await Course.findOne({ where: { directory } });
  if (!course && courseSourceId) {
    course = await Course.findOne({
      where: { CourseFolderId: courseFolderId, sourceId: courseSourceId },
    });
  }

  const courseAttributes = {
    originalName: path.basename(directory),
    cleanedName: cleanNameCourse(path.basename(directory)),
    directory,
    sourceId: courseSourceId,
  };

  if (!course) {
    course = await Course.create({
      ...courseAttributes,
      duration: 0,
      CourseFolderId: courseFolderId,
    });
    console.log("new course created");
  } else {
    await course.update(courseAttributes);
  }

  const currentSections = naturalSort(
    fs
      .readdirSync(directory)
      .filter((name) => fs.statSync(path.join(directory, name)).isDirectory())
      .map((name) => ({
        name,
        sourceId: getSourceId(path.join(directory, name)),
      })),
  );
  const currentSectionsBySourceId = new Map(
    currentSections
      .filter(({ sourceId }) => sourceId)
      .map((section) => [section.sourceId, section]),
  );

  const existingSections = await Section.findAll({
    where: { CourseId: course.id },
    include: [{ model: Lecture, as: "lectures" }],
  });

  for (const section of existingSections) {
    const currentSection =
      (section.sourceId && currentSectionsBySourceId.get(section.sourceId)) ||
      currentSections.find(({ name }) => name === section.originalName);
    if (!currentSection) {
      const pathIdsToDelete = await collectPathIdsForSection(section.id);

      await section.destroy();
      console.log(`Deleted section: ${section.cleanedName}`);

      for (const pathId of pathIdsToDelete) {
        usedPathIds.add(pathId);
      }

      continue;
    }

    const sectionPath = path.join(directory, currentSection.name);
    await section.update({
      originalName: currentSection.name,
      cleanedName: cleanName(currentSection.name),
      sourceId: currentSection.sourceId,
      order: parseBaseNumber(currentSection.name) || 0,
    });

    const files = naturalSort(fs.readdirSync(sectionPath));
    const fileGroups = groupFiles(files);
    const validLectures = new Map();
    for (const group of fileGroups.values()) {
      if (!group.main) continue;
      const mainFile = group.main;
      const sourceId = getSourceId(path.join(sectionPath, mainFile));
      validLectures.set(mainFile, mainFile);
      if (sourceId) validLectures.set(sourceId, mainFile);
    }

    for (const lecture of section.lectures) {
      const lectureName =
        (lecture.sourceId && validLectures.get(lecture.sourceId)) ||
        validLectures.get(path.basename(lecture.path || ""));
      if (!lectureName) {
        const pathIdsToDelete = collectPathIdsForLecture(lecture);

        await lecture.destroy();
        console.log(`Deleted lecture: ${lecture.cleanedName}`);

        for (const pathId of pathIdsToDelete) {
          usedPathIds.add(pathId);
        }
      } else {
        await lecture.update({
          originalName: lectureName,
          cleanedName: cleanName(lectureName),
          sourceId: getSourceId(path.join(sectionPath, lectureName)),
          path: path.join(sectionPath, lectureName),
          order: parseBaseNumber(lectureName) || 0,
        });
      }
    }

    await updateSectionDuration(section.id);
  }

  const videoFilesToProcess = [];
  const lecturesToCreate = [];
  const lectureUpdates = [];

  for (const { name: sectionDir, sourceId: sectionSourceId } of currentSections) {
    const sectionPath = path.join(directory, sectionDir);
    let section = await Section.findOne({
      where: {
        CourseId: course.id,
        originalName: sectionDir,
      },
    });
    if (!section && sectionSourceId) {
      section = await Section.findOne({
        where: { CourseId: course.id, sourceId: sectionSourceId },
      });
    }

    if (!section) {
      section = await Section.create({
        originalName: sectionDir,
        cleanedName: cleanName(sectionDir),
        sourceId: sectionSourceId,
        order: parseBaseNumber(sectionDir) || 0,
        CourseId: course.id,
        duration: 0,
      });
    } else {
      await section.update({
        originalName: sectionDir,
        cleanedName: cleanName(sectionDir),
        sourceId: sectionSourceId,
      });
    }

    const files = naturalSort(fs.readdirSync(sectionPath));
    const fileGroups = groupFiles(files);

    for (const [base, group] of fileGroups) {
      if (
        !group.main ||
        (group.subtitles.length > 0 && !VIDEO_EXT.has(path.extname(group.main)))
      ) {
        continue;
      }

      const mainFile = group.main;
      const ext = path.extname(mainFile).toLowerCase();
      const isVideo = VIDEO_EXT.has(ext);
      const lectureType = isVideo
        ? "video"
        : path.extname(mainFile).replace(".", "");
      const filePath = path.join(sectionPath, mainFile);
      const lectureSourceId = getSourceId(filePath);

      let lecture = await Lecture.findOne({
        where: {
          SectionId: section.id,
          originalName: mainFile,
        },
      });
      if (!lecture && lectureSourceId) {
        lecture = await Lecture.findOne({
          where: { SectionId: section.id, sourceId: lectureSourceId },
        });
      }

      const content = group.contents.map(async (f) => {
        const contentPath = path.join(sectionPath, f);
        const contentPathId = await pathCache.getPathId(contentPath);
        return {
          type: path.extname(f).replace(".", ""),
          pathId: contentPathId,
          originalName: f,
          cleanedName: cleanName(f),
        };
      });

      const languageMap = {
        afrikaans: "af",
        albanian: "sq",
        amharic: "am",
        arabic: "ar",
        armenian: "hy",
        assamese: "as",
        azerbaijani: "az",
        bambara: "bm",
        basque: "eu",
        belarusian: "be",
        bengali: "bn",
        bosnian: "bs",
        bulgarian: "bg",
        burmese: "my",
        catalan: "ca",
        cebuano: "ceb",
        chichewa: "ny",
        chinese: "zh",
        corsican: "co",
        croatian: "hr",
        czech: "cs",
        danish: "da",
        dhivehi: "dv",
        dutch: "nl",
        english: "en",
        esperanto: "eo",
        estonian: "et",
        ewe: "ee",
        filipino: "fil",
        finnish: "fi",
        french: "fr",
        frisian: "fy",
        galician: "gl",
        georgian: "ka",
        german: "de",
        greek: "el",
        gujarati: "gu",
        "haitian creole": "ht",
        hausa: "ha",
        hawaiian: "haw",
        hebrew: "he",
        hindi: "hi",
        hmong: "hmn",
        hungarian: "hu",
        icelandic: "is",
        igbo: "ig",
        indonesian: "id",
        irish: "ga",
        italian: "it",
        japanese: "ja",
        javanese: "jv",
        kannada: "kn",
        kazakh: "kk",
        khmer: "km",
        kinyarwanda: "rw",
        korean: "ko",
        krio: "kri",
        kurdish: "ku",
        kyrgyz: "ky",
        lao: "lo",
        latin: "la",
        latvian: "lv",
        lithuanian: "lt",
        luxembourgish: "lb",
        macedonian: "mk",
        malagasy: "mg",
        malay: "ms",
        malayalam: "ml",
        maltese: "mt",
        maori: "mi",
        marathi: "mr",
        mongolian: "mn",
        nepali: "ne",
        norwegian: "no",
        odia: "or",
        oriya: "or",
        pashto: "ps",
        persian: "fa",
        polish: "pl",
        portuguese: "pt",
        punjabi: "pa",
        romanian: "ro",
        russian: "ru",
        samoan: "sm",
        "scottish gaelic": "gd",
        serbian: "sr",
        sesotho: "st",
        shona: "sn",
        sindhi: "sd",
        sinhala: "si",
        slovak: "sk",
        slovenian: "sl",
        somali: "so",
        spanish: "es",
        sundanese: "su",
        swahili: "sw",
        swedish: "sv",
        tagalog: "tl",
        tajik: "tg",
        tamil: "ta",
        telugu: "te",
        thai: "th",
        turkish: "tr",
        ukrainian: "uk",
        urdu: "ur",
        uyghur: "ug",
        uzbek: "uz",
        vietnamese: "vi",
        welsh: "cy",
        xhosa: "xh",
        yiddish: "yi",
        yoruba: "yo",
        zulu: "zu",
        "simplified chinese": "zh",
      };

      const subtitles = await Promise.all(
        group.subtitles.map(async (f) => {
          const subtitlePath = path.join(sectionPath, f);
          const subtitlePathId = await pathCache.getPathId(subtitlePath);

          const langMatch = f.match(
            /(?:[\s_\-]+)([A-Za-z\s]+)(?=\.[a-z]{3}$)/i,
          );
          let detectedLang = "en";

          if (langMatch) {
            const rawLang = langMatch[1]
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();

            if (languageMap[rawLang]) {
              detectedLang = languageMap[rawLang];
            } else if (/^[a-z]{2}$/.test(rawLang)) {
              detectedLang = rawLang;
            } else {
              const matchedKey = Object.keys(languageMap).find((key) =>
                rawLang.includes(key),
              );
              detectedLang = matchedKey ? languageMap[matchedKey] : "en";
            }
          }

          return {
            language: detectedLang,
            pathId: subtitlePathId,
            type: path.extname(f).replace(".", ""),
            originalName: f,
            cleanedName: cleanName(f),
          };
        }),
      );
      const resolvedContent = await Promise.all(content);
      if (isVideo) {
        videoFilesToProcess.push({
          sectionId: section.id,
          sectionPath,
          filePath,
          mainFile,
          lectureSourceId,
          base,
          lectureType,
          content,
          subtitles,
          lecture,
        });
      } else {
        if (!lecture) {
          lecturesToCreate.push({
            originalName: mainFile,
            cleanedName: cleanName(mainFile),
            sourceId: lectureSourceId,
            order: base,
            type: lectureType,
            path: filePath,
            content: content,
            subtitles: subtitles,
            SectionId: section.id,
            duration: 0,
          });
        } else {
          lectureUpdates.push({
            id: lecture.id,
            originalName: mainFile,
            cleanedName: cleanName(mainFile),
            sourceId: lectureSourceId,
            order: base,
            duration: 0,
            path: filePath,
            content: content,
            subtitles: subtitles,
          });
        }
      }
    }

    const newOrder = parseBaseNumber(sectionDir) || 0;
    if (section.order !== newOrder) {
      await section.update({ order: newOrder });
    }
  }

  if (videoFilesToProcess.length > 0) {
    const videoFilePaths = videoFilesToProcess.map((v) => v.filePath);
    const durationResults = await getVideoDurations(videoFilePaths);

    for (const videoInfo of videoFilesToProcess) {
      const {
        sectionId,
        filePath,
        mainFile,
        lectureSourceId,
        base,
        lectureType,
        content,
        subtitles,
        lecture,
      } = videoInfo;
      const duration = durationResults[filePath] || 0;

      if (!lecture) {
        lecturesToCreate.push({
          originalName: mainFile,
          cleanedName: cleanName(mainFile),
          sourceId: lectureSourceId,
          order: base,
          type: lectureType,
          path: filePath,
          content: content,
          subtitles: subtitles,
          SectionId: sectionId,
          duration,
        });
      } else {
        lectureUpdates.push({
          id: lecture.id,
          originalName: mainFile,
          cleanedName: cleanName(mainFile),
          sourceId: lectureSourceId,
          order: base,
          duration,
          path: filePath,
          content: content,
          subtitles: subtitles,
        });
      }
    }
  }

  if (lecturesToCreate.length > 0) {
    await Lecture.bulkCreate(lecturesToCreate);
  }

  if (lectureUpdates.length > 0) {
    for (const update of lectureUpdates) {
      await Lecture.update(
        {
          originalName: update.originalName,
          cleanedName: update.cleanedName,
          sourceId: update.sourceId,
          order: update.order,
          duration: update.duration,
          path: update.path,
          content: update.content,
          subtitles: update.subtitles,
        },
        { where: { id: update.id } },
      );
    }
  }

  const pathEntries = pathCache.getAllEntries();

  if (pathEntries.length > 0) {
    const existingPaths = await PathFile.findAll({
      where: {
        path: pathEntries.map((entry) => entry.path),
      },
      attributes: ["path"],
    });

    const existingPathSet = new Set(existingPaths.map((p) => p.path));

    const newPathEntries = pathEntries.filter(
      (entry) => !existingPathSet.has(entry.path),
    );

    if (newPathEntries.length > 0) {
      await PathFile.bulkCreate(newPathEntries);
    }
  }

  if (usedPathIds.size > 0) {
    await PathFile.destroy({
      where: {
        id: Array.from(usedPathIds),
      },
    });
  }

  const sections = await Section.findAll({
    where: { CourseId: course.id },
  });

  for (const section of sections) {
    await updateSectionDuration(section.id);
  }

  await updateCourseDuration(course.id);

  return course;
};

const scanForDirectory = async (directory) =>
  new Set(
    naturalSort(
      fs
        .readdirSync(directory)
        .filter((f) => fs.statSync(path.join(directory, f)).isDirectory())
        .map((f) => path.join(directory, f)),
    ),
  );

const reconcileLegacyCourseRename = async (courseFolderId, directories) => {
  const courses = await Course.findAll({ where: { CourseFolderId: courseFolderId } });
  const directoryPaths = Array.from(directories).map(normalizePath);
  const knownDirectories = new Set(courses.map(({ directory }) => directory));
  const missingCourses = courses.filter(
    (course) => !course.sourceId && !directoryPaths.includes(course.directory),
  );
  const addedDirectories = directoryPaths.filter(
    (directory) => !knownDirectories.has(directory),
  );

  // Legacy records have no stable filesystem identity. Only upgrade a rename
  // when there is exactly one possible pairing, avoiding broad guesswork.
  if (missingCourses.length !== 1 || addedDirectories.length !== 1) return;

  const [course] = missingCourses;
  const [directory] = addedDirectories;
  await course.update({
    originalName: path.basename(directory),
    cleanedName: cleanNameCourse(path.basename(directory)),
    directory,
    sourceId: getSourceId(directory),
  });
  console.log(`Renamed course: ${course.cleanedName}`);
};

const collectPathIdsForCourse = async (courseId) => {
  const sections = await Section.findAll({
    where: { CourseId: courseId },
    include: [
      {
        model: Lecture,
        as: "lectures",
      },
    ],
  });

  const pathIds = new Set();

  for (const section of sections) {
    if (section.lectures) {
      for (const lecture of section.lectures) {
        if (lecture.content && Array.isArray(lecture.content)) {
          lecture.content.forEach((item) => {
            if (item.pathId) pathIds.add(item.pathId);
          });
        }

        if (lecture.subtitles && Array.isArray(lecture.subtitles)) {
          lecture.subtitles.forEach((item) => {
            if (item.pathId) pathIds.add(item.pathId);
          });
        }

        if (lecture.pathId) pathIds.add(lecture.pathId);
      }
    }
  }

  return Array.from(pathIds);
};
const deleteCourse = async (courseId) => {
  const pathIdsToDelete = await collectPathIdsForCourse(courseId);

  const course = await Course.findByPk(courseId);
  if (course) {
    await course.destroy();
  }

  if (pathIdsToDelete.length > 0) {
    await PathFile.destroy({
      where: {
        id: pathIdsToDelete,
      },
    });
  }

  return {
    courseDeleted: course ? true : false,
    pathFilesDeleted: pathIdsToDelete.length,
  };
};
const scan = async (req, res) => {
  try {
    const coursefolder = await CourseFolder.findAll();

    for (const folder of coursefolder) {
      const individualCourseDirectory = await scanForDirectory(
        folder.directory,
      );
      await reconcileLegacyCourseRename(folder.id, individualCourseDirectory);
      for (const individualCourse of individualCourseDirectory) {
        await syncCourseDirectory(normalizePath(individualCourse), folder.id);
      }
    }
  } catch (error) {
    res.status(500).send("Error updating the course");
    console.error(error);
  }
  res.status(201).send("successfully updated the course");
};
const addCourseFolder = async (req, res) => {
  try {
    const folders = await Promise.all(
      req.body.folders.map(async (folder) => {
        const stats = await fsp.stat(folder);
        return {
          directory: normalizePath(folder),
          lastModified: stats.mtime,
          lastChecked: new Date(),
        };
      }),
    );

    const coursefolder = await CourseFolder.bulkCreate(folders);
    res.status(201).send("folder successfully ceated");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.body;
    const coursefolder = await CourseFolder.findByPk(folderId);

    if (coursefolder) {
      const courses = await Course.findAll({
        where: { CourseFolderId: folderId },
      });

      const deletionResults = [];
      for (const course of courses) {
        const result = await deleteCourse(course.id);
        deletionResults.push(result);
      }

      await coursefolder.destroy();

      res.status(200).json({
        message: "Successfully removed folder and associated courses",
        folder: coursefolder,
        coursesRemoved: deletionResults,
      });
    } else {
      res.status(404).json({ message: "Folder not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error removing folder");
  }
};
export { scan, addCourseFolder, deleteFolder };
