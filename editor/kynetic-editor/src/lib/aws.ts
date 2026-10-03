export interface PresignedUrlResponse {
  url: string;
}

export interface AwsConfig {
  apiUrl: string;
  apiKey: string;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("API Gateway URL is empty.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("API Gateway URL must be a valid http(s) URL.");
  }

  url.pathname = url.pathname.replace(/\/(get-url|put-url)(-frontend)?\/?$/, "");
  const path = url.pathname.replace(/\/+$/, "");
  if (!path) {
    url.pathname = "/prod";
  }
  return url.toString().replace(/\/+$/, "");
}

export function getPresignedGetUrl(config: AwsConfig, key: string): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.apiUrl);
  const targetUrl = `${baseUrl}/get-url-frontend?key=${encodeURIComponent(key)}`;

  return fetchWithFallback(targetUrl, {
    headers: { "X-Api-Key": config.apiKey.trim() },
  });
}

export function getPresignedPutUrl(
  config: AwsConfig,
  key: string,
  contentType?: string,
): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.apiUrl);
  const params = new URLSearchParams({ key });
  if (contentType) params.set("content_type", contentType);
  const targetUrl = `${baseUrl}/put-url-frontend?${params.toString()}`;

  return fetchWithFallback(targetUrl, {
    headers: { "X-Api-Key": config.apiKey.trim() },
  });
}

export async function uploadToS3(
  config: AwsConfig,
  key: string,
  body: Blob,
  contentType: string,
): Promise<void> {
  const putUrl = await getPresignedPutUrl(config, key, contentType);

  let response: Response;
  try {
    response = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
  } catch (error) {
    throw new Error(corsHint(error, "S3 upload"));
  }

  if (!response.ok) {
    let bodyText = "";
    try {
      bodyText = (await response.text()).slice(0, 300);
    } catch {
      //ignore
    }
    throw new Error(
      `S3 upload failed: ${response.status} ${response.statusText}${
        bodyText ? `: ${bodyText}` : ""
      }`,
    );
  }
}

function corsHint(error: unknown, what: string): string {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    `${what} could not reach the server (${detail}). This is usually a CORS or ` +
    `network failure: check the API Gateway URL and API key, and make sure the ` +
    `CDK stack has been (re)deployed so the API and bucket send CORS headers.`
  );
}

async function fetchWithFallback(
  url: string,
  init: RequestInit,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(corsHint(error, "API request"));
  }

  if (!response.ok) {
    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      // ignore
    }
    const hint =
      response.status === 403 || response.status === 401
        ? " (check that the API key is correct and attached to the API's usage plan)"
        : response.status === 429
          ? " (throttled by the usage plan. Try again in a moment)"
          : "";
    throw new Error(`API request failed: ${response.status} ${response.statusText}${
      bodyText ? ` : ${bodyText}` : ""
    }${hint}`);
  }

  const data = (await response.json()) as PresignedUrlResponse;
  if (!data.url) {
    throw new Error("API response did not include a presigned URL");
  }
  return data.url;
}

export async function testApiConnection(config: AwsConfig): Promise<void> {
  await getPresignedGetUrl(config, `_health_probe_${Date.now()}`);
}
