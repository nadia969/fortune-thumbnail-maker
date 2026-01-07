import { useState } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import Editor from './components/Editor';
import ApiKeyInput from './components/ApiKeyInput';
import { processImage } from './utils/imageProcessing';

function App() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleImageSelect = async (imageUrl, name) => {
    if (!apiKey) {
      alert("먼저 API Key를 설정해주세요.");
      return;
    }

    setOriginalImage(imageUrl);
    setFileName(name);
    setIsProcessing(true);

    // Start background removal immediately
    try {
      const resultUrl = await processImage(imageUrl, apiKey);
      setProcessedImage(resultUrl);
    } catch (error) {
      console.error(error);
      alert(`오류 발생: ${error.message}`);
      setOriginalImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setFileName('');
  };

  return (
    <div className="app">
      <main className="app-main container">
        <div className="hero-text">
          <h1 style={{ color: '#000000' }}>전화운세 썸네일 메이커</h1>
        </div>

        <ApiKeyInput onKeyChange={setApiKey} />

        <ImageUploader onImageSelect={handleImageSelect} />

        {isProcessing && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>배경 제거 중입니다...</p>
          </div>
        )}

        {originalImage && !isProcessing && processedImage && (
          <Editor
            originalImage={originalImage}
            removedBgImage={processedImage}
            fileName={fileName}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}

export default App
