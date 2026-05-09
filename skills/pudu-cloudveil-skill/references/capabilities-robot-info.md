# 机器人信息

覆盖状态：Bundled endpoints covered. 已收录条目见下表；精确参数和响应结构以 `assets/robot-info.openapi.json` 为准。未覆盖条目单独列在对应小节。

## 机器人通用状态查询

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 云隐-获取指定机器人状态 | GET `/openapi/open-platform-service/v1/status/get_by_sn` | `assets/robot-info.openapi.json` |
| 云隐-获取指定机器人状态V2 | GET `/openapi/open-platform-service/v2/status/get_by_sn` | `assets/robot-info.openapi.json` |
| 云隐-获取组中机器人状态 | GET `/openapi/open-platform-service/v1/status/get_by_group_id` | `assets/robot-info.openapi.json` |
| 云隐-获取组中机器人状态V2 | GET `/openapi/open-platform-service/v2/status/get_by_group_id` | `assets/robot-info.openapi.json` |

## 机器人当前执行任务状态

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 获取当前机器执行任务状态 | GET `/openapi/open-platform-service/v1/robot/task/state/get` | `assets/robot-info.openapi.json` |

## 机器人详情

已收录的机器列表和位置接口在 `capabilities-common.md` 的门店管理、地图信息分组中。以下条目仍未覆盖：

- 云隐-获取清洁机器状态详情
