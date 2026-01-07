import { useState, useRef, useEffect, useCallback } from 'react';
import './Editor.css';

// Increased resolution again for ultra-high quality (4x original = 1544x2056)
const CANVAS_WIDTH = 1544;
const CANVAS_HEIGHT = 2056;
const DISPLAY_WIDTH = 386; // For CSS display
const DISPLAY_HEIGHT = 514;
const EXPORT_QUALITY = 1.0;

const Editor = ({ originalImage, removedBgImage, fileName, onReset }) => {
    const canvasRef = useRef(null);
    const [personImage, setPersonImage] = useState(null); // The low-res mask from API
    const [originalImageObj, setOriginalImageObj] = useState(null); // The high-res original
    const [compositeImage, setCompositeImage] = useState(null); // The high-res cutout

    // Background Images
    const [bgImageObj, setBgImageObj] = useState(null);
    const [activeTab, setActiveTab] = useState('none'); // 'none', 'tarot', 'saju', 'sinjeom'

    // Transform state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const [interactionMode, setInteractionMode] = useState(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialTransform, setInitialTransform] = useState({ scale: 1, x: 0, y: 0 });

    // Load images
    useEffect(() => {
        if (removedBgImage) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = removedBgImage;
            img.onload = () => setPersonImage(img);
        }
    }, [removedBgImage]);

    useEffect(() => {
        if (originalImage) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = originalImage;
            img.onload = () => setOriginalImageObj(img);
        }
    }, [originalImage]);

    // Load Background based on activeTab
    useEffect(() => {
        if (activeTab === 'none') {
            setBgImageObj(null);
            return;
        }

        const img = new Image();
        img.src = `/bg_${activeTab}.jpg`; // Assumes images are in public folder: bg_tarot.jpg, bg_saju.jpg, bg_sinjeom.jpg
        img.onload = () => setBgImageObj(img);
    }, [activeTab]);

    // Generate High-Res Composite (Masking)
    useEffect(() => {
        if (personImage && originalImageObj) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImageObj.width;
            tempCanvas.height = originalImageObj.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(originalImageObj, 0, 0);
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(personImage, 0, 0, originalImageObj.width, originalImageObj.height);

            const compImg = new Image();
            // compImg.src = tempCanvas.toDataURL('image/png'); // Can be heavy
            // Optimized:
            tempCanvas.toBlob(blob => {
                compImg.src = URL.createObjectURL(blob);
            });

            compImg.onload = () => {
                setCompositeImage(compImg);
                if (scale === 1) {
                    const fitScale = (CANVAS_HEIGHT * 0.8) / compImg.height;
                    setScale(fitScale);
                }
            };
        } else if (personImage && !originalImageObj) {
            setCompositeImage(personImage);
            if (scale === 1) {
                const fitScale = (CANVAS_HEIGHT * 0.8) / personImage.height;
                setScale(fitScale);
            }
        }
    }, [personImage, originalImageObj]);


    // Draw Function
    const drawCanvas = useCallback((ctx, img, currentScale, currentPos, showOverlay = true, background = null) => {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Draw Background (if exists)
        if (background) {
            ctx.save();
            // Background covers the canvas? stretch or fit? 
            // Usually backgrounds are designed for the ratio. 
            // Let's assume cover/stretch to canvas size.
            ctx.drawImage(background, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }

        if (!img) return;

        // 2. Draw Person
        ctx.save();
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        ctx.translate(cx + currentPos.x, cy + currentPos.y);
        ctx.scale(currentScale, currentScale);

        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        ctx.restore();

        // 3. Draw UI
        if (showOverlay) {
            const boxCenterX = cx + currentPos.x;
            const boxCenterY = cy + currentPos.y;
            const boxWidth = img.width * currentScale;
            const boxHeight = img.height * currentScale;

            const boxLeft = boxCenterX - boxWidth / 2;
            const boxTop = boxCenterY - boxHeight / 2;
            const boxRight = boxCenterX + boxWidth / 2;
            const boxBottom = boxCenterY + boxHeight / 2;

            ctx.strokeStyle = '#693BF2';
            ctx.lineWidth = 4;
            ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

            const handleSize = 50;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#693BF2';
            ctx.lineWidth = 3;

            const handles = [
                { x: boxLeft, y: boxTop },
                { x: boxRight, y: boxTop },
                { x: boxRight, y: boxBottom },
                { x: boxLeft, y: boxBottom },
            ];

            handles.forEach(h => {
                ctx.beginPath();
                ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                ctx.fill();
                ctx.stroke();
            });
        }
    }, []);

    // Effect to drive drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const imgToDraw = compositeImage || personImage;
        drawCanvas(ctx, imgToDraw, scale, position, true, bgImageObj);
    }, [compositeImage, personImage, scale, position, bgImageObj, drawCanvas]);


    const getCanvasPoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const isOnHandle = (px, py, handleX, handleY) => {
        const handleSize = 80;
        return Math.abs(px - handleX) < handleSize && Math.abs(py - handleY) < handleSize;
    };

    const handleMouseDown = (e) => {
        const img = compositeImage || personImage;
        if (!img) return;

        const p = getCanvasPoint(e);

        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        const boxCenterX = cx + position.x;
        const boxCenterY = cy + position.y;
        const boxWidth = img.width * scale;
        const boxHeight = img.height * scale;

        const boxLeft = boxCenterX - boxWidth / 2;
        const boxTop = boxCenterY - boxHeight / 2;
        const boxRight = boxCenterX + boxWidth / 2;
        const boxBottom = boxCenterY + boxHeight / 2;

        setInitialTransform({ scale, x: position.x, y: position.y });
        setDragStart({ x: p.x, y: p.y });
        setIsDragging(true);

        if (isOnHandle(p.x, p.y, boxLeft, boxTop)) { setInteractionMode('resize-tl'); return; }
        if (isOnHandle(p.x, p.y, boxRight, boxTop)) { setInteractionMode('resize-tr'); return; }
        if (isOnHandle(p.x, p.y, boxLeft, boxBottom)) { setInteractionMode('resize-bl'); return; }
        if (isOnHandle(p.x, p.y, boxRight, boxBottom)) { setInteractionMode('resize-br'); return; }

        if (p.x >= boxLeft && p.x <= boxRight && p.y >= boxTop && p.y <= boxBottom) {
            setInteractionMode('pan');
            return;
        }

        setIsDragging(false);
        setInteractionMode(null);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const img = compositeImage || personImage;
        if (!img) return;

        const p = getCanvasPoint(e);
        const dx = p.x - dragStart.x;

        if (interactionMode === 'pan') {
            const dy = p.y - dragStart.y;
            setPosition({
                x: initialTransform.x + dx,
                y: initialTransform.y + dy
            });
        } else if (interactionMode && interactionMode.startsWith('resize')) {
            const imgW = img.width;
            let dirX = 1;
            if (interactionMode === 'resize-br') { dirX = 1; }
            if (interactionMode === 'resize-bl') { dirX = -1; }
            if (interactionMode === 'resize-tr') { dirX = 1; }
            if (interactionMode === 'resize-tl') { dirX = -1; }

            const relativeChangeX = (dx * dirX) / (imgW * initialTransform.scale);
            const newScale = Math.max(0.1, initialTransform.scale * (1 + relativeChangeX));

            setScale(newScale);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setInteractionMode(null);
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const img = compositeImage || personImage;

        // Draw for download: TRANSPARENT background (pass null instead of bgImageObj)
        // User requested preview tabs, but didn't explicitly ask to change download behavior.
        // Usually preview is just for checking fit.
        // I will keep it transparent as per previous heavy reinforcement.
        drawCanvas(ctx, img, scale, position, false, null);

        const link = document.createElement('a');
        const downloadName = fileName ? `${fileName.split('.')[0]}.png` : 'fortune-thumbnail.png';
        link.download = downloadName;
        link.href = canvas.toDataURL('image/png', EXPORT_QUALITY);
        link.click();

        // Restore UI (with background if active)
        drawCanvas(ctx, img, scale, position, true, bgImageObj);
    };

    return (
        <div className="editor-container">
            <div className="editor-content">
                {/* Left Side: Original Image */}
                <div className="image-panel">
                    <h3>원본 이미지</h3>
                    <div className="image-preview-box">
                        <img src={originalImage} alt="Old" />
                    </div>
                </div>

                {/* Right Side: Canvas Editor */}
                <div className="canvas-panel">
                    <div className="category-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'none' ? 'active' : ''}`}
                            onClick={() => setActiveTab('none')}
                        >
                            배경 없음
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'tarot' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tarot')}
                        >
                            타로
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'saju' ? 'active' : ''}`}
                            onClick={() => setActiveTab('saju')}
                        >
                            사주
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'sinjeom' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sinjeom')}
                        >
                            신점
                        </button>
                    </div>

                    <div className="canvas-wrapper">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            style={{ width: `${DISPLAY_WIDTH}px`, height: `${DISPLAY_HEIGHT}px` }}
                            className="editor-canvas"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                        <p className="help-text">이미지 모서리를 드래그하여 크기 조절, 중앙을 드래그하여 이동</p>

                        <div className="zoom-controls floating">
                            <button onClick={() => setScale(s => s - 0.05)}>-</button>
                            <span>{(scale * 100).toFixed(0)}%</span>
                            <button onClick={() => setScale(s => s + 0.05)}>+</button>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="btn-primary" onClick={handleDownload}>고해상도 다운로드 (투명)</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
