/**
 * Pudu OpenAPI 请求工具
 *
 * 能力：
 * - 支持 GET / POST 的 HMAC-SHA1 签名请求
 * - 自动解析环境变量中的凭证和集群
 * - 统一返回解析后的结果，便于上层直接判断成功或失败
 *
 * 默认读取以下环境变量：
 * - PUDU_API_APP_KEY
 * - PUDU_API_APP_SECRET
 * - PUDU_API_CLUSTER（cn / sea / de / us）
 */

"use strict";

const https = require("https");
const crypto = require("crypto");

const CLUSTERS = {
  cn: {
    name: "国内生产节点",
    hostname: "open-platform.pudutech.com",
  },
  sea: {
    name: "海外（日韩新加坡）生产节点",
    hostname: "css-open-platform.pudutech.com",
  },
  de: {
    name: "德国生产节点",
    hostname: "csg-open-platform.pudutech.com",
  },
  us: {
    name: "美国生产节点",
    hostname: "csu-open-platform.pudutech.com",
  },
};

// ─── 通用工具 ─────────────────────────────────────────────────────────────────

/**
 * 对敏感值做脱敏展示，避免日志或报错中回显完整凭证
 */
function maskSecret(value) {
  if (!value) {
    return "";
  }

  if (value.length <= 6) {
    return `${value.slice(0, 1)}***`;
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

/**
 * 安全解析 JSON。解析失败时返回 null，由上层决定如何展示原始文本。
 */
function parseJsonSafely(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 统一检查必填字段，缺失时抛出可读错误。
 */
function assertRequired(value, fieldName, hint) {
  if (value) {
    return;
  }

  const error = new Error(`${fieldName} 缺失。${hint}`);
  error.code = "PUDU_CONFIG_MISSING";
  throw error;
}

/**
 * 判断字符串是否是常见 MAC 地址格式，例如：14:80:CC:89:27:A6
 */
function isMacAddress(value) {
  return typeof value === "string" && /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(value);
}

/**
 * 当接口需要 sn 时，防止误把 MAC 地址当作 sn 传入。
 */
function validateSnField(params) {
  if (!params || typeof params !== "object") {
    return;
  }

  if (isMacAddress(params.sn)) {
    const error = new Error(
      `检测到 sn 的值看起来像 MAC 地址（${params.sn}）。请提供机器人 SN，而不是 MAC 地址。`
    );
    error.code = "PUDU_SN_LOOKS_LIKE_MAC";
    throw error;
  }
}

/**
 * 从环境变量和显式参数中解析凭证。
 * 显式参数优先，其次读取环境变量。
 */
function resolveCredentials({ apiAppKey, apiAppSecret } = {}) {
  const resolvedAppKey = apiAppKey || process.env.PUDU_API_APP_KEY;
  const resolvedAppSecret = apiAppSecret || process.env.PUDU_API_APP_SECRET;

  assertRequired(
    resolvedAppKey,
    "ApiAppKey",
    "请直接提供 apiAppKey，或设置环境变量 PUDU_API_APP_KEY。"
  );
  assertRequired(
    resolvedAppSecret,
    "ApiAppSecret",
    "请直接提供 apiAppSecret，或设置环境变量 PUDU_API_APP_SECRET。"
  );

  return {
    apiAppKey: resolvedAppKey,
    apiAppSecret: resolvedAppSecret,
  };
}

/**
 * 解析集群信息。
 * - 优先使用显式传入的 hostname
 * - 否则使用 cluster 或环境变量 PUDU_API_CLUSTER 映射 hostname
 */
function resolveCluster({ hostname, cluster } = {}) {
  if (hostname) {
    return {
      cluster: cluster || "custom",
      clusterName: cluster && CLUSTERS[cluster] ? CLUSTERS[cluster].name : "自定义集群",
      hostname,
    };
  }

  const clusterKey = cluster || process.env.PUDU_API_CLUSTER;

  assertRequired(
    clusterKey,
    "PUDU_API_CLUSTER",
    "请设置环境变量 PUDU_API_CLUSTER，或显式传入 cluster/hostname。"
  );

  const clusterConfig = CLUSTERS[clusterKey];
  if (!clusterConfig) {
    const error = new Error(
      `无效的集群值：${clusterKey}。可选值仅支持 cn / sea / de / us。`
    );
    error.code = "PUDU_CLUSTER_INVALID";
    throw error;
  }

  return {
    cluster: clusterKey,
    clusterName: clusterConfig.name,
    hostname: clusterConfig.hostname,
  };
}

// ─── 签名工具 ─────────────────────────────────────────────────────────────────

/**
 * 计算 HMAC-SHA1 签名并返回 base64 字符串
 */
function hmacSha1(secret, message) {
  return crypto.createHmac("sha1", secret).update(message, "utf8").digest("base64");
}

/**
 * 计算请求体的 Content-MD5（POST 专用）
 * 规则：MD5(bodyStr) → hex → base64
 */
function computeContentMD5(bodyStr) {
  const hex = crypto.createHash("md5").update(bodyStr, "utf8").digest("hex");
  return Buffer.from(hex).toString("base64");
}

/**
 * 将参数对象按字典序拼接为 query string（GET 专用）
 *
 * 规则：
 *   - 值先 encodeURIComponent 编码
 *   - 数组用逗号分隔
 *   - 空值（null / undefined / ""）只保留 key
 */
function buildQueryString(params) {
  const parts = [];

  for (const key of Object.keys(params).sort()) {
    const value = params[key];

    if (Array.isArray(value)) {
      parts.push(value.length ? `${key}=${value.map(encodeURIComponent).join(",")}` : key);
    } else if (value === null || value === undefined || value === "") {
      parts.push(key);
    } else {
      parts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }

  return parts.join("&");
}

/**
 * 构造 HMAC 签名字符串
 *
 * 格式（各行以 \n 分隔）：
 *   x-date: {dateTime}
 *   {METHOD}
 *   application/json        ← Accept
 *   application/json        ← Content-Type
 *   {contentMD5}
 *   {signPath}              ← GET 用 decoded path?query；POST 用 path
 */
function buildSigningString({ method, signPath, dateTime, contentMD5 }) {
  return [
    `x-date: ${dateTime}`,
    method,
    "application/json",
    "application/json",
    contentMD5,
    signPath,
  ].join("\n");
}

// ─── 核心请求方法 ──────────────────────────────────────────────────────────────

/**
 * 发起已签名的 HTTPS 请求（GET / POST）
 *
 * @param {object} opts
 * @param {string} [opts.hostname]    请求 host（不含协议，例如 open-platform.pudutech.com）
 * @param {string} [opts.cluster]     集群标识（cn / sea / de / us），未传时读取 PUDU_API_CLUSTER
 * @param {string} opts.path          接口路径（以 / 开头）
 * @param {string} opts.method        请求方法，"GET" 或 "POST"
 * @param {object} [opts.params={}]   GET 查询参数 或 POST 请求体字段
 * @param {string} [opts.apiAppKey]   应用 ApiAppKey，未传时读取 PUDU_API_APP_KEY
 * @param {string} [opts.apiAppSecret] 应用 ApiAppSecret，未传时读取 PUDU_API_APP_SECRET
 * @param {number} [opts.port=443]    端口号（HTTPS 默认 443）
 * @param {number} [opts.timeoutMs=15000] 请求超时时间
 * @returns {Promise<object>}
 */
function request({
  hostname,
  cluster,
  path,
  method,
  params = {},
  apiAppKey,
  apiAppSecret,
  port = 443,
  timeoutMs = 15000,
}) {
  return new Promise((resolve, reject) => {
    assertRequired(path, "path", "请传入以 / 开头的接口路径。");
    assertRequired(method, "method", "请传入 GET 或 POST。");

    const normalizedMethod = method.toUpperCase();
    if (!["GET", "POST"].includes(normalizedMethod)) {
      const error = new Error(`不支持的请求方法：${method}。当前仅支持 GET / POST。`);
      error.code = "PUDU_METHOD_UNSUPPORTED";
      reject(error);
      return;
    }

    const credentials = resolveCredentials({ apiAppKey, apiAppSecret });
    const clusterInfo = resolveCluster({ hostname, cluster });
    const isGet = normalizedMethod === "GET";
    const dateTime = new Date().toUTCString();

    validateSnField(params);

    // GET：参数进 query string；POST：参数序列化为 JSON body
    const queryStr = isGet ? buildQueryString(params) : "";
    const bodyStr = isGet ? "" : JSON.stringify(params);
    const md5 = isGet ? "" : computeContentMD5(bodyStr);

    // 请求路径（GET 附带 encoded query string）
    const fullPath = queryStr ? `${path}?${queryStr}` : path;

    // 签名路径：GET 使用 decoded query string，避免二次编码导致签名不匹配
    const signPath = queryStr ? `${path}?${decodeURIComponent(queryStr)}` : path;

    // 构造签名
    const signingStr = buildSigningString({
      method: normalizedMethod,
      signPath,
      dateTime,
      contentMD5: md5,
    });
    const signature = hmacSha1(credentials.apiAppSecret, signingStr);
    const authorization = `hmac id="${credentials.apiAppKey}", algorithm="hmac-sha1", headers="x-date", signature="${signature}"`;

    const options = {
      hostname: clusterInfo.hostname,
      port,
      path: fullPath,
      method: normalizedMethod,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Content-MD5": md5,
        "Content-Length": Buffer.byteLength(bodyStr),
        "x-date": dateTime,
        Authorization: authorization,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const json = parseJsonSafely(body);
        const message = json && typeof json.message === "string" ? json.message : "";
        const ok = res.statusCode === 200 && message === "SUCCESS";
        const errorMessage =
          ok
            ? ""
            : (json && (json.message || json.error || json.msg)) ||
              body ||
              `HTTP ${res.statusCode} 请求失败`;

        resolve({
          ok,
          status: res.statusCode,
          message,
          cluster: clusterInfo.cluster,
          clusterName: clusterInfo.clusterName,
          hostname: clusterInfo.hostname,
          method: normalizedMethod,
          path: fullPath,
          json,
          body,
          traceId: json && json.trace_id ? json.trace_id : "",
          errorMessage,
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`请求超时：${timeoutMs}ms`));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

module.exports = {
  CLUSTERS,
  isMacAddress,
  maskSecret,
  resolveCredentials,
  resolveCluster,
  request,
};

// ─── 示例用法（直接执行时运行）────────────────────────────────────────────────

if (require.main === module) {
  try {
    const credentials = resolveCredentials();
    const clusterInfo = resolveCluster();

    console.log("当前配置：");
    console.log(`- ApiAppKey: ${maskSecret(credentials.apiAppKey)}`);
    console.log(`- ApiAppSecret: ${maskSecret(credentials.apiAppSecret)}`);
    console.log(`- 集群: ${clusterInfo.clusterName} (${clusterInfo.hostname})`);
    console.log("");
    console.log("请在其他脚本中按需调用 request()，避免直接执行本文件时误发真实请求。");
  } catch (error) {
    console.error(`配置检查失败：${error.message}`);
  }
}
