import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
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
  editorState!: EditorState;
  private sub = new Subscription();

  // Active control panel tab
  activeTab: 'frame' | 'bubble' | 'text' = 'frame';

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

        // 1. If active panel index changed, focus 'bubble' tab
        if (state.activePanelIndex !== undefined && state.activePanelIndex !== prevPanelIndex) {
          this.activeTab = 'bubble';
        }

        // 2. If selected bubble ID changed (and is not null), focus 'text' tab
        if (state.selectedBubbleId && state.selectedBubbleId !== prevSelectedId) {
          this.activeTab = 'text';
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
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
    if (this.editorState.selectedBubbleId) {
      this.editorService.deleteBubble(this.editorState.selectedBubbleId);
    }
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
