import { Component, Input, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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

  editorService = inject(ComicEditorService);
  private cdr = inject(ChangeDetectorRef);
  editorState!: EditorState;
  private sub = new Subscription();

  // Active control panel tab
  activeTab: 'frame' | 'bubble' | 'text' = 'frame';

  // Save-to-backend state for the sticky footer Save button — hiện thông báo
  // ngay phía trên nút Lưu thay vì dùng modal PopUp (backdrop full-screen của
  // PopUp từng che mất thao tác chỉnh bong bóng dù "ẩn").
  isSaving = false;
  saveStatus: 'idle' | 'success' | 'error' = 'idle';
  private saveStatusTimeout: any;

  // Get active panel index from service
  get targetPanelIndex(): number {
    return this.editorState ? this.editorState.activePanelIndex : 0;
  }

  onTargetPanelChange(value: any) {
    this.editorService.selectPanel(Number(value));
  }

  exportComic() {
    this.editorService.triggerExport();
  }

  // Persist bubble positions/sizes/shapes/text to BE so re-opening this project
  // from story-board loads exactly what was edited here, instead of the
  // original auto-generated layout.
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

  // App chạy zoneless — cập nhật state trong subscribe()/setTimeout() không tự vẽ
  // lại view, phải ép change detection thủ công thì thông báo mới thật sự hiện ra.
  private refreshView() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // Preset list of professional comic fonts
  fontFamilies = [
    { name: 'EDITOR_COMIC.FONTS.COMIC_NEUE', value: 'Comic Neue' },
    { name: 'EDITOR_COMIC.FONTS.BANGERS', value: 'Bangers' },
    { name: 'EDITOR_COMIC.FONTS.ARIAL', value: 'Arial' },
    { name: 'EDITOR_COMIC.FONTS.IMPACT', value: 'Impact' },
    { name: 'EDITOR_COMIC.FONTS.OUTFIT', value: 'Outfit' }
  ];

  ngOnInit() {
    this.sub.add(
      this.editorService.state$.subscribe((state) => {
        const prevPanelIndex = this.editorState?.activePanelIndex;
        const prevSelectedId = this.editorState?.selectedBubbleId;
        this.editorState = state;

        // 1. If active panel index changed, focus 'frame' tab
        if (state.activePanelIndex !== undefined && state.activePanelIndex !== prevPanelIndex) {
          this.activeTab = 'frame';
          
          // Tự động bỏ chọn bong bóng nếu nó không thuộc panel đang chọn
          if (state.selectedBubbleId) {
            const currentBubble = state.bubbles.find(b => b.id === state.selectedBubbleId);
            if (currentBubble && currentBubble.panelIndex !== state.activePanelIndex) {
              this.editorService.selectBubble(null);
            }
          }
        }

        // 2. If selected bubble ID changed (and is not null), focus 'text' tab
        if (state.selectedBubbleId && state.selectedBubbleId !== prevSelectedId) {
          this.activeTab = 'text';
        }

        // App chạy zoneless — subscribe() ngoài event DOM không tự trigger CD.
        this.refreshView();
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    clearTimeout(this.saveStatusTimeout);
  }

  get panelsCount(): number[] {
    if (!this.comicData) return [];
    return Array.from({ length: this.comicData.frameCount || 4 }, (_, i) => i);
  }

  // Get currently selected speech bubble
  get selectedBubble(): SpeechBubble | null {
    if (!this.editorState || !this.editorState.selectedBubbleId) return null;
    return this.editorState.bubbles.find(b => b.id === this.editorState.selectedBubbleId) || null;
  }

  getBubblesForActiveFrame(): SpeechBubble[] {
    if (!this.editorState || this.targetPanelIndex === null) return [];
    return this.editorState.bubbles.filter(b => b.panelIndex === this.targetPanelIndex);
  }

  selectBubble(id: string | null) {
    this.editorService.selectBubble(id);
    if (id) {
      this.activeTab = 'text';
    }
  }

  // Set active sidebar tab
  setTab(tab: 'frame' | 'bubble' | 'text') {
    this.activeTab = tab;
  }

  // Frame modifiers (Save history first then update state)
  onBorderWidthChange(value: number) {
    this.editorService.updateState({ borderWidth: value });
  }

  onBorderRadiusChange(value: number) {
    this.editorService.updateState({ borderRadius: value });
  }

  onBorderColorChange(value: string) {
    this.editorService.updateState({ borderColor: value });
  }

  onGutterSizeChange(value: number) {
    this.editorService.updateState({ gutterSize: value });
  }

  // Bubble modifiers
  addBubble(type: 'round' | 'square' | 'cloud') {
    this.editorService.addBubble(this.targetPanelIndex, type);
    this.activeTab = 'text'; // Auto focus text customization on add
  }

  deleteSelectedBubble() {
    this.editorService.deleteBubblesOnPanel(this.targetPanelIndex);
  }

  // Change the shape of the currently selected bubble (round/square/cloud)
  // — distinct from addBubble(), which always creates a brand new bubble.
  changeSelectedBubbleShape(type: 'round' | 'square' | 'cloud') {
    this.updateSelectedBubble({ type });
  }

  // Text details modifiers
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
