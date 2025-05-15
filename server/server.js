import express from "express";
import multer from "multer";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import * as replace from "replace-in-file";
import { fileURLToPath } from "url";
import cors from "cors";
import { dirname } from "path";
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const TEMPLATE_DIR = path.join(__dirname, "template");
const BUILD_DIR = path.join(__dirname, "..", "build");
fs.ensureDirSync(BUILD_DIR);
app.use(express.static(__dirname));
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, X-Requested-With",
}));
const upload = multer();
app.post("/generate-apk", upload.none(), async (req, res) => {
    const { packageName, appName, webViewUrl } = req.body;
    console.log(webViewUrl, "ppppppppppppppp");
    if (!packageName || !appName || !webViewUrl) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    // Add timestamp-based folder to prevent overwrite
    const timestamp = Date.now().toString();
    const uniqueProjectDir = path.join(BUILD_DIR, timestamp);
    const projectDir = uniqueProjectDir;
    console.log("Generating APK with:", { packageName, appName, webViewUrl });
    try {
        await fs.copy(TEMPLATE_DIR, projectDir);
        const manifestPath = path.join(projectDir, "app", "src", "main", "AndroidManifest.xml");
        const mainActivityPath = path.join(projectDir, "app", "src", "main", "java", "com", "example", "apkgenmaster", "MainActivity.java");
        const gradlePath = path.join(projectDir, "app", "build.gradle");
        const stringsPath = path.join(projectDir, "app", "src", "main", "res", "values", "strings.xml");
        await replace.replaceInFile({
            files: [manifestPath, gradlePath],
            from: /com\.example\.apkgenmaster/g,
            to: packageName,
        });
        await replace.replaceInFile({
            files: stringsPath,
            from: /WebView App/g,
            to: appName,
        });
        await replace.replaceInFile({
            files: mainActivityPath,
            from: /https:\/\/www\.extramarks\.com/g,
            to: webViewUrl,
        });
        await replace.replaceInFile({
            files: mainActivityPath,
            from: /^package\s+com\.example\.apkgenmaster;/m,
            to: `package ${packageName};`,
        });
        const oldJavaPath = path.join(projectDir, "app", "src", "main", "java", "com", "example", "apkgenmaster");
        const newJavaPath = path.join(projectDir, "app", "src", "main", "java", ...packageName.split("."));
        await fs.ensureDir(path.dirname(newJavaPath));
        await fs.move(oldJavaPath, newJavaPath, { overwrite: true });
        const isWindows = process.platform === "win32";
        const gradleCmd = isWindows
            ? `gradlew.bat assembleDebug`
            : `chmod +x gradlew && ./gradlew assembleDebug`;
        exec(`cd "${projectDir}" && ${gradleCmd}`, { maxBuffer: 1024 * 1024 * 10 }, async (error) => {
            if (error) {
                console.error("Build error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "APK build failed",
                    error: error.message,
                });
            }
            const apkPath = path.join(projectDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
            if (!fs.existsSync(apkPath)) {
                return res
                    .status(404)
                    .json({ success: false, message: "APK not found" });
            }
            const relativeApkPath = path.relative(BUILD_DIR, apkPath);
            const downloadUrl = `/apk/${relativeApkPath.replace(/\\/g, "/")}`;
            res.setHeader("Content-Type", "application/json");
            res.json({ success: true, downloadUrl });
        });
    }
    catch (e) {
        console.error(e);
        res.setHeader("Content-Type", "application/json");
        res.status(500).json({ success: false, message: "Server error" });
    }
});
// Serve all folders inside /build for apk download
app.use("/apk", express.static(BUILD_DIR));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
const startServer = () => {
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on("connection", (socket) => {
        socket.on("close", () => { });
    });
    process.on("SIGTERM", () => {
        server.close(() => {
            console.log("Server stopped");
            process.exit(0);
        });
    });
    return server;
};
try {
    startServer();
}
catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
}
export default app;
