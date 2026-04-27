# Pudu OpenAPI 能力清单

## 说明

本清单用于描述 `pudu-openapi-skill` 当前覆盖的能力范围，帮助在接到用户请求时，快速判断：

- 应该落到哪个功能组
- 应该读取哪份 OpenAPI 规范
- 通常需要哪些关键参数
- 适合调用哪些代表接口

调用前置条件：

- 已获取 `ApiAppKey` / `ApiAppSecret`
- 已确定目标集群（`cn` / `sea` / `de` / `us`）
- 已明确用户是查询类请求还是任务/控制类请求

---

## 1. 机器人状态与信息查询

规范文件：`assets/01-robot-status.json`

典型场景：

- 查询机器人当前状态
- 查询机器人当前位置
- 查询机器人正在执行的任务
- 查询机器人组及组内机器人
- 查询任务调度日志

常见关键参数：

- `sn`
- `groupId`
- `device`
- `shopId`
- `taskIds`

代表接口：

- `GET /open-platform-service/v2/status/get_by_sn`
- `GET /open-platform-service/v2/status/get_by_group_id`
- `GET /open-platform-service/v1/robot/get_position`
- `GET /open-platform-service/v1/robot/task/state/get`
- `GET /open-platform-service/v1/robot/group/list`
- `POST /open-platform-service/v1/schedule_log/list`

---

## 2. 配送与运送任务

规范文件：`assets/02-delivery-transport.json`

典型场景：

- 下发标准配送任务
- 下发多目标点运送任务
- 取消、继续或干预配送/运送任务
- 查询配送任务列表

常见关键参数：

- `sn`
- `shopId`
- `taskId`
- `payload.type`
- `payload.trays`
- `payload.startPoint`

代表接口：

- `GET /open-platform-service/v1/delivery/list`
- `POST /open-platform-service/v1/delivery_task`
- `POST /open-platform-service/v1/delivery_action`
- `POST /open-platform-service/v1/transport_task`
- `POST /open-platform-service/v1/transport_action`

---

## 3. 跑腿任务

规范文件：`assets/03-errand.json`

典型场景：

- 下发跑腿模式任务
- 查询跑腿任务
- 对跑腿任务执行操作

常见关键参数：

- `sn`
- `shopId`
- `sessionId`
- `payload.tasks`
- `payload.auth`
- `payload.backMode`

代表接口：

- `GET /open-platform-service/v1/errand/list`
- `POST /open-platform-service/v1/task_errand`
- `POST /open-platform-service/v1/errand_action`

---

## 4. 顶升与托盘任务

规范文件：`assets/04-lifting-tray.json`

典型场景：

- 下发顶升任务
- 查询顶升任务
- 对顶升任务发送操作指令
- 给机器人托盘推送订单

常见关键参数：

- `sn`
- `shopId`
- `taskId`
- `payload.tasks`
- `payload.orders`
- `payload.trayIndex`

代表接口：

- `GET /open-platform-service/v1/lifting/list`
- `POST /open-platform-service/v1/lifting_task`
- `POST /open-platform-service/v1/lifting_action`
- `POST /open-platform-service/v1/tray_order`

---

## 5. 巡航与领位任务

规范文件：`assets/05-cruise-guide.json`

典型场景：

- 下发巡航任务
- 获取巡航线路
- 执行巡航操作
- 下发领位任务

常见关键参数：

- `sn`
- `taskId`
- `mapCruiseId`
- `mapCruiseName`
- `payload.trays`

代表接口：

- `POST /open-platform-service/v1/cruise_task`
- `POST /open-platform-service/v1/cruise_action`
- `GET /open-platform-service/v1/get_cruise_line`
- `POST /open-platform-service/v1/guide_task`

---

## 6. 呼叫任务

规范文件：`assets/06-call.json`

典型场景：

- 发起自定义呼叫
- 取消呼叫
- 完成呼叫
- 查询呼叫任务列表

常见关键参数：

- `sn`
- `shopId`
- `taskId`
- `callDeviceName`
- `point`
- `mapName`
- `robotGroupIds`

代表接口：

- `GET /open-platform-service/v1/call/list`
- `POST /open-platform-service/v1/custom_call`
- `POST /open-platform-service/v1/custom_call/cancel`
- `POST /open-platform-service/v1/custom_call/complete`

---

## 7. 闪电匣专属功能

规范文件：`assets/07-flash-cabinet.json`

典型场景：

- 查询货柜取货状态
- 控制舱门开关
- 按货道编号取货
- 查询舱门状态
- 电梯内切换楼层地图
- 设置机器人屏幕内容

常见关键参数：

- `sn`
- `payload.info`
- `payload.controlStates`
- `payload.tasks`
- `payload.map`

代表接口：

- `GET /open-platform-service/v1/cabinet/pick/state/get`
- `POST /open-platform-service/v1/robot/cabinet/pick`
- `GET /open-platform-service/v1/door_state`
- `POST /open-platform-service/v1/control_doors`
- `POST /open-platform-service/v1/cancel_task`
- `POST /open-platform-service/v1/robot/map/switch_in_elevator`
- `POST /open-platform-service/v1/robot/screen/set`

---

## 8. 内容、语音与媒体

规范文件：`assets/08-media-content.json`

典型场景：

- 给机器人发送自定义展示内容
- 查询语音列表
- 播放语音
- 执行语音动作
- 调整音量

常见关键参数：

- `sn`
- `taskId`
- `callMode`
- `modeData`
- `name`
- `action`
- `volume`

代表接口：

- `POST /open-platform-service/v1/custom_content`
- `GET /open-platform-service/v1/voice/list`
- `POST /open-platform-service/v1/voice/play`
- `POST /open-platform-service/v1/voice/action`
- `POST /open-platform-service/v1/volume/set`

---

## 9. 基础控制与数据上报

规范文件：`assets/09-control-reporting.json`

典型场景：

- 机器人一键回充
- 切换地图
- 开启/关闭位置上报
- 开启/关闭雷达上报
- 查询刷卡记录
- 上报交管区配置或结果

常见关键参数：

- `sn`
- `mapInfo`
- `interval`
- `times`
- `shopId`
- `areaId`
- `taskId`

代表接口：

- `GET /open-platform-service/v2/recharge`
- `POST /open-platform-service/v1/switch_map`
- `POST /open-platform-service/v1/position_command`
- `POST /open-platform-service/v1/position_closed`
- `POST /open-platform-service/v1/laser`
- `POST /open-platform-service/v1/laser_closed`
- `GET /open-platform-service/v1/swipe_card`
- `POST /open-platform-service/v1/traffic_control/config`
- `POST /open-platform-service/v1/traffic_control/action_result`

---

## 10. 清洁统计分析

规范文件：`assets/10-analysis-clean.json`

典型场景：

- 获取洗地、扫地等清洁模式的概览数据（折线、柱状图数据）
- 获取清洁模式 24 小时运行分布数据
- 分页查询清洁任务列表数据
- 获取详细的清洁报告列表和单次清洁报告详情

常见关键参数：

- `shopId`
- `robotId`
- `startTime`
- `endTime`

代表接口：

- `GET /data-board/v1/analysis/clean/mode`
- `GET /data-board/v1/analysis/clean/detail`
- `GET /data-board/v1/analysis/clean/paging`

---

## 11. 通用统计分析

规范文件：`assets/11-analysis-common.json`

典型场景：

- 机器概览：运行总览和分页列表数据
- 门店概览：门店运行分析折线和柱状图数据

常见关键参数：

- `shopId`
- `robotId`
- `startTime`
- `endTime`

代表接口：

- `GET /data-board/v1/analysis/run`
- `GET /data-board/v1/analysis/run/paging`
- `GET /data-board/v1/analysis/shop`

---

## 12. 配送统计分析

规范文件：`assets/12-analysis-delivery.json`

典型场景：

- 广告、呼叫、巡航、配送、领位、宫格、互动、回盘、揽客等各类模式的汇总（折线/柱状图）数据查询
- 获取上述各模式的运行明细数据（分页列表）

常见关键参数：

- `shopId`
- `robotId`
- `startTime`
- `endTime`

代表接口：

- `GET /data-board/v1/analysis/task/ad`
- `GET /data-board/v1/analysis/task/call`
- `GET /data-board/v1/analysis/task/delivery`

---

## 13. 行业统计分析

规范文件：`assets/13-analysis-industry.json`

典型场景：

- 获取顶升等专门行业场景的任务总览及图表数据
- 分页查询顶升任务的明细列表数据

常见关键参数：

- `shopId`
- `robotId`
- `startTime`
- `endTime`

代表接口：

- `GET /data-board/v1/analysis/task/lifting`
- `GET /data-board/v1/analysis/task/lifting/paging`

---

## 14. 概览数据

规范文件：`assets/14-brief.json`

典型场景：

- 机器整体概览数据
- 机器运行大盘数据
- 门店核心运行概览

常见关键参数：

- `shopId`
- `robotId`
- `startTime`
- `endTime`

代表接口：

- `GET /data-board/v1/brief/robot`
- `GET /data-board/v1/brief/run`
- `GET /data-board/v1/brief/shop`

---

## 15. 日志与上报记录

规范文件：`assets/15-log.json`

典型场景：

- 开机自检记录查询
- 电池健康筛选及充电记录查询
- 故障与事件列表查询

常见关键参数：

- `shopId`
- `robotId`
- `startTime`
- `endTime`

代表接口：

- `GET /data-board/v1/log/boot/query_list`
- `GET /data-board/v1/log/battery/query_list`
- `GET /data-board/v1/log/charge/query_list`

---

## 16. 任务调度与历史

规范文件：`assets/16-tasks.json`

典型场景：

- 呼叫、巡航、配送、领位、顶升、回盘等任务的目的地执行明细
- 追溯具体任务在各个业务点的详细时间轴及结果

常见关键参数：

- `shopId`
- `robotId`
- `taskId`

代表接口：

- `GET /data-board/v1/task/call`
- `GET /data-board/v1/task/cruise`
- `GET /data-board/v1/task/delivery`

---

## 选型建议

当用户提出需求时，优先按下面的方式判断：

- “查状态 / 查位置 / 查任务进度” → `01-robot-status.json`
- “下发配送 / 运送 / 多点任务” → `02-delivery-transport.json`
- “跑腿模式” → `03-errand.json`
- “顶升 / 托盘订单” → `04-lifting-tray.json`
- “巡航 / 领位” → `05-cruise-guide.json`
- “呼叫机器人” → `06-call.json`
- “闪电匣 / 货柜 / 舱门” → `07-flash-cabinet.json`
- “语音 / 屏幕 / 媒体内容” → `08-media-content.json`
- “回充 / 切图 / 位置上报 / 雷达 / 交管” → `09-control-reporting.json`
- “清洁统计分析” → `10-analysis-clean.json`
- “通用统计分析” → `11-analysis-common.json`
- “配送统计分析” → `12-analysis-delivery.json`
- “行业统计分析” → `13-analysis-industry.json`
- “概览数据” → `14-brief.json`
- “日志与上报记录” → `15-log.json`
- “任务调度与历史” → `16-tasks.json`

若一个需求同时涉及查询和控制，优先拆成两步：

1. 先调用查询接口确认当前状态
2. 再调用控制或任务接口执行动作
