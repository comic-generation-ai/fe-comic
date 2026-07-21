import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { EditorComic } from './editor-comic';
import { ComicEditorService } from '../comic-editor.service';
import { SpeechBubblesApiService } from '../../../core/api/speech-bubbles-api.service';

describe('EditorComic', () => {
  let fixture: ComponentFixture<EditorComic>;
  let component: EditorComic;
  let editorService: ComicEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditorComic],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EditorComic);
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

  describe('panelsCount / targetPanelIndex / selectedBubble / getBubblesForActiveFrame', () => {
    it('panelsCount rỗng khi chưa có comicData, đủ số khung khi có comicData.frameCount', () => {
      fixture.detectChanges();
      expect(component.panelsCount).toEqual([]);

      component.comicData = { frameCount: 3 };
      expect(component.panelsCount).toEqual([0, 1, 2]);
    });

    it('targetPanelIndex lấy từ editorState.activePanelIndex, mặc định 0 khi chưa có state', () => {
      expect(component.targetPanelIndex).toBe(0);
      fixture.detectChanges();
      editorService.selectPanel(2);
      expect(component.targetPanelIndex).toBe(2);
    });

    it('selectedBubble trả về null khi chưa chọn, trả bong bóng khi đã chọn', () => {
      fixture.detectChanges();
      expect(component.selectedBubble).toBeNull();

      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      editorService.selectBubble(id);

      expect(component.selectedBubble?.id).toBe(id);
    });

    it('getBubblesForActiveFrame() chỉ trả bong bóng thuộc panel đang active', () => {
      fixture.detectChanges();
      editorService.addBubble(0);
      editorService.addBubble(1);
      editorService.selectPanel(1);

      expect(component.getBubblesForActiveFrame().length).toBe(1);
      expect(component.getBubblesForActiveFrame()[0].panelIndex).toBe(1);
    });
  });

  describe('ngOnInit — tự động chuyển tab theo thay đổi panel/bong bóng đang chọn', () => {
    it('đổi panel active thì chuyển về tab "frame"', () => {
      fixture.detectChanges();
      component.setTab('bubble');

      editorService.selectPanel(1);

      expect(component.activeTab).toBe('frame');
    });

    it('chọn bong bóng không thuộc panel đang active thì tự bỏ chọn bong bóng đó', () => {
      fixture.detectChanges();
      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      editorService.selectBubble(id);

      editorService.selectPanel(1); // panel mới không chứa bubble vừa chọn

      expect(editorService.getState().selectedBubbleId).toBeNull();
    });

    it('chọn bong bóng (khác trước) thì chuyển sang tab "text"', () => {
      fixture.detectChanges();
      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      editorService.selectBubble(null); // addBubble() đã tự chọn sẵn id này
      component.setTab('frame');

      editorService.selectBubble(id);

      expect(component.activeTab).toBe('text');
    });
  });

  describe('điều khiển tab và các thao tác bong bóng qua editorService', () => {
    beforeEach(() => fixture.detectChanges());

    it('setTab() đổi tab hiện tại', () => {
      component.setTab('bubble');
      expect(component.activeTab).toBe('bubble');
    });

    it('onTargetPanelChange() chuyển panel theo giá trị chuỗi', () => {
      component.onTargetPanelChange('2');
      expect(editorService.getState().activePanelIndex).toBe(2);
    });

    it('addBubble() thêm bong bóng vào panel đang active và focus tab "text"', () => {
      editorService.selectPanel(1);
      component.setTab('frame');

      component.addBubble('cloud');

      expect(editorService.getState().bubbles[0].panelIndex).toBe(1);
      expect(editorService.getState().bubbles[0].type).toBe('cloud');
      expect(component.activeTab).toBe('text');
    });

    it('deleteSelectedBubble() xoá toàn bộ bong bóng của panel đang active', () => {
      editorService.addBubble(0);
      editorService.addBubble(1);

      component.deleteSelectedBubble();

      expect(editorService.getState().bubbles.length).toBe(1);
      expect(editorService.getState().bubbles[0].panelIndex).toBe(1);
    });

    it('selectBubble(id) focus tab "text"; selectBubble(null) không đổi tab', () => {
      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      component.setTab('bubble');

      component.selectBubble(id);
      expect(component.activeTab).toBe('text');

      component.setTab('frame');
      component.selectBubble(null);
      expect(component.activeTab).toBe('frame');
    });

    it('changeSelectedBubbleShape()/updateSelectedBubble() chỉ áp dụng khi có bong bóng đang chọn', () => {
      editorService.addBubble(0);
      const id = editorService.getState().bubbles[0].id;
      editorService.selectBubble(null); // addBubble() đã tự chọn sẵn id này

      component.updateSelectedBubble({ text: 'x' }); // chưa chọn -> không làm gì
      expect(editorService.getState().bubbles[0].text).not.toBe('x');

      editorService.selectBubble(id);
      component.changeSelectedBubbleShape('square');

      expect(editorService.getState().bubbles[0].type).toBe('square');
    });

    it('onBorderWidthChange/onBorderRadiusChange/onBorderColorChange/onGutterSizeChange cập nhật đúng trường', () => {
      component.onBorderWidthChange(5);
      component.onBorderRadiusChange(20);
      component.onBorderColorChange('#ff0000');
      component.onGutterSizeChange(30);

      const state = editorService.getState();
      expect(state.borderWidth).toBe(5);
      expect(state.borderRadius).toBe(20);
      expect(state.borderColor).toBe('#ff0000');
      expect(state.gutterSize).toBe(30);
    });
  });

  describe('undo/redo', () => {
    beforeEach(() => fixture.detectChanges());

    it('canUndo/canRedo/undo/redo uỷ quyền đúng cho ComicEditorService', () => {
      expect(component.canUndo()).toBe(false);

      editorService.addBubble(0);
      expect(component.canUndo()).toBe(true);

      component.undo();
      expect(editorService.getState().bubbles.length).toBe(0);
      expect(component.canRedo()).toBe(true);

      component.redo();
      expect(editorService.getState().bubbles.length).toBe(1);
    });
  });

  describe('resetAll() — có xác nhận qua window.confirm', () => {
    beforeEach(() => fixture.detectChanges());

    it('reset toàn bộ khi người dùng xác nhận', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      editorService.addBubble(0);

      component.resetAll();

      expect(editorService.getState().bubbles.length).toBe(0);
    });

    it('không làm gì khi người dùng huỷ xác nhận', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      editorService.addBubble(0);

      component.resetAll();

      expect(editorService.getState().bubbles.length).toBe(1);
    });
  });

  describe('exportComic()', () => {
    it('kích hoạt export$ của ComicEditorService', () => {
      fixture.detectChanges();
      let triggered = false;
      editorService.export$.subscribe(() => (triggered = true));

      component.exportComic();

      expect(triggered).toBe(true);
    });
  });

  describe('saveProject()', () => {
    beforeEach(() => {
      fixture.detectChanges();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('lưu thành công: isSaving bật rồi tắt, saveStatus "success" rồi tự về "idle" sau 3.5s', () => {
      const api = TestBed.inject(SpeechBubblesApiService);
      vi.spyOn(api, 'create');
      vi.spyOn(editorService, 'saveBubbles').mockReturnValue(of(void 0));

      component.saveProject();

      expect(component.isSaving).toBe(false);
      expect(component.saveStatus).toBe('success');

      vi.advanceTimersByTime(3500);
      expect(component.saveStatus).toBe('idle');
    });

    it('lưu thất bại: saveStatus chuyển "error" rồi tự về "idle" sau 4.5s', () => {
      vi.spyOn(editorService, 'saveBubbles').mockReturnValue(throwError(() => new Error('network')));

      component.saveProject();

      expect(component.isSaving).toBe(false);
      expect(component.saveStatus).toBe('error');

      vi.advanceTimersByTime(4500);
      expect(component.saveStatus).toBe('idle');
    });

    it('không cho lưu chồng khi đang lưu dở (isSaving=true)', () => {
      vi.spyOn(editorService, 'saveBubbles').mockReturnValue(of(void 0));
      component.isSaving = true;

      component.saveProject();

      expect(editorService.saveBubbles).not.toHaveBeenCalled();
    });
  });

  // Các test dưới đây bấm thẳng vào phần tử DOM thật (thay vì gọi hàm component
  // trực tiếp như các test ở trên) để khớp đúng các hàm lắng nghe sự kiện
  // (click) khai báo trong editor-comic.html — mục đích riêng là tăng độ bao
  // phủ "functions" của template, không thêm hành vi nghiệp vụ mới.
  describe('tương tác trực tiếp trên DOM (khớp các hàm lắng nghe sự kiện trong template)', () => {
    beforeEach(() => {
      vi.spyOn(editorService, 'saveBubbles').mockReturnValue(of(void 0));
      fixture.detectChanges();
    });

    it('bấm nút Undo/Redo/Reset trong header gọi đúng hàm', () => {
      editorService.addBubble(0);
      fixture.detectChanges();

      fixture.nativeElement.querySelectorAll('.btn-history')[0].click(); // Undo
      expect(editorService.getState().bubbles.length).toBe(0);

      fixture.nativeElement.querySelectorAll('.btn-history')[1].click(); // Redo
      expect(editorService.getState().bubbles.length).toBe(1);

      vi.spyOn(window, 'confirm').mockReturnValue(true);
      fixture.nativeElement.querySelectorAll('.btn-history')[2].click(); // Reset
      expect(editorService.getState().bubbles.length).toBe(0);
    });

    it('bấm nút chuyển tab (frame/bubble/text) đổi đúng activeTab', () => {
      const tabButtons = fixture.nativeElement.querySelectorAll('.tab-btn');

      tabButtons[1].click(); // bubble
      expect(component.activeTab).toBe('bubble');

      tabButtons[2].click(); // text
      expect(component.activeTab).toBe('text');

      tabButtons[0].click(); // frame
      expect(component.activeTab).toBe('frame');
    });

    it('bấm mẫu màu viền (tab frame) gọi onBorderColorChange với đúng mã màu', () => {
      component.setTab('frame');
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.color-swatch[aria-label="#ef4444"]').click();

      expect(editorService.getState().borderColor).toBe('#ef4444');
    });

    it('bấm nút hình dạng để thêm bong bóng mới (tab bubble)', () => {
      component.setTab('bubble');
      fixture.detectChanges();

      fixture.nativeElement.querySelectorAll('.shape-card')[2].click(); // cloud

      expect(editorService.getState().bubbles[0].type).toBe('cloud');
      expect(component.activeTab).toBe('text');
    });

    it('bấm nút đổi hình dạng và nút xoá bong bóng đang chọn (tab bubble)', () => {
      editorService.addBubble(0, 'round');
      component.setTab('bubble');
      fixture.detectChanges();

      const shapeButtons = fixture.nativeElement.querySelectorAll('.bubble-selection-card .shape-card');
      shapeButtons[1].click(); // square
      expect(editorService.getState().bubbles[0].type).toBe('square');

      fixture.nativeElement.querySelector('.btn-delete-bubble-action').click();
      expect(editorService.getState().bubbles.length).toBe(0);
    });

    it('bấm nút căn lề chữ và mẫu màu chữ (tab text)', () => {
      editorService.addBubble(0);
      component.setTab('text');
      fixture.detectChanges();

      const alignButtons = fixture.nativeElement.querySelectorAll('.align-btn-group .align-btn');
      alignButtons[2].click(); // right
      expect(editorService.getState().bubbles[0].textAlign).toBe('right');

      fixture.nativeElement.querySelector('.swatch-grid .color-swatch[aria-label="#10b981"]').click();
      expect(editorService.getState().bubbles[0].fontColor).toBe('#10b981');
    });

    it('bấm nút Lưu và nút Xuất ảnh ở footer', () => {
      let exported = false;
      editorService.export$.subscribe(() => (exported = true));

      fixture.nativeElement.querySelector('.btn-export-full').click();
      expect(exported).toBe(true);

      fixture.nativeElement.querySelector('.btn-save-full').click();
      expect(editorService.saveBubbles).toHaveBeenCalled();
    });
  });
});
