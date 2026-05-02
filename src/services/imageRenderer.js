import prism from 'prismjs';
import 'prismjs/components/prism-python';
import { toPng } from 'html-to-image';

export class ImageRendererService {
    constructor() {
        this.container = null;
    }

    _ensureContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.style.position = 'absolute';
            this.container.style.left = '-9999px';
            this.container.style.top = '-9999px';
            this.container.style.width = '800px';
            this.container.style.fontFamily = '"JetBrains Mono", "Fira Code", monospace';
            this.container.style.fontSize = '14px';
            this.container.style.lineHeight = '1.5';
            this.container.style.background = '#2d2d2d';
            this.container.style.color = '#ccc';
            this.container.style.padding = '20px';
            this.container.style.borderRadius = '12px';
            document.body.appendChild(this.container);
        }
    }

    _removeContainer() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }

    renderCodeToHtml(code, language = 'python') {
        const grammar = prism.languages[language] || prism.languages.python;
        const highlighted = prism.highlight(code || '', grammar, language);
        const lines = (code || '').split('\n');
        const lineNumbers = lines.map((_, i) => `<span style="color:#666;margin-right:12px;user-select:none;display:inline-block;width:24px;text-align:right;">${i + 1}</span>`).join('\n');
        const lineContents = highlighted.split('\n').map(line => `<span style="white-space:pre;">${line || ' '}</span>`).join('\n');
        return `
            <div style="display:flex;">
                <div style="flex-shrink:0;">${lineNumbers}</div>
                <div style="flex:1;">${lineContents}</div>
            </div>
        `;
    }

    async renderToBase64(code, language = 'python') {
        this._ensureContainer();
        this.container.innerHTML = this.renderCodeToHtml(code, language);
        // Force layout
        this.container.offsetHeight;
        const dataUrl = await toPng(this.container, { cacheBust: true, pixelRatio: 2 });
        this._removeContainer();
        return dataUrl;
    }
}
