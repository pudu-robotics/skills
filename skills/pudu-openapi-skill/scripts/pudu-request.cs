/**
 * Pudu OpenAPI 请求工具 (C# 版本)
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

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace PuduOpenApi
{
    public class ClusterInfo
    {
        public string Name { get; set; }
        public string Hostname { get; set; }
    }

    public class RequestOptions
    {
        /// <summary>
        /// 请求 host（不含协议，例如 open-platform.pudutech.com）
        /// </summary>
        public string Hostname { get; set; }
        
        /// <summary>
        /// 集群标识（cn / sea / de / us），未传时读取 PUDU_API_CLUSTER
        /// </summary>
        public string Cluster { get; set; }
        
        /// <summary>
        /// 接口路径（以 / 开头）
        /// </summary>
        public string Path { get; set; }
        
        /// <summary>
        /// 请求方法，"GET" 或 "POST"
        /// </summary>
        public string Method { get; set; }
        
        /// <summary>
        /// GET 查询参数 或 POST 请求体字段
        /// </summary>
        public Dictionary<string, object> Params { get; set; } = new Dictionary<string, object>();
        
        /// <summary>
        /// 应用 ApiAppKey，未传时读取 PUDU_API_APP_KEY
        /// </summary>
        public string ApiAppKey { get; set; }
        
        /// <summary>
        /// 应用 ApiAppSecret，未传时读取 PUDU_API_APP_SECRET
        /// </summary>
        public string ApiAppSecret { get; set; }
        
        /// <summary>
        /// 端口号（HTTPS 默认 443）
        /// </summary>
        public int Port { get; set; } = 443;
        
        /// <summary>
        /// 请求超时时间 (毫秒)
        /// </summary>
        public int TimeoutMs { get; set; } = 15000;
    }

    public class ResponseResult
    {
        public bool Ok { get; set; }
        public int Status { get; set; }
        public string Message { get; set; }
        public string Cluster { get; set; }
        public string ClusterName { get; set; }
        public string Hostname { get; set; }
        public string Method { get; set; }
        public string Path { get; set; }
        public JsonElement? Json { get; set; }
        public string Body { get; set; }
        public string TraceId { get; set; }
        public string ErrorMessage { get; set; }
    }

    public static class PuduRequestTool
    {
        private static readonly HttpClient _httpClient = new HttpClient();

        public static readonly Dictionary<string, ClusterInfo> CLUSTERS = new Dictionary<string, ClusterInfo>(StringComparer.OrdinalIgnoreCase)
        {
            { "cn", new ClusterInfo { Name = "国内生产节点", Hostname = "open-platform.pudutech.com" } },
            { "sea", new ClusterInfo { Name = "海外（日韩新加坡）生产节点", Hostname = "css-open-platform.pudutech.com" } },
            { "de", new ClusterInfo { Name = "德国生产节点", Hostname = "csg-open-platform.pudutech.com" } },
            { "us", new ClusterInfo { Name = "美国生产节点", Hostname = "csu-open-platform.pudutech.com" } }
        };

        // ─── 通用工具 ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// 对敏感值做脱敏展示，避免日志或报错中回显完整凭证
        /// </summary>
        public static string MaskSecret(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Length <= 6) return $"{value.Substring(0, 1)}***";
            return $"{value.Substring(0, 3)}***{value.Substring(value.Length - 3)}";
        }

        /// <summary>
        /// 判断字符串是否是常见 MAC 地址格式，例如：14:80:CC:89:27:A6
        /// </summary>
        public static bool IsMacAddress(string value)
        {
            if (string.IsNullOrEmpty(value)) return false;
            return Regex.IsMatch(value, @"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$");
        }

        /// <summary>
        /// 当接口需要 sn 时，防止误把 MAC 地址当作 sn 传入。
        /// </summary>
        public static void ValidateSnField(Dictionary<string, object> parameters)
        {
            if (parameters == null) return;
            if (parameters.TryGetValue("sn", out var snObj) && snObj is string sn)
            {
                if (IsMacAddress(sn))
                {
                    throw new ArgumentException($"检测到 sn 的值看起来像 MAC 地址（{sn}）。请提供机器人 SN，而不是 MAC 地址。");
                }
            }
        }

        /// <summary>
        /// 从环境变量和显式参数中解析凭证。
        /// 显式参数优先，其次读取环境变量。
        /// </summary>
        public static (string ApiAppKey, string ApiAppSecret) ResolveCredentials(string apiAppKey = null, string apiAppSecret = null)
        {
            string resolvedAppKey = apiAppKey ?? Environment.GetEnvironmentVariable("PUDU_API_APP_KEY");
            string resolvedAppSecret = apiAppSecret ?? Environment.GetEnvironmentVariable("PUDU_API_APP_SECRET");

            if (string.IsNullOrEmpty(resolvedAppKey))
                throw new ArgumentException("ApiAppKey 缺失。请直接提供 apiAppKey，或设置环境变量 PUDU_API_APP_KEY。");
            if (string.IsNullOrEmpty(resolvedAppSecret))
                throw new ArgumentException("ApiAppSecret 缺失。请直接提供 apiAppSecret，或设置环境变量 PUDU_API_APP_SECRET。");

            return (resolvedAppKey, resolvedAppSecret);
        }

        /// <summary>
        /// 解析集群信息。
        /// - 优先使用显式传入的 hostname
        /// - 否则使用 cluster 或环境变量 PUDU_API_CLUSTER 映射 hostname
        /// </summary>
        public static (string Cluster, string ClusterName, string Hostname) ResolveCluster(string hostname = null, string cluster = null)
        {
            if (!string.IsNullOrEmpty(hostname))
            {
                string name = (!string.IsNullOrEmpty(cluster) && CLUSTERS.TryGetValue(cluster, out var cInfo)) ? cInfo.Name : "自定义集群";
                return (cluster ?? "custom", name, hostname);
            }

            string clusterKey = cluster ?? Environment.GetEnvironmentVariable("PUDU_API_CLUSTER");

            if (string.IsNullOrEmpty(clusterKey))
                throw new ArgumentException("PUDU_API_CLUSTER 缺失。请设置环境变量 PUDU_API_CLUSTER，或显式传入 cluster/hostname。");

            if (!CLUSTERS.TryGetValue(clusterKey, out var config))
                throw new ArgumentException($"无效的集群值：{clusterKey}。可选值仅支持 cn / sea / de / us。");

            return (clusterKey, config.Name, config.Hostname);
        }

        // ─── 签名工具 ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// 计算 HMAC-SHA1 签名并返回 base64 字符串
        /// </summary>
        public static string HmacSha1(string secret, string message)
        {
            using (var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(secret)))
            {
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
                return Convert.ToBase64String(hash);
            }
        }

        /// <summary>
        /// 计算请求体的 Content-MD5（POST 专用）
        /// 规则：MD5(bodyStr) → hex → base64
        /// </summary>
        public static string ComputeContentMD5(string bodyStr)
        {
            if (string.IsNullOrEmpty(bodyStr)) return "";
            using (var md5 = MD5.Create())
            {
                byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(bodyStr));
                string hex = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
                return Convert.ToBase64String(Encoding.ASCII.GetBytes(hex));
            }
        }

        /// <summary>
        /// 将参数对象按字典序拼接为 query string（GET 专用）
        /// </summary>
        public static string BuildQueryString(Dictionary<string, object> parameters)
        {
            if (parameters == null || parameters.Count == 0) return "";

            var parts = new List<string>();

            foreach (var key in parameters.Keys.OrderBy(k => k, StringComparer.Ordinal))
            {
                var value = parameters[key];

                if (value is IEnumerable<object> list && !(value is string))
                {
                    var items = list.Select(i => Uri.EscapeDataString(i?.ToString() ?? "")).ToList();
                    if (items.Count > 0)
                        parts.Add($"{key}={string.Join(",", items)}");
                    else
                        parts.Add(key);
                }
                else if (value == null || value.ToString() == "")
                {
                    parts.Add(key);
                }
                else
                {
                    parts.Add($"{key}={Uri.EscapeDataString(value.ToString())}");
                }
            }

            return string.Join("&", parts);
        }

        /// <summary>
        /// 构造 HMAC 签名字符串
        /// </summary>
        public static string BuildSigningString(string method, string signPath, string dateTime, string contentMD5)
        {
            return $"x-date: {dateTime}\n{method}\napplication/json\napplication/json\n{contentMD5}\n{signPath}";
        }

        // ─── 核心请求方法 ──────────────────────────────────────────────────────────────

        /// <summary>
        /// 发起已签名的 HTTPS 请求（GET / POST）
        /// </summary>
        public static async Task<ResponseResult> RequestAsync(RequestOptions opts)
        {
            if (opts == null) throw new ArgumentNullException(nameof(opts));
            if (string.IsNullOrEmpty(opts.Path) || !opts.Path.StartsWith("/"))
                throw new ArgumentException("请传入以 / 开头的接口路径。");

            if (string.IsNullOrEmpty(opts.Method))
                throw new ArgumentException("请传入 GET 或 POST。");

            string normalizedMethod = opts.Method.ToUpperInvariant();
            if (normalizedMethod != "GET" && normalizedMethod != "POST")
                throw new ArgumentException($"不支持的请求方法：{opts.Method}。当前仅支持 GET / POST。");

            var (apiAppKey, apiAppSecret) = ResolveCredentials(opts.ApiAppKey, opts.ApiAppSecret);
            var (clusterKey, clusterName, hostname) = ResolveCluster(opts.Hostname, opts.Cluster);
            bool isGet = normalizedMethod == "GET";

            ValidateSnField(opts.Params);

            // GET：参数进 query string；POST：参数序列化为 JSON body
            string queryStr = isGet ? BuildQueryString(opts.Params) : "";
            string bodyStr = isGet ? "" : JsonSerializer.Serialize(opts.Params ?? new Dictionary<string, object>());
            string md5 = isGet ? "" : ComputeContentMD5(bodyStr);

            // 请求路径（GET 附带 encoded query string）
            string fullPath = !string.IsNullOrEmpty(queryStr) ? $"{opts.Path}?{queryStr}" : opts.Path;

            // 签名路径：GET 使用 decoded query string，避免二次编码导致签名不匹配
            string signPath = !string.IsNullOrEmpty(queryStr) ? $"{opts.Path}?{Uri.UnescapeDataString(queryStr)}" : opts.Path;

            // 构造时间
            string dateTime = DateTime.UtcNow.ToString("r"); // RFC1123 格式

            // 构造签名
            string signingStr = BuildSigningString(normalizedMethod, signPath, dateTime, md5);
            string signature = HmacSha1(apiAppSecret, signingStr);
            string authorization = $"hmac id=\"{apiAppKey}\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"{signature}\"";

            string url = $"https://{hostname}:{opts.Port}{fullPath}";

            var result = new ResponseResult
            {
                Cluster = clusterKey,
                ClusterName = clusterName,
                Hostname = hostname,
                Method = normalizedMethod,
                Path = fullPath
            };

            using (var requestMsg = new HttpRequestMessage(isGet ? HttpMethod.Get : HttpMethod.Post, url))
            {
                requestMsg.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                if (!string.IsNullOrEmpty(md5))
                    requestMsg.Headers.Add("Content-MD5", md5);
                requestMsg.Headers.Add("x-date", dateTime);
                requestMsg.Headers.TryAddWithoutValidation("Authorization", authorization);

                if (!isGet && !string.IsNullOrEmpty(bodyStr))
                {
                    requestMsg.Content = new StringContent(bodyStr, Encoding.UTF8, "application/json");
                }

                try
                {
                    using (var cts = new CancellationTokenSource(opts.TimeoutMs))
                    using (var response = await _httpClient.SendAsync(requestMsg, cts.Token))
                    {
                        result.Status = (int)response.StatusCode;
                        result.Body = await response.Content.ReadAsStringAsync();

                        if (!string.IsNullOrEmpty(result.Body))
                        {
                            try
                            {
                                using (var doc = JsonDocument.Parse(result.Body))
                                {
                                    result.Json = doc.RootElement.Clone();

                                    if (doc.RootElement.TryGetProperty("message", out var msgElement) && msgElement.ValueKind == JsonValueKind.String)
                                        result.Message = msgElement.GetString();

                                    if (doc.RootElement.TryGetProperty("trace_id", out var traceElement) && traceElement.ValueKind == JsonValueKind.String)
                                        result.TraceId = traceElement.GetString();
                                }
                            }
                            catch
                            {
                                // 解析失败忽略，走纯文本错误处理
                            }
                        }

                        result.Ok = response.StatusCode == System.Net.HttpStatusCode.OK && result.Message == "SUCCESS";

                        if (!result.Ok)
                        {
                            if (result.Json.HasValue)
                            {
                                var root = result.Json.Value;
                                if (root.TryGetProperty("error", out var errElement) && errElement.ValueKind == JsonValueKind.String)
                                    result.ErrorMessage = errElement.GetString();
                                else if (root.TryGetProperty("msg", out var msgErrElement) && msgErrElement.ValueKind == JsonValueKind.String)
                                    result.ErrorMessage = msgErrElement.GetString();
                                else
                                    result.ErrorMessage = result.Message;
                            }

                            if (string.IsNullOrEmpty(result.ErrorMessage))
                            {
                                result.ErrorMessage = !string.IsNullOrEmpty(result.Body) ? result.Body : $"HTTP {result.Status} 请求失败";
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.Ok = false;
                    result.ErrorMessage = ex.Message;
                }

                return result;
            }
        }
    }

    // ─── 示例用法（直接执行时运行）────────────────────────────────────────────────
    
    class Program
    {
        static async Task Main(string[] args)
        {
            try
            {
                var (apiKey, apiSecret) = PuduRequestTool.ResolveCredentials();
                var (clusterKey, clusterName, hostname) = PuduRequestTool.ResolveCluster();

                Console.WriteLine("当前配置：");
                Console.WriteLine($"- ApiAppKey: {PuduRequestTool.MaskSecret(apiKey)}");
                Console.WriteLine($"- ApiAppSecret: {PuduRequestTool.MaskSecret(apiSecret)}");
                Console.WriteLine($"- 集群: {clusterName} ({hostname})\n");
                Console.WriteLine("请在其他代码中按需调用 PuduRequestTool.RequestAsync()，避免直接执行本文件时误发真实请求。");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"配置检查失败：{ex.Message}");
            }
        }
    }
}
