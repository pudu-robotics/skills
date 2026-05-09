# 统计数据

覆盖状态：已收录到 `assets/statistics.openapi.json`。先用这份文档把用户侧接口标题映射到具体 OpenAPI 路径，再去分组 OpenAPI JSON 里查看精确参数和 Schema。

常见查询参数包括 `timezone_offset`、`start_time`、`end_time`、`shop_id`，以及分页字段 `limit`、`offset`；每个路径的精确参数还是以 `assets/statistics.openapi.json` 为准。

## 概览数据

| API title | Bundled endpoint |
| --- | --- |
| 门店概览 | GET `/openapi/data-board/v1/brief/shop` |
| 机器概览 | GET `/openapi/data-board/v1/brief/robot` |
| 机器运行概览 | GET `/openapi/data-board/v1/brief/run` |

## 模式统计数据

| API title | Bundled endpoint |
| --- | --- |
| 门店分析 | GET `/openapi/data-board/v1/analysis/shop` |
| 门店分析-列表 | GET `/openapi/data-board/v1/analysis/shop/paging` |
| 机器人运行分析 | GET `/openapi/data-board/v1/analysis/run` |
| 机器人运行分析-列表 | GET `/openapi/data-board/v1/analysis/run/paging` |
| 机器任务分析-广告模式 | GET `/openapi/data-board/v1/analysis/task/ad` |
| 机器任务分析-广告模式-列表 | GET `/openapi/data-board/v1/analysis/task/ad/paging` |
| 机器任务分析-呼叫模式 | GET `/openapi/data-board/v1/analysis/task/call` |
| 机器任务分析-呼叫模式-列表 | GET `/openapi/data-board/v1/analysis/task/call/paging` |
| 机器任务分析-巡航模式 | GET `/openapi/data-board/v1/analysis/task/cruise` |
| 机器任务分析-巡航模式-列表 | GET `/openapi/data-board/v1/analysis/task/cruise/paging` |
| 机器任务分析-返航模式 | GET `/openapi/data-board/v1/analysis/task/turn_back` |
| 机器任务分析-返航模式-列表 | GET `/openapi/data-board/v1/analysis/task/turn_back/paging` |
| 机器任务分析-配送模式 | GET `/openapi/data-board/v1/analysis/task/delivery` |
| 机器任务分析-配送模式-列表 | GET `/openapi/data-board/v1/analysis/task/delivery/paging` |
| 机器任务分析-领位模式 | GET `/openapi/data-board/v1/analysis/task/greeter` |
| 机器任务分析-领位模式-列表 | GET `/openapi/data-board/v1/analysis/task/greeter/paging` |
| 机器任务分析-宫格点击 | GET `/openapi/data-board/v1/analysis/task/grid` |
| 机器任务分析-宫格点击-列表 | GET `/openapi/data-board/v1/analysis/task/grid/paging` |
| 机器任务分析-互动模式 | GET `/openapi/data-board/v1/analysis/task/interactive` |
| 机器任务分析-互动模式-列表 | GET `/openapi/data-board/v1/analysis/task/interactive/paging` |
| 机器任务分析-回盘模式 | GET `/openapi/data-board/v1/analysis/task/recovery` |
| 机器任务分析-回盘模式-列表 | GET `/openapi/data-board/v1/analysis/task/recovery/paging` |
| 机器任务分析-揽客模式 | GET `/openapi/data-board/v1/analysis/task/solicit` |
| 机器任务分析-揽客模式-列表 | GET `/openapi/data-board/v1/analysis/task/solicit/paging` |
| 机器任务分析-顶升模式 | GET `/openapi/data-board/v1/analysis/task/lifting` |
| 机器任务分析-顶升模式-列表 | GET `/openapi/data-board/v1/analysis/task/lifting/paging` |
| 机器任务分析-全部模式 | GET `/openapi/data-board/v1/analysis/task/total_event` |
| 机器任务分析-全部模式-列表 | GET `/openapi/data-board/v1/analysis/task/total_event/paging` |
| 机器任务分析[清洁线]-清洁模式 | GET `/openapi/data-board/v1/analysis/clean/mode` |
| 机器任务分析[清洁线]-清洁模式-列表 | GET `/openapi/data-board/v1/analysis/clean/paging` |
| 机器任务分析[清洁线]-清洁模式工作时段分布 | GET `/openapi/data-board/v1/analysis/clean/detail` |

## 任务明细数据

| API title | Bundled endpoint |
| --- | --- |
| 机器任务明细-呼叫目的地 | GET `/openapi/data-board/v1/task/call` |
| 机器任务明细-配送目的地 | GET `/openapi/data-board/v1/task/delivery` |
| 机器任务明细-领位目的地 | GET `/openapi/data-board/v1/task/greeter` |
| 机器任务明细-顶升目的地 | GET `/openapi/data-board/v1/task/lifting` |
| 机器任务明细-回盘目的地 | GET `/openapi/data-board/v1/task/recovery` |
| 机器任务明细-巡航目的地 | GET `/openapi/data-board/v1/task/cruise` |
| 清洁报告-列表 | GET `/openapi/data-board/v1/log/clean_task/query_list` |
| 清洁报告-详情 | GET `/openapi/data-board/v1/log/clean_task/query` |
| 清洁定时多任务详情 | GET `/openapi/data-board/v1/log/clean_task/multi_query` |

## 日志数据

| API title | Bundled endpoint |
| --- | --- |
| 开机自检-列表 | GET `/openapi/data-board/v1/log/boot/query_list` |
| 故障异常\|事件-列表 | GET `/openapi/data-board/v1/log/error/query_list` |
| 充电记录-列表 | GET `/openapi/data-board/v1/log/charge/query_list` |
| 闸机通行-列表 | GET `/openapi/data-board/v1/log/turnstile/query_list` |
| 电池健康-列表 | GET `/openapi/data-board/v1/log/battery/query_list` |
