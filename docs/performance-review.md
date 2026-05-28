# 同步攀登性能优化决策文档

本文档记录当前阶段确认要做的性能优化，以及暂时不做或不按原方案做的优化。目标不是一次性做完整离线同步或虚拟化重构，而是在不破坏现有交互的前提下，优先解决最容易造成卡顿、请求放大和状态错乱的问题。

检查范围：

- 微信小程序前端：`miniprogram/pages/index/index.ts|wxml|wxss`
- Express 后端：`server/src/app.ts`
- PostgreSQL 结构：`server/migrations/001_init.sql`

## 当前优先级结论

优先做：

1. BaseCamp 装备管理采用方案 1：乐观更新 + 防抖提交 + 关键时机 flush。
2. 日历渲染建立日期索引，减少重复 filter 和 sort。
3. 装备拖拽视觉更新节流，减少 `touchmove` 中的 `setData` 压力。
4. 装备排序后端改成批量 SQL 更新。
5. 团队事件装备保存只提交 dirty 项，后端批量校验。
6. 补充数据库索引。
7. 团队名、昵称保存增加无变化短路。
8. 增加轻量性能日志，便于线上定位卡顿点。

暂时不做：

1. 不把 BaseCamp 改成完整 local-first 离线同步系统。
2. 不立即缩小日历前后 24 个月的数据窗口。
3. 不立即做完整月历虚拟列表。
4. 不把团队成员个人事件改成 busy 聚合标记。

## BaseCamp 装备优化方案

### 目标

BaseCamp 装备操作需要保持当前简单直接的体验：用户点加减、删除、排序时界面立即响应；同时减少连续操作产生的大量接口请求，避免弱网下请求乱序导致数据回退。

当前问题：

- 数量每点一次都会调用一次 `PATCH /me/gears/:gearId`。
- 拖拽排序松手后调用 `PATCH /me/gears/order`，后端逐条更新并返回全量装备。
- 删除装备时，如果同一装备还有未提交的数量变化，可能出现删除后又提交数量的冲突。
- 弱网下多个数量请求可能乱序返回，造成后端最终值不是用户最后看到的值。

### 采用方案 1：即时可见 + 防抖提交

前端行为：

1. 用户点击 `+` / `-` 时，立即更新本地 `gearItems`。
2. 同一件装备在短时间内多次变化，只保留最后数量。
3. 每件装备维护一个防抖 timer，建议 600ms 到 800ms 后提交最终数量。
4. 如果提交过程中用户又继续修改，不用旧响应覆盖本地；旧请求完成后检查是否还有新 pending 值，有则继续提交最新值。
5. 删除装备时，取消该装备所有 pending 数量提交，再执行删除。
6. 切出 BaseCamp、切 tab、进入后台、退出登录前，强制 flush 所有 pending 数量。

后端接口：

- 数量接口可以继续使用 `PATCH /me/gears/:gearId`。
- 不需要第一阶段新增完整批量同步接口。

需要新增的前端状态：

```ts
gearQuantityTimers: Record<string, number>
gearPendingQuantities: Record<string, number>
gearSubmittingQuantities: Record<string, boolean>
gearSyncFailedIds: Record<string, boolean>
```

数量变化流程：

```text
点击 + 或 -
  -> wx.vibrateShort
  -> 本地立即更新 count
  -> gearPendingQuantities[id] = 最新 count
  -> 重置该 gear 的 timer
  -> timer 到期后提交 PATCH /me/gears/:id
  -> 成功后清理 pending
  -> 如果提交期间又有新 pending，继续提交最新值
  -> 失败则标记同步失败，保留本地显示，后续 flush 或重新进入页面时重试
```

删除流程：

```text
点击删除
  -> wx.vibrateShort
  -> 取消该 gear 的数量 timer
  -> 删除 gearPendingQuantities[id]
  -> 本地先移除装备
  -> DELETE /me/gears/:id
  -> 成功结束
  -> 失败则恢复该装备并提示
```

拖拽排序流程：

```text
长按装备
  -> 进入拖拽态
  -> ghost 跟随手指
  -> 移动过程节流更新 ghost 样式
  -> 必要时更新占位位置

松手
  -> 本地顺序确定
  -> PATCH /me/gears/order { gearIds }
  -> 成功后不再用后端全量结果覆盖本地
  -> 失败则提示并重新 loadGearItems
```

后端排序接口优化：

- 当前逐条 `UPDATE`。
- 改成单条批量 SQL：

```sql
UPDATE user_gears
SET display_order = v.display_order,
    updated_at = now()
FROM (VALUES ...) AS v(id, display_order)
WHERE user_gears.id = v.id
  AND user_gears.user_id = $uid;
```

接口返回建议：

```json
{ "ok": true }
```

前端已经知道最终顺序，不需要每次用后端返回的全量装备覆盖本地。

### 这个方案的问题

1. 用户操作后立刻杀掉小程序，防抖请求可能没有提交。
   - 缓解：`onHide` 和切 tab 前 flush。

2. 弱网提交失败时，本地和后端会短暂不一致。
   - 缓解：标记同步失败，下次进入 BaseCamp 或重新登录后重试/刷新。

3. 多端同时编辑时仍然是最后写入为准。
   - 当前阶段接受；后续如果需要强一致，再加 `version` 或 `updatedAt` 冲突检测。

4. 新增装备仍然等待接口成功后才插入。
   - 这是刻意保守的选择，避免临时 id 和 id 映射复杂度。

## 日历渲染优化

### 目标

保留当前前后 24 个月的历史回溯能力，同时减少构建月历时的重复计算。

当前问题：

- `buildMonth()` 每个日期都会调用 `sortedEventsForDate(events, date)`。
- `buildWeekSegments()` 和 `buildWeekMoreMarkers()` 又会按天重复过滤和排序。
- 新增、删除、移动事件后经常重建当前已渲染月份。

### 优化方式

1. 加 `buildEventsByDate(events)`。
2. 每次事件列表变化后，按日期预计算该日覆盖的事件。
3. 每个日期内事件按现有规则排序：
   - 时长长的排前面。
   - 时长相同，创建时间晚的排前面。
4. `buildMonth()`、`buildWeekSegments()`、`buildWeekMoreMarkers()` 改为从索引读取，不再重复 `filter + sort`。
5. 个人日历和团队日历共用同一套构建逻辑，避免 `+n`、pending 虚线、团队事件显示规则不一致。

### 暂时不做的点

暂时不缩小 `apiCalendarRange()` 的前后 24 个月范围。原因是产品需要回溯历史事件，直接缩小窗口会改变用户体验。

暂时不做完整月历虚拟列表。原因是虚拟化会影响：

- 回到今天按钮。
- 上下追加月份。
- 长按滑动选日期。
- 事件拖拽时的 cell 命中。
- 个人日历和团队日历两个滚动容器的状态维护。

等日期索引完成后，先用性能日志验证是否仍然需要虚拟化。

## 拖拽性能优化

### BaseCamp 装备拖拽

当前 `touchmove` 会频繁更新 ghost 样式，并在跨越目标位置时重排 `gearItems`。

优化：

1. ghost 样式更新加 16ms 节流。
2. 移动中尽量只更新 ghost 和目标占位。
3. 如果当前实现继续移动中重排数组，也要限制为目标 index 改变时才 `setData`。
4. 排序保存失败时重新拉取后端装备列表。

### 事件拖拽

事件拖拽已经有 16ms 视觉节流，可以保留。后续只需要确认无权限拖拽时不进入动画态，避免无效渲染。

## 团队事件装备保存优化

### 当前问题

团队事件详情里编辑装备数量，关闭弹窗时会把参与者和装备的完整矩阵提交到后端。后端逐条查询参与者、查询装备归属，然后逐条 delete 或 upsert。

人数和装备数上来后，一次关闭弹窗会产生大量 SQL，即使用户只改了一个数量。

### 优化方式

前端：

1. 打开事件详情时记录一份原始装备分配快照。
2. 用户点击 `+` / `-` 时只修改本地，并标记 dirty。
3. 关闭弹窗时只提交变化项。
4. 没有 dirty 时不调用保存接口。

后端：

1. 一次性查出 joined participants。
2. 一次性查出相关 user gears。
3. 在内存中校验参与者状态、装备归属和数量上限。
4. 对 dirty 项批量 upsert/delete。
5. 返回最新装备汇总。

需要注意：

- 退出事件的成员不能再出现在装备编辑列表。
- pending 或 rejected 成员不能提交装备分配。
- 数量为 0 的 dirty 项代表删除该装备需求。

## 数据库索引

建议补充以下索引：

```sql
CREATE INDEX IF NOT EXISTS idx_user_gears_user_order
  ON user_gears(user_id, display_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_members_team_active
  ON team_members(team_id, left_at, joined_at);

CREATE INDEX IF NOT EXISTS idx_events_creator_personal_dates
  ON events(creator_user_id, scope, deleted_at, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_events_team_scope_dates
  ON events(team_id, scope, deleted_at, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_participants_event_status
  ON event_participants(event_id, status, user_id);

CREATE INDEX IF NOT EXISTS idx_gear_requirements_event
  ON event_gear_requirements(event_id, participant_user_id, gear_type_id);
```

风险：

- 索引会增加写入成本，但当前写入量远小于查询量，可以接受。
- 需要用迁移脚本添加，避免直接手工改线上库。

## 无变化保存短路

### 团队名

当前团队名 blur 后可能触发不必要的 `PATCH /teams/:teamId`，并带来刷新链路。

优化：

- 进入团队详情时记录 `originalTeamName`。
- blur 时比较 `trim(teamName)` 和 `originalTeamName`。
- 无变化只退出编辑态，不请求接口。
- 保存成功后只局部更新团队名，不刷新个人日历。

### 昵称和头像

优化：

- 保存 `originalNickname` / `originalAvatarUrl`。
- 无变化不调用 `PATCH /me/profile`。
- 头像上传可以继续即时执行，但资料保存只提交变化字段。

## 可观测性

前端开发版增加轻量日志：

- `loadCalendarEvents` 请求耗时、事件数量。
- `refreshMonths` 构建耗时、月份数量、事件数量。
- `loadTeamEvents` 请求耗时、事件数量。
- `refreshTeamMonths` 构建耗时、月份数量、事件数量。
- BaseCamp 数量 flush 次数、失败次数。

后端增加请求耗时日志：

- `traceId`
- `method`
- `path`
- `status`
- `durationMs`
- 必要时记录关键 row count

这些日志只用于定位性能问题，不在前端展示给普通用户。

## 实施顺序

1. BaseCamp 数量乐观更新、防抖提交、flush、删除取消 pending。
2. BaseCamp 拖拽视觉节流，排序接口改批量 SQL。
3. 日历事件日期索引，统一个人和团队日历构建逻辑。
4. 数据库索引迁移。
5. 团队事件装备保存 dirty diff 和后端批量校验。
6. 团队名、昵称无变化短路。
7. 加前后端性能日志。

## 验收重点

BaseCamp：

- 连续快速点击 `+`，前端数量立即变化，后端只收到最终数量或少量合并请求。
- 连续快速点击 `-`，数量不小于 0。
- 数量变化后立刻切 tab，会 flush 成功。
- 删除装备后，不再发送该装备的 pending 数量请求。
- 拖拽排序松手后不明显卡顿。
- 排序失败时能提示并恢复后端顺序。

日历：

- 个人日历和团队日历 `+n` 逻辑保持一致。
- pending 事件虚线显示不变。
- 长按创建、点击事件、点击 `+n`、拖拽事件不受影响。
- 回到今天按钮和上下滚动追加月份不受影响。

团队事件装备：

- 没有改动时关闭详情不调用保存接口。
- 只改一个装备数量时，只提交该变化。
- 退出事件的成员装备从汇总中扣除。
- pending/rejected 成员不显示在装备编辑列表。
