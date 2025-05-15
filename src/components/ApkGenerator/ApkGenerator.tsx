/** Third Party Imports */
import React, { useState } from "react";
import { useApkGenerator } from "../../hooks/useApkGenerator";

/** Relative Imports */
import type { FormData } from "./ApkGenerator.types";
import styles from "./ApkGenerator.module.scss";

const APKGenerator = () => {
  /** States */
  const [formData, setFormData] = useState<FormData>({
    packageName: "",
    appName: "",
    webViewUrl: "",
  });

  /** Hooks */
  const { generateApk, isLoading, status } = useApkGenerator();

  /**
   * Handles input changes and updates form state
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Handles form submission for APK generation
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   * @throws {Error} When API request fails or APK generation fails
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await generateApk(formData);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Android WebView App Generator</h2>
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
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Generating..." : "Generate APK"}
          </button>
        </div>

        {status.message && (
          <div
            className={`${styles.statusMessage} ${
              status.type ? styles[status.type] : ""
            }`}
          >
            {status.downloadUrl ? (
              <p>
                {status.message}{" "}
                <a href={`http://localhost:3000${status.downloadUrl}`} download>
                  Download APK
                </a>
              </p>
            ) : (
              <p>{status.message}</p>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default APKGenerator;
