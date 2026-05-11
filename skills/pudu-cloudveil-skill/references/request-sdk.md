# CloudVeil OpenAPI 请求工具

本文档说明 `scripts/cloudveil-request.js` 的环境变量、SSO/SM2 认证流程、请求参数和响应判定规则。真实调用前必须先读取本文档。

## 环境变量

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `CLOUDVEIL_BASE_URL` | 是 | CloudVeil 服务器基础地址，例如 `https://cloudveil.example.com` |
| `CLOUDVEIL_ACCOUNT` | 是 | CloudVeil 登录账号 |
| `CLOUDVEIL_PASSWORD` | 是 | CloudVeil 登录密码 |
| `CLOUDVEIL_TOKEN_HEADER` | 否 | 下游 OpenAPI token 头部名，默认 `Authorization` |

不要把演示地址当成默认值。不要把账号、密码、访问 token 或加密后的凭证写入仓库文件。若用户在对话中直接提供凭证，只能用脱敏形式回显，例如 `abc***xyz`。

## SSO/SM2 认证

`scripts/cloudveil-request.js` 实现的认证流程：

1. `GET /openapi/sso/api/v1/secret/getSecret`
2. 用返回的 `data.secret` 对 `CLOUDVEIL_ACCOUNT` 和 `CLOUDVEIL_PASSWORD` 做 SM2 加密
3. `POST /openapi/sso/api/v1/account/accountLogin`
4. 使用 `data.access_token` 调用目标 CloudVeil OpenAPI 接口

下游 OpenAPI 默认使用 `Authorization: <access_token>`，直接传原始 token，不添加任何前缀。若官方环境要求别的头部名，只能通过 `CLOUDVEIL_TOKEN_HEADER` 改头部名，不能给 token 增加前缀。

SM2 资源放在 `scripts/sm2encrypt/`。脚本通过参数安全的 `execFile` 调用 wasm 运行时，不要改成 shell 字符串拼接。

## CLI 用法

GET 示例：

```bash
node scripts/cloudveil-request.js \
  --path /openapi/data-board/v1/brief/shop \
  --param timezone_offset=8 \
  --param start_time=1778083200 \
  --param end_time=1778169599
```

POST JSON 示例：

```bash
node scripts/cloudveil-request.js \
  --method POST \
  --path /openapi/open-platform-service/v1/custom_call \
  --body-json '{"sn":"ROBOT_SN"}'
```

规则：

- `--path` 必须使用 asset 中的完整 OpenAPI path。
- GET 使用 `--param key=value` 拼 query。
- POST 可同时带 `--param` query 和 `--body-json` JSON 请求体。
- 查询参数和 POST JSON body 必须从对应 OpenAPI asset 里拿，不能只靠自然语言猜字段名。`custom_call` 以 `assets/robot-tasks.openapi.json` 中的 `CustomCallReq` 为准。

## 成功和失败

成功必须同时满足：

1. HTTP 状态码为 `200`
2. 响应 JSON 的 `message === "SUCCESS"`

如果 HTTP 为 200 但 `message` 不是 `SUCCESS`，按业务失败处理。

## 维护校验

更新任一 `assets/*.openapi.json` 后，至少运行：

```bash
npm test
```

如需快速查看所有 asset 的规模：

```bash
for f in assets/*.openapi.json; do jq -r '"\(.info.title)\tpaths=\(.paths|keys|length)\tops=\([.paths[] | keys[]] | length)"' "$f"; done
```
