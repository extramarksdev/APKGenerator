import { useState } from "react";
import axios, { AxiosProgressEvent } from "axios";

import {
  StatusType,
  ApkGenerationResult,
} from "../components/ApkGenerator/ApkGenerator.types";

/** Handles APK generation logic */
export const useApkGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '', downloadUrl: '' });

  const generateApk = async (formData: FormData, options?: {
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  }) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/generate-apk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: options?.onUploadProgress,
        baseURL: import.meta.env.DEV ? '' : 'http://localhost:8888'
      });
      
      setStatus({
        message: 'APK generated successfully!',
        type: 'success',
        downloadUrl: response.data.downloadUrl
      });
    } catch (error) {
      setStatus({
        message: 'Failed to generate APK',
        type: 'error',
        downloadUrl: ''
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { generateApk, isLoading, status };
};
