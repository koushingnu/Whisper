import { NextConfig } from "next";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_S3_BUCKET: string;
      OPENAI_API_KEY: string;
    }
  }
}

const config: NextConfig = {
  /* config options here */
};

export default config;
