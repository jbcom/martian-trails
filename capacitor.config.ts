import type { CapacitorConfig } from "@capacitor/cli";

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
    webContentsDebuggingEnabled: false,
  },
};

export default config;
