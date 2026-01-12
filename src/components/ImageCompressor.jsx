import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import './ImageCompressor.css';

const MAX_FILES = 50;

const ImageCompressor = () => {
    const [files, setFiles] = useState([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionQuality, setCompressionQuality] = useState(0.8);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
    };

    const addFiles = (selectedFiles) => {
        const currentCount = files.length;
        const availableSlots = MAX_FILES - currentCount;

        if (availableSlots <= 0) {
            alert(`최대 ${MAX_FILES}장까지만 업로드 가능합니다.`);
            return;
        }

        const filesToAdd = selectedFiles.slice(0, availableSlots);
        if (selectedFiles.length > availableSlots) {
            alert(`${availableSlots}개의 이미지만 추가되었습니다 (최대 ${MAX_FILES}장).`);
        }

        const newFiles = filesToAdd.map(file => {
            const extension = file.name.split('.').pop().toUpperCase();
            return {
                id: Math.random().toString(36).substr(2, 9),
                file,
                name: file.name,
                extension,
                originalSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                compressedSize: null,
                compressedBlob: null,
                status: 'pending', // pending, compressing, completed, error
                progress: 0
            };
        });
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const compressAll = async () => {
        if (files.length === 0) return;
        setIsCompressing(true);

        const options = {
            maxSizeMB: 10,
            useWebWorker: true,
            initialQuality: compressionQuality,
            alwaysKeepResolution: true,
        };

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === 'completed') continue;

            try {
                const currentFileId = files[i].id;
                setFiles(prev => prev.map(f => f.id === currentFileId ? { ...f, status: 'compressing' } : f));

                const compressedFile = await imageCompression(files[i].file, {
                    ...options,
                    onProgress: (p) => {
                        setFiles(prev => prev.map(f => f.id === currentFileId ? { ...f, progress: p } : f));
                    }
                });

                setFiles(prev => prev.map(f => f.id === currentFileId ? {
                    ...f,
                    compressedBlob: compressedFile,
                    compressedSize: (compressedFile.size / 1024 / 1024).toFixed(2) + ' MB',
                    status: 'completed',
                    progress: 100
                } : f));

            } catch (error) {
                console.error('Compression error:', error);
                const currentFileId = files[i].id;
                setFiles(prev => prev.map(f => f.id === currentFileId ? { ...f, status: 'error' } : f));
            }
        }

        setIsCompressing(false);
    };

    const downloadFile = (file) => {
        if (!file.compressedBlob) return;
        const url = URL.createObjectURL(file.compressedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadAll = async () => {
        const completedFiles = files.filter(f => f.status === 'completed');
        if (completedFiles.length === 0) return;

        const zip = new JSZip();
        completedFiles.forEach(f => {
            zip.file(f.name, f.compressedBlob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'compressed_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const totalProgress = files.length > 0
        ? Math.round(files.reduce((acc, f) => acc + (f.progress || 0), 0) / files.length)
        : 0;

    return (
        <div className="image-compressor-container">
            <header className="compressor-header">
                <h1 className="compressor-title">이미지 용량 줄이기</h1>
                <p className="compressor-subtitle">해상도를 유지하고 이미지 용량을 줄여보세요.</p>
            </header>

            <main className="compressor-main">
                <aside className="compressor-sidebar">
                    <div className="sidebar-sticky-wrapper">
                        <section className="settings-section">
                            <div className="option-group">
                                <label>압축 품질 ({compressionQuality})</label>
                                <div className="range-wrapper">
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.05"
                                        value={compressionQuality}
                                        onChange={(e) => setCompressionQuality(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="status-section">
                            <div className="status-card">
                                <label>전체 진행률</label>
                                <div className="progress-container">
                                    <div className="progress-circle-large">
                                        <svg viewBox="0 0 36 36">
                                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="circle" strokeDasharray={`${totalProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                        <span className="progress-text">{totalProgress}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="status-card">
                                <label>파일 상태</label>
                                <div className="stats-info">
                                    <span>선택된 파일: <strong>{files.length}</strong> / {MAX_FILES}</span>
                                    <span>압축 완료: <strong>{files.filter(f => f.status === 'completed').length}</strong></span>
                                </div>
                            </div>
                            <div className="sidebar-buttons">
                                <button
                                    className="btn-primary"
                                    onClick={compressAll}
                                    disabled={isCompressing || files.length === 0 || files.every(f => f.status === 'completed')}
                                >
                                    {isCompressing ? '압축 중...' : '모두 압축하기'}
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={downloadAll}
                                    disabled={!files.some(f => f.status === 'completed')}
                                >
                                    ZIP 다운로드
                                </button>
                                <button className="btn-outline" onClick={() => setFiles([])} disabled={isCompressing}>
                                    전체 삭제
                                </button>
                            </div>
                        </section>
                    </div>
                </aside>

                <div className="compressor-workspace">
                    <section
                        className={`workspace-card ${files.length > 0 ? 'has-files' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            addFiles(Array.from(e.dataTransfer.files));
                        }}
                    >
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            id="file-upload"
                            hidden
                        />

                        <label htmlFor="file-upload" className={files.length === 0 ? "dropzone-label-full" : "dropzone-label-compact"}>
                            <div className="icon-pulse">📁</div>
                            <p className="primary-text">파일을 드래그하거나 클릭해서 첨부해 주세요 (최대 50장)</p>
                        </label>

                        {files.length > 0 && (
                            <div className="list-container">
                                <div className="list-header">
                                    <span className="file-count">현재 <strong>{files.length}</strong>개 첨부됨</span>
                                </div>
                                <div className="file-grid">
                                    {files.map(file => (
                                        <div key={file.id} className={`file-card ${file.status}`}>
                                            <div className="file-info">
                                                <div className="file-header">
                                                    <span className={`extension-badge ${file.extension.toLowerCase()}`}>
                                                        {file.extension}
                                                    </span>
                                                    <div className="file-name" title={file.name}>{file.name}</div>
                                                </div>
                                                <div className="file-size-info">
                                                    <span>{file.originalSize}</span>
                                                    {file.compressedSize && (
                                                        <span className="compressed-size"> → {file.compressedSize}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="file-actions">
                                                {file.status === 'compressing' && (
                                                    <div className="file-progress-circle">
                                                        <svg viewBox="0 0 36 36">
                                                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                            <path className="circle" strokeDasharray={`${file.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {file.status === 'completed' && (
                                                    <button className="btn-download-small" onClick={() => downloadFile(file)} title="다운로드">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                            <polyline points="7 10 12 15 17 10" />
                                                            <line x1="12" y1="15" x2="12" y2="3" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {file.status !== 'compressing' && (
                                                    <button className="btn-remove-small" onClick={() => removeFile(file.id)} title="삭제">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M18 6 6 18" />
                                                            <path d="m6 6 12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <footer className="compressor-footer">
                <p>© 2026 프리미엄 대량 이미지 압축기 - All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default ImageCompressor;
