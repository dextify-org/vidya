import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { isAdminOrFirstStartUp } from "../middleware/owner.js";

const router = Router();

const isWindows = os.platform() === "win32";

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

const getParentDirectory = (currentPath) => {
  if (!currentPath) return null;

  if (isWindows) {
    if (currentPath.match(/^[A-Za-z]:\\$/)) {
      return null;
    }
    const parent = path.dirname(currentPath);
    return parent.endsWith("\\") ? parent : `${parent}\\`;
  } else {
    if (currentPath === "/") return null;
    return path.dirname(currentPath);
  }
};

const isValidPath = (basePath, targetPath) => {
  if (isWindows) {
    const normalizedBase = path.resolve(basePath).toLowerCase();
    const normalizedTarget = path.resolve(targetPath).toLowerCase();

    const baseDrive = normalizedBase.split(":")[0];
    const targetDrive = normalizedTarget.split(":")[0];

    if (baseDrive !== targetDrive) {
      return true;
    }

    return normalizedTarget.startsWith(normalizedBase);
  } else {
    return path.resolve(targetPath).startsWith(path.resolve(basePath));
  }
};

const getSystemDrives = async () => {
  if (isWindows) {
    const driveLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const drives = await Promise.all(
      driveLetters.map(async (letter) => {
        const drivePath = `${letter}:\\`;
        try {
          await fs.access(drivePath);
          return {
            path: drivePath,
            label: `${letter}:`,
            accessible: true,
            type: "drive",
          };
        } catch {
          return null;
        }
      }),
    );
    return drives.filter(Boolean);
  }

  if (os.platform() === "linux") {
    try {
      const mountTable = await fs.readFile("/proc/mounts", "utf8");
      const mounts = mountTable
        .split("\n")
        .filter((line) => line)
        .map((line) => {
          const [device, encodedMountPoint] = line.split(/\s+/);
          const mountPoint = encodedMountPoint
            ?.replaceAll("\\040", " ")
            .replaceAll("\\011", "\t")
            .replaceAll("\\012", "\n")
            .replaceAll("\\134", "\\");
          return {
            path: mountPoint,
            label: device,
            accessible: true,
            type: "mount",
          };
        })
        .filter((mount) => mount.label?.startsWith("/") && mount.path)
        .filter((mount) => {
          const excludePaths = [
            "/boot",
            "/dev",
            "/proc",
            "/sys",
            "/run",
            "/snap",
          ];
          return !excludePaths.some((excluded) =>
            mount.path.startsWith(excluded)
          );
        });

      mounts.unshift({
        path: os.homedir(),
        label: "Home",
        accessible: true,
        type: "home",
      });
      mounts.unshift({
        path: "/",
        label: "Root",
        accessible: true,
        type: "root",
      });
      return mounts;
    } catch (error) {
      console.error("Error getting Linux mount points:", error);
    }
  }

  return [
    {
      path: os.homedir(),
      label: "Home",
      accessible: true,
      type: "home",
    },
    {
      path: "/",
      label: "Root",
      accessible: true,
      type: "root",
    },
  ];
};

router.get("/drives", isAdminOrFirstStartUp, async (req, res) => {
  try {
    const drives = await getSystemDrives();
    res.json(drives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/browse", isAdminOrFirstStartUp, async (req, res) => {
  try {
    let directoryPath = normalizePath(req.query.path);

    if (isWindows && directoryPath.match(/^[A-Za-z]:\\$/)) {
    } else {
      if (!isValidPath(directoryPath, path.resolve(directoryPath))) {
        throw new Error("Invalid path");
      }
    }

    const contents = await fs.readdir(directoryPath, { withFileTypes: true });
    const items = await Promise.all(
      contents.map(async (item) => {
        const itemPath = path.join(directoryPath, item.name);
        let itemInfo = {
          name: item.name,
          isDirectory: item.isDirectory(),
          path: normalizePath(itemPath),
          size: null,
          modifiedTime: null,
          type: item.isDirectory() ? "directory" : "file",
        };

        try {
          const stats = await fs.stat(itemPath);
          itemInfo.size = stats.size;
          itemInfo.modifiedTime = stats.mtime;
        } catch (e) {
          itemInfo.error = "Access denied";
        }

        return itemInfo;
      })
    );

    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    const parentDir = getParentDirectory(directoryPath);
    res.json({
      currentPath: directoryPath,
      parentDirectory: parentDir,
      items: items,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
