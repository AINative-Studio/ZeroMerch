import { ZeroDBClient } from "@zeromerch/zerodb";

let _client: ZeroDBClient | null = null;

export function getServerZeroDBClient(): ZeroDBClient {
  if (_client) return _client;
  _client = new ZeroDBClient({
    apiUrl: process.env["ZERODB_API_URL"],
    apiToken: process.env["ZERODB_API_TOKEN"],
    apiKey: process.env["ZERODB_API_KEY"],
    projectId: process.env["ZERODB_PROJECT_ID"]!,
  });
  return _client;
}
