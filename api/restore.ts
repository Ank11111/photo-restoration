import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID || '';
const ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET || '';

// 阿里云 API 签名算法
function sign(
  method: string,
  path: string,
  params: Record<string, string>,
  headers: Record<string, string>
): string {
  const timestamp = new Date().toISOString();
  const nonce = Math.random().toString(36).substring(2);

  // 构造签名字符串
  const stringToSign = [
    method.toUpperCase(),
    headers['Content-Type'] || 'application/x-www-form-urlencoded',
    headers['Content-MD5'] || '',
    headers['Date'] || timestamp,
    path,
  ].join('\n');

  // HMAC-SHA1 签名
  const signature = crypto
    .createHmac('sha1', ALIYUN_ACCESS_KEY_SECRET)
    .update(stringToSign)
    .digest('base64');

  return signature;
}

// 调用阿里云视觉智能 API
async function callAliyunAPI(
  action: string,
  imageURL: string
): Promise<string> {
  const endpoint = 'https://viapi.cn-shanghai.aliyuncs.com';
  const path = '/';
  const method = 'POST';

  const params = {
    Action: action,
    Version: '2020-09-30',
    Format: 'JSON',
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: Math.random().toString(36).substring(2),
    Timestamp: new Date().toISOString(),
    ImageURL: imageURL,
  };

  // 计算签名
  const canonicalizedQueryString = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key as keyof typeof params])}`)
    .join('&');

  const stringToSign = `${method}&${encodeURIComponent('/')}&${encodeURIComponent(canonicalizedQueryString)}`;
  const signature = crypto
    .createHmac('sha1', `${ALIYUN_ACCESS_KEY_SECRET}&`)
    .update(stringToSign)
    .digest('base64');

  params.Signature = signature;

  // 发送请求
  const response = await fetch(endpoint + path + '?' + new URLSearchParams(params), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${JSON.stringify(data)}`);
  }

  return data.Data.ImageURL || imageURL;
}

// 上传图片到 OSS（简化版，使用 Base64）
async function uploadToOSS(base64Image: string): Promise<string> {
  // 实际项目中应该上传到阿里云 OSS
  // 这里暂时返回 base64，实际需要先上传获取 URL
  return base64Image;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data required' });
  }

  try {
    // 上传图片（实际需要上传到 OSS）
    const imageUrl = await uploadToOSS(image);

    // 步骤1: 老照片修复
    console.log('Step 1: EnhanceImageColor');
    const enhancedImage = await callAliyunAPI('EnhanceImageColor', imageUrl);

    // 步骤2: 超分辨率放大
    console.log('Step 2: SuperResolution');
    const superResImage = await callAliyunAPI('SuperResolution', enhancedImage);

    // 步骤3: 检测是否黑白，是则上色
    // 暂时跳过，需要先实现黑白检测
    console.log('Step 3: Check if black and white and colorize (skipped)');

    return res.status(200).json({
      success: true,
      image: superResImage,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process image',
    });
  }
}