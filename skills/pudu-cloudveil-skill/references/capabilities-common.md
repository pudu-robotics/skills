# 通用接口

覆盖状态：Bundled endpoints covered. 已收录条目见下表；精确参数、Schema、requestBody 和响应结构以 `assets/common.openapi.json` 为准。未覆盖条目单独列在对应小节。

## 门店管理

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 云隐-获取门店列表 | GET `/openapi/data-open-platform-service/v1/api/shop` | `assets/common.openapi.json` |
| 云隐-门店机器列表 | GET `/openapi/data-open-platform-service/v1/api/robot` | `assets/common.openapi.json` |

## 地图信息

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 云隐-门店下地图列表 | GET `/openapi/data-open-platform-service/v1/api/maps` | `assets/common.openapi.json` |
| 云隐-机器可用地图列表 | GET `/openapi/map-service/v1/open/list` | `assets/common.openapi.json` |
| 云隐-机器当前使用地图 | GET `/openapi/map-service/v1/open/current` | `assets/common.openapi.json` |
| 云隐-获取地图详情 | GET `/openapi/data-open-platform-service/v2/api/map` | `assets/common.openapi.json` |
| 云隐-获取地图详情（公网同入口） | GET `/openapi/map-service/v1/open/map` | `assets/common.openapi.json` |
| 云隐-获取机器实时地图位置 | GET `/openapi/data-open-platform-service/v1/api/map/robotCurrentPosition` | `assets/common.openapi.json` |
| 云隐-获取机器当前位置（公网同入口） | GET `/openapi/open-platform-service/v1/robot/get_position` | `assets/common.openapi.json` |
| 云隐-获取机器当前使用地图的点位 | GET `/openapi/map-service/v1/open/point` | `assets/common.openapi.json` |
| 云隐-获取点位分组 | POST `/openapi/map-service/v1/open/group` | `assets/common.openapi.json` |

未覆盖：

- 云隐-绘制解析后的地图V2

## 机器人组

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 获取绑定的机器人组 | GET `/openapi/open-platform-service/v1/robot/group/list` | `assets/common.openapi.json` |
| 获取机器人组中的机器人 | GET `/openapi/open-platform-service/v1/robot/list_by_device_and_group` | `assets/common.openapi.json` |
