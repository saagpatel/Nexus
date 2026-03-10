import { describe, expect, it } from "vitest";
import type { HttpRequest } from "@shared/ipc-types";
import { generateAxios, generateCurl, generateFetch } from "@/utils/codegen";

describe("codegen utilities", () => {
  const request: HttpRequest = {
    method: "POST",
    url: "https://api.example.com/users",
    headers: {
      Authorization: "Bearer token-123",
      "Content-Type": "application/json",
    },
    body: '{"name":"Ari"}',
  };

  it("generates curl snippet", () => {
    const snippet = generateCurl(request);
    expect(snippet).toContain("curl -X POST 'https://api.example.com/users'");
    expect(snippet).toContain('--data-raw \'{"name":"Ari"}\'');
  });

  it("generates fetch snippet", () => {
    const snippet = generateFetch(request);
    expect(snippet).toContain('await fetch("https://api.example.com/users"');
    expect(snippet).toContain('method: "POST"');
  });

  it("generates axios snippet", () => {
    const snippet = generateAxios(request);
    expect(snippet).toContain("import axios from 'axios'");
    expect(snippet).toContain('method: "post"');
  });
});
