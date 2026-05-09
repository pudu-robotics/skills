# 云隐能力索引

先读这个索引，再只打开命中的详细文档。这样可以把 CloudVeil API 检索保持在很小的上下文里。

## 覆盖规则

- 先按业务分组打开详细文档，定位 method/path 和参考来源。
- 对于 `Covered` 或 `Bundled endpoints covered` 的接口，到 `assets/` 下的分组 OpenAPI JSON 查看精确参数、Schema、requestBody 和响应结构。
- 对于标记为 Not covered 的分组，不要编造路径或参数；请用户补充对应的 Swagger / OpenAPI 文档。

## 分组 OpenAPI JSON

| Asset file | Group | Paths | Methods |
| --- | --- | --- | --- |
| `assets/statistics.openapi.json` | 统计数据 | 48 | GET |
| `assets/common.openapi.json` | 通用接口 | 14 | GET, POST |
| `assets/robot-info.openapi.json` | 机器人信息 | 5 | GET |
| `assets/robot-tasks.openapi.json` | 机器人任务 | 18 | GET, POST |
| `assets/control.openapi.json` | 控制指令 | 6 | GET, POST |
| `assets/order-to-person.openapi.json` | 订单到人（试用版） | 23 | GET, POST |

## 详细参考

| Group | Detail file | Coverage |
| --- | --- | --- |
| 回调通知 | `references/capabilities-callbacks.md` | Not covered |
| 通用接口 | `references/capabilities-common.md` | Bundled endpoints covered by `assets/common.openapi.json` |
| 机器人信息 | `references/capabilities-robot-info.md` | Bundled endpoints covered by `assets/robot-info.openapi.json` |
| 机器人任务 | `references/capabilities-robot-tasks.md` | Bundled endpoints covered by `assets/robot-tasks.openapi.json` |
| 控制指令 | `references/capabilities-control.md` | Bundled endpoints covered by `assets/control.openapi.json` |
| 机器人调度 | `references/capabilities-dispatch.md` | Not covered |
| 统计数据 | `references/capabilities-statistics.md` | Covered by `assets/statistics.openapi.json` |
| 订单到人（试用版） | `references/capabilities-order-to-person.md` | Covered by `assets/order-to-person.openapi.json` |
