declare module "dotenv" {
  export interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
    override?: boolean;
  }
  export function config(options?: DotenvConfigOptions): {
    parsed?: Record<string, string>;
    error?: Error;
  };
}
