import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface SpeechBubble {
  id: string;
  panelIndex: number;
  x: number; // relative X percentage (0-100) inside the panel
  y: number; // relative Y percentage (0-100) inside the panel
  w: number; // width in px
  h: number; // height in px
  type: 'round' | 'square' | 'cloud';
  tailX: number; // pointer tail X (px, relative to center)
  tailY: number; // pointer tail Y (px, relative to center)
  text: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface EditorState {
  borderWidth: number;
  borderRadius: number;
  borderColor: string;
  gutterSize: number;
  bubbles: SpeechBubble[];
  selectedBubbleId: string | null;
  activePanelIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class ComicEditorService {
  private initialState: EditorState = {
    borderWidth: 2,
    borderRadius: 8,
    borderColor: '#1e1e24',
    gutterSize: 16,
    bubbles: [],
    selectedBubbleId: null,
    activePanelIndex: 0
  };

  private stateSubject = new BehaviorSubject<EditorState>({ ...this.initialState });
  public state$: Observable<EditorState> = this.stateSubject.asObservable();

  private pastStates: string[] = [];
  private futureStates: string[] = [];

  constructor() { }

  getState(): EditorState {
    return this.stateSubject.getValue();
  }

  updateState(partial: Partial<EditorState>, skipHistory = false) {
    if (!skipHistory) {
      this.saveHistory();
    }
    const current = this.stateSubject.getValue();
    const updated = { ...current, ...partial };
    this.stateSubject.next(updated);
  }

  // Speech Bubble Actions
  addBubble(panelIndex: number, type: 'round' | 'square' | 'cloud' = 'round') {
    this.saveHistory();
    const current = this.stateSubject.getValue();
    const newBubble: SpeechBubble = {
      id: 'bubble_' + Math.random().toString(36).substr(2, 9),
      panelIndex,
      x: 50, // center
      y: 50, // center
      w: 160,
      h: 100,
      type,
      tailX: 40,
      tailY: 60,
      text: 'Lời thoại mới',
      fontFamily: 'Comic Neue',
      fontSize: 16,
      fontColor: '#000000',
      textAlign: 'center',
      lineHeight: 1.2
    };

    this.stateSubject.next({
      ...current,
      bubbles: [...current.bubbles, newBubble],
      selectedBubbleId: newBubble.id
    });
  }

  updateBubble(id: string, partial: Partial<SpeechBubble>, skipHistory = false) {
    if (!skipHistory) {
      this.saveHistory();
    }
    const current = this.stateSubject.getValue();
    const updatedBubbles = current.bubbles.map(b => b.id === id ? { ...b, ...partial } : b);
    this.stateSubject.next({
      ...current,
      bubbles: updatedBubbles
    });
  }

  deleteBubble(id: string) {
    this.saveHistory();
    const current = this.stateSubject.getValue();
    this.stateSubject.next({
      ...current,
      bubbles: current.bubbles.filter(b => b.id !== id),
      selectedBubbleId: current.selectedBubbleId === id ? null : current.selectedBubbleId
    });
  }

  selectBubble(id: string | null) {
    const current = this.stateSubject.getValue();
    if (current.selectedBubbleId !== id) {
      this.stateSubject.next({
        ...current,
        selectedBubbleId: id
      });
    }
  }

  selectPanel(index: number) {
    const current = this.stateSubject.getValue();
    if (current.activePanelIndex !== index) {
      this.stateSubject.next({
        ...current,
        activePanelIndex: index
      });
    }
  }

  private exportSubject = new Subject<void>();
  public export$: Observable<void> = this.exportSubject.asObservable();

  triggerExport() {
    this.exportSubject.next();
  }

  // History controls
  public saveHistory() {
    const currentStr = JSON.stringify(this.stateSubject.getValue());
    this.pastStates.push(currentStr);
    this.futureStates = []; // clear redo
    if (this.pastStates.length > 50) {
      this.pastStates.shift();
    }
  }

  canUndo(): boolean {
    return this.pastStates.length > 0;
  }

  canRedo(): boolean {
    return this.futureStates.length > 0;
  }

  undo() {
    if (!this.canUndo()) return;
    const currentStr = JSON.stringify(this.stateSubject.getValue());
    this.futureStates.push(currentStr);
    const prevStr = this.pastStates.pop()!;
    const prevState = JSON.parse(prevStr) as EditorState;
    this.stateSubject.next(prevState);
  }

  redo() {
    if (!this.canRedo()) return;
    const currentStr = JSON.stringify(this.stateSubject.getValue());
    this.pastStates.push(currentStr);
    const nextStr = this.futureStates.pop()!;
    const nextState = JSON.parse(nextStr) as EditorState;
    this.stateSubject.next(nextState);
  }

  reset() {
    this.pastStates = [];
    this.futureStates = [];
    this.stateSubject.next({
      ...this.initialState,
      bubbles: []
    });
  }
}
