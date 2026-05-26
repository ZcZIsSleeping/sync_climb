# 同步攀登后端实现计划

## 目标

为微信小程序“同步攀登”设计第一版后端能力，覆盖登录、BaseCamp 装备、个人日历、团队、团队日历、团队事件参与和团队事件装备分配。

当前阶段先设计接口和数据结构，不实现数据库和服务代码。

## 核心业务规则

### 登录

- 使用微信登录服务。
- 后端通过 `wx.login` 返回的 `code` 换取 `openid`。
- 用户头像默认使用微信头像。
- 用户昵称默认使用微信昵称，后续允许用户在 BaseCamp 中编辑。

### 日程类型

个人日历中存在三种日程：

- 个人日程：自己创建，只能编辑名称、删除、移动日期。
- 待接受团队日程：虚线框展示，点击后显示来源团队和发起人，可接受或拒绝。
- 团队日程：自己已加入的团队事件，打开后展示团队事件详情，并提供跳转到对应团队的入口。

团队日历中存在两种日程：

- 成员个人日程：展示团队成员的个人日程。其他人的只能查看事件名和成员名；自己的可以编辑名称、删除、移动日期。
- 团队日程：未加入时可点击加入；已加入时展示团队事件详情。

### 团队事件参与状态

团队事件参与关系使用状态管理：

- `pending`：被邀请，等待接受。
- `joined`：已加入。
- `rejected`：已拒绝。
- `left`：主动退出事件，或退出团队后自动退出事件。

明确规则：

- 某人拒绝团队事件后，团队事件详情中不显示这个人。
- 即使某人将 `pending` 操作为 `rejected`，仍然可以在团队事件列表中点击加入，状态重新变为 `joined`。
- 退出团队后，该用户在该团队下所有团队事件中的参与状态变为 `left`。

### 装备管理

- BaseCamp 中用户可以新增装备种类。
- 用户可以新增、减少、删除自己的装备数量。
- 团队事件中，事件发起人可以编辑每个参与者需要携带的装备。
- 分配数量不能小于 0，也不能超过该参与者拥有的对应装备数量。

## 数据库设计

### users

用户表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 用户 ID |
| openid | string | 微信 openid，唯一 |
| nickname | string | 昵称 |
| avatar_url | string | 微信头像 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### gear_types

装备种类表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 装备种类 ID |
| name | string | 装备名称，例如快挂、主锁、机械塞、绳索 |
| icon_key | string | icon 占位符，后续可替换为真实 icon |
| created_by_user_id | string | 创建人 |
| is_system | boolean | 是否系统默认 |
| created_at | datetime | 创建时间 |

### user_gears

用户装备库存表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 用户装备 ID |
| user_id | string | 用户 ID |
| gear_type_id | string | 装备种类 ID |
| name | string | 用户自定义装备名称 |
| quantity | number | 数量 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### teams

团队表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 团队 ID |
| name | string | 团队名称 |
| avatar_url | string | 团队头像 |
| room_code | string | 房间号/邀请码 |
| owner_user_id | string | 创建人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### team_members

团队成员表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 成员关系 ID |
| team_id | string | 团队 ID |
| user_id | string | 用户 ID |
| role | string | `owner` / `member` |
| display_order | number | 成员展示顺序 |
| joined_at | datetime | 加入时间 |
| left_at | datetime/null | 退出时间，未退出为空 |

### events

日程主体表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 日程 ID |
| title | string | 日程标题 |
| creator_user_id | string | 创建人 |
| scope | string | `personal` / `team` |
| team_id | string/null | 团队日程所属团队 |
| start_date | date | 开始日期 |
| end_date | date | 结束日期 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| deleted_at | datetime/null | 删除时间 |

### event_participants

日程参与关系表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 参与关系 ID |
| event_id | string | 日程 ID |
| user_id | string | 用户 ID |
| team_id | string/null | 团队 ID |
| status | string | `pending` / `joined` / `rejected` / `left` |
| source | string | `creator` / `invited` / `self_joined` |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### event_gear_requirements

团队事件装备分配表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 分配记录 ID |
| event_id | string | 团队事件 ID |
| participant_user_id | string | 参与者用户 ID |
| gear_type_id | string | 装备种类 ID |
| quantity | number | 需要携带数量 |
| assigned_by_user_id | string | 分配人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

建议唯一约束：

- `users.openid`
- `teams.room_code`
- `team_members(team_id, user_id)`
- `event_participants(event_id, user_id)`
- `event_gear_requirements(event_id, participant_user_id, gear_type_id)`

## 接口设计

### 登录

#### POST /auth/wechat-login

使用微信登录。

请求：

```json
{
  "code": "wx-login-code",
  "nickname": "Alex",
  "avatarUrl": "https://example.com/avatar.png"
}
```

处理逻辑：

1. 后端用 `code` 向微信换取 `openid`。
2. 如果 `openid` 不存在，创建用户。
3. 如果已存在，更新头像和昵称。
4. 返回登录态和用户信息。

返回：

```json
{
  "token": "session-token",
  "user": {
    "id": "u1",
    "nickname": "Alex",
    "avatarUrl": "https://example.com/avatar.png"
  }
}
```

### BaseCamp 装备

#### GET /gear-types

获取可选装备种类。

#### POST /gear-types

新增装备种类。

```json
{
  "name": "冰锥",
  "iconKey": "I"
}
```

#### GET /me/gears

获取我的装备库存。

#### POST /me/gears

新增一张装备卡片。

```json
{
  "gearTypeId": "quickdraw",
  "name": "快挂",
  "quantity": 6
}
```

#### PATCH /me/gears/:gearId

修改装备名称或数量。

```json
{
  "name": "快挂",
  "quantity": 8
}
```

#### DELETE /me/gears/:gearId

删除装备。

### 个人日历

#### GET /me/calendar/events

获取个人日历事件。

查询参数：

```text
start=2025-05-01
end=2025-08-31
```

返回包含：

- 自己的个人日程。
- 自己 `pending` 的团队日程。
- 自己 `joined` 的团队日程。

不返回：

- `rejected` 团队日程。
- `left` 团队日程。
- 已删除日程。

#### POST /me/events

创建个人日程。

```json
{
  "title": "体能训练",
  "startDate": "2025-05-12",
  "endDate": "2025-05-14"
}
```

处理逻辑：

1. 创建 `events.scope = personal`。
2. 创建当前用户的 `event_participants.status = joined`。

#### PATCH /me/events/:eventId

编辑个人日程名称。

```json
{
  "title": "雪山适应性训练"
}
```

权限：

- 只能编辑自己创建的个人日程。

#### PATCH /me/events/:eventId/move

移动个人日程。

```json
{
  "startDate": "2025-05-20"
}
```

处理逻辑：

- 保持原始持续天数。
- 根据新的开始日期重新计算结束日期。

#### DELETE /me/events/:eventId

删除个人日程。

权限：

- 只能删除自己创建的个人日程。

#### POST /me/events/:eventId/accept

接受团队事件邀请。

处理逻辑：

- `event_participants.status` 更新为 `joined`。

#### POST /me/events/:eventId/reject

拒绝团队事件邀请。

处理逻辑：

- `event_participants.status` 更新为 `rejected`。
- 个人日历不再显示该团队事件。

### 团队

#### POST /teams

创建团队。

```json
{
  "name": "四姑娘山小队"
}
```

处理逻辑：

1. 创建团队。
2. 生成唯一 `room_code`。
3. 当前用户加入团队，角色为 `owner`。

#### GET /teams

获取我的团队列表。

#### POST /teams/join

加入团队。

```json
{
  "roomCode": "A7K29Q"
}
```

处理逻辑：

- 如果从未加入过，创建 `team_members`。
- 如果曾经退出过，将 `left_at` 恢复为空。

#### DELETE /teams/:teamId/leave

退出团队。

处理逻辑：

1. `team_members.left_at` 设置为当前时间。
2. 当前用户在该团队所有团队事件中的 `event_participants.status` 更新为 `left`。
3. 个人日历不再展示该团队的团队日程。

### 团队日历

#### GET /teams/:teamId/calendar/events

获取团队日历事件。

查询参数：

```text
start=2025-05-01
end=2025-08-31
onlyTeamEvents=false
```

返回：

- `onlyTeamEvents = false`：返回团队成员个人日程 + 团队日程。
- `onlyTeamEvents = true`：只返回团队日程。

展示规则：

- 成员个人日程按成员循环分配色卡。
- 团队日程按团队循环分配色卡。
- 其他人的个人日程只能查看。
- 自己的个人日程可编辑、删除、移动。
- 团队日程未加入时展示加入按钮，已加入时展示团队事件详情。

#### POST /teams/:teamId/events

创建团队日程。

```json
{
  "title": "珠峰大本营徒步计划",
  "startDate": "2025-05-31",
  "endDate": "2025-06-02",
  "participantUserIds": ["u1", "u2", "u3"]
}
```

处理逻辑：

1. 创建 `events.scope = team`。
2. 创建者参与状态为 `joined`。
3. 被邀请成员参与状态为 `pending`。

#### GET /teams/:teamId/events/:eventId

获取团队事件详情。

返回内容：

- 事件标题。
- 发起人。
- 当前用户参与状态。
- 已加入成员列表。
- 装备汇总。
- 每个已加入成员的装备拥有数量和已分配数量。

重要过滤规则：

- `pending` 成员不展示在详情参与者列表中。
- `rejected` 成员不展示在详情参与者列表中。
- `left` 成员不展示在详情参与者列表中。
- 只有 `joined` 成员展示在团队事件详情中。

#### POST /teams/:teamId/events/:eventId/join

加入团队日程。

处理逻辑：

- 如果当前用户没有参与记录，创建 `event_participants.status = joined`，`source = self_joined`。
- 如果当前用户状态为 `pending`，更新为 `joined`。
- 如果当前用户状态为 `rejected`，允许重新更新为 `joined`。
- 如果当前用户状态为 `left`，允许重新更新为 `joined`，前提是用户仍在该团队中。

#### POST /teams/:teamId/events/:eventId/leave

退出某个团队日程。

处理逻辑：

- `event_participants.status` 更新为 `left`。

#### PATCH /teams/:teamId/events/:eventId

编辑团队日程名称。

权限：

- 事件发起人可以编辑。
- 团队 owner 可以编辑，是否开放可按产品规则决定。

#### PATCH /teams/:teamId/events/:eventId/move

移动团队日程。

处理逻辑：

- 保持原始持续天数。
- 根据新的开始日期重新计算结束日期。

权限：

- 事件发起人可以移动。
- 团队 owner 是否可以移动，后续按产品规则决定。

#### DELETE /teams/:teamId/events/:eventId

删除团队日程。

权限：

- 事件发起人可以删除。
- 团队 owner 是否可以删除，后续按产品规则决定。

### 团队事件装备

#### PATCH /teams/:teamId/events/:eventId/gear-requirements

批量更新团队事件装备分配。

```json
{
  "requirements": [
    {
      "participantUserId": "u1",
      "gearTypeId": "rope",
      "quantity": 1
    },
    {
      "participantUserId": "u2",
      "gearTypeId": "quickdraw",
      "quantity": 6
    }
  ]
}
```

校验规则：

1. 当前用户必须是事件发起人。
2. `participantUserId` 必须是该事件的 `joined` 参与者。
3. 数量不能小于 0。
4. 数量不能超过参与者拥有的对应装备数量。
5. 同一个 `event_id + participant_user_id + gear_type_id` 只保留一条记录。

返回：

```json
{
  "gearSummary": [
    {
      "gearTypeId": "quickdraw",
      "name": "快挂",
      "iconKey": "Q",
      "quantity": 6
    }
  ]
}
```

## 核心业务流程

### 个人创建日程

1. 前端长按并滑动选择日期。
2. 调用 `POST /me/events`。
3. 后端创建个人日程和参与关系。
4. 前端刷新个人日历或本地插入返回事件。

### 个人移动日程

1. 前端长按日程柱状体并拖动。
2. 调用 `PATCH /me/events/:eventId/move`。
3. 后端保持时长，更新开始日期和结束日期。

### 创建团队

1. 调用 `POST /teams`。
2. 后端创建团队并生成房间号。
3. 当前用户自动成为 owner。

### 加入团队

1. 输入房间号。
2. 调用 `POST /teams/join`。
3. 后端创建或恢复成员关系。

### 创建团队日程

1. 在团队页长按并滑动选择日期。
2. 调用 `POST /teams/:teamId/events`。
3. 创建者状态为 `joined`。
4. 被邀请成员状态为 `pending`。
5. 被邀请成员个人日历出现待接受团队日程。

### 接受团队日程

1. 用户在个人日历点击待接受日程。
2. 调用 `POST /me/events/:eventId/accept`。
3. 参与状态变为 `joined`。
4. 个人日历显示为团队日程。
5. 团队事件详情中显示该用户。

### 拒绝团队日程

1. 用户在个人日历点击待接受日程。
2. 调用 `POST /me/events/:eventId/reject`。
3. 参与状态变为 `rejected`。
4. 个人日历不再显示该事件。
5. 团队事件详情中不显示该用户。
6. 用户之后仍可在团队事件列表中点击加入，重新变为 `joined`。

### 加入已拒绝的团队日程

1. 用户在团队日历中点击该团队事件。
2. 如果当前状态是 `rejected`，仍展示加入按钮。
3. 调用 `POST /teams/:teamId/events/:eventId/join`。
4. 后端将状态从 `rejected` 更新为 `joined`。
5. 团队事件详情开始显示该用户。

### 退出团队

1. 调用 `DELETE /teams/:teamId/leave`。
2. 成员关系 `left_at` 置为当前时间。
3. 当前用户在该团队所有团队事件中的参与状态改为 `left`。
4. 个人日历不再显示该团队的团队日程。

### 分配团队事件装备

1. 打开团队事件详情。
2. 发起人为已加入成员调整装备数量。
3. 调用 `PATCH /teams/:teamId/events/:eventId/gear-requirements`。
4. 后端校验数量边界。
5. 返回装备汇总和成员装备明细。

## 实现顺序建议

1. 登录与用户表。
2. BaseCamp 装备种类和用户装备库存。
3. 个人日历创建、编辑、删除、移动。
4. 团队创建、加入、退出。
5. 团队日历聚合读取。
6. 团队事件创建、加入、拒绝、接受、删除、移动。
7. 团队事件详情。
8. 团队事件装备分配。
9. 前端从 mock 数据切换为真实接口。

## 第一版验收重点

- 微信登录后能获得稳定用户身份。
- BaseCamp 可以新增装备种类和装备数量。
- 个人日历可以创建、删除、移动个人日程。
- 可以创建团队、加入团队、退出团队。
- 团队日历能展示成员个人日程和团队日程。
- 待接受团队日程可以接受或拒绝。
- 拒绝后团队事件详情不显示该用户。
- 拒绝后仍可从团队事件列表重新加入。
- 退出团队后个人日历不再显示该团队事件。
- 团队事件发起人可以为已加入成员分配装备，且不能超过成员拥有数量。
