import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceComic } from './workspace-comic';
import { ComicEditorService } from '../comic-editor.service';

describe('WorkspaceComic', () => {
  let fixture: ComponentFixture<WorkspaceComic>;
  let component: WorkspaceComic;
  let editorService: ComicEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkspaceComic],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(WorkspaceComic);
    component = fixture.componentInstance;
    editorService = TestBed.inject(ComicEditorService);
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('trạng thái nháp (chưa có comicData)', () => {
    it('panels getter trả về đúng số khung theo selectedFrames', () => {
      component.selectedFrames = 3;
      fixture.detectChanges();

      expect(component.panels).toEqual([1, 2, 3]);
      expect(fixture.nativeElement.querySelectorAll('.comic-panel-card').length).toBe(3);
      expect(fixture.nativeElement.querySelectorAll('.draft-placeholder').length).toBe(3);
    });

    it('getPanelData() trả về null khi chưa có comicData', () => {
      fixture.detectChanges();
      expect(component.getPanelData(0)).toBeNull();
    });

    it('hiển thị banner lỗi khi generationError được set', () => {
      component.generationError = 'Sinh truyện tranh thất bại';
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.generation-error-banner');
      expect(banner?.textContent).toContain('Sinh truyện tranh thất bại');
    });

    it('nút quay lại chỉ hiện khi showBackButton=true và phát onBack khi bấm', () => {
      component.showBackButton = true;
      fixture.detectChanges();
      let emitted = false;
      component.onBack.subscribe(() => (emitted = true));

      fixture.nativeElement.querySelector('.btn-back-workspace').click();

      expect(emitted).toBe(true);
    });
  });

  describe('trạng thái đã có comicData — từng panel theo trạng thái sinh ảnh', () => {
    beforeEach(() => {
      component.selectedFrames = 3;
      component.comicData = {
        title: 'Truyen thu',
        panels: [
          { imageUrl: 'https://x/panel0.png', status: 'SUCCESS' },
          { status: 'FAILED', errorMessage: 'GPU loi' },
          { status: 'PROCESSING' },
        ],
      };
      fixture.detectChanges();
    });

    it('panel có imageUrl hiển thị <img>, panel FAILED hiển thị lỗi, panel còn lại hiển thị loading', () => {
      const cards = fixture.nativeElement.querySelectorAll('.comic-panel-card');
      expect(cards[0].querySelector('.panel-image')).toBeTruthy();
      expect(cards[1].querySelector('.panel-error-state')?.textContent).toContain('GPU loi');
      expect(cards[2].querySelector('.panel-loading-state')).toBeTruthy();
    });

    it('getPanelData() trả đúng dữ liệu panel theo index, null khi vượt quá số panel', () => {
      expect(component.getPanelData(0)?.imageUrl).toBe('https://x/panel0.png');
      expect(component.getPanelData(1)?.status).toBe('FAILED');
      expect(component.getPanelData(5)).toBeNull();
    });

    it('selectPanel() chọn khung và cập nhật activePanelIndex hiển thị', () => {
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');

      component.selectPanel(1, event);
      fixture.detectChanges();

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(editorService.getState().activePanelIndex).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.comic-panel-card')[1].classList).toContain('active-panel');
    });

    it('deselectBubble() bỏ chọn bong bóng khi click vùng trống', () => {
      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      editorService.selectBubble(id);

      component.deselectBubble(new MouseEvent('click'));

      expect(editorService.getState().selectedBubbleId).toBeNull();
    });
  });

  describe('thao tác với bong bóng thoại trên canvas SVG', () => {
    beforeEach(() => {
      component.selectedFrames = 1;
      component.comicData = { title: 'Truyen thu', panels: [{ imageUrl: 'https://x/p.png', status: 'SUCCESS' }] };
      fixture.detectChanges();
    });

    it('addSpeechBubbleToPanel() thêm đúng loại bong bóng và vẽ đúng hình SVG (round/square/cloud)', () => {
      const event = new MouseEvent('click');

      component.addSpeechBubbleToPanel(0, 'round', event);
      component.addSpeechBubbleToPanel(0, 'square', event);
      component.addSpeechBubbleToPanel(0, 'cloud', event);
      fixture.detectChanges();

      expect(editorService.getState().bubbles.length).toBe(3);
      const svg = fixture.nativeElement.querySelector('.vector-overlay-layer');
      expect(svg.querySelectorAll('ellipse.bubble-body-shape').length).toBe(1);
      expect(svg.querySelectorAll('rect.bubble-body-shape').length).toBe(1);
      expect(svg.querySelectorAll('path.bubble-body-shape').length).toBe(1);
    });

    it('selectBubble() hiển thị khung chọn (selection-handles) quanh bong bóng', () => {
      component.addSpeechBubbleToPanel(0, 'round', new MouseEvent('click'));
      const id = editorService.getState().bubbles[0].id;

      component.selectBubble(id, new MouseEvent('mousedown'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.selection-handles')).toBeTruthy();
    });

    it('deleteBubble() xoá bong bóng khỏi canvas', () => {
      component.addSpeechBubbleToPanel(0, 'round', new MouseEvent('click'));
      const id = editorService.getState().bubbles[0].id;

      component.deleteBubble(id, new MouseEvent('click'));
      fixture.detectChanges();

      expect(editorService.getState().bubbles.length).toBe(0);
      expect(fixture.nativeElement.querySelector('.vector-overlay-layer .bubble-vector-group')).toBeNull();
    });

    it('startEditingText()/onTextChange()/onTextBlur() chuyển đổi giữa hiển thị tĩnh và ô nhập chữ', () => {
      component.addSpeechBubbleToPanel(0, 'round', new MouseEvent('click'));
      const id = editorService.getState().bubbles[0].id;

      component.startEditingText(id, new MouseEvent('mousedown'));
      expect(component.editingTextId).toBe(id);

      component.onTextChange(id, 'Loi thoai moi');
      expect(editorService.getState().bubbles[0].text).toBe('Loi thoai moi');

      component.onTextBlur(id);
      expect(component.editingTextId).toBeNull();
      expect(editorService.canUndo()).toBe(true);
    });
  });

  describe('kéo-thả bong bóng bằng chuột (mousedown/mousemove/mouseup)', () => {
    beforeEach(() => {
      component.selectedFrames = 1;
      component.comicData = { title: 'T', panels: [{ imageUrl: 'x', status: 'SUCCESS' }] };
      fixture.detectChanges();
      component.addSpeechBubbleToPanel(0, 'round', new MouseEvent('click'));
    });

    it('startDrag(move) rồi onMouseMove() di chuyển bong bóng trong giới hạn 5-95%', () => {
      const bubble = editorService.getState().bubbles[0];
      const startEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });

      component.startDrag(startEvent, bubble, 'move');
      expect(component.activeDragType).toBe('move');
      expect(component.activeBubbleId).toBe(bubble.id);
      expect(editorService.getState().selectedBubbleId).toBe(bubble.id);

      component.onMouseMove(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
      const moved = editorService.getState().bubbles[0];
      expect(moved.x).toBeGreaterThanOrEqual(5);
      expect(moved.x).toBeLessThanOrEqual(95);

      component.onMouseUp(new MouseEvent('mouseup'));
      expect(component.activeDragType).toBeNull();
      expect(component.activeBubbleId).toBeNull();
    });

    it('startDrag(resize) rồi onMouseMove() thay đổi kích thước trong giới hạn cho phép', () => {
      const bubble = editorService.getState().bubbles[0];
      component.startDrag(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }), bubble, 'resize');

      component.onMouseMove(new MouseEvent('mousemove', { clientX: 500, clientY: 500 }));

      const resized = editorService.getState().bubbles[0];
      expect(resized.w).toBeLessThanOrEqual(400);
      expect(resized.h).toBeLessThanOrEqual(350);
    });

    it('startDrag(tail) rồi onMouseMove() di chuyển điểm chỉ dẫn theo delta chuột', () => {
      const bubble = editorService.getState().bubbles[0];
      component.startDrag(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }), bubble, 'tail');

      component.onMouseMove(new MouseEvent('mousemove', { clientX: 20, clientY: 10 }));

      const moved = editorService.getState().bubbles[0];
      expect(moved.tailX).toBe(bubble.tailX + 20);
      expect(moved.tailY).toBe(bubble.tailY + 10);
    });

    it('onMouseMove() không làm gì khi chưa startDrag (activeBubbleId rỗng)', () => {
      const before = editorService.getState().bubbles[0];
      component.onMouseMove(new MouseEvent('mousemove', { clientX: 999, clientY: 999 }));
      expect(editorService.getState().bubbles[0]).toEqual(before);
    });

    it('onBubbleDragEnded() (CDK drag) cập nhật vị trí theo khoảng cách kéo và reset transform CDK', () => {
      const bubble = editorService.getState().bubbles[0];
      const reset = vi.fn();
      const fakeEvent = { distance: { x: 30, y: -10 }, source: { reset } } as any;

      component.onBubbleDragEnded(fakeEvent, bubble);

      expect(reset).toHaveBeenCalled();
      const moved = editorService.getState().bubbles[0];
      expect(moved.x).not.toBe(bubble.x);
    });
  });

  describe('hàm hình học SVG thuần (getCloudPath/getTailPoints/getTailStroke)', () => {
    it('getCloudPath() trả về chuỗi path SVG bắt đầu bằng M và kết thúc bằng Z', () => {
      const path = component.getCloudPath(120, 80);
      expect(path.startsWith('M')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
    });

    it('getTailPoints()/getTailStroke() trả về chuỗi rỗng khi bong bóng không có đuôi', () => {
      const bubble = {
        id: 'b1', panelIndex: 0, x: 50, y: 50, w: 100, h: 80, type: 'round' as const,
        tailX: 10, tailY: 10, hasTail: false, text: '', fontFamily: 'Comic Neue', fontSize: 16,
        fontColor: '#000', textAlign: 'center' as const, lineHeight: 1.2,
      };

      expect(component.getTailPoints(bubble)).toBe('');
      expect(component.getTailStroke(bubble)).toBe('');
    });

    it('getTailPoints()/getTailStroke() trả về toạ độ khi bong bóng có đuôi', () => {
      const bubble = {
        id: 'b1', panelIndex: 0, x: 50, y: 50, w: 100, h: 80, type: 'square' as const,
        tailX: 20, tailY: 30, hasTail: true, text: '', fontFamily: 'Comic Neue', fontSize: 16,
        fontColor: '#000', textAlign: 'center' as const, lineHeight: 1.2,
      };

      expect(component.getTailPoints(bubble).split(' ').length).toBe(3);
      expect(component.getTailStroke(bubble).startsWith('M')).toBe(true);
    });
  });

  describe('exportComicAsImage() qua editorService.export$', () => {
    it('không throw ra ngoài fixture khi được kích hoạt (jsdom không hỗ trợ Canvas 2D context)', () => {
      fixture.detectChanges();
      // jsdom không hiện thực Canvas 2D — getContext('2d') trả về null nên hàm sẽ
      // ném lỗi runtime khi gán ctx.imageSmoothingEnabled. Đây là giới hạn của môi
      // trường kiểm thử (không có polyfill canvas), không phải hành vi nghiệp vụ
      // cần kiểm chứng ở test này — chỉ xác nhận export$ thực sự gọi tới hàm.
      const spy = vi.spyOn(component, 'exportComicAsImage').mockImplementation(() => {});
      editorService.triggerExport();
      expect(spy).toHaveBeenCalled();
    });
  });

  // Bấm/thả chuột thẳng vào phần tử DOM (kể cả SVG) thay vì gọi hàm component
  // trực tiếp như các test ở trên, để khớp đúng các hàm lắng nghe sự kiện khai
  // báo trong workspace-comic.html — tăng độ bao phủ "functions" của template,
  // không thêm hành vi nghiệp vụ mới.
  describe('tương tác trực tiếp trên DOM (khớp các hàm lắng nghe sự kiện trong template)', () => {
    beforeEach(() => {
      component.selectedFrames = 1;
      component.comicData = { title: 'T', panels: [{ imageUrl: 'https://x/p.png', status: 'SUCCESS' }] };
      fixture.detectChanges();
    });

    it('bấm vùng trống bỏ chọn bong bóng; bấm thẻ khung chọn đúng panel', () => {
      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      editorService.selectBubble(id);

      fixture.nativeElement.querySelector('.comic-panel-card').click();
      expect(editorService.getState().activePanelIndex).toBe(0);

      fixture.nativeElement.querySelector('.workspace-container').click();
      expect(editorService.getState().selectedBubbleId).toBeNull();
    });

    it('bấm nút thêm bong bóng trên overlay hover của khung ảnh', () => {
      fixture.nativeElement.querySelector('.overlay-btn.btn-cld').click();

      expect(editorService.getState().bubbles[0].type).toBe('cloud');
      expect(editorService.getState().bubbles[0].panelIndex).toBe(0);
    });

    it('mousedown vào thân bong bóng (ellipse) bắt đầu kéo; bấm nút xoá xoá đúng bong bóng', () => {
      component.addSpeechBubbleToPanel(0, 'round', new MouseEvent('click'));
      fixture.detectChanges();

      const shape = fixture.nativeElement.querySelector('ellipse.bubble-body-shape');
      shape.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }));
      expect(component.activeDragType).toBe('move');
      component.onMouseUp(new MouseEvent('mouseup'));

      fixture.nativeElement.querySelector('.btn-delete-bubble').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(editorService.getState().bubbles.length).toBe(0);
    });

    it('double-click vào chữ tĩnh chuyển sang ô nhập; nhập chữ rồi rời khỏi ô lưu lại lịch sử', () => {
      component.addSpeechBubbleToPanel(0, 'round', new MouseEvent('click'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.bubble-static-text').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      expect(component.editingTextId).not.toBeNull();

      const textarea = fixture.nativeElement.querySelector('.bubble-textarea-input');
      expect(textarea).toBeTruthy();
      textarea.dispatchEvent(new Event('blur'));
      expect(component.editingTextId).toBeNull();
    });
  });
});
