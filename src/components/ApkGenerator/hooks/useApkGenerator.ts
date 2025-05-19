import { useState } from "react";
import axios, { AxiosResponse, AxiosError } from "axios";

import {
  HookStatus,
  GenerateOptions,
  GenerateResult,
  GenerateSuccessResult,
  GenerateErrorResult,
  ApiResponse,
} from "../ApkGenerator.types";

/**
 * Custom hook for handling APK generation logic
 * @returns {Object} Hook API containing:
 *   - generateApk: Function to trigger APK generation
 *   - isLoading: Boolean indicating if generation is in progress
 *   - status: Object containing generation status information
 */
export const useApkGenerator = <T extends HookStatus = HookStatus>() => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<T>({
    message: "",
    type: "",
    downloadUrl: undefined,
    keystoreUrl: undefined,
  } as T);

  /**
   * Generates an APK file by sending form data to the server
   * @param {FormData} formData - The form data containing APK configuration
   * @param {Object} [options] - Optional configuration
   * @param {Function} [options.onUploadProgress] - Progress callback for file upload
   * @returns {Promise<GenerateResult>} Results of the APK generation
   */
  const generateApk = async (
    formData: FormData,
    options?: GenerateOptions
  ): Promise<GenerateResult> => {
    setStatus({
      ...status,
      message: "",
      type: "",
      downloadUrl: undefined,
      keystoreUrl: undefined,
    });

    setIsLoading(true);

    try {
      const response: AxiosResponse<ApiResponse> = await axios.post(
        "/generate-apk",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: options?.onUploadProgress,
          baseURL: "http://localhost:8888",
        }
      );

      const isReleaseBuild = formData.get("enableReleaseBuild") === "true";

      setStatus({
        ...status,
        message: response.data.message || `APK generated successfully!`,
        type: "success",
        downloadUrl: response.data.downloadUrl,
        keystoreUrl: response.data.keystoreUrl,
      });

      return {
        success: true,
        downloadUrl: response.data.downloadUrl || "",
        keystoreUrl: response.data.keystoreUrl,
        isReleaseBuild,
      } as GenerateSuccessResult;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      const errorMessage =
        axiosError.response?.data?.error?.message || "Failed to generate APK";

      setStatus({
        ...status,
        message: errorMessage,
        type: "error",
        downloadUrl: undefined,
        keystoreUrl: undefined,
      });

      return {
        success: false,
        error: errorMessage,
      } as GenerateErrorResult;
    } finally {
      setIsLoading(false);
    }
  };

  return { generateApk, isLoading, status };
};
