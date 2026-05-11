#!/usr/bin/env node

const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const REQUIRED_ENV = [
  "CLOUDVEIL_BASE_URL",
  "CLOUDVEIL_ACCOUNT",
  "CLOUDVEIL_PASSWORD",
];

function requireConfig(env = process.env) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    baseUrl: env.CLOUDVEIL_BASE_URL,
    account: env.CLOUDVEIL_ACCOUNT,
    password: env.CLOUDVEIL_PASSWORD,
  };
}

function checkEnvironment(env = process.env) {
  const present = REQUIRED_ENV.filter((name) => Boolean(env[name]));
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  return {
    ready: missing.length === 0,
    present,
    missing,
  };
}

function buildUrl(baseUrl, requestPath, params = {}) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = requestPath.replace(/^\/+/, "");
  const url = new URL(normalizedPath, normalizedBase);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
}

function isSuccessResponse(status, json) {
  return status === 200 && json?.message === "SUCCESS";
}

function redactSensitiveValue(value) {
  if (!value || String(value).length < 7) {
    return "***";
  }

  const text = String(value);
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

function buildTokenHeaders(accessToken, env = process.env) {
  const headerName = env.CLOUDVEIL_TOKEN_HEADER || "Authorization";

  return {
    [headerName]: accessToken,
  };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Response is not valid JSON: ${text.slice(0, 200)}`);
  }
}

async function httpRequest(method, url, body, headers = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await parseJsonResponse(response);
  return {
    status: response.status,
    ok: isSuccessResponse(response.status, json),
    json,
  };
}

function normalizeMethod(method = "GET") {
  const normalized = String(method).toUpperCase();
  if (normalized !== "GET" && normalized !== "POST") {
    throw new Error("--method must be GET or POST");
  }
  return normalized;
}

function buildRequestOptions({
  method = "GET",
  body,
  accessToken,
  env = process.env,
} = {}) {
  return {
    method: normalizeMethod(method),
    body,
    headers: buildTokenHeaders(accessToken, env),
  };
}

async function sm2Encrypt(publicKey, text) {
  if (!text) {
    return "";
  }

  const scriptPath = path.join(__dirname, "sm2encrypt", "wasm_exec_node.js");
  const wasmPath = path.join(__dirname, "sm2encrypt", "sm2encrypt.wasm");
  const { stdout } = await execFileAsync(
    process.execPath,
    [scriptPath, wasmPath, publicKey, text],
    {
      cwd: path.dirname(scriptPath),
      maxBuffer: 1024 * 1024,
    },
  );

  const parsed = JSON.parse(stdout.trim());
  if (!parsed.encrypt_str) {
    throw new Error("SM2 encryption output did not include encrypt_str");
  }
  return parsed.encrypt_str.toUpperCase();
}

async function getAccessToken(config) {
  const secretUrl = buildUrl(
    config.baseUrl,
    "/openapi/sso/api/v1/secret/getSecret",
  );
  const secretResponse = await httpRequest("GET", secretUrl);
  if (!secretResponse.ok || !secretResponse.json?.data?.secret) {
    throw new Error(
      `Get secret failed: ${secretResponse.status} ${JSON.stringify(secretResponse.json)}`,
    );
  }

  const secret = secretResponse.json.data.secret;
  const account = await sm2Encrypt(secret, config.account);
  const password = await sm2Encrypt(secret, config.password);
  const loginUrl = buildUrl(
    config.baseUrl,
    "/openapi/sso/api/v1/account/accountLogin",
  );
  const loginResponse = await httpRequest("POST", loginUrl, {
    account,
    password,
  });

  const accessToken = loginResponse.json?.data?.access_token;
  if (!loginResponse.ok || !accessToken) {
    throw new Error(
      `Get access token failed: ${loginResponse.status} ${JSON.stringify(loginResponse.json)}`,
    );
  }

  return accessToken;
}

async function requestCloudVeil({
  path: requestPath,
  params = {},
  method = "GET",
  body,
  env = process.env,
}) {
  if (!requestPath) {
    throw new Error("path is required");
  }

  const config = requireConfig(env);
  const accessToken = await getAccessToken(config);
  const url = buildUrl(config.baseUrl, requestPath, params);
  const requestOptions = buildRequestOptions({
    method,
    body,
    accessToken,
    env,
  });
  return httpRequest(
    requestOptions.method,
    url,
    requestOptions.body,
    requestOptions.headers,
  );
}

function parseCliArgs(argv) {
  const args = {
    method: "GET",
    params: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--path") {
      args.path = argv[++index];
    } else if (arg === "--method") {
      args.method = normalizeMethod(argv[++index]);
    } else if (arg === "--param") {
      const pair = argv[++index];
      const separator = pair.indexOf("=");
      if (separator === -1) {
        throw new Error("--param must use key=value format");
      }
      args.params[pair.slice(0, separator)] = pair.slice(separator + 1);
    } else if (arg === "--body-json") {
      const jsonText = argv[++index];
      try {
        args.body = JSON.parse(jsonText);
      } catch (error) {
        throw new Error(`--body-json must be valid JSON: ${error.message}`);
      }
    } else if (arg === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/cloudveil-request.js --path <api-path> [--method GET|POST] [--param key=value] [--body-json '<json>']

Required environment:
  CLOUDVEIL_BASE_URL
  CLOUDVEIL_ACCOUNT
  CLOUDVEIL_PASSWORD`);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.path) {
    throw new Error("--path is required");
  }

  const envCheck = checkEnvironment();
  if (!envCheck.ready) {
    throw new Error(
      `Environment not ready: missing ${envCheck.missing.join(", ")}`,
    );
  }

  const response = await requestCloudVeil({
    path: args.path,
    params: args.params,
    method: args.method,
    body: args.body,
  });

  console.log(JSON.stringify(response.json, null, 2));
  if (!response.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  requireConfig,
  checkEnvironment,
  buildUrl,
  normalizeMethod,
  buildRequestOptions,
  parseCliArgs,
  isSuccessResponse,
  redactSensitiveValue,
  buildTokenHeaders,
  sm2Encrypt,
  getAccessToken,
  requestCloudVeil,
};
