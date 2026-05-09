# 机器人任务

覆盖状态：Bundled endpoints covered. 已收录条目见下表；精确 query、JSON body、Schema 和响应结构以 `assets/robot-tasks.openapi.json` 为准。未覆盖条目单独列在对应小节。

## 呼叫机器人

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 云隐-发起呼叫任务 | POST `/openapi/open-platform-service/v1/custom_call` | `assets/robot-tasks.openapi.json` |
| 云隐-取消呼叫任务 | POST `/openapi/open-platform-service/v1/custom_call/cancel` | `assets/robot-tasks.openapi.json` |
| 云隐-完成呼叫任务 | POST `/openapi/open-platform-service/v1/custom_call/complete` | `assets/robot-tasks.openapi.json` |
| 云隐-发送自定义展示内容 | POST `/openapi/open-platform-service/v1/custom_content` | `assets/robot-tasks.openapi.json` |
| 云隐-获取呼叫列表 | GET `/openapi/open-platform-service/v1/call/list` | `assets/robot-tasks.openapi.json` |

## 配送任务

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 配送任务 | POST `/openapi/open-platform-service/v1/delivery_task` | `assets/robot-tasks.openapi.json` |
| 配送指令 | POST `/openapi/open-platform-service/v1/delivery_action` | `assets/robot-tasks.openapi.json` |
| 配送任务列表 | GET `/openapi/open-platform-service/v1/delivery/list` | `assets/robot-tasks.openapi.json` |

## 运送任务

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 运送任务 | POST `/openapi/open-platform-service/v1/transport_task` | `assets/robot-tasks.openapi.json` |
| 运送指令 | POST `/openapi/open-platform-service/v1/transport_action` | `assets/robot-tasks.openapi.json` |

## 跑腿任务

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 跑腿任务 | POST `/openapi/open-platform-service/v1/task_errand` | `assets/robot-tasks.openapi.json` |
| 跑腿任务控制指令 | POST `/openapi/open-platform-service/v1/errand_action` | `assets/robot-tasks.openapi.json` |
| 跑腿任务列表 | GET `/openapi/open-platform-service/v1/errand/list` | `assets/robot-tasks.openapi.json` |

## 顶升任务

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 顶升任务 | POST `/openapi/open-platform-service/v1/lifting_task` | `assets/robot-tasks.openapi.json` |
| 顶升任务控制指令 | POST `/openapi/open-platform-service/v1/lifting_action` | `assets/robot-tasks.openapi.json` |
| 顶升任务列表 | GET `/openapi/open-platform-service/v1/lifting/list` | `assets/robot-tasks.openapi.json` |

## 清洁任务

覆盖状态：Not covered。

- 清洁任务列表
- 清洁指令

## 托盘任务

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 给机器发送托盘推送任务 | POST `/openapi/open-platform-service/v1/tray_order` | `assets/robot-tasks.openapi.json` |

## 领位任务

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 给机器发送领位任务 | POST `/openapi/open-platform-service/v1/guide_task` | `assets/robot-tasks.openapi.json` |
