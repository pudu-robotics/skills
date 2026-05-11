# CloudVeil OpenAPI 能力清单

## 说明

本清单用于在接到用户请求时快速判断：

- 应该落到哪个功能组
- 应该读取哪份 OpenAPI asset
- 通常需要哪些关键参数
- 适合调用哪些代表接口

调用前置条件：

- 已检查 `CLOUDVEIL_BASE_URL` / `CLOUDVEIL_ACCOUNT` / `CLOUDVEIL_PASSWORD`
- 已通过 `references/request-sdk.md` 理解 SSO/SM2 认证流程
- 已明确用户是查询类请求、任务下发、控制指令、统计查询还是订单到人操作

精确参数、Schema、requestBody 和响应结构必须回到对应 `assets/*.openapi.json` 查看。

---

## 1. 通用接口

规范文件：`assets/common.openapi.json`

详细文档：`references/capabilities-common.md`

覆盖状态：Bundled endpoints covered by `assets/common.openapi.json`。

典型场景：

- 查询门店列表、门店机器列表
- 查询门店地图、机器可用地图、当前地图
- 查询地图详情、点位、点位分组
- 查询机器人当前位置
- 查询机器人组和组内机器人

常见关键参数：

- `shopId`
- `sn`
- `groupId`
- `device`
- `mapName`
- `needElement`
- `offset`
- `limit`

代表接口：

- `GET /openapi/data-open-platform-service/v1/api/shop`
- `GET /openapi/data-open-platform-service/v1/api/robot`
- `GET /openapi/map-service/v1/open/current`
- `GET /openapi/open-platform-service/v1/robot/get_position`
- `POST /openapi/map-service/v1/open/group`

未覆盖条目见 `references/capabilities-common.md`。

## 2. 机器人信息

规范文件：`assets/robot-info.openapi.json`

详细文档：`references/capabilities-robot-info.md`

覆盖状态：Bundled endpoints covered。

典型场景：

- 查询指定机器人状态
- 查询机器人组中的机器人状态
- 查询机器人当前执行任务状态

常见关键参数：

- `sn`
- `mac`
- `groupId`

代表接口：

- `GET /openapi/open-platform-service/v2/status/get_by_sn`
- `GET /openapi/open-platform-service/v2/status/get_by_group_id`
- `GET /openapi/open-platform-service/v1/robot/task/state/get`

未覆盖条目见 `references/capabilities-robot-info.md`。

## 3. 机器人任务

规范文件：`assets/robot-tasks.openapi.json`

详细文档：`references/capabilities-robot-tasks.md`

覆盖状态：Bundled endpoints covered。

典型场景：

- 发起、取消、完成呼叫任务
- 下发配送、运送、跑腿、顶升任务
- 对任务发送控制指令
- 查询呼叫、配送、跑腿、顶升任务列表
- 下发托盘推送任务或领位任务

常见关键参数：

- `sn`
- `shopId`
- `taskId`
- `payload`
- `point`
- `mapName`
- `sessionId`
- `offset`
- `limit`

代表接口：

- `POST /openapi/open-platform-service/v1/custom_call`
- `POST /openapi/open-platform-service/v1/delivery_task`
- `POST /openapi/open-platform-service/v1/transport_task`
- `POST /openapi/open-platform-service/v1/task_errand`
- `POST /openapi/open-platform-service/v1/lifting_task`
- `GET /openapi/open-platform-service/v1/delivery/list`

未覆盖条目见 `references/capabilities-robot-tasks.md`。

## 4. 控制指令

规范文件：`assets/control.openapi.json`

详细文档：`references/capabilities-control.md`

覆盖状态：Bundled endpoints covered。

典型场景：

- 通知机器上报位置
- 切换地图
- 一键回充
- 查询刷卡记录
- 更新机器功能列表

常见关键参数：

- `sn`
- `payload.interval`
- `payload.times`
- `payload.source`
- `mapInfo.mapName`
- `mapInfo.mapCode`
- `shopFunctions[].shopId`
- `shopFunctions[].functionList`
- `taskId`
- `taskType`
- `offset`
- `limit`

代表接口：

- `POST /openapi/open-platform-service/v1/position_command`
- `POST /openapi/open-platform-service/v1/switch_map`
- `GET /openapi/open-platform-service/v2/recharge`
- `GET /openapi/open-platform-service/v1/swipe_card`
- `POST /openapi/open-platform-service/v1/robot/shadow/function_list`

未覆盖条目见 `references/capabilities-control.md`。

## 5. 统计数据

规范文件：`assets/statistics.openapi.json`

详细文档：`references/capabilities-statistics.md`

覆盖状态：Covered。

典型场景：

- 查询门店、机器、运行概览
- 查询门店分析、运行分析、任务模式分析
- 查询任务明细
- 查询清洁报告和设备日志

常见关键参数：

- `timezone_offset`
- `start_time`
- `end_time`
- `shop_id`
- `limit`
- `offset`

代表接口：

- `GET /openapi/data-board/v1/brief/shop`
- `GET /openapi/data-board/v1/brief/robot`
- `GET /openapi/data-board/v1/analysis/run`
- `GET /openapi/data-board/v1/analysis/task/delivery`
- `GET /openapi/data-board/v1/log/error/query_list`

## 6. 订单到人（试用版）

规范文件：`assets/order-to-person.openapi.json`

详细文档：`references/capabilities-order-to-person.md`

覆盖状态：Covered。

典型场景：

- 导入、取消、查询订单任务
- 获取或更新托盘配置
- 锁定或解锁巷道
- PDA 监听区域配置
- 拣货领取和完成
- 批次任务领取、取消、完成、交接和查询
- 查询货位地图点映射

常见关键参数：

- `order_id`
- `shop_id`
- `map_name`
- `sn`
- `batch_id`
- `barcode`
- `warehouse_id`

代表接口：

- `POST /openapi/order_to_user/v1/order/import`
- `GET /openapi/order_to_user/v1/order/query`
- `GET /openapi/order_to_user/v1/config/tray`
- `POST /openapi/order_to_user/v1/aisle/batch_lock`
- `POST /openapi/order_to_user/v1/batch/assign`
- `GET /openapi/order_to_user/v1/batch/query`
- `GET /openapi/order_to_user/v1/warehouse/query_points`

## 7. 回调通知

规范文件：Not covered

详细文档：`references/capabilities-callbacks.md`

覆盖状态：Not covered。回调通知为被动接收，无主动调用接口。需要具体回调参数时，读取详细文档里的页面 URL 或补充对应 OpenAPI 文档。

典型场景：

- 机器状态回调
- 地图与位置回调
- 任务执行回调
- 硬件控制与感知回调

## 8. 机器人调度

规范文件：Not covered

详细文档：`references/capabilities-dispatch.md`

覆盖状态：Not covered。当前未收录交管区 / 调度接口。实现或调用前，请用户补充对应 OpenAPI 文档。
