# 订单到人（试用版）

覆盖状态：Covered。已收录到 `assets/order-to-person.openapi.json`；精确 query、JSON body、Schema 和响应结构以该 asset 为准。

支持机型：PuduT300。

## 订单管理接口

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 任务取消撤回 | POST `/openapi/order_to_user/v1/order/cancel` | `assets/order-to-person.openapi.json` |
| 任务池导入 | POST `/openapi/order_to_user/v1/order/import` | `assets/order-to-person.openapi.json` |
| 任务状态查询 | GET `/openapi/order_to_user/v1/order/query` | `assets/order-to-person.openapi.json` |

## 系统配置接口

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 获取托盘配置 | GET `/openapi/order_to_user/v1/config/tray` | `assets/order-to-person.openapi.json` |
| 更新托盘配置 | POST `/openapi/order_to_user/v1/config/tray` | `assets/order-to-person.openapi.json` |

## 机器人管理接口

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 巷道批量锁定/解锁 | POST `/openapi/order_to_user/v1/aisle/batch_lock` | `assets/order-to-person.openapi.json` |
| 查询地图内巷道列表 | GET `/openapi/order_to_user/v1/aisle/list` | `assets/order-to-person.openapi.json` |
| 提前抵达 | POST `/openapi/order_to_user/v1/early_arrival` | `assets/order-to-person.openapi.json` |
| 获取PDA监听区域配置 | GET `/openapi/order_to_user/v1/pda/subscribe_config` | `assets/order-to-person.openapi.json` |
| 更新PDA监听区域配置 | POST `/openapi/order_to_user/v1/pda/subscribe_config` | `assets/order-to-person.openapi.json` |
| 区域内机器人搜索 | POST `/openapi/order_to_user/v1/robot/search` | `assets/order-to-person.openapi.json` |
| 机器人特殊配置查询 | GET `/openapi/order_to_user/v1/order/sconf_read` | `assets/order-to-person.openapi.json` |

## 拣货操作接口

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 当前拣货单查询 | GET `/openapi/order_to_user/v1/current_pick/query` | `assets/order-to-person.openapi.json` |
| 拣货点领取拣货单 | POST `/openapi/order_to_user/v1/pick/assign` | `assets/order-to-person.openapi.json` |
| 拣货点完成拣货 | POST `/openapi/order_to_user/v1/pick/picked` | `assets/order-to-person.openapi.json` |

## 批次任务管理接口

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 批次任务领取 | POST `/openapi/order_to_user/v1/batch/assign` | `assets/order-to-person.openapi.json` |
| 批次任务取消撤回 | POST `/openapi/order_to_user/v1/batch/cancel` | `assets/order-to-person.openapi.json` |
| 手动触发换绑 | POST `/openapi/order_to_user/v1/batch/error_stop` | `assets/order-to-person.openapi.json` |
| 批次任务完成 | POST `/openapi/order_to_user/v1/batch/finish` | `assets/order-to-person.openapi.json` |
| 根据容器号查询商品列表 | POST `/openapi/order_to_user/v1/batch/goods_by_barcode` | `assets/order-to-person.openapi.json` |
| 批次任务交接确认 | POST `/openapi/order_to_user/v1/batch/handover/confirm` | `assets/order-to-person.openapi.json` |
| 查询是否有待交接批次 | GET `/openapi/order_to_user/v1/batch/handover/query` | `assets/order-to-person.openapi.json` |
| 批次任务交接预约 | POST `/openapi/order_to_user/v1/batch/handover/reserve` | `assets/order-to-person.openapi.json` |
| 批次任务状态查询 | GET `/openapi/order_to_user/v1/batch/query` | `assets/order-to-person.openapi.json` |

## 仓库管理接口

| API title | Bundled endpoint | Reference |
| --- | --- | --- |
| 查询货位地图点映射清单 | GET `/openapi/order_to_user/v1/warehouse/query_points` | `assets/order-to-person.openapi.json` |
