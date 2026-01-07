import { useState, useRef } from 'react';
import './ImageUploader.css';

const ImageUploader = ({ onImageSelect }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
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

        // Create URL for preview
        const imageUrl = URL.createObjectURL(file);
        onImageSelect(imageUrl, file.name);
    };

    const handleZoneClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="upload-container">
            <div
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
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
                />

                <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>

                <div className="upload-text">
                    <h3>사진을 여기에 놓으세요</h3>
                    <p>또는 클릭하여 파일을 선택하세요</p>
                </div>
            </div>
        </div>
    );
};

export default ImageUploader;
