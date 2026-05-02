import { CanvasDrawingEngine } from '../src/lib/canvasDrawingEngine.js';

describe('CanvasDrawingEngine', () => {
    let canvas;
    let engine;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        document.body.appendChild(canvas);
        engine = new CanvasDrawingEngine(canvas);
    });

    afterEach(() => {
        engine.destroy();
        document.body.removeChild(canvas);
    });

    test('initializes canvas dimensions', () => {
        expect(canvas.width).toBe(400);
        expect(canvas.height).toBe(300);
    });

    test('brush stroke records stroke data', () => {
        engine.setTool('brush');
        engine.setColor('#00ff00');
        engine.setLineWidth(5);

        const down = new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true });
        const move = new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true });
        const up = new MouseEvent('mouseup', { bubbles: true });

        canvas.dispatchEvent(down);
        canvas.dispatchEvent(move);
        canvas.dispatchEvent(up);

        expect(engine.strokes.length).toBe(1);
        expect(engine.strokes[0].tool).toBe('brush');
        expect(engine.strokes[0].color).toBe('#00ff00');
        expect(engine.strokes[0].lineWidth).toBe(5);
        expect(engine.strokes[0].points.length).toBeGreaterThanOrEqual(2);
    });

    test('eraser records stroke data', () => {
        engine.setTool('eraser');
        engine.setEraserRadius(10);

        const down = new MouseEvent('mousedown', { clientX: 60, clientY: 60, bubbles: true });
        const move = new MouseEvent('mousemove', { clientX: 70, clientY: 70, bubbles: true });
        const up = new MouseEvent('mouseup', { bubbles: true });

        canvas.dispatchEvent(down);
        canvas.dispatchEvent(move);
        canvas.dispatchEvent(up);

        expect(engine.strokes.length).toBe(1);
        expect(engine.strokes[0].tool).toBe('eraser');
    });

    test('exportToBase64 returns a PNG data URL', () => {
        const dataUrl = engine.exportToBase64();
        expect(typeof dataUrl).toBe('string');
        expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('clear removes all strokes', () => {
        engine.setTool('brush');
        const down = new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true });
        const up = new MouseEvent('mouseup', { bubbles: true });
        canvas.dispatchEvent(down);
        canvas.dispatchEvent(up);
        expect(engine.strokes.length).toBe(1);

        engine.clear();
        expect(engine.strokes.length).toBe(0);
    });

    test('setTool updates tool state', () => {
        engine.setTool('eraser');
        expect(engine.tool).toBe('eraser');
        engine.setTool('brush');
        expect(engine.tool).toBe('brush');
    });

    test('setColor updates color state', () => {
        engine.setColor('#123456');
        expect(engine.color).toBe('#123456');
    });

    test('setLineWidth updates width state', () => {
        engine.setLineWidth(8);
        expect(engine.lineWidth).toBe(8);
    });

    test('setEraserRadius updates radius state', () => {
        engine.setEraserRadius(25);
        expect(engine.eraserRadius).toBe(25);
    });
});
