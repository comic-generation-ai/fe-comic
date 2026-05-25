import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ComicEditorService, SpeechBubble, EditorState } from '../comic-editor.service';
import { Subscription } from 'rxjs';
import { DragDropModule, CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-workspace-comic',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, DragDropModule, CdkDrag],
  templateUrl: './workspace-comic.html',
  styleUrl: './workspace-comic.scss',
})
export class WorkspaceComic implements OnInit, OnDestroy {
  @Input() comicData: any = null;
  @Input() selectedFrames: number = 4;
  @Input() showBackButton: boolean = false;
  @Output() onBack = new EventEmitter<void>();

  editorService = inject(ComicEditorService);
  el = inject(ElementRef);

  editorState!: EditorState;
  private sub = new Subscription();

  // Active dragging state variables
  activeDragType: 'move' | 'resize' | 'tail' | null = null;
  activeBubbleId: string | null = null;
  dragStartX = 0;
  dragStartY = 0;
  initialBubbleX = 0;
  initialBubbleY = 0;
  initialBubbleW = 0;
  initialBubbleH = 0;
  initialTailX = 0;
  initialTailY = 0;

  // Active text inline-editing bubble ID
  editingTextId: string | null = null;

  ngOnInit() {
    this.sub.add(
      this.editorService.state$.subscribe((state) => {
        this.editorState = state;
      })
    );
    this.sub.add(
      this.editorService.export$.subscribe(() => {
        this.exportComic();
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
    }
  }

  get panels(): number[] {
    return Array.from({ length: this.selectedFrames }, (_, i) => i + 1);
  }

  getBubblesForPanel(panelIndex: number): SpeechBubble[] {
    if (!this.editorState) return [];
    return this.editorState.bubbles.filter((b) => b.panelIndex === panelIndex);
  }

  // Set the selected bubble inside the editor
  selectBubble(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.editorService.selectBubble(id);
  }

  // Set the active panel frame
  selectPanel(index: number, event: MouseEvent) {
    event.stopPropagation();
    this.editorService.selectPanel(index);
  }

  // Deselect bubble when clicking empty workspace
  deselectBubble(event: MouseEvent) {
    this.editorService.selectBubble(null);
  }

  // Add speech bubble directly to a specific panel
  addSpeechBubbleToPanel(panelIndex: number, type: 'round' | 'square' | 'cloud', event: MouseEvent) {
    event.stopPropagation();
    this.editorService.addBubble(panelIndex, type);
  }

  // Delete specific bubble
  deleteBubble(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.editorService.deleteBubble(id);
  }

  // Drag handles & move controllers
  startDrag(event: MouseEvent, bubble: SpeechBubble, dragType: 'move' | 'resize' | 'tail') {
    event.preventDefault();
    event.stopPropagation();

    this.activeDragType = dragType;
    this.activeBubbleId = bubble.id;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    this.initialBubbleX = bubble.x;
    this.initialBubbleY = bubble.y;
    this.initialBubbleW = bubble.w;
    this.initialBubbleH = bubble.h;
    this.initialTailX = bubble.tailX;
    this.initialTailY = bubble.tailY;

    this.editorService.selectBubble(bubble.id);

    // Save current state into undo list before starting any mouse manipulation
    this.editorService.saveHistory();

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.activeBubbleId || !this.activeDragType) return;

    const currentBubble = this.editorState.bubbles.find((b) => b.id === this.activeBubbleId);
    if (!currentBubble) return;

    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;

    const panelElement = document.getElementById(`panel-card-${currentBubble.panelIndex}`);
    if (!panelElement) return;

    const rect = panelElement.getBoundingClientRect();
    const panelWidth = rect.width || 300;
    const panelHeight = rect.height || 200;

    if (this.activeDragType === 'move') {
      const dpx = (dx / panelWidth) * 100;
      const dpy = (dy / panelHeight) * 100;

      const newX = Math.max(5, Math.min(95, this.initialBubbleX + dpx));
      const newY = Math.max(5, Math.min(95, this.initialBubbleY + dpy));

      this.editorService.updateBubble(this.activeBubbleId, { x: newX, y: newY }, true);
    } else if (this.activeDragType === 'resize') {
      const newW = Math.max(80, Math.min(400, this.initialBubbleW + dx));
      const newH = Math.max(50, Math.min(350, this.initialBubbleH + dy));

      this.editorService.updateBubble(this.activeBubbleId, { w: newW, h: newH }, true);
    } else if (this.activeDragType === 'tail') {
      const newTailX = this.initialTailX + dx;
      const newTailY = this.initialTailY + dy;

      this.editorService.updateBubble(this.activeBubbleId, { tailX: newTailX, tailY: newTailY }, true);
    }
  };

  onMouseUp = (event: MouseEvent) => {
    this.activeDragType = null;
    this.activeBubbleId = null;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  };

  // CDK Drag & Drop ended handler
  onBubbleDragEnded(event: CdkDragEnd, bubble: SpeechBubble) {
    const distance = event.distance;
    const panelElement = document.getElementById(`panel-card-${bubble.panelIndex}`);
    if (!panelElement) return;

    const rect = panelElement.getBoundingClientRect();
    const panelWidth = rect.width || 300;
    const panelHeight = rect.height || 200;

    const dpx = (distance.x / panelWidth) * 100;
    const dpy = (distance.y / panelHeight) * 100;

    const newX = Math.max(5, Math.min(95, bubble.x + dpx));
    const newY = Math.max(5, Math.min(95, bubble.y + dpy));

    // Save history and update service
    this.editorService.saveHistory();
    this.editorService.updateBubble(bubble.id, { x: newX, y: newY });

    // Important: reset CDK Drag inline CSS transform so SVG standard style translates remain the single source of truth
    event.source.reset();
  }

  // Text Direct Inline Editor Actions
  startEditingText(id: string, event: MouseEvent) {
    event.stopPropagation();
    this.editingTextId = id;
    this.editorService.selectBubble(id);
  }

  onTextChange(id: string, text: string) {
    this.editorService.updateBubble(id, { text }, true);
  }

  onTextBlur(id: string) {
    this.editorService.saveHistory(); // save completed text editing to undo stack
    this.editingTextId = null;
  }

  // SVG Drawing Helpers
  getCloudPath(w: number, h: number): string {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2 - 12;
    const ry = h / 2 - 12;
    const steps = 10;
    let path = '';
    for (let i = 0; i <= steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      const nextAngle = (((i + 1) % steps) * 2 * Math.PI) / steps;

      const x1 = cx + rx * Math.cos(angle);
      const y1 = cy + ry * Math.sin(angle);
      const x2 = cx + rx * Math.cos(nextAngle);
      const y2 = cy + ry * Math.sin(nextAngle);

      const midAngle = angle + Math.PI / steps;
      const bump = Math.min(w, h) * 0.15;
      const mx = cx + (rx + bump) * Math.cos(midAngle);
      const my = cy + (ry + bump) * Math.sin(midAngle);

      if (i === 0) {
        path += `M ${x1} ${y1}`;
      }
      path += ` Q ${mx} ${my} ${x2} ${y2}`;
    }
    return path + ' Z';
  }

  getTailPoints(b: SpeechBubble): string {
    const cx = b.w / 2;
    const cy = b.h / 2;
    const angle = Math.atan2(b.tailY, b.tailX);
    const delta = 0.28; // tail width base

    const rx = b.type === 'square' ? b.w / 2 - 10 : b.w / 2 - 4;
    const ry = b.type === 'square' ? b.h / 2 - 10 : b.h / 2 - 4;

    const ax = cx + rx * Math.cos(angle - delta);
    const ay = cy + ry * Math.sin(angle - delta);
    const bx = cx + rx * Math.cos(angle + delta);
    const by = cy + ry * Math.sin(angle + delta);

    const tx = cx + b.tailX;
    const ty = cy + b.tailY;

    return `${ax},${ay} ${tx},${ty} ${bx},${by}`;
  }

  getTailStroke(b: SpeechBubble): string {
    const cx = b.w / 2;
    const cy = b.h / 2;
    const angle = Math.atan2(b.tailY, b.tailX);
    const delta = 0.28;

    const rx = b.type === 'square' ? b.w / 2 - 10 : b.w / 2 - 4;
    const ry = b.type === 'square' ? b.h / 2 - 10 : b.h / 2 - 4;

    const ax = cx + rx * Math.cos(angle - delta);
    const ay = cy + ry * Math.sin(angle - delta);
    const bx = cx + rx * Math.cos(angle + delta);
    const by = cy + ry * Math.sin(angle + delta);

    const tx = cx + b.tailX;
    const ty = cy + b.tailY;

    return `M ${ax} ${ay} L ${tx} ${ty} L ${bx} ${by}`;
  }

  // Premium Canvas Export logic at 2x quality
  exportComic() {
    const gridElement = this.el.nativeElement.querySelector('.comic-grid-layout');
    if (!gridElement) return;

    const rect = gridElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Create 2x resolution canvas
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d')!;

    // Enable high quality scaling image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw background
    ctx.fillStyle = this.editorState.borderColor || '#1e1e24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const panelCards = this.el.nativeElement.querySelectorAll('.comic-panel-card');
    const imagePromises: Promise<void>[] = [];

    panelCards.forEach((card: HTMLElement, idx: number) => {
      const cardRect = card.getBoundingClientRect();
      const cx = (cardRect.left - rect.left) * 2;
      const cy = (cardRect.top - rect.top) * 2;
      const cw = cardRect.width * 2;
      const ch = cardRect.height * 2;

      // Draw standard panel background and border-radius rounded corners on canvas
      ctx.save();
      ctx.beginPath();
      const radius = (this.editorState.borderRadius || 8) * 2;
      ctx.roundRect(cx, cy, cw, ch, radius);
      ctx.clip();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx, cy, cw, ch);

      // Check if image exists
      const imgEl = card.querySelector('.panel-image') as HTMLImageElement;
      if (imgEl && imgEl.src) {
        const drawImgPromise = new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = imgEl.src;
          img.onload = () => {
            ctx.drawImage(img, cx, cy, cw, ch);
            resolve();
          };
          img.onerror = () => {
            // Draw gradient fallback
            const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
            grad.addColorStop(0, '#f3f4f6');
            grad.addColorStop(1, '#e5e7eb');
            ctx.fillStyle = grad;
            ctx.fillRect(cx, cy, cw, ch);
            resolve();
          };
        });
        imagePromises.push(drawImgPromise);
      } else {
        // Draw standard empty placeholder gradient
        const grad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#312e81');
        ctx.fillStyle = grad;
        ctx.fillRect(cx, cy, cw, ch);

        ctx.fillStyle = '#818cf8';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Panel #${idx + 1}`, cx + cw / 2, cy + ch / 2);
      }
      ctx.restore();
    });

    // Wait for images to load, then render the borders and bubbles
    Promise.all(imagePromises).then(() => {
      panelCards.forEach((card: HTMLElement, idx: number) => {
        const cardRect = card.getBoundingClientRect();
        const cx = (cardRect.left - rect.left) * 2;
        const cy = (cardRect.top - rect.top) * 2;
        const cw = cardRect.width * 2;
        const ch = cardRect.height * 2;

        // Draw panel borders on top of the images
        if (this.editorState.borderWidth > 0) {
          ctx.save();
          ctx.beginPath();
          const radius = (this.editorState.borderRadius || 8) * 2;
          ctx.roundRect(cx, cy, cw, ch, radius);
          ctx.lineWidth = this.editorState.borderWidth * 2;
          ctx.strokeStyle = this.editorState.borderColor;
          ctx.stroke();
          ctx.restore();
        }

        // Draw speech bubbles for this panel
        const bubbles = this.getBubblesForPanel(idx);
        bubbles.forEach((b) => {
          const bx = cx + (b.x / 100) * cw;
          const by = cy + (b.y / 100) * ch;
          const bw = b.w * 2;
          const bh = b.h * 2;
          const btl_x = bx - bw / 2;
          const btl_y = by - bh / 2;
          const tx = bx + b.tailX * 2;
          const ty = by + b.tailY * 2;

          ctx.save();

          // Bubble outline styles
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000000';
          ctx.fillStyle = '#ffffff';

          // 1. Draw Tail shapes
          if (b.type !== 'cloud') {
            const angle = Math.atan2(b.tailY, b.tailX);
            const delta = 0.28;
            const rx = b.type === 'square' ? bw / 2 - 20 : bw / 2 - 8;
            const ry = b.type === 'square' ? bh / 2 - 20 : bh / 2 - 8;

            const ax = bx + rx * Math.cos(angle - delta);
            const ay = by + ry * Math.sin(angle - delta);
            const bx_pt = bx + rx * Math.cos(angle + delta);
            const by_pt = by + ry * Math.sin(angle + delta);

            // Tail fill
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx_pt, by_pt);
            ctx.closePath();
            ctx.fill();
          }

          // 2. Draw Bubble body shapes
          ctx.beginPath();
          if (b.type === 'round') {
            ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else if (b.type === 'square') {
            ctx.roundRect(btl_x, btl_y, bw, bh, 20);
            ctx.fill();
            ctx.stroke();
          } else if (b.type === 'cloud') {
            // Generate cloud path on canvas
            const rx = bw / 2 - 24;
            const ry = bh / 2 - 24;
            const steps = 10;
            for (let i = 0; i <= steps; i++) {
              const angle = (i * 2 * Math.PI) / steps;
              const nextAngle = (((i + 1) % steps) * 2 * Math.PI) / steps;

              const x1 = bx + rx * Math.cos(angle);
              const y1 = by + ry * Math.sin(angle);
              const x2 = bx + rx * Math.cos(nextAngle);
              const y2 = by + ry * Math.sin(nextAngle);

              const midAngle = angle + Math.PI / steps;
              const bump = Math.min(bw, bh) * 0.15;
              const mx = bx + (rx + bump) * Math.cos(midAngle);
              const my = by + (ry + bump) * Math.sin(midAngle);

              if (i === 0) {
                ctx.moveTo(x1, y1);
              }
              ctx.quadraticCurveTo(mx, my, x2, y2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw 3 small circles for cloud tail
            const circles = [
              { r: 20, d: 0.3 },
              { r: 14, d: 0.6 },
              { r: 8, d: 0.9 },
            ];
            circles.forEach((c) => {
              const cx_circ = bx + b.tailX * 2 * c.d;
              const cy_circ = by + b.tailY * 2 * c.d;
              ctx.beginPath();
              ctx.arc(cx_circ, cy_circ, c.r, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            });
          }

          // 3. Draw Tail Stroke overlay to hide baseline
          if (b.type !== 'cloud') {
            const angle = Math.atan2(b.tailY, b.tailX);
            const delta = 0.28;
            const rx = b.type === 'square' ? bw / 2 - 20 : bw / 2 - 8;
            const ry = b.type === 'square' ? bh / 2 - 20 : bh / 2 - 8;

            const ax = bx + rx * Math.cos(angle - delta);
            const ay = by + ry * Math.sin(angle - delta);
            const bx_pt = bx + rx * Math.cos(angle + delta);
            const by_pt = by + ry * Math.sin(angle + delta);

            // Re-fill white base of tail to cover bubble border segment
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx_pt, by_pt);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Draw tail border lines
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx_pt, by_pt);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
          }

          // 4. Draw Text with custom fonts and wrap text correctly
          if (b.text) {
            ctx.fillStyle = b.fontColor;
            ctx.textAlign = b.textAlign;
            ctx.textBaseline = 'middle';
            const fSize = b.fontSize * 2;
            // Map common font family fallbacks
            let fFamily = b.fontFamily;
            if (fFamily === 'Bangers') fFamily = 'Bangers, Impact, sans-serif';
            else if (fFamily === 'Comic Neue') fFamily = '"Comic Neue", "Comic Sans MS", sans-serif';
            else if (fFamily === 'Outfit') fFamily = 'Outfit, sans-serif';

            ctx.font = `bold ${fSize}px ${fFamily}`;

            const maxWidth = bw - 50;
            const words = b.text.split(' ');
            let line = '';
            const lines: string[] = [];
            const canvasLineHeight = b.lineHeight * fSize;

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
              } else {
                line = testLine;
              }
            }
            lines.push(line);

            const totalHeight = lines.length * canvasLineHeight;
            let startY = by - totalHeight / 2 + canvasLineHeight / 2;

            let textX = bx;
            if (b.textAlign === 'left') textX = btl_x + 25;
            else if (b.textAlign === 'right') textX = btl_x + bw - 25;

            lines.forEach((l) => {
              ctx.fillText(l.trim(), textX, startY);
              startY += canvasLineHeight;
            });
          }

          ctx.restore();
        });
      });

      // Trigger download
      const link = document.createElement('a');
      link.download = `comic_masterpiece_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
}
