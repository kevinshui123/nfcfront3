# 最终交付说明（快速查看）

包含本次交付的关键文件、运行与测试命令，以及视觉烟雾测试报告链接。

- 前端构建产物：`admin_frontend/dist/`
- 视觉烟雾截图：`admin_frontend/e2e/visual-screenshots/`
- 视觉报告（快速查看）：`admin_frontend/e2e/visual-report.html`

## 本地快速运行（非 Docker）

1. 后端（Windows PowerShell）

   ```powershell
   # 在 backend 目录下创建并激活 venv，然后安装依赖
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements_dev.txt
   # 使用 SQLite dev.db（已配置）
   setx DATABASE_URL "sqlite+aiosqlite:///./dev.db"
   uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
   ```

2. 前端（Windows PowerShell）

   ```powershell
   cd admin_frontend
   npm install
   npm run dev
   # 或使用生产构建
   npm run build
   npx serve -s dist -l 5173
   ```

## 运行测试

- 后端单元与集成：在仓库根目录执行 `pytest`
- 前端 E2E（Playwright）：`cd admin_frontend/e2e && run_playwright_test.bat`
- 视觉烟雾截图位置：`admin_frontend/e2e/visual-screenshots/`

## 下一步建议

- 如果你需要视觉回归差异（baseline vs current），我可以：
  - 生成 baseline 截图并运行 pixel-compare
  - 输出差异图并在报告中标注

如需我继续生成 baseline 并做差异比对，请回复“生成 baseline 并比较”。我现在把视觉报告写入仓库已完成。 


