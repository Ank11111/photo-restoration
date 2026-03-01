import React, { useState } from 'react';

type Step = 'upload' | 'processing' | 'complete';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('upload');
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [originalImage, setOriginalImage] = useState<string>('');
  const [restoredImage, setRestoredImage] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('请上传 JPG 或 PNG 格式的图片');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    // 读取图片
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setOriginalImage(base64);

      // 开始处理
      setStep('processing');
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageBase64: string) => {
    const tasks = [
      { name: '修复划痕和噪点', duration: 8000 },
      { name: '提升清晰度', duration: 8000 },
      { name: '黑白转彩色', duration: 8000 },
    ];

    let currentProgress = 0;
    const progressStep = 100 / tasks.length;

    for (const task of tasks) {
      setCurrentTask(task.name);

      // 模拟API调用进度
      const progressInterval = setInterval(() => {
        currentProgress += 2;
        if (currentProgress >= progressStep * (tasks.indexOf(task) + 1)) {
          clearInterval(progressInterval);
        }
        setProgress(Math.min(currentProgress, 100));
      }, 160);

      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, task.duration));
      clearInterval(progressInterval);
    }

    // 处理完成（这里应该返回真实的修复后图片）
    setRestoredImage(imageBase64); // 暂时使用原图
    setStep('complete');
  };

  const handleSave = () => {
    // 触发下载
    const link = document.createElement('a');
    link.href = restoredImage;
    link.download = 'restored-photo.png';
    link.click();
  };

  const handleReset = () => {
    setStep('upload');
    setProgress(0);
    setCurrentTask('');
    setOriginalImage('');
    setRestoredImage('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {step === 'upload' && (
        <div className="w-full max-w-md">
          <h1 className="text-2xl text-center mb-2">老照片修复</h1>
          <p className="text-center text-gray-600 mb-8">让记忆更清晰</p>

          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-primary rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-6xl mb-4">📷</span>
              <p className="text-xl text-primary font-medium">点击上传照片</p>
              <p className="text-sm text-gray-500 mt-2">支持 JPG / PNG 格式</p>
              <p className="text-sm text-gray-500">最大 10MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png"
              onChange={handleFileUpload}
            />
          </label>

          <div className="flex justify-between items-center mt-8 px-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-sm">上传</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-400">处理中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-400">完成</span>
            </div>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="w-full max-w-md text-center">
          <h2 className="text-xl mb-8">正在修复您的照片...</h2>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-primary h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <p className="text-lg text-gray-600 mb-2">{progress}%</p>
          <p className="text-sm text-gray-500">{currentTask}</p>
        </div>
      )}

      {step === 'complete' && (
        <div className="w-full max-w-md">
          <h2 className="text-xl text-center mb-6">修复完成！</h2>

          <div className="relative mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <img
                  src={originalImage}
                  alt="修复前"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-gray-600 mt-2">修复前</p>
              </div>
              <div className="text-center">
                <img
                  src={restoredImage}
                  alt="修复后"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-sm text-primary font-medium mt-2">修复后</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSave}
              className="w-full bg-primary text-white py-4 px-6 rounded-xl text-xl font-medium hover:bg-primaryHover transition-colors"
            >
              保存到手机相册
            </button>
            <button
              onClick={handleReset}
              className="w-full bg-gray-200 text-gray-700 py-4 px-6 rounded-xl text-xl font-medium hover:bg-gray-300 transition-colors"
            >
              再修复一张
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;