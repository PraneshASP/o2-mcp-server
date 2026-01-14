import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  stdio: true,
  paths: {
    tools: "./src/tools",
    prompts: "./src/prompts",
    resources: false,
  }
};

export default config;
