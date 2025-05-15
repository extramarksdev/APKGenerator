/** Form inputs for APK generation */
export type FormData = {
  /** Android package name (e.g. com.example.app) */
  packageName: string;
  /** Display name for the app */
  appName: string;
  /** URL for the WebView to load */
  webViewUrl: string;
};

/** Current generation state */
export type StatusType = {
  /** success, error, or null (loading) */
  type: "success" | "error" | null;
  /** Status message for UI */
  message: string;
  /** APK download URL when successful */
  downloadUrl?: string;
};

/** APK generation status types */
export type ApkGenerationResult = {
  /** True if generation succeeded */
  success: boolean;
  /** APK download URL when successful */
  downloadUrl?: string;
  /** Optional server message */
  message?: string;
};
