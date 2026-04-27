import org.apache.commons.codec.digest.DigestUtils;
import org.apache.http.HttpEntity;
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

/**
 * Pudu OpenAPI 请求工具 (Java 版本)
 * 
 * 依赖:
 * - org.apache.httpcomponents:httpclient
 * - commons-codec:commons-codec
 */
class PuduRequest {
    private static final String MAC_NAME = "HmacSHA1";
    private static final String ENCODING = "UTF-8";

    public static class ClusterInfo {
        public String cluster;
        public String name;
        public String hostname;

        public ClusterInfo(String cluster, String name, String hostname) {
            this.cluster = cluster;
            this.name = name;
            this.hostname = hostname;
        }
    }

    public static final Map<String, ClusterInfo> CLUSTERS = new HashMap<>();
    static {
        CLUSTERS.put("cn", new ClusterInfo("cn", "国内生产节点", "open-platform.pudutech.com"));
        CLUSTERS.put("sea", new ClusterInfo("sea", "海外（日韩新加坡）生产节点", "css-open-platform.pudutech.com"));
        CLUSTERS.put("de", new ClusterInfo("de", "德国生产节点", "csg-open-platform.pudutech.com"));
        CLUSTERS.put("us", new ClusterInfo("us", "美国生产节点", "csu-open-platform.pudutech.com"));
    }

    public static ClusterInfo resolveCluster(String cluster, String hostname) {
        if (hostname != null && !hostname.isEmpty()) {
            String name = (cluster != null && CLUSTERS.containsKey(cluster)) ? CLUSTERS.get(cluster).name : "自定义集群";
            return new ClusterInfo(cluster != null ? cluster : "custom", name, hostname);
        }
        String envCluster = System.getenv("PUDU_API_CLUSTER");
        String finalCluster = (cluster != null && !cluster.isEmpty()) ? cluster : envCluster;
        if (finalCluster == null || !CLUSTERS.containsKey(finalCluster)) {
            throw new IllegalArgumentException("请设置环境变量 PUDU_API_CLUSTER，或显式传入 cluster/hostname。可选值: cn, sea, de, us");
        }
        return CLUSTERS.get(finalCluster);
    }

    public static String[] resolveCredentials(String appKey, String appSecret) {
        String finalAppKey = (appKey != null && !appKey.isEmpty()) ? appKey : System.getenv("PUDU_API_APP_KEY");
        String finalAppSecret = (appSecret != null && !appSecret.isEmpty()) ? appSecret : System.getenv("PUDU_API_APP_SECRET");

        if (finalAppKey == null || finalAppKey.isEmpty()) {
            throw new IllegalArgumentException("ApiAppKey 缺失。请直接提供 apiAppKey，或设置环境变量 PUDU_API_APP_KEY。");
        }
        if (finalAppSecret == null || finalAppSecret.isEmpty()) {
            throw new IllegalArgumentException("ApiAppSecret 缺失。请直接提供 apiAppSecret，或设置环境变量 PUDU_API_APP_SECRET。");
        }
        return new String[]{finalAppKey, finalAppSecret};
    }

    /**
     * 发起 HTTPS 请求 (自动签名)
     *
     * @param method      "GET" 或 "POST"
     * @param path        接口路径 (例如 /pudu-entry/data-open-platform-service/v1/api/healthCheck)
     * @param getParams   GET请求的 Query 参数 (若为 POST，可传 null)
     * @param postBody    POST请求的 JSON Body 字符串 (若为 GET，可传 null 或 "")
     * @param cluster     集群标志 (cn, sea, de, us)
     * @param hostname    直接指定域名
     * @param apiAppKey   应用的 ApiAppKey
     * @param apiAppSecret 应用的 ApiAppSecret
     * @return 接口返回的 JSON 字符串
     */
    public static String request(
            String method,
            String path,
            Map<String, List<String>> getParams,
            String postBody,
            String cluster,
            String hostname,
            String apiAppKey,
            String apiAppSecret
    ) throws Exception {
        method = method.toUpperCase();
        ClusterInfo clusterInfo = resolveCluster(cluster, hostname);
        String[] creds = resolveCredentials(apiAppKey, apiAppSecret);
        String finalAppKey = creds[0];
        String finalAppSecret = creds[1];

        String acceptHeader = "application/json";
        String contentType = "application/json";
        
        boolean isGet = "GET".equals(method);

        String queryStr = "";
        if (isGet && getParams != null && !getParams.isEmpty()) {
            queryStr = buildQueryString(getParams);
        }

        String reqBody = isGet ? "" : (postBody != null ? postBody : "");
        String contentMD5 = "";

        if (reqBody.isEmpty()) {
            contentType = "";
            contentMD5 = "";
        } else {
            contentMD5 = base64Encode(getMD5(reqBody).getBytes(ENCODING));
        }

        String fullPath = path;
        if (isGet && !queryStr.isEmpty()) {
            fullPath = path + "?" + queryStr;
        }

        String url = "https://" + clusterInfo.hostname + fullPath;
        
        // 构建用于签名的 pathAndParams
        String pathAndParams = path;
        if (isGet && !queryStr.isEmpty()) {
            // 先通过 sortQueryParams 重新解析并排序 query string
            pathAndParams = pathAndParams + "?" + sortQueryParams(queryStr);
            // GET 需要对排序好的 URL 参数执行 URLDecode 才能生成正确的签名串
            pathAndParams = URLDecoder.decode(pathAndParams, ENCODING);
        } else if (!isGet) {
            // POST 情况下直接使用 path，如果在 path 中本身带有查询参数，按照示例直接包含
            // 若 path 自带查询参数需要解析和排序（不建议），这部分也可以使用 sortQueryParams
            int queryIdx = pathAndParams.indexOf("?");
            if (queryIdx != -1) {
                String pPath = pathAndParams.substring(0, queryIdx);
                String pQuery = pathAndParams.substring(queryIdx + 1);
                pathAndParams = pPath + "?" + sortQueryParams(pQuery);
            }
        }

        String xDate = getGMTTime();
        String stringToSign = String.format("x-date: %s\n%s\n%s\n%s\n%s\n%s", 
                xDate, method, acceptHeader, contentType, contentMD5, pathAndParams);

        byte[] hmacStr = HmacSHA1Encrypt(stringToSign, finalAppSecret);
        String signature = base64Encode(hmacStr);
        String authHeader = String.format("hmac id=\"%s\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"%s\"", finalAppKey, signature);

        CloseableHttpClient httpClient = HttpClients.createDefault();
        CloseableHttpResponse response = null;

        try {
            if (isGet) {
                HttpGet httpGet = new HttpGet(url);
                httpGet.setHeader("Accept", acceptHeader);
                httpGet.setHeader("Host", clusterInfo.hostname);
                if (!contentType.isEmpty()) {
                    httpGet.setHeader("Content-Type", contentType);
                }
                httpGet.setHeader("x-date", xDate);
                httpGet.setHeader("Authorization", authHeader);
                response = httpClient.execute(httpGet);
            } else {
                HttpPost httpPost = new HttpPost(url);
                httpPost.setHeader("Accept", acceptHeader);
                httpPost.setHeader("Host", clusterInfo.hostname);
                httpPost.setHeader("x-date", xDate);
                if (!contentType.isEmpty()) {
                    httpPost.setHeader("Content-Type", contentType);
                    httpPost.setHeader("Content-MD5", contentMD5);
                }
                httpPost.setHeader("Authorization", authHeader);
                StringEntity stringEntity = new StringEntity(reqBody, ENCODING);
                httpPost.setEntity(stringEntity);
                response = httpClient.execute(httpPost);
            }

            HttpEntity responseEntity = response.getEntity();
            if (responseEntity != null) {
                return EntityUtils.toString(responseEntity, ENCODING);
            }
            return null;
        } finally {
            if (response != null) {
                response.close();
            }
            httpClient.close();
        }
    }

    private static String getGMTTime() {
        Calendar cd = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("GMT"));
        return sdf.format(cd.getTime());
    }

    private static String buildQueryString(Map<String, List<String>> params) throws Exception {
        Map<String, List<String>> sortedParams = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, List<String>> entry : sortedParams.entrySet()) {
            String key = entry.getKey();
            List<String> values = entry.getValue();
            boolean allEmpty = values.stream().allMatch(v -> v == null || v.isEmpty());

            sb.append(URLEncoder.encode(key, ENCODING));
            
            if (!allEmpty) {
                List<String> nonEmpty = values.stream()
                        .filter(v -> v != null && !v.isEmpty())
                        .map(v -> {
                            try {
                                return URLEncoder.encode(v, ENCODING);
                            } catch (Exception e) {
                                return v;
                            }
                        })
                        .collect(Collectors.toList());
                if (!nonEmpty.isEmpty()) {
                    sb.append("=");
                    sb.append(String.join(",", nonEmpty));
                }
            }
            sb.append("&");
        }
        if (sb.length() > 0) {
            sb.setLength(sb.length() - 1);
        }
        return sb.toString();
    }

    private static String sortQueryParams(String queryParam) {
        if (queryParam == null || queryParam.isEmpty()) {
            return "";
        }
        String[] queryParams = queryParam.split("&");
        Map<String, List<String>> queryPairs = new TreeMap<>(); // TreeMap 自动按字典序排序
        for (String query : queryParams) {
            String[] kv = query.split("=", 2);
            String key = kv[0];
            String value = kv.length > 1 ? kv[1] : null;
            queryPairs.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
        }

        StringBuilder sortedParamsBuilder = new StringBuilder();
        for (Map.Entry<String, List<String>> entry : queryPairs.entrySet()) {
            List<String> values = entry.getValue();
            boolean allEmpty = values.stream().allMatch(v -> v == null || v.isEmpty());
            
            sortedParamsBuilder.append(entry.getKey());
            
            if (!allEmpty) {
                List<String> nonEmpty = values.stream()
                        .filter(v -> v != null && !v.isEmpty())
                        .collect(Collectors.toList());
                if (!nonEmpty.isEmpty()) {
                    sortedParamsBuilder.append("=");
                    sortedParamsBuilder.append(String.join(",", nonEmpty));
                }
            }
            sortedParamsBuilder.append("&");
        }
        if (sortedParamsBuilder.length() > 0) {
            sortedParamsBuilder.setLength(sortedParamsBuilder.length() - 1);
        }
        return sortedParamsBuilder.toString();
    }

    private static byte[] HmacSHA1Encrypt(String encryptText, String encryptKey) throws Exception {
        byte[] data = encryptKey.getBytes(ENCODING);
        SecretKey secretKey = new SecretKeySpec(data, MAC_NAME);
        Mac mac = Mac.getInstance(MAC_NAME);
        mac.init(secretKey);
        return mac.doFinal(encryptText.getBytes(ENCODING));
    }

    private static String base64Encode(byte[] key) {
        return Base64.getEncoder().encodeToString(key);
    }

    private static String getMD5(String str) {
        return DigestUtils.md5Hex(str);
    }

    private static String maskSecret(String value) {
        if (value == null || value.isEmpty()) return "";
        if (value.length() <= 6) return value.substring(0, 1) + "***";
        return value.substring(0, 3) + "***" + value.substring(value.length() - 3);
    }

    // ─── 示例用法（直接执行时运行）────────────────────────────────────────────────

    public static void main(String[] args) {
        try {
            // 解析配置（可通过配置环境变量，或在此处设置以便测试）
            // System.setProperty("PUDU_API_APP_KEY", "your_key");
            // System.setProperty("PUDU_API_APP_SECRET", "your_secret");
            // System.setProperty("PUDU_API_CLUSTER", "cn");
            
            String[] creds = resolveCredentials(null, null);
            ClusterInfo clusterInfo = resolveCluster(null, null);

            System.out.println("当前配置：");
            System.out.println("- ApiAppKey: " + maskSecret(creds[0]));
            System.out.println("- ApiAppSecret: " + maskSecret(creds[1]));
            System.out.println("- 集群: " + clusterInfo.name + " (" + clusterInfo.hostname + ")\n");
            
            System.out.println("请在其他类中按需调用 PuduRequest.request()，避免直接执行本文件时误发真实请求。");

            // GET 示例:
            // Map<String, List<String>> getParams = new HashMap<>();
            // getParams.put("b", Arrays.asList("2"));
            // getParams.put("a", Arrays.asList("###特殊字符测试"));
            // getParams.put("d", Arrays.asList("item02", "item01", "item03"));
            // getParams.put("c", Arrays.asList("3"));
            // String getRes = request("GET", "/pudu-entry/data-open-platform-service/v1/api/healthCheck", 
            //                          getParams, null, "cn", null, creds[0], creds[1]);
            // System.out.println("GET Response: " + getRes);

            // POST 示例:
            // String postBody = "{\"b\":\"2\", \"a\":\"###特殊字符测试\", \"c\": \"3\"}";
            // String postRes = request("POST", "/pudu-entry/data-open-platform-service/v1/api/healthCheck", 
            //                          null, postBody, "cn", null, creds[0], creds[1]);
            // System.out.println("POST Response: " + postRes);

        } catch (Exception e) {
            System.err.println("配置检查失败：" + e.getMessage());
        }
    }
}
