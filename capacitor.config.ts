import type { CapacitorConfig } from "@capacitor/cli";

// Enable WebView debugging for local/debug builds so developers can inspect the
// WebView; keep it OFF for production/release. Driven by CAP_DEBUG (set in dev /
// debug build scripts), defaulting to off.
const debuggable = process.env.CAP_DEBUG === "true";

const config: CapacitorConfig = {
  appId: "com.jbcom.martiantrail",
  appName: "Martian Trail",
  webDir: "dist",
  backgroundColor: "#1a0b08",
  server: {
    androidScheme: "https",
  },
  android: {
    path: "android",
    allowMixedContent: false,
    webContentsDebuggingEnabled: debuggable,
  },
};

export default config;
