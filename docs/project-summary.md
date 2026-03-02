# 老照片修复工具 — 项目总结

## 产品概述

为父母制作的老照片修复网页工具，手机浏览器直接访问，上传照片后一键自动完成修复，无需任何操作技巧。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + TypeScript + Tailwind CSS |
| 托管 | Vercel（免费，香港节点） |
| 后端代理 | Vercel Serverless Functions |
| 图片存储 | 阿里云 OSS（华东2 上海区域） |
| AI 能力 | 阿里云视觉智能开放平台（imageenhan + facebody） |

---

## AI 处理流程

```
用户上传照片
    ↓
上传至阿里云 OSS（上海）
    ↓
Step 1: EnhanceFace（facebody 服务）
        人脸修复增强，去噪、提升清晰度、细节增强
    ↓
Step 2: MakeSuperResolutionImage（imageenhan 服务）
        超分辨率放大 2 倍（分辨率超限时自动跳过）
    ↓
Step 3: ColorizeImage（imageenhan 服务）
        黑白照片自动上色（彩色照片或报错时自动跳过）
    ↓
返回最终图片 URL → 前端展示修复前/后对比 + 下载
```

---

## 阿里云 API 信息

| API | 所属服务 | Endpoint | Version |
|-----|----------|----------|---------|
| EnhanceFace | facebody | facebody.cn-shanghai.aliyuncs.com | 2019-12-30 |
| MakeSuperResolutionImage | imageenhan | imageenhan.cn-shanghai.aliyuncs.com | 2019-09-30 |
| ColorizeImage | imageenhan | imageenhan.cn-shanghai.aliyuncs.com | 2019-09-30 |

---

## 关键配置

**Vercel 环境变量**

| 变量名 | 说明 |
|--------|------|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret |
| `OSS_BUCKET_NAME` | OSS Bucket 名称（上海区域） |
| `OSS_REGION` | `oss-cn-shanghai` |

**vercel.json**

```json
{
  "version": 2,
  "functions": {
    "api/restore.js": {
      "maxDuration": 300
    }
  },
  "regions": ["hkg1"]
}
```

> 函数部署在香港节点（hkg1），减少连接上海 OSS 的网络延迟。

**OSS 客户端**

```js
const ossClient = new OSS({
  region: OSS_REGION,
  accessKeyId: ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: ALIYUN_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET_NAME,
  timeout: 120000,
  secure: true,   // 必须开启，Vercel 节点屏蔽 HTTP 80 端口
});
```

---

## 踩过的坑

| 问题 | 原因 | 解法 |
|------|------|------|
| `InvalidVersion` | API 版本号写成 `2020-09-30` | 改为 `2019-09-30` |
| `InvalidVersion` | Endpoint 用了 `viapi.cn-shanghai` | 改为 `imageenhan.cn-shanghai` |
| `MissingOutputFormat` | EnhanceImageColor 必填参数缺失 | 补充 `OutputFormat: 'jpg'` |
| `MissingMode` | EnhanceImageColor 必填参数缺失 | 补充 `Mode: 'ln17_256'` |
| `InvalidAction.NotFound` | SuperResolution Action 名错误 | 改为 `MakeSuperResolutionImage` |
| `InvalidImage.Region` | OSS Bucket 在杭州，API 只支持上海 | 迁移 Bucket 到上海区域 |
| `InvalidParameter` | Mode 值 `Auto` 不合法 | 改为 `ln17_256` |
| `InvalidAction.NotFound` | EnhanceFace 不属于 imageenhan | 改用 `facebody.cn-shanghai` endpoint |
| `InvalidApi.NotPurchase` | facebody 服务未开通 | 在阿里云控制台购买激活 |
| `InvalidImage.Resolution` | EnhanceFace 输出超过超分接口分辨率限制 | 超分失败时自动跳过 |
| OSS 上传超时 | Vercel 美国节点连上海 OSS 延迟高 | 将函数部署到香港节点 `hkg1` |
| OSS 连接超时（ETIMEDOUT 80） | OSS 默认使用 HTTP，Vercel 节点屏蔽 80 端口 | 添加 `secure: true` 走 HTTPS |
| 进度条不动 | 前端单次请求等待，期间无进度更新 | 用定时器模拟进度，每 300ms 涨 1% |

---

## 与 Claude 协作的流程

### 开发阶段

1. **用 `/brainstorming` 命令启动需求讨论**，Claude 会逐步提问澄清需求（平台、技术选型、UI 风格等），最终生成设计文档
2. 设计确认后，Claude 直接克隆 GitHub 仓库、修改代码、commit 并 push

### 遇到报错时

把 **Vercel 日志完整复制**给 Claude，格式如：
```
2026-03-02 12:22:03 [error] API Error: { Code: 'xxx', Message: 'xxx' }
```
Claude 会：
- 定位错误原因
- 如果不确定（如参数合法值），先查阿里云文档再改
- 直接修改代码并推送，不需要你手动操作

### 推送权限

Claude 没有 GitHub 写权限，每次需要你提供 **Personal Access Token（classic）**，勾选 `repo` 权限。

> 注意：Token 出现在对话记录里，**用完立即去 GitHub 删掉**，防止泄露。

### 回滚

如果某次修改效果不好，直接说「回滚」，Claude 会执行 `git revert` 还原到上一个版本并推送。

### 有效的提问方式

| 场景 | 推荐说法 |
|------|----------|
| 报错了 | 把完整日志贴过来，说「改一下」 |
| 效果不好 | 描述具体哪里不好，Claude 会提方案后再改 |
| 不确定某个技术决策 | 直接问「为什么」，Claude 会解释依据 |
| 想看某个 API 参数 | 把文档链接发过来，Claude 会查后再动手 |
| 改完想撤销 | 说「回滚」即可 |

---

## 项目结构

```
photo-restoration/
├── api/
│   └── restore.js          # Vercel Serverless Function，AI 处理逻辑
├── src/
│   └── App.tsx             # 前端主页面（上传 → 处理中 → 完成）
├── docs/
│   └── plans/              # 设计文档
├── vercel.json             # Vercel 部署配置
└── package.json
```
