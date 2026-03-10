import type { SavedRequest } from "@shared/ipc-types";

type SavedRequestLike = Pick<SavedRequest, "method" | "url" | "bodyContent">;

export function isWebSocketRequest(
  saved: Pick<SavedRequest, "method" | "url">,
): boolean {
  return (
    saved.method === "WS" ||
    saved.url.startsWith("ws://") ||
    saved.url.startsWith("wss://")
  );
}

export function parseSavedWebSocketProtocols(
  bodyContent: string | null,
): string {
  if (!bodyContent) return "";

  try {
    const parsed = JSON.parse(bodyContent) as { protocols?: unknown };
    return typeof parsed.protocols === "string" ? parsed.protocols : "";
  } catch {
    return "";
  }
}

export function parseSavedGraphqlBody(saved: SavedRequestLike): {
  query: string;
  variables: string;
  operationName: string;
} {
  try {
    const parsed = saved.bodyContent
      ? (JSON.parse(saved.bodyContent) as {
          query?: unknown;
          variables?: unknown;
          operationName?: unknown;
        })
      : {};

    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      variables:
        parsed.variables &&
        typeof parsed.variables === "object" &&
        !Array.isArray(parsed.variables)
          ? JSON.stringify(parsed.variables, null, 2)
          : "{}",
      operationName:
        typeof parsed.operationName === "string" ? parsed.operationName : "",
    };
  } catch {
    return {
      query: saved.bodyContent || "",
      variables: "{}",
      operationName: "",
    };
  }
}
