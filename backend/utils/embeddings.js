import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

export function generateImageEmbedding(imagePath) {
  return new Promise((resolve, reject) => {
    const utilsDir = path.dirname(fileURLToPath(import.meta.url));
    const backendDir = path.resolve(utilsDir, "..");

    const scriptPath = path.resolve(backendDir, "ml", "embed_image.py");
    const pythonPath = path.resolve(backendDir, ".venv", "bin", "python"); // uses your backend venv

    const proc = spawn(pythonPath, [scriptPath, imagePath], { cwd: backendDir });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => {
      reject(new Error(`Failed to start embedding process: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`embed script failed (${code}): ${stderr || stdout}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.error) return reject(new Error(parsed.error));
        resolve(parsed); // { model, embedding }
      } catch (e) {
        reject(new Error(`Failed to parse embedding JSON: ${e.message}\nOutput: ${stdout}`));
      }
    });
  });
}
