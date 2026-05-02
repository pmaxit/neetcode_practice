import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CanvasDrawingEngine } from '../lib/canvasDrawingEngine.js';
import { toPng } from 'html-to-image';
import { Pencil, Eraser, X, Save, RotateCcw, Palette } from 'lucide-react';

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];

export default function AnnotationOverlay({ targetRef, savedAnnotation, onClose, onSave }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const [tool, setTool] = useState('brush');
    const [color, setColor] = useState('#ff0000');
    const [lineWidth, setLineWidth] = useState(3);
    const [eraserRadius, setEraserRadius] = useState(20);
    const [bgImage, setBgImage] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        engineRef.current = new CanvasDrawingEngine(canvas);

        // Load saved annotation as background if available
        if (savedAnnotation) {
            engineRef.current.setBackgroundImage(savedAnnotation).catch(() => {});
        }

        return () => {
            engineRef.current?.destroy();
        };
    }, [savedAnnotation]);

    useEffect(() => {
        if (!targetRef?.current) return;
        let cancelled = false;
        toPng(targetRef.current, { cacheBust: true, pixelRatio: 2 })
            .then(url => {
                if (!cancelled) setBgImage(url);
            })
            .catch(() => {
                if (!cancelled) setBgImage(null);
            });
        return () => { cancelled = true; };
    }, [targetRef]);

    useEffect(() => {
        if (!engineRef.current) return;
        engineRef.current.setTool(tool);
    }, [tool]);

    useEffect(() => {
        if (!engineRef.current) return;
        engineRef.current.setColor(color);
    }, [color]);

    useEffect(() => {
        if (!engineRef.current) return;
        engineRef.current.setLineWidth(lineWidth);
    }, [lineWidth]);

    useEffect(() => {
        if (!engineRef.current) return;
        engineRef.current.setEraserRadius(eraserRadius);
    }, [eraserRadius]);

    const handleReset = useCallback(() => {
        engineRef.current?.clear();
        if (bgImage && engineRef.current) {
            engineRef.current.setBackgroundImage(bgImage).catch(() => {});
        }
    }, [bgImage]);

    const handleSave = useCallback(async () => {
        if (!engineRef.current || !containerRef.current) return;
        setSaving(true);
        try {
            const canvas = engineRef.current.canvas;
            const container = containerRef.current;
            const composite = document.createElement('canvas');
            composite.width = container.clientWidth;
            composite.height = container.clientHeight;
            const ctx = composite.getContext('2d');

            if (bgImage) {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, composite.width, composite.height);
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = bgImage;
                });
            }

            ctx.drawImage(canvas, 0, 0, composite.width, composite.height);
            const dataUrl = composite.toDataURL('image/png');
            await onSave(dataUrl);
            setConfirmMessage('Annotation saved!');
            setTimeout(() => setConfirmMessage(''), 3000);
        } catch (err) {
            setConfirmMessage('Save failed.');
        } finally {
            setSaving(false);
        }
    }, [onSave, bgImage]);

    return (
        <div className="annotation-overlay" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        className={`btn btn-sm ${tool === 'brush' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setTool('brush')}
                        title="Brush"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        className={`btn btn-sm ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setTool('eraser')}
                        title="Eraser"
                    >
                        <Eraser size={16} />
                    </button>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <Palette size={14} style={{ opacity: 0.6 }} />
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); setTool('brush'); }}
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: c,
                                    border: color === c ? '2px solid white' : '2px solid transparent',
                                    cursor: 'pointer'
                                }}
                                title={c}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <span>{tool === 'brush' ? 'Width' : 'Radius'}</span>
                        <input
                            type="range"
                            min={1}
                            max={tool === 'brush' ? 20 : 50}
                            value={tool === 'brush' ? lineWidth : eraserRadius}
                            onChange={e => {
                                const val = parseInt(e.target.value, 10);
                                if (tool === 'brush') setLineWidth(val);
                                else setEraserRadius(val);
                            }}
                            style={{ width: 80 }}
                        />
                        <span>{tool === 'brush' ? lineWidth : eraserRadius}px</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {confirmMessage && (
                        <span style={{ color: 'var(--easy)', fontSize: '0.8rem' }}>{confirmMessage}</span>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={handleReset} title="Reset">
                        <RotateCcw size={14} /> Reset
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
                        <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={onClose} title="Close">
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#1e1e1e',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                {bgImage && (
                    <img
                        src={bgImage}
                        alt="Code background"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            pointerEvents: 'none'
                        }}
                    />
                )}
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        cursor: tool === 'eraser' ? 'cell' : 'crosshair',
                        touchAction: 'none'
                    }}
                />
            </div>
        </div>
    );
}
