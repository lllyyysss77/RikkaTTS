# 🔮 Rikka-TTS | 邪王真眼共鸣装置

Rikka-TTS 是一款基于 [SiliconFlow (硅基流动)](https://siliconflow.cn/) API 构建的现代化、跨平台文本转语音 (TTS) 客户端。它拥有极具中二病风格的魔法 UI 设计，专为移动端与桌面端提供丝滑的沉浸式体验。

![Project Logo/Preview Placeholder](#) *(如果有截图可以放在这里)*

## ✨ 核心特性

- **🚀 零延迟连发系统 (Chain Casting)**
  - 支持真正的多线程并发生成。不受前一条语音生成加载的限制，疯狂连发、后台并行提速。
  - 内置自动追播（Auto-Play）队列，无缝念出长段分段文本。
  
- **🔊 智能音色管理**
  - 无缝接入 SiliconFlow 的多种 TTS 大模型 (如 `IndexTTS-2`, `CosyVoice2-0.5B`, `MOSS-TTSD` 等)。
  - 支持 **自定义音色克隆与上传**，一次上传即可在云端漫步。
  - 提供本地持久化的“自命名”系统，将晦涩的官方 ID 改成你最喜欢的专属昵称。

- **📱 极致的移动端适配 (Mobile-First)**
  - 采用流体卡片布局、亚克力（毛玻璃）模糊背景效果。
  - 精心调整的防误触大按钮 (44px 黄金触控区) 和适配手机屏幕的弹窗。
  - 滚动时自动吸顶吸底，在移动端浏览器（包括内置浏览器）中也能拥有接近原生 App 的手感。

- **🔗 原生社交分享**
  - 利用 Web Share API，在支持的设备上一键拉起系统原生分享面板，直接发送语音 mp3 文件至微信、Telegram 等社交软件。
  - 针对不支持原生分享的场景（如 HTTP 局域网）提供智能降级或 HTTPS 本地测试方案。

- **💰 精准的算力消耗监控**
  - 内置字符/字节计费预估系统。
  - 发送按钮下方常驻显示当前任务的预估 ¥ 消耗，每按一次都心中有数。

## 🛠️ 技术栈

此应用是一个纯前端 (Client-Side) SPA，完全由本地浏览器驱动。

- **框架**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **音频引擎**: HTML5 `<audio>` + Web Audio API (实时波形可视化)
- **存储方案**: 浏览器 `localStorage` 持久化保存密钥、音色设置和历史记录

## 📦 本地开发与运行

### 1. 克隆项目 & 安装依赖

```bash
git clone <你的仓库地址>
cd RikkaTTS
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

> **局域网真机调试提示**: 
> 默认情况下，我们在 `vite.config.ts` 中启用了 `@vitejs/plugin-basic-ssl` 插件。这意味着当您使用 `npm run dev -- --host` 在局域网中测试时，它会自动提供 HTTPS 服务（以突破手机浏览器对原生分享功能的 HTTP 限制）。

### 3. 构建生产版本

```bash
npm run build
```
输出的文件将在 `dist` 文件夹中，可以直接部署到 Zeabur, Vercel, Netlify 或任何静态页面托管服务。

## ⚙️ 快速上手

1. 启动项目并打开网页。
2. 点击右上角 **菜单 (Menu)**。
3. 在设置面板中填入你在 **SiliconFlow** 申请的 API 密钥。
4. 返回主页，点击顶部 **配置选择** 按钮挑选模型和音色（或上传自己的音频进行音色克隆）。
5. 在下方魔法书输入框中输入咒语，即可召唤语音！

## 🤝 贡献与反馈

欢迎提交 Issue 和 Pull Request，或者分享你发现的有趣音色组合！

---
*"被漆黑烈焰吞噬殆尽吧！(Dark Flame Master!)"*