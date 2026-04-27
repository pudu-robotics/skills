---
name: pudu-openapi-skill
description: >-
  调用普渡机器人 (Pudu) 云端 OpenAPI，支持机器人任务下发、状态查询、配送、巡航、呼叫以及统计数据分析等操作。
  使用时先检查凭证和集群环境变量，若缺失则提示用户补充，再根据用户意图调用对应接口并展示结果。
  触发场景：用户提到"普渡机器人"、"pudu"、"机器人下发任务"、"查询机器人状态"、"配送任务"、
  "巡航任务"、"呼叫机器人"、"顶升任务"、"跑腿"、"闪电匣"、"统计数据"、"大盘概览"、"OpenAPI"等关键词时使用此 skill。
---

# Pudu OpenAPI Skill

## 工作流

```
1. 检查凭证        → 读取 / 提示 ApiAppKey & ApiAppSecret
2. 确认集群        → 读取 PUDU_API_CLUSTER；若缺失，必须询问用户选择，禁止默认任意集群 → 确定 BASE_URL
3. 理解用户意图    → 定位功能组 → 读取对应 assets/*.json
4. 构建并执行请求  → 按环境优先级执行脚本 (js -> py -> go -> java -> cs)
5. 展示结果        → 200 且 message=SUCCESS 美化输出，否则输出错误原因
```

---

## 第一步：检查凭证

优先从环境变量读取：

| 变量名 | 说明 |
|--------|------|
| `PUDU_API_APP_KEY` | ApiAppKey |
| `PUDU_API_APP_SECRET` | ApiAppSecret |

**若任意变量缺失**，停止执行并提示：

> 缺少以下凭证，请通过以下任一方式提供：
>
> **方式一（推荐）：设置环境变量**
> ```bash
> export PUDU_API_APP_KEY="your-key"
> export PUDU_API_APP_SECRET="your-secret"
> ```
>
> **方式二：直接告诉我**
> 请输入您的 ApiAppKey 和 ApiAppSecret。
>
> **如果您还没有凭证**
> 请访问 [普渡开放平台快速开始](https://open.pudutech.com/zh/cloud-api/gjq71a2i4qzpgk0t2ooe3vi7) 按照教程申请。

两项均确认后方可继续。

### 敏感凭证处理规则

- 优先建议用户通过环境变量提供凭证，而不是直接在对话中粘贴
- 若用户直接提供 `ApiAppSecret`，不要在回复、日志、报错、示例代码中回显完整值
- 不要将用户提供的 `ApiAppKey` / `ApiAppSecret` 写入仓库文件、脚本常量或示例代码
- 在排查问题时，只允许使用脱敏后的形式展示，例如 `abc***xyz`

---

## 第二步：确认集群

优先读取环境变量 `PUDU_API_CLUSTER`，取值映射如下：

| 环境变量值 | 集群 | hostname |
|------------|------|----------|
| `cn` | 国内生产节点 | `open-platform.pudutech.com` |
| `sea` | 海外（日韩新加坡）生产节点 | `css-open-platform.pudutech.com` |
| `de` | 德国生产节点 | `csg-open-platform.pudutech.com` |
| `us` | 美国生产节点 | `csu-open-platform.pudutech.com` |

**若环境变量未设置、为空，或当前上下文中无法明确判断集群**，必须使用 AskQuestion 工具让用户明确选择集群。

**严禁**在未获得用户确认时默认选择任意集群（包括但不限于默认使用 `cn`）。

在用户完成选择后，再提示可通过以下方式固化设置：

```bash
export PUDU_API_CLUSTER="cn"   # cn / sea / de / us
```

所有接口请求的完整 URL 格式：
```
https://{hostname}/pudu-entry{path}
```

---

## 第三步：理解意图 → 定位接口

根据用户描述，定位功能组并**读取对应规范文件**获取接口的路径、参数和请求体结构：

| 功能组 | 规范文件 | 典型场景 |
|--------|----------|----------|
| 机器人状态与信息查询 | `assets/01-robot-status.json` | 查状态、位置、任务状态 |
| 配送与运送任务 | `assets/02-delivery-transport.json` | 下发配送任务、多点运送 |
| 跑腿任务 | `assets/03-errand.json` | 跑腿模式任务 |
| 顶升与托盘任务 | `assets/04-lifting-tray.json` | 顶升机器人任务、托盘订单 |
| 巡航与领位任务 | `assets/05-cruise-guide.json` | 巡逻、迎宾引导 |
| 呼叫任务 | `assets/06-call.json` | 自定义呼叫机器人 |
| 闪电匣专属功能 | `assets/07-flash-cabinet.json` | 货柜取货、舱门控制 |
| 内容、语音与媒体 | `assets/08-media-content.json` | 屏幕展示、语音播报、音量 |
| 基础控制与数据上报 | `assets/09-control-reporting.json` | 充电、切换地图、位置上报、交通管控 |
| 清洁统计分析 | `assets/10-analysis-clean.json` | 洗地、扫地等清洁模式图表及分页数据 |
| 通用统计分析 | `assets/11-analysis-common.json` | 机器概览、门店概览与运行分析数据 |
| 配送统计分析 | `assets/12-analysis-delivery.json` | 配送、呼叫、巡航等模式明细与图表数据 |
| 行业统计分析 | `assets/13-analysis-industry.json` | 顶升等行业任务的统计明细及图表数据 |
| 简报数据 | `assets/14-brief.json` | 门店和机器核心运行大盘数据 |
| 日志与上报记录 | `assets/15-log.json` | 开机自检、电池充电、故障事件等列表查询 |
| 任务调度与历史 | `assets/16-tasks.json` | 呼叫、配送等任务的目的地执行明细与时间轴 |
| 门店与基础数据 | `assets/17-shop-data.json` | 门店列表查询、机器列表查询 |
| 地图服务 | `assets/18-map-service.json` | 获取地图列表、地图详情、当前地图、点位信息、点位分组、地图底图 |

完整能力范围、典型场景和代表接口请参考：`references/capabilities.md`

---

## 第四步：构建并执行请求

构建参数并执行请求脚本。脚本执行优先级如下，当因为环境问题无法执行当前脚本时（如没有安装 Node.js），则依次向下尝试下一个脚本：
1. `scripts/pudu-request.js`
2. `scripts/pudu-request.py`
3. `scripts/pudu-request.go`
4. `scripts/pudu-request.java`
5. `scripts/pudu-request.cs`

示例（以执行 `pudu-request.js` 为例）：

```js
const { request } = require("./scripts/pudu-request");

const result = await request({
  cluster:      process.env.PUDU_API_CLUSTER,   // 或显式传入 "cn" / "sea" / "de" / "us"
  path:         "/pudu-entry<从规范文件读取的 path>",
  method:       "<GET 或 POST>",
  params:       { /* 从用户 prompt 和规范文件提取参数 */ },
  apiAppKey:    process.env.PUDU_API_APP_KEY,
  apiAppSecret: process.env.PUDU_API_APP_SECRET,
});

if (result.ok) {
  console.log(result.json);
} else {
  console.error(result.errorMessage);
}
```

说明：

- `request()` 会优先读取环境变量中的 `PUDU_API_APP_KEY`、`PUDU_API_APP_SECRET`、`PUDU_API_CLUSTER`
- 若显式传入 `apiAppKey` / `apiAppSecret` / `cluster` / `hostname`，则以显式参数为准
- `path` 需包含 `/pudu-entry` 前缀，例如：`/pudu-entry/open-platform-service/v2/status/get_by_sn` （如果接口是针对 `/data-board` 的统计接口，路径也会是类似 `/pudu-entry/data-board/v1/analysis/run` 等，具体以规范文件为准）
- `params` 需要根据用户 prompt 和 OpenAPI 规范文件共同构建，不能只靠自然语言猜测字段
- 当接口需要 `sn` 时，若用户传入的值形如 `14:80:CC:89:27:A6`，应判断为 MAC 地址而非 SN，并主动提醒用户改为提供真实机器人 SN

---

## 第五步：展示结果

### 成功判定规则

只有同时满足以下条件才表示成功：

1. HTTP 状态码为 `200`
2. 返回结果中的 `message === "SUCCESS"`

成功响应示例：

```json
{
  "data": {
    "count": 110,
    "list": [
      {
        "company_id": "13947",
        "company_name": "chixzdls_internal02二级代理商",
        "shop_id": "324100000",
        "shop_name": "【10月08日】出尘门店"
      },
      {
        "company_id": "13947",
        "company_name": "chixzdls_internal02二级代理商",
        "shop_id": "325300001",
        "shop_name": "闪电匣和很多葫芦"
      }
    ]
  },
  "message": "SUCCESS",
  "trace_id": "YourApiAppKey_405eb004-7f09-4d86-bff1-4657cdec2717"
}
```

### 判定成功时的展示方式

将 `body` 解析为 JSON 并美化展示：

```
✅ 调用成功

接口：GET /open-platform-service/v2/status/get_by_sn
集群：国内生产节点

{
  "message": "SUCCESS",
  "data": {
    "sn": "robot-001",
    "runState": "IDLE",
    "battery": 85,
    ...
  }
}
```

### 判定失败时的展示方式

以下任一情况都视为失败：

- HTTP 状态码非 `200`
- HTTP 状态码为 `200`，但 `message !== "SUCCESS"`

解析错误信息并输出：

```
❌ 调用失败（HTTP 401）

接口：GET /open-platform-service/v2/status/get_by_sn

错误原因：Unauthorized — ApiAppKey 或签名验证失败，请检查凭证是否正确。
```

常见错误码参考：

| HTTP 状态码 | 含义 | 处理建议 |
|-------------|------|----------|
| 401 | 签名验证失败 | 检查 ApiAppKey / ApiAppSecret 是否正确 |
| 403 | 无权限 | 确认接口是否已开通 |
| 404 | 接口路径不存在 | 检查 path 和集群是否匹配 |
| 500 | 服务端错误 | 重试或联系普渡技术支持 |

---

## 常用接口速查

```
# 查询机器人状态（推荐 v2）
GET /open-platform-service/v2/status/get_by_sn?sn={sn}
GET /open-platform-service/v1/status/get_by_group_id?groupId={groupId}

# 下发任务
POST /open-platform-service/v1/delivery_task
POST /open-platform-service/v1/transport_task

# 一键回充（推荐 v2）
GET /open-platform-service/v2/recharge?sn={sn}

# 呼叫机器人
POST /open-platform-service/v1/custom_call

# 查询机器运行概览和分析
GET /data-board/v1/brief/run?shopId={shopId}
GET /data-board/v1/analysis/run?shopId={shopId}
```

---

## 注意事项

- v2 接口优先于 v1（`status/get_by_sn`、`recharge`），状态字段更简洁
- 标注 `(闪电匣)` 的接口仅适用于带货柜的机器人型号
- `sn` 为机器人序列号，`shopId` 为门店 ID，是最常用的标识字段
- MAC 地址常见格式为 `14:80:CC:89:27:A6`；若接口要求 `sn`，不能直接用 MAC 地址替代
- 巡航、顶升等任务有对应的 `*_action` 接口用于暂停/继续/取消
- 如果用户有编写Open API请求 sdk 的意图，根据用户指定的编程语言，参考 `references/request-sdk.md`，输出对应语言的标准实现范例。