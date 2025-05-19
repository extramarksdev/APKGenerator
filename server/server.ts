import cors from "cors";
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import multer from "multer";
import crypto from "crypto";
import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as replace from "replace-in-file";
import { exec, execSync } from "child_process";
import type { Request, Response } from "express";

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
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:8888",
      "http://localhost:3000",
    ],
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, X-Requested-With",
    credentials: true,
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

app.post(
  "/generate-apk",
  upload.fields([
    { name: "icon", maxCount: 1 },
    { name: "keystore", maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const {
      packageName,
      appName,
      webViewUrl,
      enableReleaseBuild,
      keystoreOption,
      keystoreAlias,
      keystorePassword,
      keyPassword,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const iconFile = files["icon"] ? files["icon"][0] : null;
    const keystoreFile = files["keystore"] ? files["keystore"][0] : null;

    if (!packageName || !appName || !webViewUrl) {
      res.status(400).json({
        success: false,
        error: { message: "Missing required fields" },
      });
      return;
    }

    if (enableReleaseBuild === "true") {
      if (!keystoreAlias || !keystorePassword || !keyPassword) {
        res.status(400).json({
          success: false,
          error: { message: "Missing signing information" },
        });
        return;
      }

      if (keystoreOption === "upload" && !keystoreFile) {
        res.status(400).json({
          success: false,
          error: { message: "Missing keystore file" },
        });
        return;
      }
    }

    const timestamp = Date.now();
    const projectDir = path.join(BUILD_DIR, `build_${timestamp}`);

    try {
      await fs.ensureDir(projectDir);

      console.log("Generating APK with:", {
        packageName,
        appName,
        webViewUrl,
        isRelease: enableReleaseBuild === "true",
      });

      await fs.copy(TEMPLATE_DIR, projectDir);

      if (iconFile) {
        const iconBuffer = await sharp(iconFile.buffer)
          .resize(512, 512)
          .toFormat("png")
          .toBuffer();

        const drawablePath = path.join(
          projectDir,
          "app",
          "src",
          "main",
          "res",
          "drawable"
        );

        await fs.ensureDir(drawablePath);
        await fs.writeFile(
          path.join(drawablePath, "ic_launcher.png"),
          iconBuffer
        );
      }

      const manifestPath = path.join(
        projectDir,
        "app",
        "src",
        "main",
        "AndroidManifest.xml"
      );
      const mainActivityPath = path.join(
        projectDir,
        "app",
        "src",
        "main",
        "java",
        "com",
        "newapp",
        "app",
        "MainActivity.java"
      );
      const gradlePath = path.join(projectDir, "app", "build.gradle");
      const stringsPath = path.join(
        projectDir,
        "app",
        "src",
        "main",
        "res",
        "values",
        "strings.xml"
      );

      await replace.replaceInFile({
        files: [manifestPath, gradlePath],
        from: /com\.example\.apkgenmaster/g,
        to: packageName,
      });

      await replace.replaceInFile({
        files: stringsPath,
        from: /<string name="app_name">([^<]*)<\/string>/g,
        to: `<string name="app_name">${appName}</string>`,
      });

      await replace.replaceInFile({
        files: mainActivityPath,
        from: /^package\s+com\.newapp\.app;/m,
        to: `package ${packageName};`,
      });

      await replace.replaceInFile({
        files: mainActivityPath,
        from: /https:\/\/www\.extramarks\.com/g,
        to: webViewUrl,
      });

      await replace.replaceInFile({
        files: gradlePath,
        from: /namespace\s+['"]com\.newapp\.app['"]/g,
        to: `namespace '${packageName}'`,
      });

      await replace.replaceInFile({
        files: gradlePath,
        from: /applicationId\s+['"]com\.newapp\.app['"]/g,
        to: `applicationId '${packageName}'`,
      });

      const oldJavaPath = path.join(
        projectDir,
        "app",
        "src",
        "main",
        "java",
        "com",
        "newapp",
        "app",
        "MainActivity.java"
      );
      const newJavaPath = path.join(
        projectDir,
        "app",
        "src",
        "main",
        "java",
        ...packageName.split("."),
        "MainActivity.java"
      );
      await fs.ensureDir(path.dirname(newJavaPath));
      await fs.move(oldJavaPath, newJavaPath, { overwrite: true });

      let buildType = "debug";
      let keystoreDownloadUrl: string | null = null;

      if (enableReleaseBuild === "true") {
        buildType = "release";

        const keystoreFilename =
          keystoreOption === "generate"
            ? `${crypto.randomBytes(4).toString("hex")}_release.keystore`
            : "release.keystore";

        const keystorePath = path.join(projectDir, "app", keystoreFilename);

        if (keystoreOption === "upload" && keystoreFile) {
          await fs.writeFile(keystorePath, keystoreFile.buffer);
          console.log(`Using uploaded keystore at ${keystorePath}`);
        } else {
          console.log(`Generating new keystore at ${keystorePath}`);

          const keytoolCmd =
            `keytool -genkey -v -keystore "${keystorePath}" ` +
            `-alias ${keystoreAlias} -keyalg RSA -keysize 2048 -validity 10000 ` +
            `-storepass ${keystorePassword} -keypass ${keyPassword} ` +
            `-dname "CN=${appName}, OU=ID, O=APK Generator, L=Unknown, S=Unknown, C=US"`;

          try {
            execSync(keytoolCmd, { stdio: "pipe" });
          } catch (error) {
            console.error(
              "Keystore generation failed:",
              (error as Error).message
            );
            res.status(500).json({
              success: false,
              message: "Failed to generate keystore",
              error: { message: (error as Error).message },
            });
            return;
          }

          const relativeKeystorePath = path.relative(BUILD_DIR, keystorePath);
          keystoreDownloadUrl = `/apk/${relativeKeystorePath.replace(
            /\\/g,
            "/"
          )}`;
        }

        const gradlePropertiesPath = path.join(projectDir, "gradle.properties");
        await fs.appendFile(
          gradlePropertiesPath,
          `
RELEASE_STORE_FILE=${path.basename(keystorePath)}
RELEASE_KEY_ALIAS=${keystoreAlias}
RELEASE_STORE_PASSWORD=${keystorePassword}
RELEASE_KEY_PASSWORD=${keyPassword}
        `
        );

        const signingConfig = `android {
    signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }`;

        await replace.replaceInFile({
          files: gradlePath,
          from: /android\s*\{/,
          to: signingConfig,
        });
      }

      const isWindows = process.platform === "win32";
      const gradleCmd = isWindows
        ? `gradlew.bat assemble${
            buildType.charAt(0).toUpperCase() + buildType.slice(1)
          }`
        : `chmod +x gradlew && ./gradlew assemble${
            buildType.charAt(0).toUpperCase() + buildType.slice(1)
          }`;

      console.log(`Executing build command: ${gradleCmd}`);

      exec(
        `cd "${projectDir}" && ${gradleCmd}`,
        { maxBuffer: 1024 * 1024 * 10 }, // 10 MB buffer
        async (error, stdout, stderr) => {
          if (error) {
            console.error("Build error:", error.message);
            console.error("Build output:", stdout, stderr);
            res.status(500).json({
              success: false,
              message: "APK build failed",
              error: { message: error.message },
            });
            return;
          }

          const apkPath = path.join(
            projectDir,
            "app",
            "build",
            "outputs",
            "apk",
            buildType,
            `app-${buildType}.apk`
          );

          if (!fs.existsSync(apkPath)) {
            console.error(`APK not found at expected path: ${apkPath}`);
            res.status(404).json({
              success: false,
              message: "APK not found",
            });
            return;
          }

          console.log(`APK successfully generated at: ${apkPath}`);

          const relativeApkPath = path.relative(BUILD_DIR, apkPath);
          const downloadUrl = `/apk/${relativeApkPath.replace(/\\/g, "/")}`;

          const apkStats = await fs.stat(apkPath);
          const apkSizeMB = (apkStats.size / (1024 * 1024)).toFixed(2);

          res.setHeader("Content-Type", "application/json");
          res.json({
            success: true,
            downloadUrl: downloadUrl,
            keystoreUrl: keystoreDownloadUrl || undefined,
            message: `${
              buildType.charAt(0).toUpperCase() + buildType.slice(1)
            } APK (${apkSizeMB} MB) generated successfully`,
            buildType: buildType,
            packageName: packageName,
            appName: appName,
          });
        }
      );
    } catch (e) {
      console.error("Error during APK generation:", e);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({
        success: false,
        message: "Server error during APK generation",
        error: { message: (e as Error).message },
      });
    }
  }
);

app.use("/apk", express.static(BUILD_DIR));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const startServer = () => {
  const PORT = 8888;
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("connection", (socket) => {
    socket.on("close", () => {});
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
} catch (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
}

export default app;
