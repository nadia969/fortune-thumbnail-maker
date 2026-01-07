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
            img.crossOrigin = "anonymous"; // Important if images are from external URLs
            img.src = removedBgImage;
            img.onload = () => {
                setPersonImage(img);
            };
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

    // Generate High-Res Composite (Masking)
    useEffect(() => {
        if (personImage && originalImageObj) {
            // Create a temporary canvas at ORIGINAL image resolution
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalImageObj.width;
            tempCanvas.height = originalImageObj.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 1. Draw High-Res Original
            tempCtx.drawImage(originalImageObj, 0, 0);

            // 2. Apply Mask (Low-Res personImage scaled up)
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(personImage, 0, 0, originalImageObj.width, originalImageObj.height);

            // 3. Save as Image object for efficient drawing
            const compImg = new Image();
            compImg.src = tempCanvas.toDataURL('image/png');
            compImg.onload = () => {
                setCompositeImage(compImg);

                // Set initial scale to fit based on the NEW composite dimensions
                // Only if scale hasn't been touched yet? Or always reset?
                // Better to set initial scale only once.
                // We'll trust the user to zoom if needed, or set default.
                // Default fit:
                if (scale === 1) {
                    const fitScale = (CANVAS_HEIGHT * 0.8) / compImg.height;
                    setScale(fitScale);
                }
            };
        } else if (personImage && !originalImageObj) {
            // Fallback if original didn't load for some reason (rare)
            setCompositeImage(personImage);
            if (scale === 1) {
                const fitScale = (CANVAS_HEIGHT * 0.8) / personImage.height;
                setScale(fitScale);
            }
        }
    }, [personImage, originalImageObj]);


    // Draw Function
    const drawCanvas = useCallback((ctx, img, currentScale, currentPos, showOverlay = true) => {
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Ensure smoothing is high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (!img) return;

        ctx.save();
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        ctx.translate(cx + currentPos.x, cy + currentPos.y);
        ctx.scale(currentScale, currentScale);

        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        ctx.restore();

        // Draw Transform Controls (Overlay)
        if (showOverlay) {
            const boxCenterX = cx + currentPos.x;
            const boxCenterY = cy + currentPos.y;
            const boxWidth = img.width * currentScale;
            const boxHeight = img.height * currentScale;

            const boxLeft = boxCenterX - boxWidth / 2;
            const boxTop = boxCenterY - boxHeight / 2;
            const boxRight = boxCenterX + boxWidth / 2;
            const boxBottom = boxCenterY + boxHeight / 2;

            // Draw selection border
            ctx.strokeStyle = '#693BF2';
            ctx.lineWidth = 4; // Thicker for high res
            ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

            // Draw resize handles (corners)
            const handleSize = 50; // Larger for high res
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#693BF2';
            ctx.lineWidth = 3;

            const handles = [
                { x: boxLeft, y: boxTop }, // TL
                { x: boxRight, y: boxTop }, // TR
                { x: boxRight, y: boxBottom }, // BR
                { x: boxLeft, y: boxBottom }, // BL
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
        // Prefer compositeImage (High Res), fallback to personImage
        const imgToDraw = compositeImage || personImage;
        drawCanvas(ctx, imgToDraw, scale, position, true);
    }, [compositeImage, personImage, scale, position, drawCanvas]);


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
        const handleSize = 80; // Hit area
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
        // const dy = p.y - dragStart.y; // Unused for uniform scale X-driver

        if (interactionMode === 'pan') {
            const dy = p.y - dragStart.y;
            setPosition({
                x: initialTransform.x + dx,
                y: initialTransform.y + dy
            });
        } else if (interactionMode && interactionMode.startsWith('resize')) {
            const imgW = img.width;

            // Directions
            let dirX = 1;
            if (interactionMode === 'resize-br') { dirX = 1; }
            if (interactionMode === 'resize-bl') { dirX = -1; }
            if (interactionMode === 'resize-tr') { dirX = 1; }
            if (interactionMode === 'resize-tl') { dirX = -1; }

            const relativeChangeX = (dx * dirX) / (imgW * initialTransform.scale);
            const newScale = Math.max(0.1, initialTransform.scale * (1 + relativeChangeX));

            // For center-anchored scaling (simplest UX without shift):
            setScale(newScale);

            // Note: If we want true corner anchoring, we need position shift math.
            // But center-scale is often acceptable or even preferred in simple editors.
            // Given the complexity of implementing robust anchor-shift in this coordinate system
            // without matrix math libraries, sticking to center-scale is safer to avoid "jumping".
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

        // 1. Draw without UI
        drawCanvas(ctx, img, scale, position, false);

        // 2. Export
        const link = document.createElement('a');
        const downloadName = fileName ? `${fileName.split('.')[0]}.png` : 'fortune-thumbnail.png';
        link.download = downloadName;
        // High Quality export
        link.href = canvas.toDataURL('image/png', EXPORT_QUALITY);
        link.click();

        // 3. Restore UI
        drawCanvas(ctx, img, scale, position, true);
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
                    <h3>썸네일 편집</h3>

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

                        {/* Floating Zoom Controls tied to this wrapper */}
                        <div className="zoom-controls floating">
                            <button onClick={() => setScale(s => s - 0.05)}>-</button>
                            <span>{(scale * 100).toFixed(0)}%</span>
                            <button onClick={() => setScale(s => s + 0.05)}>+</button>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button className="btn-primary" onClick={handleDownload}>고해상도 다운로드</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
