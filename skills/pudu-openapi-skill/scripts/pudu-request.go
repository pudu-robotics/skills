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
	"regexp"
	"sort"
	"strings"
	"time"
)

// ClusterConfig 保存集群的配置信息
type ClusterConfig struct {
	Name     string
	Hostname string
}

// CLUSTERS 预设集群列表
var CLUSTERS = map[string]ClusterConfig{
	"cn":  {"国内生产节点", "open-platform.pudutech.com"},
	"sea": {"海外（日韩新加坡）生产节点", "css-open-platform.pudutech.com"},
	"de":  {"德国生产节点", "csg-open-platform.pudutech.com"},
	"us":  {"美国生产节点", "csu-open-platform.pudutech.com"},
}

// RequestOptions 请求配置参数
type RequestOptions struct {
	Hostname     string
	Cluster      string
	Path         string                 // 接口路径，例如 "/pudu-entry/..." 或带参数的路径
	Method       string                 // "GET" 或 "POST"
	Params       map[string]interface{} // GET 查询参数 或 POST 请求体字段
	ApiAppKey    string
	ApiAppSecret string
	Timeout      time.Duration
}

// ResponseResult 统一封装的响应结果
type ResponseResult struct {
	Ok           bool
	Status       int
	Message      string
	Cluster      string
	ClusterName  string
	Hostname     string
	Method       string
	Path         string
	JSON         map[string]interface{}
	Body         string
	TraceID      string
	ErrorMessage string
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

func maskSecret(value string) string {
	if value == "" {
		return ""
	}
	if len(value) <= 6 {
		return value[:1] + "***"
	}
	return value[:3] + "***" + value[len(value)-3:]
}

func isMacAddress(value string) bool {
	matched, _ := regexp.MatchString(`^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$`, value)
	return matched
}

func validateSnField(params map[string]interface{}) error {
	if params == nil {
		return nil
	}
	if snVal, ok := params["sn"]; ok {
		if snStr, ok := snVal.(string); ok && isMacAddress(snStr) {
			return fmt.Errorf("检测到 sn 的值看起来像 MAC 地址（%s）。请提供机器人 SN，而不是 MAC 地址", snStr)
		}
	}
	return nil
}

func buildQueryString(params map[string]interface{}) string {
	var keys []string
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var parts []string
	for _, k := range keys {
		v := params[k]
		if v == nil || v == "" {
			parts = append(parts, k)
			continue
		}

		switch val := v.(type) {
		case []string:
			if len(val) == 0 {
				parts = append(parts, k)
			} else {
				var encoded []string
				for _, s := range val {
					encoded = append(encoded, encode(s))
				}
				parts = append(parts, fmt.Sprintf("%s=%s", k, strings.Join(encoded, ",")))
			}
		case []interface{}:
			if len(val) == 0 {
				parts = append(parts, k)
			} else {
				var encoded []string
				for _, s := range val {
					encoded = append(encoded, encode(fmt.Sprintf("%v", s)))
				}
				parts = append(parts, fmt.Sprintf("%s=%s", k, strings.Join(encoded, ",")))
			}
		default:
			parts = append(parts, fmt.Sprintf("%s=%s", k, encode(fmt.Sprintf("%v", v))))
		}
	}
	return strings.Join(parts, "&")
}

// Request 发起签名请求
func Request(opts RequestOptions) (*ResponseResult, error) {
	if opts.Path == "" || !strings.HasPrefix(opts.Path, "/") {
		return nil, fmt.Errorf("path 缺失。请传入以 / 开头的接口路径")
	}

	method := strings.ToUpper(opts.Method)
	if method != "GET" && method != "POST" {
		return nil, fmt.Errorf("不支持的请求方法：%s。当前仅支持 GET / POST", opts.Method)
	}

	// 1. 解析凭证
	appKey := opts.ApiAppKey
	if appKey == "" {
		appKey = os.Getenv("PUDU_API_APP_KEY")
	}
	appSecret := opts.ApiAppSecret
	if appSecret == "" {
		appSecret = os.Getenv("PUDU_API_APP_SECRET")
	}
	if appKey == "" {
		return nil, fmt.Errorf("ApiAppKey 缺失。请直接提供 apiAppKey，或设置环境变量 PUDU_API_APP_KEY")
	}
	if appSecret == "" {
		return nil, fmt.Errorf("ApiAppSecret 缺失。请直接提供 apiAppSecret，或设置环境变量 PUDU_API_APP_SECRET")
	}

	// 2. 解析集群
	cluster := opts.Cluster
	hostname := opts.Hostname
	clusterName := "自定义集群"

	if hostname == "" {
		if cluster == "" {
			cluster = os.Getenv("PUDU_API_CLUSTER")
		}
		if cluster == "" {
			return nil, fmt.Errorf("PUDU_API_CLUSTER 缺失。请设置环境变量 PUDU_API_CLUSTER，或显式传入 cluster/hostname")
		}
		config, ok := CLUSTERS[cluster]
		if !ok {
			return nil, fmt.Errorf("无效的集群值：%s。可选值仅支持 cn / sea / de / us", cluster)
		}
		hostname = config.Hostname
		clusterName = config.Name
	} else if cluster != "" {
		if config, ok := CLUSTERS[cluster]; ok {
			clusterName = config.Name
		}
	} else {
		cluster = "custom"
	}

	if err := validateSnField(opts.Params); err != nil {
		return nil, err
	}

	// 3. 构造请求路径和参数
	isGet := method == "GET"
	var queryStr string
	var bodyStr string

	if isGet {
		if opts.Params != nil {
			queryStr = buildQueryString(opts.Params)
		}
	} else {
		if opts.Params != nil && len(opts.Params) > 0 {
			b, _ := json.Marshal(opts.Params)
			bodyStr = string(b)
		} else {
			bodyStr = "{}"
		}
	}

	// 合并由于显式在 path 中传入的 query 和 Params 转换的 query
	fullPath := opts.Path
	u, err := url.Parse(fullPath)
	if err != nil {
		return nil, fmt.Errorf("解析 Path 失败：%v", err)
	}

	pathOnly := u.Path
	urlQuery := u.RawQuery

	// 将 URL 中的 Query 也按字典序排序处理，为了生成一致的签名 Path
	var finalQueryStr string
	if urlQuery != "" {
		args, _ := url.ParseQuery(urlQuery)
		var keys []string
		for k := range args {
			keys = append(keys, k)
		}
		sort.Strings(keys)

		var parts []string
		for _, k := range keys {
			values := args[k]
			if len(values) == 0 {
				parts = append(parts, k)
			} else {
				var nonEmpty []string
				for _, v := range values {
					if v != "" {
						nonEmpty = append(nonEmpty, v)
					}
				}
				if len(nonEmpty) == 0 {
					parts = append(parts, k)
				} else {
					if isGet {
						joined := strings.Join(nonEmpty, ",")
						parts = append(parts, k+"="+joined)
					} else {
						parts = append(parts, k+"="+nonEmpty[0])
					}
				}
			}
		}

		if queryStr != "" {
			finalQueryStr = strings.Join(parts, "&") + "&" + queryStr
		} else {
			finalQueryStr = strings.Join(parts, "&")
		}
	} else {
		finalQueryStr = queryStr
	}

	// 完整请求的路径（包含 Query）
	reqPath := pathOnly
	if finalQueryStr != "" {
		reqPath = reqPath + "?" + finalQueryStr
	}

	// 4. 计算签名
	signPath := pathOnly
	if strings.HasPrefix(signPath, "/release") {
		signPath = strings.TrimPrefix(signPath, "/release")
	} else if strings.HasPrefix(signPath, "/test") {
		signPath = strings.TrimPrefix(signPath, "/test")
	} else if strings.HasPrefix(signPath, "/prepub") {
		signPath = strings.TrimPrefix(signPath, "/prepub")
	}
	if signPath == "" {
		signPath = "/"
	}
	if finalQueryStr != "" {
		signPath = signPath + "?" + finalQueryStr
	}

	contentMD5 := ""
	if !isGet {
		h := md5.New()
		h.Write([]byte(bodyStr))
		md5Str := hex.EncodeToString(h.Sum(nil))
		contentMD5 = base64.StdEncoding.EncodeToString([]byte(md5Str))
	}

	gmtFormat := "Mon, 02 Jan 2006 15:04:05 GMT"
	xDate := time.Now().UTC().Format(gmtFormat)
	accept := "application/json"
	contentType := "application/json"

	signingStr := fmt.Sprintf("x-date: %s\n%s\n%s\n%s\n%s\n%s",
		xDate, method, accept, contentType, contentMD5, signPath)

	mac := hmac.New(sha1.New, []byte(appSecret))
	mac.Write([]byte(signingStr))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	authorization := fmt.Sprintf("hmac id=\"%s\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"%s\"",
		appKey, signature)

	// 5. 发起 HTTP 请求
	reqUrl := fmt.Sprintf("https://%s%s", hostname, reqPath)
	req, err := http.NewRequest(method, reqUrl, strings.NewReader(bodyStr))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Host", hostname)
	req.Header.Set("Accept", accept)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-date", xDate)
	req.Header.Set("Authorization", authorization)
	if !isGet {
		req.Header.Set("Content-MD5", contentMD5)
	}

	client := &http.Client{
		Timeout: opts.Timeout,
	}
	if client.Timeout == 0 {
		client.Timeout = 15 * time.Second
	}

	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	resBody, _ := ioutil.ReadAll(res.Body)

	var jsonMap map[string]interface{}
	json.Unmarshal(resBody, &jsonMap)

	var message string
	if msg, ok := jsonMap["message"].(string); ok {
		message = msg
	}

	okReq := res.StatusCode == 200 && message == "SUCCESS"
	var errorMessage string
	if !okReq {
		if msg, found := jsonMap["message"].(string); found {
			errorMessage = msg
		} else if errStr, found := jsonMap["error"].(string); found {
			errorMessage = errStr
		} else if msgStr, found := jsonMap["msg"].(string); found {
			errorMessage = msgStr
		} else {
			errorMessage = string(resBody)
			if errorMessage == "" {
				errorMessage = fmt.Sprintf("HTTP %d 请求失败", res.StatusCode)
			}
		}
	}

	var traceId string
	if tid, found := jsonMap["trace_id"].(string); found {
		traceId = tid
	}

	return &ResponseResult{
		Ok:           okReq,
		Status:       res.StatusCode,
		Message:      message,
		Cluster:      cluster,
		ClusterName:  clusterName,
		Hostname:     hostname,
		Method:       method,
		Path:         reqPath,
		JSON:         jsonMap,
		Body:         string(resBody),
		TraceID:      traceId,
		ErrorMessage: errorMessage,
	}, nil
}

func main() {
	appKey := os.Getenv("PUDU_API_APP_KEY")
	appSecret := os.Getenv("PUDU_API_APP_SECRET")
	cluster := os.Getenv("PUDU_API_CLUSTER")

	fmt.Println("当前配置：")
	fmt.Printf("- ApiAppKey: %s\n", maskSecret(appKey))
	fmt.Printf("- ApiAppSecret: %s\n", maskSecret(appSecret))

	clusterName := "未设置"
	hostname := ""
	if config, ok := CLUSTERS[cluster]; ok {
		clusterName = config.Name
		hostname = config.Hostname
	}
	fmt.Printf("- 集群: %s (%s)\n", clusterName, hostname)
	fmt.Println("\n这是一个 Pudu OpenAPI 请求工具。请在其他 Go 文件中导入使用 Request() 函数，或配置好环境变量后进行测试。")
}
