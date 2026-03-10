import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useRequestStore } from "@/stores/request";

describe("Request Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("buildHttpRequest", () => {
    it("builds a simple GET request", () => {
      const store = useRequestStore();
      store.url = "https://example.com/api";
      store.method = "GET";

      const req = store.buildHttpRequest();
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://example.com/api");
      expect(req.body).toBeUndefined();
    });

    it("merges enabled headers only", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.headers = [
        { key: "Accept", value: "application/json", enabled: true },
        { key: "X-Debug", value: "true", enabled: false },
        { key: "X-Custom", value: "test", enabled: true },
      ];

      const req = store.buildHttpRequest();
      expect(req.headers["Accept"]).toBe("application/json");
      expect(req.headers["X-Custom"]).toBe("test");
      expect(req.headers["X-Debug"]).toBeUndefined();
    });

    it("adds Basic auth header", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.authType = "basic";
      store.authConfig = { username: "user", password: "pass" };

      const req = store.buildHttpRequest();
      expect(req.headers["Authorization"]).toBe(`Basic ${btoa("user:pass")}`);
    });

    it("adds Bearer auth header", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.authType = "bearer";
      store.authConfig = { token: "my-token-123" };

      const req = store.buildHttpRequest();
      expect(req.headers["Authorization"]).toBe("Bearer my-token-123");
    });

    it("adds Content-Type for JSON body", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.method = "POST";
      store.bodyType = "json";
      store.bodyContent = '{"test": true}';

      const req = store.buildHttpRequest();
      expect(req.headers["Content-Type"]).toBe("application/json");
      expect(req.body).toBe('{"test": true}');
    });

    it("adds Content-Type for form-urlencoded body", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.bodyType = "form-urlencoded";
      store.bodyContent = "key=value";

      const req = store.buildHttpRequest();
      expect(req.headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded",
      );
    });

    it("does not override manually set Content-Type", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.bodyType = "json";
      store.headers = [
        {
          key: "Content-Type",
          value: "application/vnd.api+json",
          enabled: true,
        },
      ];

      const req = store.buildHttpRequest();
      expect(req.headers["Content-Type"]).toBe("application/vnd.api+json");
    });

    it("appends query params to URL", () => {
      const store = useRequestStore();
      store.url = "https://example.com/api";
      store.queryParams = [
        { key: "page", value: "1", enabled: true },
        { key: "limit", value: "10", enabled: true },
        { key: "disabled", value: "nope", enabled: false },
      ];

      const req = store.buildHttpRequest();
      const url = new URL(req.url);
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("disabled")).toBeNull();
    });

    it("skips empty key headers", () => {
      const store = useRequestStore();
      store.url = "https://example.com";
      store.headers = [
        { key: "", value: "no-key", enabled: true },
        { key: "  ", value: "whitespace-key", enabled: true },
        { key: "Valid", value: "yes", enabled: true },
      ];

      const req = store.buildHttpRequest();
      expect(Object.keys(req.headers)).toEqual(["Valid"]);
    });

    it("builds GraphQL payload with variables and operation name", () => {
      const store = useRequestStore();
      store.url = "https://example.com/graphql";
      store.method = "POST";
      store.bodyType = "graphql";
      store.graphqlQuery =
        "query GetUser($id: ID!) { user(id: $id) { id name } }";
      store.graphqlVariables = '{"id":"123"}';
      store.graphqlOperationName = "GetUser";

      const req = store.buildHttpRequest();
      expect(req.headers["Content-Type"]).toBe("application/json");
      expect(req.body).toBe(
        JSON.stringify({
          query: "query GetUser($id: ID!) { user(id: $id) { id name } }",
          variables: { id: "123" },
          operationName: "GetUser",
        }),
      );
    });
  });

  describe("reset", () => {
    it("resets all fields to defaults", () => {
      const store = useRequestStore();
      store.method = "POST";
      store.url = "https://example.com";
      store.headers = [{ key: "X", value: "Y", enabled: true }];
      store.bodyType = "json";
      store.bodyContent = '{"a":1}';
      store.authType = "bearer";
      store.authConfig = { token: "abc" };
      store.currentRequestId = "req-123";
      store.currentRequestName = "My Request";
      store.isDirty = true;

      store.reset();

      expect(store.method).toBe("GET");
      expect(store.url).toBe("");
      expect(store.headers).toEqual([]);
      expect(store.queryParams).toEqual([]);
      expect(store.bodyType).toBe("none");
      expect(store.bodyContent).toBe("");
      expect(store.graphqlQuery).toBe("");
      expect(store.graphqlVariables).toBe("{}");
      expect(store.graphqlOperationName).toBe("");
      expect(store.authType).toBe("none");
      expect(store.authConfig).toEqual({});
      expect(store.currentRequestId).toBeNull();
      expect(store.currentRequestName).toBeNull();
      expect(store.isDirty).toBe(false);
    });
  });

  describe("getPersistedBodyContent", () => {
    it("serializes graphql body content", () => {
      const store = useRequestStore();
      store.bodyType = "graphql";
      store.graphqlQuery = "query { ping }";
      store.graphqlVariables = '{"env":"dev"}';
      store.graphqlOperationName = "Ping";

      expect(store.getPersistedBodyContent()).toBe(
        JSON.stringify({
          query: "query { ping }",
          variables: { env: "dev" },
          operationName: "Ping",
        }),
      );
    });
  });

  describe("loadFromSaved", () => {
    it("loads all fields from saved request", () => {
      const store = useRequestStore();

      store.loadFromSaved({
        id: "saved-1",
        name: "Test Request",
        method: "POST",
        url: "https://api.example.com/data",
        headers: [{ key: "Accept", value: "application/json", enabled: true }],
        queryParams: [{ key: "format", value: "json", enabled: true }],
        bodyType: "json",
        bodyContent: '{"key": "value"}',
        authType: "bearer",
        authConfig: { token: "abc123" },
      });

      expect(store.currentRequestId).toBe("saved-1");
      expect(store.currentRequestName).toBe("Test Request");
      expect(store.method).toBe("POST");
      expect(store.url).toBe("https://api.example.com/data");
      expect(store.headers).toHaveLength(1);
      expect(store.bodyType).toBe("json");
      expect(store.bodyContent).toBe('{"key": "value"}');
      expect(store.authType).toBe("bearer");
      expect(store.isDirty).toBe(false);
    });

    it("handles null optional fields", () => {
      const store = useRequestStore();

      store.loadFromSaved({
        id: "saved-2",
        name: "Minimal",
        method: "GET",
        url: "https://example.com",
        headers: [],
        queryParams: [],
        bodyType: null,
        bodyContent: null,
        authType: null,
        authConfig: null,
      });

      expect(store.bodyType).toBe("none");
      expect(store.bodyContent).toBe("");
      expect(store.authType).toBe("none");
      expect(store.authConfig).toEqual({});
    });
  });
});
