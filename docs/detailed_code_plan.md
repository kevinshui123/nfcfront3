# AllValue Link — 详细代码实现计划（开发导向）

版本：v1.0  
作者：开发计划生成器  
目标读者：后端工程师、移动端工程师、前端工程师、DevOps、产品经理

---

## 1. 概述与目标
- 目标：基于 NFC 标签（NDEF）实现商家门店互动产品的技术实现方案，产出可执行的代码实现计划与开发任务清单，覆盖移动端读取/展示、NFC 写入工具、后端 API、AI 文案生成功能、管理后台及部署。
- 假设：NFC 标签容量有限（通常几十到数百字节），主要写入短 URL 或 token；移动端需支持 Android 全功能，iOS 支持 URL/NDEF 的能力视机型而定（策略见下）。

## 2. 范围与优先级（MVP vs 高级功能）
- MVP（必须做）
  - NFC 标签写入并指向短 URL（格式：https://app.example.com/t/{token}）
  - 移动端：Android/React Native 或 Flutter 实现 NFC 读取并拉起展示页面；H5 兜底方案（扫描二维码）
  - 后端：Token 解析、店铺/标签/活动数据读取、简单统计（PV/UV）
  - 管理后台：店铺管理、标签批量编码、活动创建
  - AI：调用外部 LLM API 生成草稿文案（可编辑）
- 非 MVP（可选/高级）
  - 一键代发社媒（需第三方权限）、深度社媒接入  
  - 更复杂的个性化推荐与 A/B 测试

## 3. 总体架构（文本图）

  NFC标签 -> 用户手机(NFC读取) -> H5或原生App -> 后端API -> DB / AI服务

  管理后台 <-> 后端API <-> 数据库
                \
                 -> AI微服务 (LLM API)

## 4. 建议技术栈与版本
- 移动端：Flutter 3.x 或 React Native 0.72（若团队偏 JS），推荐 Flutter 便于原生 NFC 支持与跨平台 UI 一致性  
  - NFC lib（Flutter）：`flutter_nfc_kit`（或 `ndef` + 平台通道）  
  - 状态管理（Flutter）：`provider` 或 `riverpod`
- 后端：FastAPI (Python 3.10+) 或 NestJS (Node 18+)  
  - 推荐 FastAPI 用于快速构建 OpenAPI 文档与异步调用 LLM  
- 数据库：PostgreSQL 14+；Redis（缓存/短 token）  
- AI：OpenAI GPT 或 国内等价 LLM（按合规）  
- 管理后台：React 18 + Ant Design  
- 部署：Docker + Kubernetes（或直接 ECS/GCP Run）  

## 5. 数据模型（主要表）
- shops (店铺)
  - id (uuid, PK)
  - name, description, owner_id, created_at, updated_at
- nfc_tags (标签实体)
  - id (uuid, PK)
  - shop_id (FK)
  - token (string, 唯一)         -- 对应短 URL 的 token
  - ndef_payload (json)         -- 可保存实际编码内容（供写卡工具使用）
  - status (enum: unused, encoded, active)
  - created_at, encoded_at
- content_items (商家内容/活动/笔记)
  - id, shop_id, title, body, metadata(json), created_by, created_at
- visits (统计)
  - id, tag_id, user_agent, referer, created_at, device_info

## 6. NFC 标签编码规范（NDEF）
- 推荐写入格式（MVP）：
  - NDEF record type: "urn:nfc:wkt:U" (URI record)
  - URI payload: `https://app.example.com/t/{token}` 或短域名
  - 说明：后端解析 token 并返回富内容或重定向到商家 H5
- 可选增强（若标签容量允许）：
  - 写入 JSON 的轻量 token，或包含店铺 ID 的签名文本（注意安全）

## 7. 后端 API 设计（示例）
- 接口风格：RESTful + OpenAPI，所有返回 JSON

- 1) GET /t/{token}
  - 说明：NFC 点击后访问此接口，返回展示所需数据或重定向到 H5
  - Response:
    - 200: { "type":"content", "content_id":"...", "title":"...", "body":"...", "shop":{...} }
    - 302: redirect to `https://h5.example.com/shop/{id}`

- 2) POST /shops/{shop_id}/tags/batch_encode
  - 说明：管理后台调用，生成 token 列表并返回供写卡工具下载
  - Request: { "count": 100, "prefix": "MALL1" }
  - Response: { "tokens": [ "abc123", ... ], "csv_url": "..." }

- 3) POST /ai/generate
  - 说明：接受模板与上下文，返回 AI 生成文案草稿
  - Request: { "shop_id","template_id","context":{...} }
  - Response: { "draft": "..." }

- 4) Auth: JWT（商家后台）与短 token 验证（NFC token）

## 8. 移动端实现要点（代码级）
- NFC 读取流程（Flutter 示例思路）
  - 请求 NFC 权限（Android manifest / iOS plist）
  - 使用 `flutter_nfc_kit.poll()` 读取 NDEF records
  - 解析 URI，提取 token 并调用 `GET /t/{token}` 拉取内容
  - 判断是否安装原生 App：若是 App 内，则展示原生页面；若未安装或 iOS 限制，打开 H5 页面

- 错误/兜底
  - 若无法读取 NFC，则展示二维码（后端生成短链二维码）
  - 对 iOS：若 NDEF unsupported，展示扫码或手动输入 token

## 9. AI 文案生成功能（代码层面）
- 后端微服务（/ai/generate）职责：
  - 接收商家传入的模板与商品/活动上下文（图片 URL、关键字）
  - 构造 Prompt（模板化，包含风格参数）
  - 调用 LLM API（并记录调用成本与响应时间）
  - 返回 draft 文案，支持多候选与温度调节
- 示例 prompt 模板（伪代码）
  - "请为店铺 {shop_name} 的活动 {activity_title} 生成一段适合小红书的文案，风格：口语、吸引流量，长度不超过150字，包含2个emoji。上下文：{context}"

## 10. 写卡工具实现（桌面 or Web）
- 要求：
  - 支持批量导入 token 列表（CSV）
  - 支持硬件读写（USB NFC 写卡器）或手机作为写入器（安卓）
  - 提供进度与成功/失败回执
- 技术选项：
  - 桌面：Electron + Node NFC 模块（适配读写器）
  - 手机：Flutter App 使用 `flutter_nfc_kit` 做写卡（需安卓真机）

## 11. 管理后台（代码重点）
- 功能：
  - 店铺登录（OAuth / JWT），标签批量生成、活动/模板管理、统计面板
- API 与前端配合点：
  - 列出未编码标签、导出 token CSV、触发写卡回调、查看访客流量（分页）
- 安全：
  - RBAC：区分店铺管理员与普通员工
  - 所有敏感操作需审核日志

## 12. CI/CD、部署与监控（开发）
- Dockerize 后端与 AI 微服务，使用 CI 构建镜像并推送到私有 Registry  
- 推荐流程：
  - PR -> 自动测试（单元 + 集成） -> 构建镜像 -> 部署到 staging -> 手动验证 -> 部署到 prod
- 监控：
  - 应用指标（Prometheus）、日志（ELK / Cloud logging）、错误跟踪（Sentry）

## 13. 安全与隐私要点（代码实现注意）
- 不在 NFC 标签上写入敏感信息（例如支付信息、个人数据）  
- 后端对 token 实施速率限制与防滥用策略（per-token rate limit）  
- 个人/用户数据遵循当地法律（如 GDPR/中国网络安全法）  

## 14. 测试计划（代码层）
- 单元测试：后端核心逻辑（token解析、AI prompt 模块）、移动端 NFC 解析模块  
- 集成测试：API + DB，Mock LLM 返回结果  
- E2E：模拟标签读取 -> 请求后端 -> 展示流程（使用真实设备或云测试设备）  
- 兼容性：在多型号 Android 机、主流 iPhone 上测试 NFC 行为

## 15. 开发任务拆解（按角色，含验收标准）
- Backend (FastAPI) — 约 3 周
  - 任务：
    1. 项目骨架与 Dockerfile、CI（1 天）
    2. 实现 token 路由 GET /t/{token}（2 天）
    3. 实现 tag 批量生成接口（2 天）
    4. 实现 AI proxy /ai/generate（3 天）
    5. 实现基本统计接口（2 天）
  - 验收：所有接口有 OpenAPI 文档与单元测试，能处理并发 200 qps（根据 SLA）

- Mobile (Flutter) — 约 3 周
  - 任务：
    1. NFC 读取模块（权限、解析、错误兜底）(1 周)
    2. 内容展示页（支持图片、文本、分享）(1 周)
    3. H5 兜底与二维码展示(2 天)
    4. 集成测试与打包(2 天)
  - 验收：在至少 3 款 Android 机型上成功读取并展示；在 iOS 上提供兜底体验

- Admin Frontend — 约 2 周
  - 任务：店铺登录、标签管理、导出 CSV、触发写卡（接口联调）
  - 验收：能生成 token CSV 并触发写卡任务

- 写卡工具 — 约 1–2 周（取决于选项）
  - 任务：实现 CSV 导入、写卡逻辑、错误回滚
  - 验收：对 100 张标签批量写入成功率 > 98%

## 16. 典型开发日程（并行团队，6 人）
- 周 0: 环境搭建、API 设计（OpenAPI）、DB schema 确认  
- 周 1–2: 后端核心实现 + 移动端 NFC 基础实现 + 管理后台骨架  
- 周 3–4: AI 集成、写卡工具、功能联调、初步 QA  
- 周 5: 兼容性测试、bugfix、部署到 staging

## 17. 示例代码片段（伪代码）
- token 路由（Python / FastAPI, 伪代码）：

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/t/{token}")
async def resolve_token(token: str):
    tag = await db.get_tag_by_token(token)
    if not tag:
        raise HTTPException(status_code=404, detail="Token not found")
    content = await db.get_content_for_tag(tag.id)
    return {"type":"content", "content": content}
```

## 18. 接口契约样例（OpenAPI 快照）
- 示例：GET /t/{token} -> 200 JSON 包含 shop 与 content（详见代码仓 docs/openapi.yml）

## 19. 验收标准（代码层）
- 所有关键 API 覆盖单元测试，CI 流程通过  
- NFC 读取并触发后端请求延迟 < 500ms（不含网络）  
- 写卡工具批量写入成功率 > 98%（在指定写卡器上）

## 20. 交付清单与交付顺序
1. OpenAPI 文档与 DB schema SQL  
2. 后端服务 Docker 镜像（含测试用例）  
3. 移动端测试包（APK / TestFlight）  
4. 写卡工具可执行文件或安装包  
5. 管理后台可用版本  
6. 部署脚本与监控配置

---

如果你同意上述方向，我会：
 - 把文档加入仓库（已完成此次动作）  
 - 把上述“开发任务拆解”换成更加细化的 issue 列表（每一项带明确代码文件/函数目标）并写入 `issues/` 或者 `board`（根据你的偏好）  
 - 若需要，我可以把后端示例项目脚手架（FastAPI + Alembic + Docker）和 Flutter NFC demo scaffold 直接生成到代码仓库作为启动模板。

请告诉我你希望我接下来做哪项：  
- A) 生成后端示例脚手架并提交到仓库  
- B) 生成移动端（Flutter）NFC demo 并提交到仓库  
- C) 把任务细化为可直接分配的 issue 列表并写入仓库  
- D) 先不做代码，仅继续完善文档（如增加 OpenAPI 示例）


