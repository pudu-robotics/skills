---
name: pudu-cloudveil-skill
description: Use when working with PUDU CloudVeil / 云隐 OpenAPI, SSO, SM2, data board statistics, robot maps, robot status, robot tasks, robot control, callbacks, dispatch, order-to-person, or assets/*.openapi.json.
---

# 云隐 CloudVeil Skill

用于定位 CloudVeil 已收录接口、读取精确 OpenAPI 参数，并在环境就绪后发起 GET/POST 调用。

## 接口分类导航

当用户询问有哪些接口，或描述业务能力时，先读 `references/capabilities.md`。它是一个索引，只指向更小的分组文档；只打开命中的那一份，减少上下文消耗。

详细参考文件：

- `references/capabilities-callbacks.md` - 回调通知
- `references/capabilities-common.md` - 通用接口
- `references/capabilities-robot-info.md` - 机器人信息
- `references/capabilities-robot-tasks.md` - 机器人任务
- `references/capabilities-control.md` - 控制指令
- `references/capabilities-dispatch.md` - 机器人调度
- `references/capabilities-statistics.md` - 统计数据
- `references/capabilities-order-to-person.md` - 订单到人（试用版）
- `references/usage.md` - 环境变量、SSO/SM2 认证、调用命令和维护校验

当前已收录六类分组 OpenAPI JSON，面向调用和查参数时优先使用 `assets/` 下的文件：

- `assets/statistics.openapi.json` - 统计数据，48 个 GET 接口。
- `assets/common.openapi.json` - 通用接口，14 个 GET/POST 接口。
- `assets/robot-info.openapi.json` - 机器人信息，5 个 GET 接口。
- `assets/robot-tasks.openapi.json` - 机器人任务，18 个 GET/POST 接口。
- `assets/control.openapi.json` - 控制指令，6 个 GET/POST 接口。
- `assets/order-to-person.openapi.json` - 订单到人（试用版），23 个 path / 25 个 GET/POST operation。

若用户询问标记为 Not covered 的分组，就明确说明本 skill 还没有对应的 API 定义，并请用户补充匹配的 Swagger / OpenAPI 文档。不要凭空编造路径、参数、回调或请求体。

## OpenAPI 参考

先用 `references/capabilities.md` 找到对应分组，再打开命中的分组文档。分组文档只列出业务标题、method/path 和参考来源；精确参数、Schema、requestBody 和响应结构必须回到对应 `assets/*.openapi.json` 分组文件查看。

大范围查找时，优先用 `jq` 或 `rg`，不要把整份文件全部加载进上下文。示例：

```bash
jq -r '.paths | keys[]' assets/robot-tasks.openapi.json
jq '.paths["/openapi/open-platform-service/v1/custom_call"].post.requestBody' assets/robot-tasks.openapi.json
jq '.paths["/openapi/data-board/v1/brief/shop"].get.parameters' assets/statistics.openapi.json
jq '.paths["/openapi/order_to_user/v1/order/import"].post.requestBody' assets/order-to-person.openapi.json
```

## 调用和维护

任何真实调用前，先读 `references/usage.md`。查询参数和 POST JSON body 必须从对应 OpenAPI asset 里拿，不能只靠自然语言猜字段名。
