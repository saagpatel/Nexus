import type {
  CollectionRunRequest,
  CollectionRunResult,
  HttpRequest,
  SavedRequest,
} from "@shared/ipc-types";
import { listRequests } from "../database/queries/requests";
import { getResolvedVariables } from "../database/queries/environments";
import { executeRequest } from "../ipc/http-client";

function getAuthHeaders(saved: SavedRequest): Record<string, string> {
  if (saved.authType === "basic") {
    const username = saved.authConfig?.username ?? "";
    const password = saved.authConfig?.password ?? "";

    return {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
    };
  }

  if (saved.authType === "bearer") {
    const token = saved.authConfig?.token ?? "";

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {};
}

function getContentType(bodyType: SavedRequest["bodyType"]): string | null {
  if (bodyType === "json" || bodyType === "graphql") {
    return "application/json";
  }

  if (bodyType === "form-urlencoded") {
    return "application/x-www-form-urlencoded";
  }

  return null;
}

function buildHeaders(saved: SavedRequest): Record<string, string> {
  const mergedHeaders: Record<string, string> = {};

  for (const header of saved.headers) {
    if (header.enabled && header.key.trim()) {
      mergedHeaders[header.key] = header.value;
    }
  }

  Object.assign(mergedHeaders, getAuthHeaders(saved));

  const contentType = getContentType(saved.bodyType);
  if (contentType && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = contentType;
  }

  return mergedHeaders;
}

function buildQueryString(saved: SavedRequest): string {
  const enabledParams = saved.queryParams.filter(
    (param) => param.enabled && param.key.trim(),
  );

  return enabledParams
    .map(
      (param) =>
        `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`,
    )
    .join("&");
}

function buildUrl(saved: SavedRequest): string {
  const query = buildQueryString(saved);
  if (!query) {
    return saved.url;
  }

  try {
    const urlObj = new URL(saved.url);
    for (const [key, value] of new URLSearchParams(query).entries()) {
      urlObj.searchParams.set(key, value);
    }
    return urlObj.toString();
  } catch {
    return `${saved.url}${saved.url.includes("?") ? "&" : "?"}${query}`;
  }
}

function buildRequestFromSaved(
  saved: SavedRequest,
  variables: Record<string, string>,
): HttpRequest {
  let body: string | undefined;
  if (saved.bodyType && saved.bodyType !== "none") {
    body = saved.bodyContent ?? undefined;
  }

  return {
    method: saved.method,
    url: buildUrl(saved),
    headers: buildHeaders(saved),
    body,
    variables,
  };
}

function extractRuntimeVariables(
  responseBody: string,
  runtimeVariables: Record<string, string>,
): void {
  try {
    const parsedBody = JSON.parse(responseBody) as unknown;
    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return;
    }

    for (const [key, value] of Object.entries(
      parsedBody as Record<string, unknown>,
    )) {
      const normalizedKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
      if (!normalizedKey) continue;

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        runtimeVariables[`last_${normalizedKey}`] = String(value);
      }
    }
  } catch {
    // Ignore non-JSON responses for chaining extraction.
  }
}

function createSuccessResult(
  savedRequest: SavedRequest,
  outcome: Awaited<ReturnType<typeof executeRequest>>,
  durationMs: number,
): CollectionRunResult["results"][number] {
  if (!outcome.success) {
    throw new Error("Expected a successful outcome");
  }

  const passed = outcome.data.statusCode < 400;

  return {
    requestId: savedRequest.id,
    requestName: savedRequest.name,
    status: passed ? "pass" : "fail",
    statusCode: outcome.data.statusCode,
    error: passed ? null : `HTTP ${outcome.data.statusCode}`,
    durationMs,
  };
}

function createFailureResult(
  savedRequest: SavedRequest,
  outcome: Awaited<ReturnType<typeof executeRequest>>,
  durationMs: number,
): CollectionRunResult["results"][number] {
  if (outcome.success) {
    throw new Error("Expected a failed outcome");
  }

  return {
    requestId: savedRequest.id,
    requestName: savedRequest.name,
    status: "fail",
    statusCode: null,
    error: outcome.error,
    durationMs,
  };
}

function shouldStopAfterResult(
  result: CollectionRunResult["results"][number],
  stopOnFailure: boolean,
): boolean {
  return stopOnFailure && result.status === "fail";
}

async function runSavedRequest(
  savedRequest: SavedRequest,
  runtimeVariables: Record<string, string>,
): Promise<CollectionRunResult["results"][number]> {
  const requestStart = performance.now();
  const httpRequest = buildRequestFromSaved(savedRequest, runtimeVariables);
  const outcome = await executeRequest(httpRequest);
  const durationMs = Math.round(performance.now() - requestStart);

  if (!outcome.success) {
    return createFailureResult(savedRequest, outcome, durationMs);
  }

  runtimeVariables.last_status = String(outcome.data.statusCode);
  extractRuntimeVariables(outcome.data.body, runtimeVariables);

  return createSuccessResult(savedRequest, outcome, durationMs);
}

export async function runCollection(
  args: CollectionRunRequest,
): Promise<CollectionRunResult> {
  const start = performance.now();
  const requests = listRequests(args.workspaceId, args.collectionId).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const runtimeVariables: Record<string, string> = {
    ...getResolvedVariables(args.workspaceId),
  };
  const results: CollectionRunResult["results"] = [];

  for (const savedRequest of requests) {
    const result = await runSavedRequest(savedRequest, runtimeVariables);
    results.push(result);

    if (shouldStopAfterResult(result, Boolean(args.stopOnFailure))) {
      break;
    }
  }

  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: Math.round(performance.now() - start),
    results,
  };
}
