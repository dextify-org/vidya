import { execFile } from "node:child_process";

const probeMediaDuration = (
  executable,
  filePath,
  runExecFile = execFile,
) =>
  new Promise((resolve, reject) => {
    runExecFile(
      executable,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { windowsHide: true },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(parseFloat(stdout.trim()) || 0);
      },
    );
  });

export { probeMediaDuration };
