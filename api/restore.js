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
  timeout: 120000,
  secure: true,
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
async function callAliyunAPI(action, extraParams, endpoint = 'https://imageenhan.cn-shanghai.aliyuncs.com', version = '2019-09-30') {
  const method = 'POST';

  const params = {
    Action: action,
    Version: version,
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

    // 步骤1: 超分辨率放大（原图较小时先放大，给后续修复提供更多细节）
    let superResImage = imageUrl;
    try {
      console.log('Step 1: MakeSuperResolutionImage');
      superResImage = await callAliyunAPI('MakeSuperResolutionImage', {
        Url: imageUrl,
        OutputFormat: 'jpg',
        UpscaleFactor: 2,
      });
      console.log('Super resolution:', superResImage);
    } catch (e) {
      console.log('Step 1 skipped:', e.message);
    }

    // 步骤2: 老照片人脸修复（去噪、增强细节）
    console.log('Step 2: EnhanceFace');
    const enhancedImage = await callAliyunAPI(
      'EnhanceFace',
      { ImageURL: superResImage },
      'https://facebody.cn-shanghai.aliyuncs.com',
      '2019-12-30'
    );
    console.log('Enhanced:', enhancedImage);

    // 步骤3: 黑白转彩色（黑白照片生效，彩色照片跳过）
    let finalImage = enhancedImage;
    try {
      console.log('Step 3: ColorizeImage');
      finalImage = await callAliyunAPI('ColorizeImage', {
        ImageURL: superResImage,
      });
      console.log('Colorized:', finalImage);
    } catch (e) {
      console.log('Step 3 skipped:', e.message);
    }

    return res.status(200).json({
      success: true,
      image: finalImage,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process image',
    });
  }
};