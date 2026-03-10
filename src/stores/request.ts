import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { HttpRequest } from "@shared/ipc-types";
import { parseSavedGraphqlBody } from "@/utils/saved-request";

export const useRequestStore = defineStore("request", () => {
  const method = ref("GET");
  const url = ref("");
  const headers = ref<Array<{ key: string; value: string; enabled: boolean }>>(
    [],
  );
  const queryParams = ref<
    Array<{ key: string; value: string; enabled: boolean }>
  >([]);
  const bodyType = ref<
    "none" | "json" | "text" | "form-urlencoded" | "graphql"
  >("none");
  const bodyContent = ref("");
  const graphqlQuery = ref("");
  const graphqlVariables = ref("{}");
  const graphqlOperationName = ref("");
  const authType = ref<"none" | "basic" | "bearer">("none");
  const authConfig = ref<Record<string, string>>({});

  const currentRequestId = ref<string | null>(null);
  const currentRequestName = ref<string | null>(null);
  const isDirty = ref(false);

  function markDirty(): void {
    if (currentRequestId.value !== null) {
      isDirty.value = true;
    }
  }

  watch(
    [
      method,
      url,
      headers,
      queryParams,
      bodyType,
      bodyContent,
      graphqlQuery,
      graphqlVariables,
      graphqlOperationName,
      authType,
      authConfig,
    ],
    markDirty,
    { deep: true },
  );

  function parseGraphqlVariables(): Record<string, unknown> {
    const raw = graphqlVariables.value.trim();
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  function buildHttpRequest(): HttpRequest {
    const mergedHeaders: Record<string, string> = {};

    for (const h of headers.value) {
      if (h.enabled && h.key.trim()) {
        mergedHeaders[h.key] = h.value;
      }
    }

    // Auth header
    if (authType.value === "basic") {
      const username = authConfig.value.username || "";
      const password = authConfig.value.password || "";
      mergedHeaders["Authorization"] =
        `Basic ${btoa(`${username}:${password}`)}`;
    } else if (authType.value === "bearer") {
      const token = authConfig.value.token || "";
      mergedHeaders["Authorization"] = `Bearer ${token}`;
    }

    // Content-Type
    if (bodyType.value === "json" && !mergedHeaders["Content-Type"]) {
      mergedHeaders["Content-Type"] = "application/json";
    } else if (
      bodyType.value === "form-urlencoded" &&
      !mergedHeaders["Content-Type"]
    ) {
      mergedHeaders["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (bodyType.value === "graphql" && !mergedHeaders["Content-Type"]) {
      mergedHeaders["Content-Type"] = "application/json";
    }

    // Build URL with query params
    let fullUrl = url.value;
    const enabledParams = queryParams.value.filter(
      (p) => p.enabled && p.key.trim(),
    );
    if (enabledParams.length > 0) {
      try {
        const urlObj = new URL(fullUrl);
        for (const p of enabledParams) {
          urlObj.searchParams.set(p.key, p.value);
        }
        fullUrl = urlObj.toString();
      } catch {
        // URL is malformed, append params manually
        const paramStr = enabledParams
          .map(
            (p) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
          )
          .join("&");
        fullUrl += (fullUrl.includes("?") ? "&" : "?") + paramStr;
      }
    }

    // Body
    let body: string | undefined;
    if (bodyType.value === "json" || bodyType.value === "text") {
      body = bodyContent.value || undefined;
    } else if (bodyType.value === "form-urlencoded") {
      // bodyContent stores the raw form, but we could also serialize from a KV store
      body = bodyContent.value || undefined;
    } else if (bodyType.value === "graphql") {
      const operationName = graphqlOperationName.value.trim();
      body = JSON.stringify({
        query: graphqlQuery.value,
        variables: parseGraphqlVariables(),
        ...(operationName ? { operationName } : {}),
      });
    }

    return {
      method: method.value,
      url: fullUrl,
      headers: mergedHeaders,
      body,
    };
  }

  function getPersistedBodyContent(): string {
    if (bodyType.value !== "graphql") {
      return bodyContent.value;
    }

    const operationName = graphqlOperationName.value.trim();
    return JSON.stringify({
      query: graphqlQuery.value,
      variables: parseGraphqlVariables(),
      ...(operationName ? { operationName } : {}),
    });
  }

  function reset(): void {
    method.value = "GET";
    url.value = "";
    headers.value = [];
    queryParams.value = [];
    bodyType.value = "none";
    bodyContent.value = "";
    graphqlQuery.value = "";
    graphqlVariables.value = "{}";
    graphqlOperationName.value = "";
    authType.value = "none";
    authConfig.value = {};
    currentRequestId.value = null;
    currentRequestName.value = null;
    isDirty.value = false;
  }

  function setCurrentSelection(id: string | null, name: string | null): void {
    currentRequestId.value = id;
    currentRequestName.value = name;
    isDirty.value = false;
  }

  function loadFromSaved(saved: {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: Array<{ key: string; value: string; enabled: boolean }>;
    queryParams: Array<{ key: string; value: string; enabled: boolean }>;
    bodyType: string | null;
    bodyContent: string | null;
    authType: string | null;
    authConfig: Record<string, string> | null;
  }): void {
    setCurrentSelection(saved.id, saved.name);
    method.value = saved.method;
    url.value = saved.url;
    headers.value = [...saved.headers];
    queryParams.value = [...saved.queryParams];
    bodyType.value = (saved.bodyType as typeof bodyType.value) || "none";
    bodyContent.value = saved.bodyContent || "";

    if (bodyType.value === "graphql") {
      const graphqlBody = parseSavedGraphqlBody(saved);
      graphqlQuery.value = graphqlBody.query;
      graphqlVariables.value = graphqlBody.variables;
      graphqlOperationName.value = graphqlBody.operationName;
    } else {
      graphqlQuery.value = "";
      graphqlVariables.value = "{}";
      graphqlOperationName.value = "";
    }
    authType.value = (saved.authType as typeof authType.value) || "none";
    authConfig.value = saved.authConfig ? { ...saved.authConfig } : {};
    isDirty.value = false;
  }

  return {
    method,
    url,
    headers,
    queryParams,
    bodyType,
    bodyContent,
    graphqlQuery,
    graphqlVariables,
    graphqlOperationName,
    authType,
    authConfig,
    currentRequestId,
    currentRequestName,
    isDirty,
    buildHttpRequest,
    getPersistedBodyContent,
    reset,
    setCurrentSelection,
    loadFromSaved,
  };
});
