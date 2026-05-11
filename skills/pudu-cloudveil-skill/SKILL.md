---
name: pudu-cloudveil-skill
description: Use when working with PUDU CloudVeil / 云隐 OpenAPI, SSO, SM2, data board statistics, robot maps, robot status, robot tasks, robot control, callbacks, dispatch, order-to-person, or assets/*.openapi.json.
---

# 云隐 CloudVeil Skill

## 工作流

```
1. 检查环境        → 确认 CLOUDVEIL_BASE_URL / CLOUDVEIL_ACCOUNT / CLOUDVEIL_PASSWORD
2. 认证            → 使用 SSO getSecret + SM2 加密 + accountLogin 获取 access_token
3. 理解意图        → 定位功能组 → 读取 references/capabilities.md 和命中的分组文档
4. 构建并执行请求  → 从 assets/*.openapi.json 读取 method、query、requestBody、schema
5. 展示结果        → 200 且 message === "SUCCESS" 视为成功，否则按失败展示
```

---

## 第一步：检查环境

任何真实调用前，先读取 `references/request-sdk.md` 并检查：

| 变量 | 作用 |
| --- | --- |
| `CLOUDVEIL_BASE_URL` | CloudVeil 服务器基础地址，例如 `https://cloudveil.example.com` |
| `CLOUDVEIL_ACCOUNT` | CloudVeil 登录账号 |
| `CLOUDVEIL_PASSWORD` | CloudVeil 登录密码 |

若缺少任一变量，停止执行并提示用户补齐。不要默认演示地址，不要把账号、密码、访问 token 或加密后的凭证写入仓库文件。

## 第二步：认证

CloudVeil 使用 SSO/SM2 登录流程：

1. `GET /openapi/sso/api/v1/secret/getSecret`
2. 用返回的 `data.secret` 对 `CLOUDVEIL_ACCOUNT` 和 `CLOUDVEIL_PASSWORD` 做 SM2 加密
3. `POST /openapi/sso/api/v1/account/accountLogin`
4. 使用 `data.access_token` 调用目标 OpenAPI

具体调用规则、token 头部覆盖项和 `scripts/cloudveil-request.js` 用法见 `references/request-sdk.md`。

## 第三步：理解意图并定位接口

先读 `references/capabilities.md`，根据用户描述定位功能组，再只打开命中的分组文档和 asset。

| 功能组 | 详细文档 | OpenAPI asset | 典型场景 |
| --- | --- | --- | --- |
| 通用接口 | `references/capabilities-common.md` | `assets/common.openapi.json` | 门店、地图、机器人组、位置 |
| 机器人信息 | `references/capabilities-robot-info.md` | `assets/robot-info.openapi.json` | 机器人状态、任务状态 |
| 机器人任务 | `references/capabilities-robot-tasks.md` | `assets/robot-tasks.openapi.json` | 呼叫、配送、运送、跑腿、顶升、托盘、领位 |
| 控制指令 | `references/capabilities-control.md` | `assets/control.openapi.json` | 位置上报、切图、一键回充、刷卡、设备影子 |
| 统计数据 | `references/capabilities-statistics.md` | `assets/statistics.openapi.json` | 数据看板、分析、任务明细、日志 |
| 订单到人（试用版） | `references/capabilities-order-to-person.md` | `assets/order-to-person.openapi.json` | 订单、托盘配置、巷道、拣货、批次、仓库 |
| 回调通知 | `references/capabilities-callbacks.md` | Not covered | 被动回调参数说明 |
| 机器人调度 | `references/capabilities-dispatch.md` | Not covered | 交管区 / 调度接口 |

标记为 Not covered 的分组没有 bundled OpenAPI asset。不要编造路径、参数、回调或请求体。

## 第四步：构建并执行请求

从对应 `assets/*.openapi.json` 读取精确 method、query 参数、JSON requestBody、Schema 和响应结构。不要只靠自然语言猜字段名。

大范围查找时优先用 `jq` 或 `rg`，不要把整份 asset 加载进上下文：

```bash
jq -r '.paths | keys[]' assets/robot-tasks.openapi.json
jq '.paths["/openapi/open-platform-service/v1/custom_call"].post.requestBody' assets/robot-tasks.openapi.json
jq '.paths["/openapi/data-board/v1/brief/shop"].get.parameters' assets/statistics.openapi.json
jq '.paths["/openapi/order_to_user/v1/order/import"].post.requestBody' assets/order-to-person.openapi.json
```

真实调用使用：

```bash
node scripts/cloudveil-request.js --path <api-path> [--method GET|POST] [--param key=value] [--body-json '<json>']
```

## 第五步：展示结果

成功必须同时满足：

1. HTTP 状态码为 `200`
2. 响应 JSON 的 `message === "SUCCESS"`

如果 HTTP 为 200 但 `message` 不是 `SUCCESS`，按业务失败处理。展示结果时保留接口、method、关键参数和返回 JSON；凭证、token、密码和 SM2 加密结果只能脱敏显示。

## 常用接口速查

```text
# 机器人状态
GET /openapi/open-platform-service/v2/status/get_by_sn
GET /openapi/open-platform-service/v2/status/get_by_group_id

# 地图与位置
GET /openapi/map-service/v1/open/current
GET /openapi/open-platform-service/v1/robot/get_position
POST /openapi/map-service/v1/open/group

# 任务
POST /openapi/open-platform-service/v1/custom_call
POST /openapi/open-platform-service/v1/delivery_task
POST /openapi/open-platform-service/v1/transport_task
POST /openapi/open-platform-service/v1/task_errand
POST /openapi/open-platform-service/v1/lifting_task

# 控制
GET /openapi/open-platform-service/v2/recharge
POST /openapi/open-platform-service/v1/switch_map

# 统计
GET /openapi/data-board/v1/brief/shop
GET /openapi/data-board/v1/analysis/run

# 订单到人
POST /openapi/order_to_user/v1/order/import
GET /openapi/order_to_user/v1/batch/query
GET /openapi/order_to_user/v1/warehouse/query_points
```
