/** Third Party Imports */
import React, { useState, useRef } from "react";
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (file.type !== 'image/png') {
        setFileError('Only PNG images are allowed');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Check image dimensions
      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width !== 512 || dimensions.height !== 512) {
          setFileError('Image must be exactly 512x512 pixels');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
        setIconFile(file);
      } catch (error) {
        setFileError('Failed to read image dimensions');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  // Helper function to get image dimensions
  const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    });
  };

  /**
   * Handles form submission for APK generation
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   * @throws {Error} When API request fails or APK generation fails
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataObj = new FormData();
    formDataObj.append('packageName', formData.packageName);
    formDataObj.append('appName', formData.appName);
    formDataObj.append('webViewUrl', formData.webViewUrl);
    
    if (iconFile) {
      formDataObj.append('icon', iconFile);
    }

    try {
      await generateApk(formDataObj, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
    } catch (error) {
      console.log(error);
    } finally {
      setUploadProgress(0);
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
          <label htmlFor="appIcon">App Icon (512x512 PNG):</label>
          <input
            type="file"
            id="appIcon"
            name="appIcon"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".png,image/png"
          />
          <small>Must be a 512x512 PNG file</small>
          {fileError && (
            <div className={styles.errorMessage}>{fileError}</div>
          )}
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
                <a href={`http://localhost:8888${status.downloadUrl}`} download>
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
