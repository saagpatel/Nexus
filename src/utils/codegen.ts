import type { HttpRequest } from "@shared/ipc-types";

function escapeSingleQuotes(input: string): string {
  return input.replace(/'/g, `'\\''`);
}

function normalizedHeaders(req: HttpRequest): Array<[string, string]> {
  return Object.entries(req.headers).filter(([key]) => key.trim().length > 0);
}

export function generateCurl(req: HttpRequest): string {
  const lines = [`curl -X ${req.method} '${escapeSingleQuotes(req.url)}'`];

  for (const [key, value] of normalizedHeaders(req)) {
    lines.push(`  -H '${escapeSingleQuotes(`${key}: ${value}`)}'`);
  }

  if (req.body) {
    lines.push(`  --data-raw '${escapeSingleQuotes(req.body)}'`);
  }

  return lines.join(" \\\n");
}

export function generateFetch(req: HttpRequest): string {
  const headers = Object.fromEntries(normalizedHeaders(req));
  const bodyLine = req.body ? `  body: ${JSON.stringify(req.body)},\n` : "";

  return `const response = await fetch(${JSON.stringify(req.url)}, {
  method: ${JSON.stringify(req.method)},
  headers: ${JSON.stringify(headers, null, 2)},
${bodyLine}});

const data = await response.text();
console.log(response.status, data);`;
}

export function generateAxios(req: HttpRequest): string {
  const headers = Object.fromEntries(normalizedHeaders(req));
  const dataLine = req.body ? `  data: ${JSON.stringify(req.body)},\n` : "";

  return `import axios from 'axios';

const response = await axios({
  method: ${JSON.stringify(req.method.toLowerCase())},
  url: ${JSON.stringify(req.url)},
  headers: ${JSON.stringify(headers, null, 2)},
${dataLine}});

console.log(response.status, response.data);`;
}
