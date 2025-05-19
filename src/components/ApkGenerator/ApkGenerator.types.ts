import { AxiosProgressEvent } from "axios";

export interface FormData {
  packageName: string;
  appName: string;
  webViewUrl: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export type StatusType = "success" | "error" | "warning" | "info" | "";

export interface HookStatus {
  message: string;
  type: StatusType;
  downloadUrl?: string;
  keystoreUrl?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  downloadUrl?: string;
  keystoreUrl?: string;
  error?: {
    message: string;
  };
  buildType?: string;
  packageName?: string;
  appName?: string;
}

export interface GenerateSuccessResult {
  success: true;
  downloadUrl: string;
  keystoreUrl?: string;
  isReleaseBuild: boolean;
}

export interface GenerateErrorResult {
  success: false;
  error: string;
}

export type GenerateResult = GenerateSuccessResult | GenerateErrorResult;

export interface GenerateOptions {
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
}
