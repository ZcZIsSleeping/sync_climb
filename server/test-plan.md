# 后端测试计划

## 目标

为同步攀登后端服务建立可落地的测试策略，覆盖核心业务：

- 微信登录
- BaseCamp 装备
- 个人日历事件
- 团队创建、加入、退出
- 团队日历聚合
- 团队事件接受、拒绝、重新加入
- 团队事件装备分配

测试分两层：

- 单元测试：验证纯业务规则、权限判断、数据转换和边界条件。
- 集成测试：启动测试数据库，通过 HTTP API 验证完整业务链路。

## 建议测试工具

建议使用：

- `vitest`：单元测试和集成测试 runner。
- `supertest`：直接测试 Express app。
- `pg`：连接测试 PostgreSQL。
- 独立测试数据库：`syn_climb_test`。

为了方便测试，建议后续把当前 `server/src/index.ts` 拆成：

```text
server/src/app.ts        // 创建 Express app，不 listen
server/src/index.ts      // 只负责读取端口并 listen
server/src/services/     // 业务服务
server/src/repositories/ // 数据访问
```

这样单元测试可以测 service，集成测试可以用 `supertest(app)`。

## 单元测试计划

### 1. 登录逻辑

测试对象：

- 微信 openid 获取逻辑
- 本地开发 fallback openid 逻辑

用例：

- 未配置 `WECHAT_APPID/WECHAT_SECRET` 时，`code = abc` 返回 `local_abc`。
- 配置微信参数时，微信接口返回 `openid` 后正常使用。
- 微信接口返回错误时，抛出登录失败错误。

### 2. 日期移动逻辑

测试对象：

- 事件移动时保持原始持续天数。

用例：

- `2025-05-01` 到 `2025-05-01` 移动到 `2025-05-10` 后，结束日期为 `2025-05-10`。
- `2025-05-01` 到 `2025-05-03` 移动到 `2025-05-10` 后，结束日期为 `2025-05-12`。
- 跨月事件移动后，持续天数不变。

### 3. 日程类型映射

测试对象：

- 数据库 event row 到 API response 的转换。

用例：

- `scope = personal` 映射为 `type = personal`。
- `scope = team` 且参与状态 `pending` 映射为 `type = pending_team`。
- `scope = team` 且参与状态 `joined` 映射为 `type = team`。

### 4. 团队成员权限判断

测试对象：

- `assertTeamMember`
- 团队 owner/member 权限规则

用例：

- 当前用户是团队成员且 `left_at = null`，允许访问。
- 当前用户不在团队中，拒绝访问。
- 当前用户曾加入但 `left_at != null`，拒绝访问。

### 5. 团队事件参与状态规则

测试对象：

- 团队事件详情参与者过滤规则。
- 拒绝后重新加入规则。

用例：

- `joined` 成员显示在团队事件详情。
- `pending` 成员不显示在团队事件详情。
- `rejected` 成员不显示在团队事件详情。
- `left` 成员不显示在团队事件详情。
- `pending -> rejected -> joined` 是允许状态流。
- `rejected -> joined` 是允许状态流。
- `left -> joined` 只有在用户仍是团队成员时允许。

### 6. 装备分配规则

测试对象：

- 团队事件装备分配校验。

用例：

- 发起人可以给已加入成员分配装备。
- 非发起人不能分配装备。
- 不能给 `pending/rejected/left` 成员分配装备。
- 分配数量不能小于 0。
- 分配数量不能超过成员拥有数量。
- 同一个事件、成员、装备种类重复分配时，更新原记录，不新增重复记录。
- 数量为 0 时，装备汇总不展示该项。

### 7. 退出团队规则

测试对象：

- 退出团队后的状态联动。

用例：

- 退出团队后，`team_members.left_at` 被设置。
- 退出团队后，该团队内当前用户参与的团队事件全部变为 `left`。
- 退出团队后，个人日历不再返回该团队事件。

## 集成测试计划

### 测试数据库准备

建议使用独立测试库：

```bash
createdb syn_climb_test
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb_test npm run db:migrate --prefix server
```

每个测试文件或每个测试用例前清理业务表：

```sql
TRUNCATE event_gear_requirements,
         event_participants,
         events,
         team_members,
         teams,
         user_gears,
         users
RESTART IDENTITY CASCADE;
```

然后重新 seed 默认装备种类。

### 1. 健康检查

接口：

- `GET /health`

用例：

- 返回 `200`。
- 响应体为 `{ ok: true }`。

### 2. 登录链路

接口：

- `POST /auth/wechat-login`

用例：

- 新 code 登录时创建用户并返回 token。
- 同一个 code 再次登录时复用同一个用户，但更新 token。
- 使用 token 调用鉴权接口成功。
- 不带 token 调用鉴权接口返回 `401`。

### 3. BaseCamp 装备链路

接口：

- `GET /gear-types`
- `POST /gear-types`
- `GET /me/gears`
- `POST /me/gears`
- `PATCH /me/gears/:gearId`
- `DELETE /me/gears/:gearId`

用例：

- 能获取 4 个默认装备种类。
- 能新增自定义装备种类。
- 能新增用户装备。
- 能修改装备数量。
- 能删除装备。
- 用户 A 不能修改或删除用户 B 的装备。

### 4. 个人日历链路

接口：

- `POST /me/events`
- `GET /me/calendar/events`
- `PATCH /me/events/:eventId`
- `PATCH /me/events/:eventId/move`
- `DELETE /me/events/:eventId`

用例：

- 创建个人日程后，个人日历能查到。
- 查询日期范围外的日程不会返回。
- 编辑个人日程名称成功。
- 移动个人日程后，开始日期改变，持续天数不变。
- 删除个人日程后，个人日历不再返回。
- 用户 A 不能编辑、移动、删除用户 B 的个人日程。

### 5. 团队基础链路

接口：

- `POST /teams`
- `GET /teams`
- `POST /teams/join`
- `DELETE /teams/:teamId/leave`

用例：

- 用户 A 创建团队后，A 是 owner。
- 用户 B 通过房间号加入团队。
- 团队列表显示正确成员数量。
- 用户 B 退出团队后，B 的团队列表不再显示该团队。
- 用户 B 退出后再次用房间号加入，成员关系恢复。

### 6. 团队日历聚合

接口：

- `GET /teams/:teamId/calendar/events`

用例：

- 团队日历返回团队成员的个人日程。
- 团队日历返回团队事件。
- `onlyTeamEvents=false` 返回成员个人日程 + 团队日程。
- `onlyTeamEvents=true` 只返回团队日程。
- 非团队成员访问团队日历返回 `403`。

### 7. 团队事件创建和参与状态

接口：

- `POST /teams/:teamId/events`
- `GET /teams/:teamId/events/:eventId`
- `POST /me/events/:eventId/accept`
- `POST /me/events/:eventId/reject`
- `POST /teams/:teamId/events/:eventId/join`
- `POST /teams/:teamId/events/:eventId/leave`

用例：

- 创建团队事件时，创建者状态为 `joined`。
- 被邀请成员状态为 `pending`。
- 被邀请成员的个人日历出现 `pending_team`。
- 被邀请成员接受后，个人日历显示为 `team`。
- 被邀请成员拒绝后，个人日历不再显示该事件。
- 被邀请成员拒绝后，团队事件详情不显示该成员。
- 拒绝后的成员可以从团队事件列表重新加入，状态变为 `joined`。
- 加入后，团队事件详情显示该成员。
- 用户主动退出团队事件后，详情不再显示该成员。

### 8. 团队事件编辑、移动、删除

接口：

- `PATCH /teams/:teamId/events/:eventId`
- `PATCH /teams/:teamId/events/:eventId/move`
- `DELETE /teams/:teamId/events/:eventId`

用例：

- 事件发起人可以编辑团队事件名称。
- 事件发起人可以移动团队事件。
- 移动后持续天数不变。
- 事件发起人可以删除团队事件。
- 非发起人不能编辑、移动、删除团队事件。
- 删除后团队日历不再返回该事件。

### 9. 团队事件装备分配

接口：

- `PATCH /teams/:teamId/events/:eventId/gear-requirements`
- `GET /teams/:teamId/events/:eventId`

用例：

- 发起人给自己分配装备成功。
- 发起人给其他已加入成员分配装备成功。
- 分配后事件详情返回装备汇总。
- 分配后事件详情返回成员装备分配明细。
- 分配数量超过成员拥有数量返回 `400`。
- 给未加入成员分配装备返回 `400`。
- 非发起人分配装备返回 `403`。
- 数量更新后，装备汇总同步更新。

### 10. 退出团队联动

接口：

- `DELETE /teams/:teamId/leave`
- `GET /me/calendar/events`
- `GET /teams/:teamId/events/:eventId`

用例：

- 用户退出团队后，该团队的团队事件参与状态变为 `left`。
- 用户退出团队后，个人日历不再返回该团队事件。
- 用户退出团队后，团队事件详情不再显示该用户。
- 用户退出团队后，不能访问该团队日历。

## 推荐测试优先级

第一批必须写：

- 登录链路
- 个人日历 CRUD
- 团队创建/加入/退出
- 团队事件 pending/rejected/joined 状态流
- 团队事件详情只展示 joined 成员
- 团队事件装备分配数量校验

第二批补齐：

- 权限边界
- 查询日期范围
- onlyTeamEvents 筛选
- 退出团队联动
- 重复加入团队和重复加入事件

## CI 建议

后续可以增加：

```bash
npm run build --prefix server
npm run test --prefix server
```

CI 中使用 PostgreSQL service，启动后执行：

```bash
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb_test npm run db:migrate --prefix server
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb_test npm run test --prefix server
```
