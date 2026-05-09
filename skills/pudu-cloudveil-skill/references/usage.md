# 调用和维护

## 必要环境

任何真实调用前，先检查以下环境变量：

| 变量 | 作用 |
| --- | --- |
| `CLOUDVEIL_BASE_URL` | CloudVeil 服务器基础地址，例如 `https://cloudveil.example.com` |
| `CLOUDVEIL_ACCOUNT` | CloudVeil 登录账号 |
| `CLOUDVEIL_PASSWORD` | CloudVeil 登录密码 |

可选 token 头部覆盖项：

| 变量 | 默认值 |
| --- | --- |
| `CLOUDVEIL_TOKEN_HEADER` | `Authorization` |
| `CLOUDVEIL_TOKEN_PREFIX` | `Bearer ` |

不要把演示地址当成默认值。不要把账号、密码、访问 token 或加密后的凭证写入仓库文件。若用户在对话中直接提供凭证，只能用脱敏形式回显，例如 `abc***xyz`。

## 认证流程

`scripts/cloudveil-request.js` 实现的认证流程：

1. `GET /openapi/sso/api/v1/secret/getSecret`
2. 用返回的 `data.secret` 对 `CLOUDVEIL_ACCOUNT` 和 `CLOUDVEIL_PASSWORD` 做 SM2 加密
3. `POST /openapi/sso/api/v1/account/accountLogin`
4. 使用 `data.access_token` 调用目标 CloudVeil OpenAPI 接口

SM2 资源放在 `scripts/sm2encrypt/`。助手通过参数安全的 `execFile` 调用 wasm 运行时，不要改成 shell 字符串拼接。

演示文件没有说明登录后下游 token 头部的具体名字。当前助手默认使用 `Authorization: Bearer <access_token>`。如果官方文档明确规定了别的头部，请设置 `CLOUDVEIL_TOKEN_HEADER` 和 `CLOUDVEIL_TOKEN_PREFIX`，不要直接改脚本。

## 调用接口

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
  --body-json '{"sn":"ROBOT_SN","payload":{"type":"call"}}'
```

规则：

- 先检查环境就绪，再发起任何真实调用。
- 查询参数和 POST JSON body 必须从对应 OpenAPI asset 里拿，不能只靠自然语言猜字段名。
- GET 使用 `--param key=value` 拼 query；POST 可同时带 `--param` query 和 `--body-json` JSON 请求体。
- 成功条件必须同时满足 HTTP 状态码为 `200` 且响应 JSON 的 `message === "SUCCESS"`。
- 如果 HTTP 为 200 但 `message` 不是 `SUCCESS`，按业务失败处理。

## 维护校验

更新任一 `assets/*.openapi.json` 后，至少运行：

```bash
npm test
```

如需快速查看所有 asset 的规模：

```bash
for f in assets/*.openapi.json; do jq -r '"\(.info.title)\tpaths=\(.paths|keys|length)\tops=\([.paths[] | keys[]] | length)"' "$f"; done
```
