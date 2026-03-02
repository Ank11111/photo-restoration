const crypto = require('crypto');
const OSS = require('ali-oss');

const ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID || '';
const ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET || '';
const OSS_BUCKET_NAME = process.env.OSS_BUCKET_NAME || '';
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-shanghai';

// 初始化 OSS 客户端
const ossClient = new OSS({
  region: OSS_REGION,
  accessKeyId: ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: ALIYUN_ACCESS_KEY_SECRET,
  bucket: OSS_BUCKET_NAME,
});

// 上传 Base64 图片到 OSS
async function uploadBase64ToOSS(base64Image) {
  // 移除 Base64 前缀
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // 生成唯一文件名
  const fileName = `restored/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;

  // 上传到 OSS
  const result = await ossClient.put(fileName, buffer);

  // 返回公共访问 URL
  return result.url;
}

// 计算阿里云 API 签名
function calculateAliyunSignature(method, params) {
  const endpoint = 'https://imageenhan.cn-shanghai.aliyuncs.com';
  const path = '/';

  const sortedParams = Object.keys(params).sort();
  const canonicalizedQueryString = sortedParams
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const stringToSign = `${method}&${encodeURIComponent(path)}&${encodeURIComponent(canonicalizedQueryString)}`;

  return crypto
    .createHmac('sha1', `${ALIYUN_ACCESS_KEY_SECRET}&`)
    .update(stringToSign)
    .digest('base64');
}

// 调用阿里云视觉智能 API
async function callAliyunAPI(action, extraParams) {
  const endpoint = 'https://imageenhan.cn-shanghai.aliyuncs.com';
  const method = 'POST';

  const params = {
    Action: action,
    Version: '2019-09-30',
    Format: 'JSON',
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: Math.random().toString(36).substring(2),
    Timestamp: new Date().toISOString(),
    ...extraParams,
  };

  // 计算签名
  const signature = calculateAliyunSignature(method, params);
  params.Signature = signature;

  // 发送请求
  const response = await fetch(endpoint + '?' + new URLSearchParams(params), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('API Error:', data);
    throw new Error(`API Error: ${JSON.stringify(data)}`);
  }

  if (!data.Data || (!data.Data.ImageURL && !data.Data.Url)) {
    console.error('Invalid response:', data);
    throw new Error('Invalid API response');
  }

  return data.Data.ImageURL || data.Data.Url;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data required' });
  }

  try {
    console.log('Step 0: Upload image to OSS');
    const imageUrl = await uploadBase64ToOSS(image);
    console.log('Image uploaded:', imageUrl);

    // 步骤1: 老照片修复
    console.log('Step 1: EnhanceImageColor');
    const enhancedImage = await callAliyunAPI('EnhanceImageColor', {
      ImageURL: imageUrl,
      OutputFormat: 'jpg',
      Mode: 'ln17_256',
    });
    console.log('Enhanced:', enhancedImage);

    // 步骤2: 超分辨率放大
    console.log('Step 2: MakeSuperResolutionImage');
    const superResImage = await callAliyunAPI('MakeSuperResolutionImage', {
      Url: enhancedImage,
      OutputFormat: 'jpg',
      UpscaleFactor: 2,
    });
    console.log('Super resolution:', superResImage);

    // 步骤3: 黑白转彩色（需要先检测是否黑白）
    // 暂时跳过，因为检测功能需要额外 API
    console.log('Step 3: Colorize (skipped for now)');

    return res.status(200).json({
      success: true,
      image: superResImage,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process image',
    });
  }
};