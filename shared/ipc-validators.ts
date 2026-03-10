import type { IpcChannelMap } from "./ipc-channels";
import type {
  CollectionRunRequest,
  HistoryEntry,
  HttpRequest,
  MockRoute,
  MockServerConfig,
  SavedRequest,
  WebSocketConnectRequest,
  WebSocketSendRequest,
} from "./ipc-types";

type ChannelName = keyof IpcChannelMap;
type ChannelArgs<K extends ChannelName> = IpcChannelMap[K]["args"];
type FilterSpec = { name: string; extensions: string[] };

const MAX_ID_LENGTH = 200;
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4_000;
const MAX_URL_LENGTH = 8_192;
const MAX_HEADER_ENTRIES = 200;
const MAX_QUERY_ENTRIES = 200;
const MAX_PROTOCOL_ENTRIES = 20;
const MAX_COLLECTION_ITEMS = 1_000;
const MAX_TEXT_LENGTH = 100_000;
const MAX_BODY_LENGTH = 2_000_000;
const MAX_FILE_PATH_LENGTH = 4_096;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function expectOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string,
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${label} contains unsupported field: ${key}`);
    }
  }
}

function expectString(
  value: unknown,
  label: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
  } = {},
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  const {
    minLength = 0,
    maxLength = MAX_TEXT_LENGTH,
    allowEmpty = false,
  } = options;

  if (!allowEmpty && value.trim().length === 0) {
    throw new Error(`${label} must not be empty`);
  }

  if (value.length < minLength) {
    throw new Error(`${label} is too short`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} exceeds the maximum length`);
  }

  return value;
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }
  return value;
}

function expectNumber(
  value: unknown,
  label: string,
  options: {
    integer?: boolean;
    min?: number;
    max?: number;
  } = {},
): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    throw new Error(`${label} must be a finite number`);
  }

  if (options.integer && !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(`${label} must be at least ${options.min}`);
  }

  if (options.max !== undefined && value > options.max) {
    throw new Error(`${label} must be at most ${options.max}`);
  }

  return value;
}

function expectOptionalNumber(
  value: unknown,
  label: string,
  options: {
    integer?: boolean;
    min?: number;
    max?: number;
  } = {},
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return expectNumber(value, label, options);
}

function expectNullableNumber(
  value: unknown,
  label: string,
  options: {
    integer?: boolean;
    min?: number;
    max?: number;
  } = {},
): number | null {
  if (value === null) {
    return null;
  }
  return expectNumber(value, label, options);
}

function expectOptionalBoolean(
  value: unknown,
  label: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return expectBoolean(value, label);
}

function expectOptionalString(
  value: unknown,
  label: string,
  options: {
    allowEmpty?: boolean;
    maxLength?: number;
  } = {},
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return expectString(value, label, options);
}

function expectNullableString(
  value: unknown,
  label: string,
  options: {
    allowEmpty?: boolean;
    maxLength?: number;
  } = {},
): string | null {
  if (value === null) {
    return null;
  }
  return expectString(value, label, options);
}

function expectStringRecord(
  value: unknown,
  label: string,
  options: {
    maxEntries?: number;
    maxValueLength?: number;
  } = {},
): Record<string, string> {
  const record = expectObject(value, label);
  const entries = Object.entries(record);

  if (entries.length > (options.maxEntries ?? MAX_HEADER_ENTRIES)) {
    throw new Error(`${label} has too many entries`);
  }

  return entries.reduce<Record<string, string>>((acc, [key, entryValue]) => {
    const safeKey = expectString(key, `${label} key`, {
      maxLength: MAX_NAME_LENGTH,
    }).trim();
    const safeValue = expectString(entryValue, `${label}.${safeKey}`, {
      allowEmpty: true,
      maxLength: options.maxValueLength ?? MAX_TEXT_LENGTH,
    });
    acc[safeKey] = safeValue;
    return acc;
  }, {});
}

function expectStringArray(
  value: unknown,
  label: string,
  options: {
    maxEntries?: number;
    maxItemLength?: number;
  } = {},
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  if (value.length > (options.maxEntries ?? MAX_PROTOCOL_ENTRIES)) {
    throw new Error(`${label} has too many entries`);
  }

  return value.map((item, index) =>
    expectString(item, `${label}[${index}]`, {
      maxLength: options.maxItemLength ?? MAX_NAME_LENGTH,
    }),
  );
}

function expectNullableId(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }
  return expectString(value, label, { maxLength: MAX_ID_LENGTH });
}

function expectBodyType(
  value: unknown,
  label: string,
): SavedRequest["bodyType"] {
  if (value === null) {
    return null;
  }

  const safeValue = expectString(value, label, { maxLength: 40 });
  if (
    !["none", "json", "text", "form-urlencoded", "graphql"].includes(safeValue)
  ) {
    throw new Error(`${label} must be a supported body type`);
  }
  return safeValue as SavedRequest["bodyType"];
}

function expectAuthType(
  value: unknown,
  label: string,
): SavedRequest["authType"] {
  if (value === null) {
    return null;
  }

  const safeValue = expectString(value, label, { maxLength: 40 });
  if (!["none", "basic", "bearer"].includes(safeValue)) {
    throw new Error(`${label} must be a supported auth type`);
  }
  return safeValue as SavedRequest["authType"];
}

function expectKeyValueEnabledEntry(
  value: unknown,
  label: string,
): { key: string; value: string; enabled: boolean } {
  const record = expectObject(value, label);
  expectOnlyKeys(record, ["key", "value", "enabled"], label);
  return {
    key: expectString(record.key, `${label}.key`, {
      allowEmpty: true,
      maxLength: MAX_NAME_LENGTH,
    }),
    value: expectString(record.value, `${label}.value`, {
      allowEmpty: true,
      maxLength: MAX_TEXT_LENGTH,
    }),
    enabled: expectBoolean(record.enabled, `${label}.enabled`),
  };
}

function expectKeyValueEnabledArray(
  value: unknown,
  label: string,
  maxEntries: number,
): Array<{ key: string; value: string; enabled: boolean }> {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  if (value.length > maxEntries) {
    throw new Error(`${label} has too many entries`);
  }

  return value.map((item, index) =>
    expectKeyValueEnabledEntry(item, `${label}[${index}]`),
  );
}

function expectSavedRequestInput(
  value: unknown,
): Omit<SavedRequest, "createdAt" | "updatedAt"> {
  const record = expectObject(value, "db:request:save");
  expectOnlyKeys(
    record,
    [
      "id",
      "collectionId",
      "workspaceId",
      "name",
      "method",
      "url",
      "headers",
      "queryParams",
      "bodyType",
      "bodyContent",
      "authType",
      "authConfig",
      "sortOrder",
    ],
    "db:request:save",
  );

  return {
    id: expectString(record.id, "db:request:save.id", {
      maxLength: MAX_ID_LENGTH,
    }),
    collectionId: expectNullableId(
      record.collectionId,
      "db:request:save.collectionId",
    ),
    workspaceId: expectString(
      record.workspaceId,
      "db:request:save.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    name: expectString(record.name, "db:request:save.name", {
      maxLength: MAX_NAME_LENGTH,
    }),
    method: expectString(record.method, "db:request:save.method", {
      maxLength: 20,
    }),
    url: expectString(record.url, "db:request:save.url", {
      maxLength: MAX_URL_LENGTH,
    }),
    headers: expectKeyValueEnabledArray(
      record.headers,
      "db:request:save.headers",
      MAX_HEADER_ENTRIES,
    ),
    queryParams: expectKeyValueEnabledArray(
      record.queryParams,
      "db:request:save.queryParams",
      MAX_QUERY_ENTRIES,
    ),
    bodyType: expectBodyType(record.bodyType, "db:request:save.bodyType"),
    bodyContent: expectNullableString(
      record.bodyContent,
      "db:request:save.bodyContent",
      {
        allowEmpty: true,
        maxLength: MAX_BODY_LENGTH,
      },
    ),
    authType: expectAuthType(record.authType, "db:request:save.authType"),
    authConfig:
      record.authConfig === null
        ? null
        : expectStringRecord(record.authConfig, "db:request:save.authConfig", {
            maxEntries: 20,
            maxValueLength: MAX_TEXT_LENGTH,
          }),
    sortOrder: expectNumber(record.sortOrder, "db:request:save.sortOrder", {
      integer: true,
      min: 0,
      max: 1_000_000,
    }),
  };
}

function expectHttpRequest(value: unknown): HttpRequest {
  const record = expectObject(value, "http:execute");
  expectOnlyKeys(
    record,
    ["method", "url", "headers", "body", "timeout", "variables"],
    "http:execute",
  );

  return {
    method: expectString(record.method, "http:execute.method", {
      maxLength: 20,
    }),
    url: expectString(record.url, "http:execute.url", {
      maxLength: MAX_URL_LENGTH,
    }),
    headers: expectStringRecord(record.headers, "http:execute.headers", {
      maxEntries: MAX_HEADER_ENTRIES,
      maxValueLength: MAX_TEXT_LENGTH,
    }),
    body: expectOptionalString(record.body, "http:execute.body", {
      allowEmpty: true,
      maxLength: MAX_BODY_LENGTH,
    }),
    timeout: expectOptionalNumber(record.timeout, "http:execute.timeout", {
      integer: true,
      min: 0,
      max: 300_000,
    }),
    variables:
      record.variables === undefined
        ? undefined
        : expectStringRecord(record.variables, "http:execute.variables", {
            maxEntries: 500,
            maxValueLength: MAX_TEXT_LENGTH,
          }),
  };
}

function expectCollectionRunRequest(value: unknown): CollectionRunRequest {
  const record = expectObject(value, "runner:collection");
  expectOnlyKeys(
    record,
    ["workspaceId", "collectionId", "stopOnFailure"],
    "runner:collection",
  );

  return {
    workspaceId: expectString(
      record.workspaceId,
      "runner:collection.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    collectionId: expectString(
      record.collectionId,
      "runner:collection.collectionId",
      { maxLength: MAX_ID_LENGTH },
    ),
    stopOnFailure: expectOptionalBoolean(
      record.stopOnFailure,
      "runner:collection.stopOnFailure",
    ),
  };
}

function expectWebSocketConnectRequest(
  value: unknown,
): WebSocketConnectRequest {
  const record = expectObject(value, "ws:connect");
  expectOnlyKeys(
    record,
    ["url", "headers", "protocols", "variables"],
    "ws:connect",
  );

  return {
    url: expectString(record.url, "ws:connect.url", {
      maxLength: MAX_URL_LENGTH,
    }),
    headers: expectStringRecord(record.headers, "ws:connect.headers", {
      maxEntries: MAX_HEADER_ENTRIES,
      maxValueLength: MAX_TEXT_LENGTH,
    }),
    protocols:
      record.protocols === undefined
        ? undefined
        : expectStringArray(record.protocols, "ws:connect.protocols", {
            maxEntries: MAX_PROTOCOL_ENTRIES,
            maxItemLength: MAX_NAME_LENGTH,
          }),
    variables:
      record.variables === undefined
        ? undefined
        : expectStringRecord(record.variables, "ws:connect.variables", {
            maxEntries: 500,
            maxValueLength: MAX_TEXT_LENGTH,
          }),
  };
}

function expectWebSocketSendRequest(value: unknown): WebSocketSendRequest {
  const record = expectObject(value, "ws:send");
  expectOnlyKeys(record, ["message"], "ws:send");

  return {
    message: expectString(record.message, "ws:send.message", {
      allowEmpty: true,
      maxLength: MAX_BODY_LENGTH,
    }),
  };
}

function expectMockRoute(value: unknown, label: string): MockRoute {
  const record = expectObject(value, label);
  expectOnlyKeys(
    record,
    ["id", "method", "path", "statusCode", "headers", "body", "enabled"],
    label,
  );

  return {
    id: expectString(record.id, `${label}.id`, { maxLength: MAX_ID_LENGTH }),
    method: expectString(record.method, `${label}.method`, { maxLength: 20 }),
    path: expectString(record.path, `${label}.path`, {
      maxLength: MAX_URL_LENGTH,
    }),
    statusCode: expectNumber(record.statusCode, `${label}.statusCode`, {
      integer: true,
      min: 100,
      max: 599,
    }),
    headers: expectKeyValueEnabledArray(
      record.headers,
      `${label}.headers`,
      MAX_HEADER_ENTRIES,
    ),
    body: expectString(record.body, `${label}.body`, {
      allowEmpty: true,
      maxLength: MAX_BODY_LENGTH,
    }),
    enabled: expectBoolean(record.enabled, `${label}.enabled`),
  };
}

function expectMockServerConfig(value: unknown): MockServerConfig {
  const record = expectObject(value, "mock:start");
  expectOnlyKeys(record, ["port", "routes"], "mock:start");

  if (!Array.isArray(record.routes)) {
    throw new Error("mock:start.routes must be an array");
  }

  if (record.routes.length > MAX_COLLECTION_ITEMS) {
    throw new Error("mock:start.routes has too many entries");
  }

  return {
    port:
      record.port === undefined
        ? undefined
        : expectNullableNumber(record.port, "mock:start.port", {
            integer: true,
            min: 0,
            max: 65_535,
          }),
    routes: record.routes.map((route, index) =>
      expectMockRoute(route, `mock:start.routes[${index}]`),
    ),
  };
}

function expectSingleIdArgs(value: unknown, label: string): { id: string } {
  const record = expectObject(value, label);
  expectOnlyKeys(record, ["id"], label);
  return {
    id: expectString(record.id, `${label}.id`, { maxLength: MAX_ID_LENGTH }),
  };
}

function expectWorkspaceIdArgs(
  value: unknown,
  label: string,
): { workspaceId: string } {
  const record = expectObject(value, label);
  expectOnlyKeys(record, ["workspaceId"], label);
  return {
    workspaceId: expectString(record.workspaceId, `${label}.workspaceId`, {
      maxLength: MAX_ID_LENGTH,
    }),
  };
}

function expectCollectionListArgs(value: unknown): { workspaceId: string } {
  return expectWorkspaceIdArgs(value, "db:collection:list");
}

function expectCollectionCreateArgs(value: unknown): {
  workspaceId: string;
  parentId?: string | null;
  name: string;
  description?: string | null;
} {
  const record = expectObject(value, "db:collection:create");
  expectOnlyKeys(
    record,
    ["workspaceId", "parentId", "name", "description"],
    "db:collection:create",
  );

  return {
    workspaceId: expectString(
      record.workspaceId,
      "db:collection:create.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    parentId:
      record.parentId === undefined
        ? undefined
        : expectNullableId(record.parentId, "db:collection:create.parentId"),
    name: expectString(record.name, "db:collection:create.name", {
      maxLength: MAX_NAME_LENGTH,
    }),
    description:
      record.description === undefined
        ? undefined
        : expectNullableString(
            record.description,
            "db:collection:create.description",
            {
              allowEmpty: true,
              maxLength: MAX_DESCRIPTION_LENGTH,
            },
          ),
  };
}

function expectCollectionUpdateArgs(value: unknown): {
  id: string;
  name?: string;
  parentId?: string | null;
  sortOrder?: number;
  description?: string | null;
} {
  const record = expectObject(value, "db:collection:update");
  expectOnlyKeys(
    record,
    ["id", "name", "parentId", "sortOrder", "description"],
    "db:collection:update",
  );

  return {
    id: expectString(record.id, "db:collection:update.id", {
      maxLength: MAX_ID_LENGTH,
    }),
    name: expectOptionalString(record.name, "db:collection:update.name", {
      maxLength: MAX_NAME_LENGTH,
    }),
    parentId:
      record.parentId === undefined
        ? undefined
        : expectNullableId(record.parentId, "db:collection:update.parentId"),
    sortOrder: expectOptionalNumber(
      record.sortOrder,
      "db:collection:update.sortOrder",
      {
        integer: true,
        min: 0,
        max: 1_000_000,
      },
    ),
    description:
      record.description === undefined
        ? undefined
        : expectNullableString(
            record.description,
            "db:collection:update.description",
            {
              allowEmpty: true,
              maxLength: MAX_DESCRIPTION_LENGTH,
            },
          ),
  };
}

function expectCollectionReorderArgs(value: unknown): {
  items: Array<{ id: string; sortOrder: number; parentId?: string | null }>;
} {
  const record = expectObject(value, "db:collection:reorder");
  expectOnlyKeys(record, ["items"], "db:collection:reorder");

  if (!Array.isArray(record.items)) {
    throw new Error("db:collection:reorder.items must be an array");
  }

  if (record.items.length > MAX_COLLECTION_ITEMS) {
    throw new Error("db:collection:reorder.items has too many entries");
  }

  return {
    items: record.items.map((item, index) => {
      const entry = expectObject(item, `db:collection:reorder.items[${index}]`);
      expectOnlyKeys(
        entry,
        ["id", "sortOrder", "parentId"],
        `db:collection:reorder.items[${index}]`,
      );
      return {
        id: expectString(entry.id, `db:collection:reorder.items[${index}].id`, {
          maxLength: MAX_ID_LENGTH,
        }),
        sortOrder: expectNumber(
          entry.sortOrder,
          `db:collection:reorder.items[${index}].sortOrder`,
          {
            integer: true,
            min: 0,
            max: 1_000_000,
          },
        ),
        parentId:
          entry.parentId === undefined
            ? undefined
            : expectNullableId(
                entry.parentId,
                `db:collection:reorder.items[${index}].parentId`,
              ),
      };
    }),
  };
}

function expectRequestListArgs(value: unknown): {
  workspaceId: string;
  collectionId?: string | null;
} {
  const record = expectObject(value, "db:request:list");
  expectOnlyKeys(record, ["workspaceId", "collectionId"], "db:request:list");

  return {
    workspaceId: expectString(
      record.workspaceId,
      "db:request:list.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    collectionId:
      record.collectionId === undefined
        ? undefined
        : expectNullableId(record.collectionId, "db:request:list.collectionId"),
  };
}

function expectRequestReorderArgs(value: unknown): {
  items: Array<{ id: string; sortOrder: number; collectionId?: string | null }>;
} {
  const record = expectObject(value, "db:request:reorder");
  expectOnlyKeys(record, ["items"], "db:request:reorder");

  if (!Array.isArray(record.items)) {
    throw new Error("db:request:reorder.items must be an array");
  }

  if (record.items.length > MAX_COLLECTION_ITEMS) {
    throw new Error("db:request:reorder.items has too many entries");
  }

  return {
    items: record.items.map((item, index) => {
      const entry = expectObject(item, `db:request:reorder.items[${index}]`);
      expectOnlyKeys(
        entry,
        ["id", "sortOrder", "collectionId"],
        `db:request:reorder.items[${index}]`,
      );
      return {
        id: expectString(entry.id, `db:request:reorder.items[${index}].id`, {
          maxLength: MAX_ID_LENGTH,
        }),
        sortOrder: expectNumber(
          entry.sortOrder,
          `db:request:reorder.items[${index}].sortOrder`,
          {
            integer: true,
            min: 0,
            max: 1_000_000,
          },
        ),
        collectionId:
          entry.collectionId === undefined
            ? undefined
            : expectNullableId(
                entry.collectionId,
                `db:request:reorder.items[${index}].collectionId`,
              ),
      };
    }),
  };
}

function expectEnvCreateArgs(value: unknown): {
  workspaceId: string;
  name: string;
} {
  const record = expectObject(value, "db:env:create");
  expectOnlyKeys(record, ["workspaceId", "name"], "db:env:create");
  return {
    workspaceId: expectString(record.workspaceId, "db:env:create.workspaceId", {
      maxLength: MAX_ID_LENGTH,
    }),
    name: expectString(record.name, "db:env:create.name", {
      maxLength: MAX_NAME_LENGTH,
    }),
  };
}

function expectEnvUpdateArgs(value: unknown): { id: string; name: string } {
  const record = expectObject(value, "db:env:update");
  expectOnlyKeys(record, ["id", "name"], "db:env:update");
  return {
    id: expectString(record.id, "db:env:update.id", {
      maxLength: MAX_ID_LENGTH,
    }),
    name: expectString(record.name, "db:env:update.name", {
      maxLength: MAX_NAME_LENGTH,
    }),
  };
}

function expectSetActiveEnvArgs(value: unknown): {
  workspaceId: string;
  environmentId: string | null;
} {
  const record = expectObject(value, "db:env:setActive");
  expectOnlyKeys(record, ["workspaceId", "environmentId"], "db:env:setActive");
  return {
    workspaceId: expectString(
      record.workspaceId,
      "db:env:setActive.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    environmentId: expectNullableId(
      record.environmentId,
      "db:env:setActive.environmentId",
    ),
  };
}

function expectEnvironmentIdArgs(
  value: unknown,
  label: string,
): { environmentId: string } {
  const record = expectObject(value, label);
  expectOnlyKeys(record, ["environmentId"], label);
  return {
    environmentId: expectString(
      record.environmentId,
      `${label}.environmentId`,
      { maxLength: MAX_ID_LENGTH },
    ),
  };
}

function expectEnvVariableSetArgs(value: unknown): {
  environmentId: string;
  key: string;
  value: string;
  isSecret?: boolean;
} {
  const record = expectObject(value, "db:env:variables:set");
  expectOnlyKeys(
    record,
    ["environmentId", "key", "value", "isSecret"],
    "db:env:variables:set",
  );
  return {
    environmentId: expectString(
      record.environmentId,
      "db:env:variables:set.environmentId",
      { maxLength: MAX_ID_LENGTH },
    ),
    key: expectString(record.key, "db:env:variables:set.key", {
      maxLength: MAX_NAME_LENGTH,
    }),
    value: expectString(record.value, "db:env:variables:set.value", {
      allowEmpty: true,
      maxLength: MAX_TEXT_LENGTH,
    }),
    isSecret: expectOptionalBoolean(
      record.isSecret,
      "db:env:variables:set.isSecret",
    ),
  };
}

function expectHistorySaveArgs(
  value: unknown,
): Omit<HistoryEntry, "id" | "executedAt"> {
  const record = expectObject(value, "db:history:save");
  expectOnlyKeys(
    record,
    [
      "requestId",
      "workspaceId",
      "method",
      "url",
      "requestHeaders",
      "requestBody",
      "statusCode",
      "responseHeaders",
      "responseBody",
      "responseSizeBytes",
      "responseTimeMs",
      "errorMessage",
    ],
    "db:history:save",
  );

  return {
    requestId:
      record.requestId === null
        ? null
        : expectString(record.requestId, "db:history:save.requestId", {
            maxLength: MAX_ID_LENGTH,
          }),
    workspaceId: expectString(
      record.workspaceId,
      "db:history:save.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    method: expectString(record.method, "db:history:save.method", {
      maxLength: 20,
    }),
    url: expectString(record.url, "db:history:save.url", {
      maxLength: MAX_URL_LENGTH,
    }),
    requestHeaders: expectNullableString(
      record.requestHeaders,
      "db:history:save.requestHeaders",
      {
        allowEmpty: true,
        maxLength: MAX_BODY_LENGTH,
      },
    ),
    requestBody: expectNullableString(
      record.requestBody,
      "db:history:save.requestBody",
      {
        allowEmpty: true,
        maxLength: MAX_BODY_LENGTH,
      },
    ),
    statusCode: expectNullableNumber(
      record.statusCode,
      "db:history:save.statusCode",
      {
        integer: true,
        min: 100,
        max: 599,
      },
    ),
    responseHeaders: expectNullableString(
      record.responseHeaders,
      "db:history:save.responseHeaders",
      {
        allowEmpty: true,
        maxLength: MAX_BODY_LENGTH,
      },
    ),
    responseBody: expectNullableString(
      record.responseBody,
      "db:history:save.responseBody",
      {
        allowEmpty: true,
        maxLength: MAX_BODY_LENGTH,
      },
    ),
    responseSizeBytes: expectNullableNumber(
      record.responseSizeBytes,
      "db:history:save.responseSizeBytes",
      {
        integer: true,
        min: 0,
      },
    ),
    responseTimeMs: expectNullableNumber(
      record.responseTimeMs,
      "db:history:save.responseTimeMs",
      {
        integer: true,
        min: 0,
      },
    ),
    errorMessage: expectNullableString(
      record.errorMessage,
      "db:history:save.errorMessage",
      {
        allowEmpty: true,
        maxLength: MAX_TEXT_LENGTH,
      },
    ),
  };
}

function expectHistoryListArgs(value: unknown): {
  workspaceId: string;
  limit?: number;
} {
  const record = expectObject(value, "db:history:list");
  expectOnlyKeys(record, ["workspaceId", "limit"], "db:history:list");
  return {
    workspaceId: expectString(
      record.workspaceId,
      "db:history:list.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    limit: expectOptionalNumber(record.limit, "db:history:list.limit", {
      integer: true,
      min: 1,
      max: 1_000,
    }),
  };
}

function expectDiscoveryStartArgs(value: unknown): {
  workspaceId: string;
  baseUrl: string;
} {
  const record = expectObject(value, "discovery:start");
  expectOnlyKeys(record, ["workspaceId", "baseUrl"], "discovery:start");
  return {
    workspaceId: expectString(
      record.workspaceId,
      "discovery:start.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
    baseUrl: expectString(record.baseUrl, "discovery:start.baseUrl", {
      maxLength: MAX_URL_LENGTH,
    }),
  };
}

function expectPostmanImportArgs(value: unknown): {
  filePath: string;
  workspaceId: string;
} {
  const record = expectObject(value, "import:postman");
  expectOnlyKeys(record, ["filePath", "workspaceId"], "import:postman");
  return {
    filePath: expectString(record.filePath, "import:postman.filePath", {
      maxLength: MAX_FILE_PATH_LENGTH,
    }),
    workspaceId: expectString(
      record.workspaceId,
      "import:postman.workspaceId",
      { maxLength: MAX_ID_LENGTH },
    ),
  };
}

function expectDialogFilters(value: unknown): FilterSpec[] {
  if (!Array.isArray(value)) {
    throw new Error("dialog:openFile.filters must be an array");
  }

  if (value.length > 50) {
    throw new Error("dialog:openFile.filters has too many entries");
  }

  return value.map((item, index) => {
    const record = expectObject(item, `dialog:openFile.filters[${index}]`);
    expectOnlyKeys(
      record,
      ["name", "extensions"],
      `dialog:openFile.filters[${index}]`,
    );
    return {
      name: expectString(
        record.name,
        `dialog:openFile.filters[${index}].name`,
        {
          maxLength: MAX_NAME_LENGTH,
        },
      ),
      extensions: expectStringArray(
        record.extensions,
        `dialog:openFile.filters[${index}].extensions`,
        {
          maxEntries: 25,
          maxItemLength: 20,
        },
      ),
    };
  });
}

function expectDialogOpenArgs(value: unknown): { filters?: FilterSpec[] } {
  const record = expectObject(value, "dialog:openFile");
  expectOnlyKeys(record, ["filters"], "dialog:openFile");
  return {
    filters:
      record.filters === undefined
        ? undefined
        : expectDialogFilters(record.filters),
  };
}

function expectNoArgs(channel: string, args: unknown): void {
  if (args !== undefined) {
    throw new Error(`${channel} does not accept arguments`);
  }
}

export function validateIpcArgs<K extends ChannelName>(
  channel: K,
  args: unknown,
): ChannelArgs<K> {
  switch (channel) {
    case "app:ping":
    case "http:cancel":
    case "ws:disconnect":
    case "ws:state":
    case "mock:stop":
    case "mock:state":
    case "db:workspace:list":
    case "db:workspace:getDefault":
    case "discovery:cancel":
      expectNoArgs(channel, args);
      return undefined as ChannelArgs<K>;

    case "http:execute":
      return expectHttpRequest(args) as ChannelArgs<K>;
    case "runner:collection":
      return expectCollectionRunRequest(args) as ChannelArgs<K>;
    case "ws:connect":
      return expectWebSocketConnectRequest(args) as ChannelArgs<K>;
    case "ws:send":
      return expectWebSocketSendRequest(args) as ChannelArgs<K>;
    case "mock:start":
      return expectMockServerConfig(args) as ChannelArgs<K>;
    case "db:workspace:get":
      return expectSingleIdArgs(args, "db:workspace:get") as ChannelArgs<K>;
    case "db:collection:list":
      return expectCollectionListArgs(args) as ChannelArgs<K>;
    case "db:collection:create":
      return expectCollectionCreateArgs(args) as ChannelArgs<K>;
    case "db:collection:update":
      return expectCollectionUpdateArgs(args) as ChannelArgs<K>;
    case "db:collection:delete":
      return expectSingleIdArgs(args, "db:collection:delete") as ChannelArgs<K>;
    case "db:collection:reorder":
      return expectCollectionReorderArgs(args) as ChannelArgs<K>;
    case "db:request:save":
      return expectSavedRequestInput(args) as ChannelArgs<K>;
    case "db:request:get":
      return expectSingleIdArgs(args, "db:request:get") as ChannelArgs<K>;
    case "db:request:list":
      return expectRequestListArgs(args) as ChannelArgs<K>;
    case "db:request:delete":
      return expectSingleIdArgs(args, "db:request:delete") as ChannelArgs<K>;
    case "db:request:reorder":
      return expectRequestReorderArgs(args) as ChannelArgs<K>;
    case "db:env:list":
      return expectWorkspaceIdArgs(args, "db:env:list") as ChannelArgs<K>;
    case "db:env:create":
      return expectEnvCreateArgs(args) as ChannelArgs<K>;
    case "db:env:update":
      return expectEnvUpdateArgs(args) as ChannelArgs<K>;
    case "db:env:delete":
      return expectSingleIdArgs(args, "db:env:delete") as ChannelArgs<K>;
    case "db:env:setActive":
      return expectSetActiveEnvArgs(args) as ChannelArgs<K>;
    case "db:env:getActive":
      return expectWorkspaceIdArgs(args, "db:env:getActive") as ChannelArgs<K>;
    case "db:env:variables:list":
      return expectEnvironmentIdArgs(
        args,
        "db:env:variables:list",
      ) as ChannelArgs<K>;
    case "db:env:variables:set":
      return expectEnvVariableSetArgs(args) as ChannelArgs<K>;
    case "db:env:variables:delete":
      return expectSingleIdArgs(
        args,
        "db:env:variables:delete",
      ) as ChannelArgs<K>;
    case "db:env:resolvedVariables":
      return expectWorkspaceIdArgs(
        args,
        "db:env:resolvedVariables",
      ) as ChannelArgs<K>;
    case "db:history:save":
      return expectHistorySaveArgs(args) as ChannelArgs<K>;
    case "db:history:list":
      return expectHistoryListArgs(args) as ChannelArgs<K>;
    case "discovery:start":
      return expectDiscoveryStartArgs(args) as ChannelArgs<K>;
    case "db:discovery:list":
      return expectWorkspaceIdArgs(args, "db:discovery:list") as ChannelArgs<K>;
    case "db:discovery:clear":
      return expectWorkspaceIdArgs(
        args,
        "db:discovery:clear",
      ) as ChannelArgs<K>;
    case "import:postman":
      return expectPostmanImportArgs(args) as ChannelArgs<K>;
    case "dialog:openFile":
      return expectDialogOpenArgs(args) as ChannelArgs<K>;
    default: {
      const exhaustiveCheck: never = channel;
      throw new Error(
        `No IPC validator registered for channel: ${exhaustiveCheck}`,
      );
    }
  }
}
