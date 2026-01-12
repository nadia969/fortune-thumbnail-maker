import { useState, useRef } from 'react';
import './ImageUploader.css';

const ImageUploader = ({ onUpload, isProcessing }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isProcessing) return;
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isProcessing) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const processFile = (file) => {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드해주세요.');
            return;
        }

        onUpload(file);
    };

    const handleZoneClick = () => {
        if (isProcessing) return;
        fileInputRef.current?.click();
    };

    return (
        <div className="upload-container">
            <div
                className={`drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleZoneClick}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden-input"
                    accept="image/*"
                    onChange={handleFileInput}
                    disabled={isProcessing}
                />

                {isProcessing ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>배경을 제거하는 중입니다...</p>
                    </div>
                ) : (
                    <>
                        <img src="/icon_gallery.png" alt="Upload" className="upload-icon-img" />
                        <div className="upload-text">
                            <h3>파일을 드래그하거나<br />클릭해서 첨부해 주세요</h3>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;
