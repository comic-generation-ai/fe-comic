import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ComicEditorService, SpeechBubble, EditorState } from '../comic-editor.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editor-comic',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './editor-comic.html',
  styleUrl: './editor-comic.scss',
})
export class EditorComic implements OnInit, OnDestroy {
  @Input() comicData: any = null;
  @Input() isGenerating: boolean = false;
  @Input() activeTab: 'frame' | 'bubble' | 'text' = 'frame';
  @Output() activeTabChange = new EventEmitter<'frame' | 'bubble' | 'text'>();

  editorService = inject(ComicEditorService);
  private cdr = inject(ChangeDetectorRef);
  editorState!: EditorState;
  private sub = new Subscription();

  isSaving = false;
  saveStatus: 'idle' | 'success' | 'error' = 'idle';
  private saveStatusTimeout: any;

  get targetPanelIndex(): number {
    return this.editorState ? this.editorState.activePanelIndex : 0;
  }

  // Thay đổi panel đang chỉnh sửa
  onTargetPanelChange(value: any) {
    this.editorService.selectPanel(Number(value));
  }

  // Tải truyện tranh
  exportComic() {
    this.editorService.triggerExport();
  }

  // Lưu truyện tranh
  saveProject() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.saveStatus = 'idle';
    clearTimeout(this.saveStatusTimeout);
    this.refreshView();

    this.editorService.saveBubbles().subscribe({
      next: () => {
        this.isSaving = false;
        this.saveStatus = 'success';
        this.refreshView();
        this.saveStatusTimeout = setTimeout(() => {
          this.saveStatus = 'idle';
          this.refreshView();
        }, 3500);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveStatus = 'error';
        console.error('[EditorComic] saveProject failed:', err);
        this.refreshView();
        this.saveStatusTimeout = setTimeout(() => {
          this.saveStatus = 'idle';
          this.refreshView();
        }, 4500);
      },
    });
  }

  // Cập nhật giao diện
  private refreshView() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // Danh sách font
  fontFamilies = [
    { name: 'EDITOR_COMIC.FONTS.COMIC_NEUE', value: 'Comic Neue' },
    { name: 'EDITOR_COMIC.FONTS.BANGERS', value: 'Bangers' },
    { name: 'EDITOR_COMIC.FONTS.ARIAL', value: 'Arial' },
    { name: 'EDITOR_COMIC.FONTS.IMPACT', value: 'Impact' },
    { name: 'EDITOR_COMIC.FONTS.OUTFIT', value: 'Outfit' }
  ];

  // Danh sách hình dạng bong bóng
  bubbleShapes: { type: SpeechBubble['type']; icon: string; nameKey: string }[] = [
    { type: 'round', icon: 'chat_bubble', nameKey: 'EDITOR_COMIC.SHAPE_ROUND' },
    { type: 'square', icon: 'crop_square', nameKey: 'EDITOR_COMIC.SHAPE_SQUARE' },
    { type: 'cloud', icon: 'cloud', nameKey: 'EDITOR_COMIC.SHAPE_CLOUD' },
  ];

  // Danh sách khoảng cách dòng
  lineHeightPresets: { key: string; value: number; labelKey: string }[] = [
    { key: 'compact', value: 1.0, labelKey: 'EDITOR_COMIC.LINE_HEIGHT_COMPACT' },
    { key: 'normal', value: 1.3, labelKey: 'EDITOR_COMIC.LINE_HEIGHT_NORMAL' },
    { key: 'relaxed', value: 1.6, labelKey: 'EDITOR_COMIC.LINE_HEIGHT_RELAXED' },
  ];

  // Danh sách căn chỉnh
  alignOptions: { value: 'left' | 'center' | 'right'; icon: string; titleKey: string }[] = [
    { value: 'left', icon: 'format_align_left', titleKey: 'EDITOR_COMIC.ALIGN_LEFT_TITLE' },
    { value: 'center', icon: 'format_align_center', titleKey: 'EDITOR_COMIC.ALIGN_CENTER_TITLE' },
    { value: 'right', icon: 'format_align_right', titleKey: 'EDITOR_COMIC.ALIGN_RIGHT_TITLE' },
  ];

  // Danh sách màu viền
  borderColorSwatches = ['#000000', '#ffffff', '#1e1e24', '#ef4444', '#f59e0b'];
  // Danh sách màu chữ
  fontColorSwatches = ['#000000', '#ef4444', '#2563eb', '#10b981', '#f59e0b'];

  // Lấy icon của bong bóng
  shapeIcon(type: SpeechBubble['type']): string {
    return this.bubbleShapes.find((s) => s.type === type)?.icon ?? 'chat_bubble';
  }

  // Lấy key của loại bong bóng
  bubbleTypeKey(type: SpeechBubble['type']): string {
    return type === 'round'
      ? 'EDITOR_COMIC.TYPES.ROUND'
      : type === 'square'
        ? 'EDITOR_COMIC.TYPES.SQUARE'
        : 'EDITOR_COMIC.TYPES.CLOUD';
  }

  // Lấy preset khoảng cách dòng
  activeLineHeightPreset(lineHeight: number | undefined): string {
    if (lineHeight === undefined) return 'normal';
    let closest = this.lineHeightPresets[0];
    let minDiff = Infinity;
    for (const preset of this.lineHeightPresets) {
      const diff = Math.abs(preset.value - lineHeight);
      if (diff < minDiff) {
        minDiff = diff;
        closest = preset;
      }
    }
    return closest.key;
  }

  ngOnInit() {
    this.sub.add(
      this.editorService.state$.subscribe((state) => {
        const prevPanelIndex = this.editorState?.activePanelIndex;
        const prevSelectedId = this.editorState?.selectedBubbleId;
        this.editorState = state;
        //chuyển sang tab frame nếu bám vào 1 panel và unselect bubble
        if (state.activePanelIndex !== undefined && state.activePanelIndex !== prevPanelIndex) {
          this.activeTab = 'frame';

          if (state.selectedBubbleId) {
            const currentBubble = state.bubbles.find(b => b.id === state.selectedBubbleId);
            if (currentBubble && currentBubble.panelIndex !== state.activePanelIndex) {
              this.editorService.selectBubble(null);
            }
          }
        }
        //chuyển sang tab text nếu bám vào 1 bubble
        if (state.selectedBubbleId && state.selectedBubbleId !== prevSelectedId) {
          this.activeTab = 'text';
        }

        this.refreshView();
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    clearTimeout(this.saveStatusTimeout);
  }

  // Lấy số lượng panel
  get panelsCount(): number[] {
    if (!this.comicData) return [];
    return Array.from({ length: this.comicData.frameCount || 4 }, (_, i) => i);
  }

  // Lấy bong bóng được chọn
  get selectedBubble(): SpeechBubble | null {
    if (!this.editorState || !this.editorState.selectedBubbleId) return null;
    return this.editorState.bubbles.find(b => b.id === this.editorState.selectedBubbleId) || null;
  }

  // Lấy bong bóng của panel hiện tại
  getBubblesForActiveFrame(): SpeechBubble[] {
    if (!this.editorState || this.targetPanelIndex === null) return [];
    return this.editorState.bubbles.filter(b => b.panelIndex === this.targetPanelIndex);
  }
  // Chọn bong bóng
  selectBubble(id: string | null) {
    this.editorService.selectBubble(id);
    if (id) {
      this.activeTab = 'text';
    }
  }
  // Chọn tab
  setTab(tab: 'frame' | 'bubble' | 'text') {
    this.activeTab = tab;
    this.activeTabChange.emit(tab);
  }

  // Xử lý thay đổi border width
  onBorderWidthChange(value: number) {
    this.editorService.updateState({ borderWidth: value });
  }

  // Xử lý thay đổi border radius
  onBorderRadiusChange(value: number) {
    this.editorService.updateState({ borderRadius: value });
  }

  // Xử lý thay đổi border color
  onBorderColorChange(value: string) {
    this.editorService.updateState({ borderColor: value });
  }

  // Xử lý thay đổi gutter size
  onGutterSizeChange(value: number) {
    this.editorService.updateState({ gutterSize: value });
  }

  // Thêm bong bóng
  addBubble(type: 'round' | 'square' | 'cloud') {
    this.editorService.addBubble(this.targetPanelIndex, type);
    this.activeTab = 'text';
  }

  // Xóa bong bóng
  deleteSelectedBubble() {
    this.editorService.deleteBubblesOnPanel(this.targetPanelIndex);
  }

  // Thay đổi hình dạng bong bóng
  changeSelectedBubbleShape(type: 'round' | 'square' | 'cloud') {
    this.updateSelectedBubble({ type });
  }

  // Cập nhật bong bóng
  updateSelectedBubble(partial: Partial<SpeechBubble>, skipHistory = false) {
    if (this.editorState.selectedBubbleId) {
      this.editorService.updateBubble(this.editorState.selectedBubbleId, partial, skipHistory);
    }
  }

  // Undo / Redo controls
  canUndo(): boolean {
    return this.editorService.canUndo();
  }

  canRedo(): boolean {
    return this.editorService.canRedo();
  }

  undo() {
    this.editorService.undo();
  }

  redo() {
    this.editorService.redo();
  }

  resetAll() {
    if (confirm('Bạn có chắc chắn muốn xóa hết tất cả các bong bóng thoại và đặt lại khung hình về mặc định?')) {
      this.editorService.reset();
    }
  }
}
