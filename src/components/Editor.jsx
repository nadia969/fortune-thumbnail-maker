import { useState, useRef, useEffect, useCallback } from 'react';
import './Editor.css';

// High-Res Output Dimensions (Masking Resolution)
const OUTPUT_WIDTH = 1544;
const OUTPUT_HEIGHT = 2056;

// Padding for "Infinite" feel (High-Res Pixels)
const CANVAS_PADDING = 800; // ample space around

// Total Canvas Size
const CANVAS_WIDTH = OUTPUT_WIDTH + (CANVAS_PADDING * 2);
const CANVAS_HEIGHT = OUTPUT_HEIGHT + (CANVAS_PADDING * 2);

// Visual Display Scale (CSS)
// We want the 'Output Box' to appear roughly 386x514 on screen.
// 1544 / 386 = 4. 
// So CSS width of canvas should be CANVAS_WIDTH / 4
const DISPLAY_SCALE = 0.25;
const CSS_WIDTH = CANVAS_WIDTH * DISPLAY_SCALE;
const CSS_HEIGHT = CANVAS_HEIGHT * DISPLAY_SCALE;

// UI Overlay size (The visual white box)
const UI_BOX_WIDTH = OUTPUT_WIDTH * DISPLAY_SCALE;
const UI_BOX_HEIGHT = OUTPUT_HEIGHT * DISPLAY_SCALE;


const EXPORT_QUALITY = 1.0;

const Editor = ({ originalImage, removedBgImage, fileName, onReset }) => {
    const canvasRef = useRef(null);
    const [personImage, setPersonImage] = useState(null);
    const [originalImageObj, setOriginalImageObj] = useState(null);
    const [compositeImage, setCompositeImage] = useState(null);

    // Background Images
    const [bgImageObj, setBgImageObj] = useState(null);
    const [activeTab, setActiveTab] = useState('none');

    // Transform state (Relative to Center of Output Box)
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Interaction state
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({
        isDragging: false,
        interactionMode: null,
        dragStart: { x: 0, y: 0 },
        initialTransform: { scale: 1, x: 0, y: 0 }
    });

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

    useEffect(() => {
        if (activeTab === 'none') {
            setBgImageObj(null);
            return;
        }
        const img = new Image();
        img.src = `/bg_${activeTab}.jpg`;
        img.onload = () => setBgImageObj(img);
    }, [activeTab]);

    // Generate High-Res Composite
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
            compImg.onload = () => {
                setCompositeImage(compImg);
                if (scale === 1) {
                    const fitScale = (OUTPUT_HEIGHT * 0.8) / compImg.height;
                    setScale(fitScale);
                }
            };
            tempCanvas.toBlob(blob => {
                compImg.src = URL.createObjectURL(blob);
            });
        } else if (!personImage && originalImageObj) {
            if (scale === 1) {
                const fitScale = (OUTPUT_HEIGHT * 0.8) / originalImageObj.height;
                setScale(fitScale);
            }
        }
    }, [personImage, originalImageObj]);


    // Draw Function
    const drawCanvas = useCallback((ctx, img, currentScale, currentPos, showOverlay = true, background = null) => {
        // Clear full canvas
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Previously filled with #f1f5f9. Now we want transparent to let Panel BG show.
        // If we need a specific bg for the 'void', it should match the panel: #F5F3FF.
        // But transparent is safest.

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // 0. Draw "Ghost" Person (Outside Area Visualization)
        // We draw the person with low opacity first. Then the Main Box will cover the 'inside' part.
        if (img && showOverlay) {
            ctx.save();
            ctx.translate(cx + currentPos.x, cy + currentPos.y);
            ctx.scale(currentScale, currentScale);
            ctx.globalAlpha = 0.3; // 30% opacity for outside part
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        // 1. Draw Output Box Background (White) with Shadow
        // This effectively "clears" the ghost image inside the box area by drawing white over it.
        ctx.save();
        ctx.fillStyle = '#ffffff';
        const outLeft = cx - OUTPUT_WIDTH / 2;
        const outTop = cy - OUTPUT_HEIGHT / 2;

        ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        ctx.fillRect(outLeft, outTop, OUTPUT_WIDTH, OUTPUT_HEIGHT);
        ctx.restore();

        // 2. Draw Category Background (Clipped to Output Box)
        if (background) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(outLeft, outTop, OUTPUT_WIDTH, OUTPUT_HEIGHT);
            ctx.clip();
            // Draw background image
            ctx.drawImage(background, outLeft, outTop, OUTPUT_WIDTH, OUTPUT_HEIGHT);
            ctx.restore();
        } else {
            // If no background, ensure the box is white (already drawn in step 1)
        }

        // 3. Draw Person (Normal Opacity, Clipped to Output Box)
        // We MUST clip this to the box now, otherwise it will just look like the ghost image became 100% everywhere.
        // User wants "Difference between canvas area and outside". 
        // So Inside = 100%, Outside = Ghost.
        if (img) {
            ctx.save();
            // Trace the clip area again
            ctx.beginPath();
            ctx.rect(outLeft, outTop, OUTPUT_WIDTH, OUTPUT_HEIGHT);
            ctx.clip();

            ctx.translate(cx + currentPos.x, cy + currentPos.y);
            ctx.scale(currentScale, currentScale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        }

        // 4. (Removed Dimming Mask) - The background is already #f1f5f9 and output box is White.
        if (showOverlay) {
            // 5. Draw UI Handles (Selection Box)
            if (img) {
                // ... (Keep existing handle drawing code)
                // Determine bounding box of person
                const boxCenterX = cx + currentPos.x;
                const boxCenterY = cy + currentPos.y;
                const boxWidth = img.width * currentScale;
                const boxHeight = img.height * currentScale;

                const boxLeft = boxCenterX - boxWidth / 2;
                const boxTop = boxCenterY - boxHeight / 2;

                ctx.strokeStyle = '#693BF2';
                ctx.lineWidth = 4;
                ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

                const handleSize = 50;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#693BF2';
                ctx.lineWidth = 3;

                const handles = [
                    { x: boxLeft, y: boxTop }, // TL
                    { x: boxLeft + boxWidth, y: boxTop }, // TR
                    { x: boxLeft + boxWidth, y: boxTop + boxHeight }, // BR
                    { x: boxLeft, y: boxTop + boxHeight }, // BL
                ];

                handles.forEach(h => {
                    ctx.beginPath();
                    ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                    ctx.fill();
                    ctx.stroke();
                });
            }
        }
    }, []);

    // Effect to drive drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const imgToDraw = compositeImage || personImage || originalImageObj;
        drawCanvas(ctx, imgToDraw, scale, position, true, bgImageObj);
    }, [compositeImage, personImage, originalImageObj, scale, position, bgImageObj, drawCanvas]);


    const getCanvasPoint = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
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

        let mode = null;

        if (isOnHandle(p.x, p.y, boxLeft, boxTop)) mode = 'resize-tl';
        else if (isOnHandle(p.x, p.y, boxRight, boxTop)) mode = 'resize-tr';
        else if (isOnHandle(p.x, p.y, boxLeft, boxBottom)) mode = 'resize-bl';
        else if (isOnHandle(p.x, p.y, boxRight, boxBottom)) mode = 'resize-br';
        else if (p.x >= boxLeft && p.x <= boxRight && p.y >= boxTop && p.y <= boxBottom) mode = 'pan';

        if (mode) {
            dragRef.current = {
                isDragging: true,
                interactionMode: mode,
                dragStart: { x: p.x, y: p.y },
                initialTransform: { scale, x: position.x, y: position.y }
            };
            setIsDragging(true);

            window.addEventListener('mousemove', handleWindowMouseMove);
            window.addEventListener('mouseup', handleWindowMouseUp);
        }
    };

    const handleWindowMouseMove = (e) => {
        if (!dragRef.current.isDragging) return;
        const { interactionMode, dragStart, initialTransform } = dragRef.current;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use Global coordinates mapping
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const p = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };

        const dx = p.x - dragStart.x;

        const img = compositeImage || personImage;
        if (!img) return;

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

    const handleWindowMouseUp = () => {
        dragRef.current.isDragging = false;
        setIsDragging(false);
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, []);

    const handleDownload = () => {
        const img = compositeImage || personImage;
        if (!img) return;

        // Create specific EXPORT Canvas (Exact Output Size)
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = OUTPUT_WIDTH;
        outputCanvas.height = OUTPUT_HEIGHT;
        const ctx = outputCanvas.getContext('2d');

        // 1. Draw Background (if active) - Clipped to full (it is full)
        // Wait, standard export is transparent as per request.
        // User didn't change this requirement, so no background.

        // 2. Draw Person
        // Translate logic: 
        // In the big canvas, center was (CANVAS_WIDTH/2, CANVAS_HEIGHT/2). 
        // Position was relative to that center.
        // Here, center is (OUTPUT_WIDTH/2, OUTPUT_HEIGHT/2).
        // Position is relative to Output Center. So same Position value applies!

        ctx.save();
        ctx.translate(OUTPUT_WIDTH / 2 + position.x, OUTPUT_HEIGHT / 2 + position.y);
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        const link = document.createElement('a');
        const downloadName = fileName ? `${fileName.split('.')[0]}.png` : 'fortune-thumbnail.png';
        link.download = downloadName;
        link.href = outputCanvas.toDataURL('image/png', EXPORT_QUALITY);
        link.click();
    };

    return (
        <div className="editor-container">
            <div className="editor-content">
                {/* Left Column */}
                <div className="editor-column">
                    {/* Spacer to align with Right Column's Tabs (48px height + 32px margin) */}
                    <div style={{ height: '80px', width: '100%' }}></div>

                    <div className="panel image-preview-box">
                        {/* 386x524px White Box for Original Image */}
                        <div
                            className="original-image-container"
                            style={{
                                width: '386px',
                                height: '524px',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            <img
                                src={originalImage}
                                alt="Original"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                    </div>
                    <h3 className="panel-title">원본 이미지</h3>
                </div>

                {/* Right Column */}
                <div className="editor-column">
                    {/* Tabs (Right Aligned) */}
                    <div className="tabs-wrapper">
                        <div className="category-tabs">
                            <button className={`tab-btn ${activeTab === 'none' ? 'active' : ''}`} onClick={() => setActiveTab('none')}>투명</button>
                            <button className={`tab-btn ${activeTab === 'tarot' ? 'active' : ''}`} onClick={() => setActiveTab('tarot')}>타로</button>
                            <button className={`tab-btn ${activeTab === 'saju' ? 'active' : ''}`} onClick={() => setActiveTab('saju')}>사주</button>
                            <button className={`tab-btn ${activeTab === 'sinjeom' ? 'active' : ''}`} onClick={() => setActiveTab('sinjeom')}>신점</button>
                        </div>
                    </div>

                    {/* Editor Panel */}
                    <div className="panel editor-box">
                        <div className="canvas-wrapper">
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                                style={{
                                    width: `${CSS_WIDTH}px`,
                                    height: `${CSS_HEIGHT}px`,
                                    cursor: isDragging ? 'grabbing' : 'grab'
                                }}
                                className="editor-canvas"
                                onMouseDown={handleMouseDown}
                            />

                            {/* Zoom Controls (Bottom Right of Canvas/Panel) */}
                            <div className="ui-overlay-box" style={{ width: UI_BOX_WIDTH, height: UI_BOX_HEIGHT, pointerEvents: 'none' }}>
                                {/* Zoom controls can be relative to the panel, but here they track the canvas center. 
                                     The user screenshot shows them fixed at bottom right of the PURPLE PANEL. 
                                     Let's move them OUT of the floating box and absolute position them in the panel?
                                     Actually, keeping them floating near the canvas is fine, but checking the screenshot...
                                     They are inside the purple box, bottom right.
                                 */}
                            </div>
                        </div>

                        <p className="help-text-bottom">캔버스 위에서 드래그로 크기 조절 할 수 있어요</p>

                        <div className="zoom-controls-panel">
                            <button onClick={() => setScale(s => s - 0.05)}>−</button>
                            <span>{(scale * 100).toFixed(0)}%</span>
                            <button onClick={() => setScale(s => s + 0.05)}>+</button>
                        </div>
                    </div>

                    <h3 className="panel-title">이미지 편집</h3>

                    <div className="action-buttons">
                        <button className="btn-primary" onClick={handleDownload}>이미지 다운로드</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
