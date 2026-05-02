export class CanvasDrawingEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;
        this.tool = 'brush';
        this.color = '#ff0000';
        this.lineWidth = 3;
        this.eraserRadius = 20;
        this.strokes = [];
        this._bindEvents();
        this._initContext();
    }

    _initContext() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    _bindEvents() {
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        this.canvas.addEventListener('mousedown', this._onMouseDown);
        this.canvas.addEventListener('mousemove', this._onMouseMove);
        this.canvas.addEventListener('mouseup', this._onMouseUp);
        this.canvas.addEventListener('mouseleave', this._onMouseUp);
        this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._onTouchEnd);
    }

    _getPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    _onMouseDown(e) {
        this.isDrawing = true;
        const point = this._getPoint(e);
        this.currentStroke = { tool: this.tool, color: this.color, lineWidth: this.lineWidth, points: [point] };
        if (this.tool === 'brush') {
            this.ctx.beginPath();
            this.ctx.moveTo(point.x, point.y);
        } else if (this.tool === 'eraser') {
            this._erase(point.x, point.y);
        }
    }

    _onMouseMove(e) {
        if (!this.isDrawing) return;
        const point = this._getPoint(e);
        this.currentStroke.points.push(point);
        if (this.tool === 'brush') {
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.lineWidth;
            this.ctx.lineTo(point.x, point.y);
            this.ctx.stroke();
        } else if (this.tool === 'eraser') {
            this._erase(point.x, point.y);
        }
    }

    _onMouseUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (this.currentStroke) {
            this.strokes.push(this.currentStroke);
            this.currentStroke = null;
        }
    }

    _onTouchStart(e) {
        e.preventDefault();
        this._onMouseDown(e);
    }

    _onTouchMove(e) {
        e.preventDefault();
        this._onMouseMove(e);
    }

    _onTouchEnd(e) {
        e.preventDefault();
        this._onMouseUp();
    }

    _erase(x, y) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.eraserRadius, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.clearRect(x - this.eraserRadius, y - this.eraserRadius, this.eraserRadius * 2, this.eraserRadius * 2);
        this.ctx.restore();
    }

    setTool(tool) {
        this.tool = tool;
    }

    setColor(color) {
        this.color = color;
    }

    setLineWidth(width) {
        this.lineWidth = width;
    }

    setEraserRadius(radius) {
        this.eraserRadius = radius;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.strokes = [];
    }

    exportToBase64() {
        return this.canvas.toDataURL('image/png');
    }

    setBackgroundImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                resolve();
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    destroy() {
        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
        this.canvas.removeEventListener('mouseup', this._onMouseUp);
        this.canvas.removeEventListener('mouseleave', this._onMouseUp);
        this.canvas.removeEventListener('touchstart', this._onTouchStart);
        this.canvas.removeEventListener('touchmove', this._onTouchMove);
        this.canvas.removeEventListener('touchend', this._onTouchEnd);
    }
}
