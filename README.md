# 老照片修复工具

一个简单易用的老照片修复工具，专为非技术用户设计。

## 功能

- 老照片修复（去划痕、去噪点、还原褪色）
- 超分辨率放大（提升清晰度）
- 黑白转彩色（自动检测并上色）

## 技术栈

- 前端：React + TypeScript + Tailwind CSS
- 后端：Vercel Serverless Functions
- AI API：阿里云视觉智能开放平台

## 本地开发

```bash
npm install
npm start
```

## 环境变量

在 Vercel 中配置以下环境变量：

- `ALIYUN_ACCESS_KEY_ID` - 阿里云 Access Key ID
- `ALIYUN_ACCESS_KEY_SECRET` - 阿里云 Access Key Secret