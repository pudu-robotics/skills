# 普渡开放平台 OpenAPI 请求 SDK 模板

本文档提供了各个语言的专业 SDK 代码，用于请求 Pudu OpenAPI 接口。所有的代码均实现了标准的鉴权签名机制（HMAC-SHA1）、集群自动选择以及通用的请求与响应处理。您可以直接复制相应的代码到您的项目中使用。

目前支持以下语言：
- [JavaScript (Node.js)](#javascript-nodejs)
- [Python](#python)
- [Go](#go)
- [Java](#java)
- [C#](#c)

---

## JavaScript (Node.js)

支持 `GET` 和 `POST` 请求，内置了参数的字典序排序及加密签名逻辑。

```javascript
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
  cn: { name: "国内生产节点", hostname: "open-platform.pudutech.com" },
  sea: { name: "海外（日韩新加坡）生产节点", hostname: "css-open-platform.pudutech.com" },
  de: { name: "德国生产节点", hostname: "csg-open-platform.pudutech.com" },
  us: { name: "美国生产节点", hostname: "csu-open-platform.pudutech.com" },
};

function hmacSha1(secret, message) {
  return crypto.createHmac("sha1", secret).update(message, "utf8").digest("base64");
}

function computeContentMD5(bodyStr) {
  const hex = crypto.createHash("md5").update(bodyStr, "utf8").digest("hex");
  return Buffer.from(hex).toString("base64");
}

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

function request({ hostname, cluster, path, method, params = {}, apiAppKey, apiAppSecret, port = 443, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const resolvedAppKey = apiAppKey || process.env.PUDU_API_APP_KEY;
    const resolvedAppSecret = apiAppSecret || process.env.PUDU_API_APP_SECRET;
    const clusterKey = cluster || process.env.PUDU_API_CLUSTER;
    const clusterInfo = hostname ? { hostname } : CLUSTERS[clusterKey];

    const normalizedMethod = method.toUpperCase();
    const isGet = normalizedMethod === "GET";
    const dateTime = new Date().toUTCString();

    const queryStr = isGet ? buildQueryString(params) : "";
    const bodyStr = isGet ? "" : JSON.stringify(params);
    const md5 = isGet ? "" : computeContentMD5(bodyStr);
    const fullPath = queryStr ? `${path}?${queryStr}` : path;
    const signPath = queryStr ? `${path}?${decodeURIComponent(queryStr)}` : path;

    const signingStr = [\`x-date: ${dateTime}\`, normalizedMethod, "application/json", "application/json", md5, signPath].join("\\n");
    const signature = hmacSha1(resolvedAppSecret, signingStr);
    const authorization = \`hmac id="\${resolvedAppKey}", algorithm="hmac-sha1", headers="x-date", signature="\${signature}"\`;

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
        try {
          const json = JSON.parse(body);
          resolve({ ok: res.statusCode === 200 && json.message === "SUCCESS", status: res.statusCode, json, body });
        } catch {
          resolve({ ok: false, status: res.statusCode, json: null, body });
        }
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error(\`请求超时：\${timeoutMs}ms\`)));
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

module.exports = { request };
```

---

## Python

基于 `requests` 库实现。需要执行 `pip install requests`。

```python
# -*- coding: utf-8 -*-
"""
Pudu OpenAPI 请求工具
默认读取以下环境变量：
- PUDU_API_APP_KEY
- PUDU_API_APP_SECRET
- PUDU_API_CLUSTER（cn / sea / de / us）
"""

import os, base64, datetime, hashlib, hmac, json
from urllib.parse import quote, unquote
import requests

CLUSTERS = {
    "cn": {"hostname": "open-platform.pudutech.com"},
    "sea": {"hostname": "css-open-platform.pudutech.com"},
    "de": {"hostname": "csg-open-platform.pudutech.com"},
    "us": {"hostname": "csu-open-platform.pudutech.com"},
}

def compute_content_md5(body_str: str) -> str:
    if not body_str: return ""
    md5_hex = hashlib.md5(body_str.encode("utf-8")).hexdigest()
    return base64.b64encode(md5_hex.encode("utf-8")).decode("utf-8")

def build_query_string(params: dict) -> str:
    parts = []
    for key in sorted(params.keys()):
        value = params[key]
        if isinstance(value, list):
            parts.append(f"{key}={','.join([quote(str(v), safe='') for v in value])}" if value else str(key))
        elif value is None or value == "":
            parts.append(str(key))
        else:
            parts.append(f"{key}={quote(str(value), safe='')}")
    return "&".join(parts)

def request(path: str, method: str, params=None, hostname=None, cluster=None, api_app_key=None, api_app_secret=None, port=443, timeout_ms=15000):
    params = params or {}
    api_key = api_app_key or os.environ.get("PUDU_API_APP_KEY")
    api_secret = api_app_secret or os.environ.get("PUDU_API_APP_SECRET")
    cluster_host = hostname or CLUSTERS[cluster or os.environ.get("PUDU_API_CLUSTER")]["hostname"]
    
    is_get = method.upper() == "GET"
    query_str = build_query_string(params) if is_get else ""
    body_str = "" if is_get else json.dumps(params, separators=(',', ':'), ensure_ascii=False)
    md5 = "" if is_get else compute_content_md5(body_str)
    
    full_path = f"{path}?{query_str}" if query_str else path
    
    # 清理环境前缀（适用于特殊环境）
    sign_path_base = path
    if sign_path_base.startswith(("/release", "/test", "/prepub")):
        parts = sign_path_base[1:].split("/", 1)
        sign_path_base = "/" + parts[1] if len(parts) > 1 else "/"
        
    sign_path = f"{sign_path_base}?{unquote(query_str)}" if query_str else sign_path_base
    date_time = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    
    signing_str = f"x-date: {date_time}\\n{method.upper()}\\napplication/json\\napplication/json\\n{md5}\\n{sign_path}"
    signature = hmac.new(api_secret.encode("utf-8"), msg=signing_str.encode("utf-8"), digestmod=hashlib.sha1).digest()
    auth = f'hmac id="{api_key}", algorithm="hmac-sha1", headers="x-date", signature="{base64.b64encode(signature).decode("utf-8")}"'
    
    url = f"https://{cluster_host}:{port}{full_path}"
    headers = {"Accept": "application/json", "Content-Type": "application/json", "Content-MD5": md5, "x-date": date_time, "Authorization": auth}
    
    try:
        res = requests.get(url, headers=headers, timeout=timeout_ms/1000.0) if is_get else requests.post(url, headers=headers, data=body_str.encode("utf-8"), timeout=timeout_ms/1000.0)
        res_json = res.json() if res.status_code == 200 else None
        return {"ok": res.status_code == 200 and res_json.get("message") == "SUCCESS", "status": res.status_code, "json": res_json, "body": res.text}
    except Exception as e:
        return {"ok": False, "error": str(e)}
```

---

## Go

Go 原生自带了签名所需的所有基础库，无需第三方依赖即可完成构建。

```go
package main

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"
)

var CLUSTERS = map[string]string{
	"cn":  "open-platform.pudutech.com",
	"sea": "css-open-platform.pudutech.com",
	"de":  "csg-open-platform.pudutech.com",
	"us":  "csu-open-platform.pudutech.com",
}

type RequestOptions struct {
	Hostname     string
	Cluster      string
	Path         string
	Method       string
	Params       map[string]interface{}
	ApiAppKey    string
	ApiAppSecret string
	Timeout      time.Duration
}

func encode(u string) string {
	u = strings.ReplaceAll(u, "%", "%25")
	u = strings.ReplaceAll(u, "#", "%23")
	u = strings.ReplaceAll(u, "=", "%3D")
	u = strings.ReplaceAll(u, "&", "%26")
	u = strings.ReplaceAll(u, "?", "%3F")
	u = strings.ReplaceAll(u, "/", "%2F")
	u = strings.ReplaceAll(u, "+", "%2B")
	u = strings.ReplaceAll(u, " ", "%20")
	return u
}

func Request(opts RequestOptions) (string, error) {
	appKey := opts.ApiAppKey
	if appKey == "" { appKey = os.Getenv("PUDU_API_APP_KEY") }
	appSecret := opts.ApiAppSecret
	if appSecret == "" { appSecret = os.Getenv("PUDU_API_APP_SECRET") }
	
	hostname := opts.Hostname
	if hostname == "" {
		cluster := opts.Cluster
		if cluster == "" { cluster = os.Getenv("PUDU_API_CLUSTER") }
		hostname = CLUSTERS[cluster]
	}

	method := strings.ToUpper(opts.Method)
	isGet := method == "GET"
	var queryStr, bodyStr string

	if isGet && opts.Params != nil {
		var keys []string
		for k := range opts.Params { keys = append(keys, k) }
		sort.Strings(keys)
		var parts []string
		for _, k := range keys {
			v := opts.Params[k]
			parts = append(parts, fmt.Sprintf("%s=%s", k, encode(fmt.Sprintf("%v", v))))
		}
		queryStr = strings.Join(parts, "&")
	} else if !isGet && opts.Params != nil {
		b, _ := json.Marshal(opts.Params)
		bodyStr = string(b)
	}

	reqPath := opts.Path
	if queryStr != "" { reqPath += "?" + queryStr }
	
	contentMD5 := ""
	if !isGet && bodyStr != "" {
		h := md5.New()
		h.Write([]byte(bodyStr))
		md5Str := hex.EncodeToString(h.Sum(nil))
		contentMD5 = base64.StdEncoding.EncodeToString([]byte(md5Str))
	}

	xDate := time.Now().UTC().Format("Mon, 02 Jan 2006 15:04:05 GMT")
	signingStr := fmt.Sprintf("x-date: %s\\n%s\\napplication/json\\napplication/json\\n%s\\n%s", xDate, method, contentMD5, reqPath)
	
	mac := hmac.New(sha1.New, []byte(appSecret))
	mac.Write([]byte(signingStr))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	auth := fmt.Sprintf("hmac id=\"%s\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"%s\"", appKey, signature)

	reqUrl := fmt.Sprintf("https://%s%s", hostname, reqPath)
	req, err := http.NewRequest(method, reqUrl, strings.NewReader(bodyStr))
	if err != nil { return "", err }

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-date", xDate)
	req.Header.Set("Authorization", auth)
	if !isGet { req.Header.Set("Content-MD5", contentMD5) }

	client := &http.Client{Timeout: opts.Timeout}
	if client.Timeout == 0 { client.Timeout = 15 * time.Second }
	
	res, err := client.Do(req)
	if err != nil { return "", err }
	defer res.Body.Close()

	resBody, _ := ioutil.ReadAll(res.Body)
	return string(resBody), nil
}
```

---

## Java

依赖 Apache HttpComponents (`httpclient`) 和 Commons Codec (`commons-codec`)。

```java
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

public class PuduRequest {
    private static final Map<String, String> CLUSTERS = new HashMap<>();
    static {
        CLUSTERS.put("cn", "open-platform.pudutech.com");
        CLUSTERS.put("sea", "css-open-platform.pudutech.com");
        CLUSTERS.put("de", "csg-open-platform.pudutech.com");
        CLUSTERS.put("us", "csu-open-platform.pudutech.com");
    }

    public static String request(String method, String path, Map<String, List<String>> getParams, String postBody) throws Exception {
        String appKey = System.getenv("PUDU_API_APP_KEY");
        String appSecret = System.getenv("PUDU_API_APP_SECRET");
        String hostname = CLUSTERS.get(System.getenv("PUDU_API_CLUSTER"));
        method = method.toUpperCase();
        boolean isGet = "GET".equals(method);

        String queryStr = "";
        if (isGet && getParams != null && !getParams.isEmpty()) {
            Map<String, List<String>> sortedParams = new TreeMap<>(getParams);
            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, List<String>> entry : sortedParams.entrySet()) {
                sb.append(URLEncoder.encode(entry.getKey(), "UTF-8")).append("=").append(URLEncoder.encode(entry.getValue().get(0), "UTF-8")).append("&");
            }
            queryStr = sb.toString().replaceAll("&$", "");
        }

        String reqBody = isGet || postBody == null ? "" : postBody;
        String contentMD5 = reqBody.isEmpty() ? "" : Base64.getEncoder().encodeToString(DigestUtils.md5Hex(reqBody).getBytes("UTF-8"));
        String fullPath = path + (queryStr.isEmpty() ? "" : "?" + queryStr);
        String signPath = path + (queryStr.isEmpty() ? "" : "?" + URLDecoder.decode(queryStr, "UTF-8"));

        SimpleDateFormat sdf = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("GMT"));
        String xDate = sdf.format(new Date());

        String stringToSign = String.format("x-date: %s\\n%s\\napplication/json\\napplication/json\\n%s\\n%s", xDate, method, contentMD5, signPath);
        
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(appSecret.getBytes("UTF-8"), "HmacSHA1"));
        String signature = Base64.getEncoder().encodeToString(mac.doFinal(stringToSign.getBytes("UTF-8")));
        String authHeader = String.format("hmac id=\"%s\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"%s\"", appKey, signature);

        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            if (isGet) {
                HttpGet httpGet = new HttpGet("https://" + hostname + fullPath);
                httpGet.setHeader("Accept", "application/json");
                httpGet.setHeader("x-date", xDate);
                httpGet.setHeader("Authorization", authHeader);
                try (CloseableHttpResponse response = httpClient.execute(httpGet)) {
                    return EntityUtils.toString(response.getEntity(), "UTF-8");
                }
            } else {
                HttpPost httpPost = new HttpPost("https://" + hostname + fullPath);
                httpPost.setHeader("Accept", "application/json");
                httpPost.setHeader("Content-Type", "application/json");
                httpPost.setHeader("Content-MD5", contentMD5);
                httpPost.setHeader("x-date", xDate);
                httpPost.setHeader("Authorization", authHeader);
                httpPost.setEntity(new StringEntity(reqBody, "UTF-8"));
                try (CloseableHttpResponse response = httpClient.execute(httpPost)) {
                    return EntityUtils.toString(response.getEntity(), "UTF-8");
                }
            }
        }
    }
}
```

---

## C#

使用 `.NET Core` 或 `.NET Framework` 均可运行。

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class PuduRequestTool
{
    private static readonly HttpClient _httpClient = new HttpClient();
    private static readonly Dictionary<string, string> CLUSTERS = new Dictionary<string, string>
    {
        { "cn", "open-platform.pudutech.com" },
        { "sea", "css-open-platform.pudutech.com" },
        { "de", "csg-open-platform.pudutech.com" },
        { "us", "csu-open-platform.pudutech.com" }
    };

    public static async Task<string> RequestAsync(string method, string path, Dictionary<string, object> parameters = null)
    {
        string appKey = Environment.GetEnvironmentVariable("PUDU_API_APP_KEY");
        string appSecret = Environment.GetEnvironmentVariable("PUDU_API_APP_SECRET");
        string hostname = CLUSTERS[Environment.GetEnvironmentVariable("PUDU_API_CLUSTER") ?? "cn"];
        
        bool isGet = method.ToUpper() == "GET";
        string queryStr = "";
        string bodyStr = "";

        if (isGet && parameters != null)
        {
            var parts = parameters.OrderBy(k => k.Key).Select(k => $"{k.Key}={Uri.EscapeDataString(k.Value?.ToString() ?? "")}");
            queryStr = string.Join("&", parts);
        }
        else if (!isGet && parameters != null)
        {
            bodyStr = JsonSerializer.Serialize(parameters);
        }

        string fullPath = string.IsNullOrEmpty(queryStr) ? path : $"{path}?{queryStr}";
        string signPath = string.IsNullOrEmpty(queryStr) ? path : $"{path}?{Uri.UnescapeDataString(queryStr)}";
        
        string contentMD5 = "";
        if (!isGet && !string.IsNullOrEmpty(bodyStr))
        {
            using (var md5 = MD5.Create())
            {
                byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(bodyStr));
                contentMD5 = Convert.ToBase64String(Encoding.ASCII.GetBytes(BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant()));
            }
        }

        string dateTime = DateTime.UtcNow.ToString("r");
        string signingStr = $"x-date: {dateTime}\\n{method.ToUpper()}\\napplication/json\\napplication/json\\n{contentMD5}\\n{signPath}";
        
        string signature;
        using (var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(appSecret)))
        {
            signature = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(signingStr)));
        }

        string auth = $"hmac id=\"{appKey}\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"{signature}\"";

        using (var req = new HttpRequestMessage(isGet ? HttpMethod.Get : HttpMethod.Post, $"https://{hostname}{fullPath}"))
        {
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            req.Headers.Add("x-date", dateTime);
            req.Headers.TryAddWithoutValidation("Authorization", auth);
            if (!isGet)
            {
                req.Headers.Add("Content-MD5", contentMD5);
                req.Content = new StringContent(bodyStr, Encoding.UTF8, "application/json");
            }

            var res = await _httpClient.SendAsync(req);
            return await res.Content.ReadAsStringAsync();
        }
    }
}
```
