import { useState } from 'react';
import './App.css';
import ThumbnailMaker from './components/ThumbnailMaker';
import ImageCompressor from './components/ImageCompressor';

function App() {
  const [activeTool, setActiveTool] = useState('thumbnail');

  const handleToolChange = (tool) => {
    setActiveTool(tool);
    localStorage.setItem('activeTool', tool); // We can keep writing to it, or remove it. Let's keep writing just in case they want it back later, but reading is disabled.
  };

  return (
    <div className="main-app-container">
      {/* Global Tool Navigation */}
      <nav className="tool-nav">
        <div className="tool-toggle">
          <div className={`toggle-slider ${activeTool}`}></div>
          <button
            className={`tool-toggle-btn ${activeTool === 'thumbnail' ? 'active' : ''}`}
            onClick={() => handleToolChange('thumbnail')}
          >
            썸네일 메이커
          </button>
          <button
            className={`tool-toggle-btn ${activeTool === 'compressor' ? 'active' : ''}`}
            onClick={() => handleToolChange('compressor')}
          >
            이미지 용량 줄이기
          </button>
        </div>
      </nav>

      {/* Tool Content */}
      <div className="tool-view">
        {activeTool === 'thumbnail' ? (
          <ThumbnailMaker />
        ) : (
          <ImageCompressor />
        )}
      </div>
    </div>
  )
}

export default App
