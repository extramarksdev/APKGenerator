/** Third Party Imports */
import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";

/** Relative Imports */
import styles from "./ApkGenerator.module.scss";
import defaultIcon from "./icons/default-icon.png";
import { useApkGenerator } from "./hooks/useApkGenerator";

interface FormData {
  packageName: string;
  appName: string;
  webViewUrl: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface HookStatus {
  message: string;
  type: "success" | "error" | "warning" | "info";
  downloadUrl?: string;
  keystoreUrl?: string;
}

const APKGenerator = () => {
  /** States */
  const [formData, setFormData] = useState<FormData>({
    packageName: "",
    appName: "",
    webViewUrl: "",
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enableReleaseBuild, setEnableReleaseBuild] = useState<boolean>(false);
  const [keystoreOption, setKeystoreOption] = useState<"generate" | "upload">(
    "generate"
  );
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [keystoreAlias, setKeystoreAlias] = useState<string>("");
  const [keystorePassword, setKeystorePassword] = useState<string>("");
  const [keyPassword, setKeyPassword] = useState<string>("");
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);

  /** Hooks */
  const {
    generateApk,
    isLoading,
    status: hookStatus,
  } = useApkGenerator<HookStatus>();

  /**
   * Handles changes to form input fields
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the input field
   */
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Validates and processes the selected icon file
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event
   * @returns {Promise<void>}
   */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.type !== "image/png") {
        setFileError("Only PNG images are allowed");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setPreviewIcon(null);
        return;
      }

      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width !== 512 || dimensions.height !== 512) {
          setFileError("Image must be exactly 512x512 pixels");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setPreviewIcon(null);
          return;
        }
        setIconFile(file);
        setPreviewIcon(URL.createObjectURL(file));
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to read image dimensions";

        setFileError(errorMessage);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setPreviewIcon(null);
      }
    } else {
      setIconFile(null);
      setPreviewIcon(null);
    }
  };

  /**
   * Handles keystore file selection
   * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event
   */
  const handleKeystoreFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e?.target?.files && e.target?.files?.[0]) {
      setKeystoreFile(e?.target?.files?.[0]);
    }
  };

  /**
   * Gets the dimensions of an image file
   * @param {File} file - The image file to check
   * @returns {Promise<{width: number, height: number}>} - Object containing image dimensions
   * @throws {Error} If the image fails to load
   */
  const getImageDimensions = (file: File): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
        URL.revokeObjectURL(url);
      };

      img.src = url;
    });
  };

  /**
   * Handles form submission for APK generation
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setFileError(null);

    const formDataObj = new FormData();

    formDataObj.append("packageName", formData.packageName);
    formDataObj.append("appName", formData.appName);
    formDataObj.append("webViewUrl", formData.webViewUrl);

    if (iconFile) {
      formDataObj.append("icon", iconFile);
    }

    if (enableReleaseBuild) {
      formDataObj.append("enableReleaseBuild", "true");
      formDataObj.append("keystoreOption", keystoreOption);

      if (!keystoreAlias || !keystorePassword || !keyPassword) {
        setFileError(
          "Please provide all signing information for release build"
        );
        return;
      }

      formDataObj.append("keystoreAlias", keystoreAlias);
      formDataObj.append("keystorePassword", keystorePassword);
      formDataObj.append("keyPassword", keyPassword);

      if (keystoreOption === "upload") {
        if (!keystoreFile) {
          setFileError("Please upload a keystore file");
          return;
        }
        formDataObj.append("keystore", keystoreFile);
      }
    } else {
      formDataObj.append("enableReleaseBuild", "false");
    }

    try {
      const result = await generateApk(formDataObj, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(progress, 'progress');
          }
        },
      });

      console.log("Generation result:", result);
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      console.log("");
    }
  };

  useEffect(() => {
    return () => {
      if (previewIcon) {
        URL.revokeObjectURL(previewIcon);
      }
    };
  }, [previewIcon]);

  return (
    <div className={styles.container}>
      <h2>Extramarks Smart App Generator</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="packageName">Package Name:</label>
          <input
            type="text"
            id="packageName"
            name="packageName"
            value={formData.packageName}
            onChange={handleChange}
            placeholder="com.example.myapp"
            pattern="[a-z][a-z0-9_]*(\.[a-z0-9_]+)+"
            required
          />
          <small>Format: com.example.myapp</small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="appName">Application Name:</label>
          <input
            type="text"
            id="appName"
            name="appName"
            value={formData.appName}
            onChange={handleChange}
            placeholder="My WebView App"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="webViewUrl">WebView URL:</label>
          <input
            type="url"
            id="webViewUrl"
            name="webViewUrl"
            value={formData.webViewUrl}
            onChange={handleChange}
            placeholder="https://example.com"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="appIcon">App Icon (512x512 PNG):</label>

          <div className={styles.iconPreviewSection}>
            <div className={styles.iconPreview}>
              <img
                src={previewIcon || defaultIcon}
                alt={previewIcon ? "Your app icon" : "Default app icon"}
                className={styles.iconImage}
              />
              {!previewIcon && (
                <div className={styles.defaultIconLabel}>Default Icon</div>
              )}
            </div>
            <div className={styles.iconUpload}>
              <input
                type="file"
                id="appIcon"
                name="appIcon"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".png,image/png"
              />
              <small>
                {previewIcon
                  ? "Custom icon selected"
                  : "Must be a 512x512 PNG file. If not provided, default icon will be used."}
              </small>
            </div>
          </div>

          {fileError && <div className={styles.errorMessage}>{fileError}</div>}
        </div>

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="enableRelease"
            checked={enableReleaseBuild}
            onChange={(e) => setEnableReleaseBuild(e.target.checked)}
          />
          <div className={styles.checkboxContent}>
            <label htmlFor="enableRelease">
              Generate Release Build (Signed APK)
            </label>
            <div className={styles.buildTypeInfo}>
              {enableReleaseBuild ? (
                <span className={styles.infoSuccess}>
                  ✓ Release APK can be uploaded to Google Play Store
                </span>
              ) : (
                <span className={styles.infoWarning}>
                  ⓘ Debug APK cannot be uploaded to Google Play Store
                </span>
              )}
            </div>
          </div>
        </div>

        {enableReleaseBuild && (
          <div className={styles.releaseOptionsPanel}>
            <h3>Release Build Configuration</h3>

            <div className={styles.formGroup}>
              <label>Signing Method:</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value="generate"
                    checked={keystoreOption === "generate"}
                    onChange={() => setKeystoreOption("generate")}
                  />
                  <span>Generate New Keystore</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value="upload"
                    checked={keystoreOption === "upload"}
                    onChange={() => setKeystoreOption("upload")}
                  />
                  <span>Use Existing Keystore</span>
                </label>
              </div>
            </div>

            {keystoreOption === "upload" && (
              <div className={styles.formGroup}>
                <label>Keystore File:</label>
                <input
                  type="file"
                  onChange={handleKeystoreFileChange}
                  accept=".keystore,.jks"
                  required={keystoreOption === "upload"}
                />
                <small>Upload your .keystore or .jks file</small>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Keystore Alias:</label>
              <input
                type="text"
                value={keystoreAlias}
                onChange={(e) => setKeystoreAlias(e.target.value)}
                placeholder="android"
                required={enableReleaseBuild}
              />
              <small>Name for your signing key (e.g., android)</small>
            </div>

            <div className={styles.formGroup}>
              <label>Keystore Password:</label>
              <input
                type="password"
                value={keystorePassword}
                onChange={(e) => setKeystorePassword(e.target.value)}
                minLength={6}
                required={enableReleaseBuild}
              />
              <small>Minimum 6 characters</small>
            </div>

            <div className={styles.formGroup}>
              <label>Key Password:</label>
              <input
                type="password"
                value={keyPassword}
                onChange={(e) => setKeyPassword(e.target.value)}
                minLength={6}
                required={enableReleaseBuild}
              />
              <small>Usually same as keystore password</small>
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate APK"}
          </button>
        </div>

        {hookStatus.message && (
          <div
            className={`${styles.statusMessage} ${
              hookStatus.type ? styles[hookStatus.type] : ""
            }`}
          >
            {hookStatus.downloadUrl ? (
              <div>
                <p>{hookStatus.message}</p>
                <p>
                  <a
                    href={`http://localhost:8888${hookStatus.downloadUrl}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download APK
                  </a>
                </p>
                {hookStatus.keystoreUrl && (
                  <p>
                    <a
                      href={`http://localhost:8888${hookStatus.keystoreUrl}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Keystore File
                    </a>
                    <br />
                    <small>
                      Important: Save this keystore file securely. You'll need
                      it to update this app in the future.
                    </small>
                  </p>
                )}
              </div>
            ) : (
              <p>{hookStatus.message}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default APKGenerator;
