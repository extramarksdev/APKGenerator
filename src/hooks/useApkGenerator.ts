import { useState } from "react";

import {
  StatusType,
  ApkGenerationResult,
} from "../components/ApkGenerator/ApkGenerator.types";

/** Handles APK generation logic */
export const useApkGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<StatusType>({
    type: null,
    message: "",
  });

  const generateApk = async (formData: {
    packageName: string;
    appName: string;
    webViewUrl: string;
  }) => {
    setIsLoading(true);
    setStatus({ type: null, message: "Generating APK..." });

    try {
      const response = await fetch("http://localhost:8888/generate-apk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApkGenerationResult = await response.json();

      if (result.success) {
        setStatus({
          type: "success",
          message: result.message || "APK generated successfully!",
          downloadUrl: result.downloadUrl,
        });
        return result;
      } else {
        throw new Error(result.message || "Failed to generate APK");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("APK generation error:", error);
      setStatus({
        type: "error",
        message: errorMessage,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { generateApk, isLoading, status };
};
