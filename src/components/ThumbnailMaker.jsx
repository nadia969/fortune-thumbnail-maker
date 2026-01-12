import { useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import Editor from './Editor';
import ApiKeyInput from './ApiKeyInput';
import { removeBackground } from '@imgly/background-removal';
import './ThumbnailMaker.css';

const ThumbnailMaker = () => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('remove_bg_api_key') || '');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const [removedBgImage, setRemovedBgImage] = useState(null);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');

    const handleImageUpload = async (file) => {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => setOriginalImage(e.target.result);
        reader.readAsDataURL(file);

        setIsProcessing(true);
        setError('');

        try {
            if (apiKey) {
                // Use remove.bg API if key is provided
                const formData = new FormData();
                formData.append('image_file', file);
                formData.append('size', 'auto');

                const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                    method: 'POST',
                    headers: { 'X-Api-Key': apiKey },
                    body: formData,
                });

                if (response.ok) {
                    const blob = await response.blob();
                    setRemovedBgImage(URL.createObjectURL(blob));
                } else {
                    if (response.status === 402) {
                        setShowCreditModal(true);
                    }
                    const err = await response.json();
                    console.warn('API removal failed, falling back to local:', err);
                    // Fallback to local on API error
                    const localBlob = await removeBackground(file);
                    setRemovedBgImage(URL.createObjectURL(localBlob));
                }
            } else {
                // Fallback to local processing if no API key
                const blob = await removeBackground(file);
                setRemovedBgImage(URL.createObjectURL(blob));
            }
        } catch (err) {
            console.error('Removal failed:', err);
            try {
                // Final fallback if anything else fails
                const finalBlob = await removeBackground(file);
                setRemovedBgImage(URL.createObjectURL(finalBlob));
            } catch (finalErr) {
                setError('배경 제거 중 오류가 발생했습니다. 파일을 다시 확인해 주세요.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setOriginalImage(null);
        setRemovedBgImage(null);
        setFileName('');
    };

    return (
        <div className="thumbnail-maker-content">
            <div className="hero-section">
                <div className="brand-logo">
                    <img src="/logo_kmong.png" alt="kmong" />
                </div>

                <div className="hero-text">
                    <h1 style={{ color: '#000000' }}>전화운세 상담사 썸네일 메이커</h1>
                </div>

                <ApiKeyInput onKeyChange={setApiKey} />

                <ImageUploader onUpload={handleImageUpload} isProcessing={isProcessing} />

                {originalImage && (
                    <Editor
                        originalImage={originalImage}
                        removedBgImage={removedBgImage}
                        fileName={fileName}
                        onReset={handleReset}
                    />
                )}

                {error && <div className="error-message">{error}</div>}
            </div>

            {/* Credit Exhaustion Modal */}
            {showCreditModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-icon">⚠️</div>
                        <h3>API 크레딧 소진 안내</h3>
                        <p>
                            등록된 remove.bg API 키의 크레딧이 모두 사용되었습니다.<br />
                            현재는 <strong>자체 엔진(Local Engine)</strong>을 사용하여 배경을 제거하고 있습니다. 서비스 이용에는 차이가 없습니다.
                        </p>
                        <button
                            className="modal-confirm-btn"
                            onClick={() => setShowCreditModal(false)}
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThumbnailMaker;
