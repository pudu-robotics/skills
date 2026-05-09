# 控制指令

覆盖状态：Bundled endpoints covered. 已收录条目见下表；精确 query、JSON body、Schema 和响应结构以 `assets/control.openapi.json` 为准。未覆盖条目单独列在对应小节。

## 地图与位置

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 通知机器上报位置 | POST `/openapi/open-platform-service/v1/position_command` | `assets/control.openapi.json` |
| 切换地图 | POST `/openapi/open-platform-service/v1/switch_map` | `assets/control.openapi.json` |

## 舱门控制

覆盖状态：Not covered。

- 获取舱门拍照

## 一键回充

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 机器人一键回充 | GET `/openapi/open-platform-service/v1/recharge` | `assets/control.openapi.json` |
| 机器人一键回充V2 | GET `/openapi/open-platform-service/v2/recharge` | `assets/control.openapi.json` |

## NFC

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 获取刷卡记录 | GET `/openapi/open-platform-service/v1/swipe_card` | `assets/control.openapi.json` |

## 设备影子

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 更新机器功能列表 | POST `/openapi/open-platform-service/v1/robot/shadow/function_list` | `assets/control.openapi.json` |
