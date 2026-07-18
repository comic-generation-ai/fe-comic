import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, forkJoin, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { FrameDto, SpeechBubbleDto } from '../../core/api/frames-api.service';
import { SpeechBubblesApiService, CreateSpeechBubbleRequest, UpdateSpeechBubbleRequest } from '../../core/api/speech-bubbles-api.service';

export interface SpeechBubble {
  id: string;
  panelIndex: number;
  frameId?: string; // id frame thật ở BE — cần để lưu bong bóng (POST/PATCH /api/speech-bubbles)
  x: number; // relative X percentage (0-100) inside the panel
  y: number; // relative Y percentage (0-100) inside the panel
  w: number; // width in px
  h: number; // height in px
  type: 'round' | 'square' | 'cloud';
  tailX: number; // pointer tail X (px, relative to center)
  tailY: number; // pointer tail Y (px, relative to center)
  hasTail?: boolean; // mặc định true — false cho NARRATION (không đuôi)
  text: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

// Lời thoại nhân vật (SPEECH/SHOUT) dùng 1 kiểu tròn thống nhất, có mũi tên chỉ
// vào nhân vật đang nói. Lời người dẫn truyện (NARRATION) luôn là khung chữ nhật
// nằm dưới đáy khung tranh (be-comic đặt sẵn pos_y: 88, tail_direction: 'none' —
// xem computeBubbleLayout() trong frames.service.ts) và KHÔNG có mũi tên, để phân
// biệt rõ với lời thoại nhân vật. Chỉ giữ riêng hình đám mây (cloud) cho THOUGHT.
const BUBBLE_TYPE_MAP: Record<SpeechBubbleDto['bubble_type'], SpeechBubble['type']> = {
  SPEECH: 'round',
  THOUGHT: 'cloud',
  NARRATION: 'square',
  SHOUT: 'round',
};

function tailFromDirection(direction: string | null, w: number, h: number): { x: number; y: number; hasTail: boolean } {
  switch (direction) {
    case 'down-left':
      return { x: -0.25 * w, y: 0.6 * h, hasTail: true };
    case 'down-right':
      return { x: 0.25 * w, y: 0.6 * h, hasTail: true };
    case 'down':
      return { x: 0, y: 0.65 * h, hasTail: true };
    case 'none':
    default:
      return { x: 0, y: 0, hasTail: false };
  }
}

// tail_direction chỉ lưu được 1 trong 4 hướng cố định (down/down-left/down-right/none)
// nên khi kéo mũi nhọn tự do vào đúng nhân vật rồi lưu, quy về hướng gần nhất sẽ làm
// bong bóng "nhảy" tail về vị trí mặc định của hướng đó sau khi tải lại. Toạ độ tailX/
// tailY chính xác vì vậy được lưu kèm trong style_config (jsonb, không giới hạn) — nếu
// có sẵn thì luôn ưu tiên dùng thay vì suy ra gần đúng từ tail_direction.
function resolveTail(b: SpeechBubbleDto): { x: number; y: number; hasTail: boolean } {
  const exactX = b.style_config?.['tailX'];
  const exactY = b.style_config?.['tailY'];
  if (typeof exactX === 'number' && typeof exactY === 'number') {
    return { x: exactX, y: exactY, hasTail: b.style_config?.['hasTail'] ?? true };
  }
  return tailFromDirection(b.tail_direction, b.width, b.height);
}

// Chiều ngược lại của tailFromDirection() — dùng khi lưu bong bóng về BE.
function directionFromTail(b: SpeechBubble): string {
  if (b.hasTail === false) return 'none';
  if (b.tailX < -5) return 'down-left';
  if (b.tailX > 5) return 'down-right';
  return 'down';
}

// Ước lượng chiều cao cần thiết để chữ không bị tràn ra ngoài rồi bị
// .bubble-static-text { -webkit-line-clamp: 5; overflow: hidden } ở FE che/cắt
// mất khi bong bóng quá nhỏ so với lời thoại (đổi text, fontSize hoặc lineHeight
// đều có thể làm nội dung không còn vừa chỗ chứa hiện có).
function estimateBubbleHeight(b: SpeechBubble): number {
  const len = b.text?.trim().length ?? 0;
  if (len === 0) return b.h;

  const padding = 28; // foreignObject inset 12px x2 + container padding
  const avgCharWidthPx = b.fontSize * 0.55; // ước lượng bề rộng ký tự trung bình theo cỡ chữ hiện tại
  const usableWidth = Math.max(20, b.w - padding);
  const charsPerLine = Math.max(4, Math.floor(usableWidth / avgCharWidthPx));
  const lines = Math.max(1, Math.ceil(len / charsPerLine));
  const lineHeightPx = b.fontSize * (b.lineHeight || 1.2);

  return Math.ceil(lines * lineHeightPx + padding);
}

// Chiều ngược lại của BUBBLE_TYPE_MAP — dùng khi lưu bong bóng về BE.
// Vì round giờ dùng chung cho cả SPEECH/NARRATION/SHOUT nên khi lưu lại
// luôn quy về SPEECH (loại phổ biến nhất), chỉ cloud mới còn giữ THOUGHT.
function bubbleTypeToDto(type: SpeechBubble['type']): SpeechBubbleDto['bubble_type'] {
  switch (type) {
    case 'cloud':
      return 'THOUGHT';
    case 'square':
      return 'NARRATION';
    default:
      return 'SPEECH';
  }
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

  // frame.order_index -> frame.id thật ở BE — cần để gắn frameId cho bong bóng
  // mới thêm (chưa từng được hydrate từ BE).
  private panelFrameIds: Record<number, string> = {};
  // Tập id bong bóng đã tồn tại trong DB tính từ lần hydrate/save gần nhất —
  // dùng để phân biệt PATCH (đã có) vs POST (mới thêm ở FE) và phát hiện các
  // bong bóng đã bị xoá cục bộ cần DELETE khi lưu.
  private persistedBubbleIds = new Set<string>();

  private speechBubblesApi = inject(SpeechBubblesApiService);

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
      frameId: this.panelFrameIds[panelIndex],
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

  // Nạp bong bóng tự động sinh từ BE (frame.speech_bubbles[]) vào state editor —
  // gọi sau khi generate xong hoặc mở lại project cũ, thay thế toàn bộ bubbles hiện có.
  hydrateBubblesFromFrames(frames: FrameDto[]) {
    const bubbles: SpeechBubble[] = [];
    this.panelFrameIds = {};
    this.persistedBubbleIds = new Set<string>();
    for (const frame of frames) {
      this.panelFrameIds[frame.order_index] = frame.id;
      for (const b of frame.speech_bubbles ?? []) {
        const tail = resolveTail(b);
        bubbles.push({
          id: b.id,
          panelIndex: frame.order_index,
          frameId: frame.id,
          x: b.pos_x,
          y: b.pos_y,
          w: b.width,
          h: b.height,
          type: BUBBLE_TYPE_MAP[b.bubble_type] ?? 'round',
          tailX: tail.x,
          tailY: tail.y,
          hasTail: tail.hasTail,
          text: b.text_content,
          fontFamily: b.style_config?.['fontFamily'] ?? 'Comic Neue',
          fontSize: b.style_config?.['fontSize'] ?? 16,
          fontColor: b.style_config?.['fontColor'] ?? '#000000',
          textAlign: b.style_config?.['textAlign'] ?? 'center',
          lineHeight: b.style_config?.['lineHeight'] ?? 1.2,
        });
        this.persistedBubbleIds.add(b.id);
      }
    }
    this.updateState({ bubbles }, true);
  }

  // Lưu toàn bộ thay đổi bong bóng (vị trí, kích thước, hình dạng, nội dung...)
  // của project hiện tại về BE — bong bóng mới thêm ở FE sẽ được POST tạo mới,
  // bong bóng đã có sẽ được PATCH cập nhật, bong bóng đã xoá cục bộ sẽ bị DELETE.
  // Mở lại project từ story-board sau đó sẽ hydrate đúng những gì vừa lưu.
  saveBubbles(): Observable<void> {
    const current = this.stateSubject.getValue();
    const currentIds = new Set(current.bubbles.map((b) => b.id));
    const deletedIds = [...this.persistedBubbleIds].filter((id) => !currentIds.has(id));

    const upserts$ = current.bubbles.map((b) => {
      const frameId = b.frameId ?? this.panelFrameIds[b.panelIndex];
      const payload: UpdateSpeechBubbleRequest = {
        frameId,
        textContent: b.text,
        bubbleType: bubbleTypeToDto(b.type),
        posX: b.x,
        posY: b.y,
        width: b.w,
        height: b.h,
        // tailDirection chỉ để tương thích ngược/hiển thị thô — vị trí chính xác
        // của mũi nhọn nằm trong styleConfig.tailX/tailY (xem resolveTail()).
        tailDirection: directionFromTail(b),
        styleConfig: {
          fontFamily: b.fontFamily,
          fontSize: b.fontSize,
          fontColor: b.fontColor,
          textAlign: b.textAlign,
          lineHeight: b.lineHeight,
          tailX: b.tailX,
          tailY: b.tailY,
          hasTail: b.hasTail !== false,
        },
      };

      if (this.persistedBubbleIds.has(b.id)) {
        return this.speechBubblesApi.update(b.id, payload);
      }
      // Bong bóng mới thêm ở FE (id tạm local) chưa có trong DB — tạo mới rồi
      // gán lại id thật do BE trả về để lần lưu sau PATCH thay vì POST trùng.
      return this.speechBubblesApi
        .create(payload as CreateSpeechBubbleRequest)
        .pipe(tap((saved) => this.remapLocalBubbleId(b.id, saved.id)));
    });

    const deletes$ = deletedIds.map((id) => this.speechBubblesApi.remove(id));
    const all$ = [...upserts$, ...deletes$];

    if (all$.length === 0) {
      return of(void 0);
    }

    return forkJoin(all$).pipe(
      map(() => {
        this.persistedBubbleIds = new Set(this.stateSubject.getValue().bubbles.map((b) => b.id));
      }),
    );
  }

  private remapLocalBubbleId(oldId: string, newId: string) {
    const current = this.stateSubject.getValue();
    this.stateSubject.next({
      ...current,
      bubbles: current.bubbles.map((b) => (b.id === oldId ? { ...b, id: newId } : b)),
      selectedBubbleId: current.selectedBubbleId === oldId ? newId : current.selectedBubbleId,
    });
  }

  updateBubble(id: string, partial: Partial<SpeechBubble>, skipHistory = false) {
    if (!skipHistory) {
      this.saveHistory();
    }
    const current = this.stateSubject.getValue();
    const updatedBubbles = current.bubbles.map((b) => {
      if (b.id !== id) return b;
      const merged = { ...b, ...partial };

      // Chỉ tự nới cao khi thay đổi có thể ảnh hưởng tới lượng chữ vừa khung
      // (text/fontSize/lineHeight) và người dùng không đang tự kéo resize
      // (partial.h đã có sẵn thì tôn trọng thao tác thủ công đó).
      if (
        partial.h === undefined &&
        (partial.text !== undefined || partial.fontSize !== undefined || partial.lineHeight !== undefined)
      ) {
        const neededHeight = estimateBubbleHeight(merged);
        if (neededHeight > merged.h) {
          merged.h = Math.min(240, neededHeight);
        }
      }

      return merged;
    });
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

  deleteBubblesOnPanel(panelIndex: number) {
    this.saveHistory();
    const current = this.stateSubject.getValue();
    const remainingBubbles = current.bubbles.filter(b => b.panelIndex !== panelIndex);
    const selectedBubble = current.selectedBubbleId ? current.bubbles.find(b => b.id === current.selectedBubbleId) : null;
    const nextSelectedId = selectedBubble && selectedBubble.panelIndex === panelIndex ? null : current.selectedBubbleId;

    this.stateSubject.next({
      ...current,
      bubbles: remainingBubbles,
      selectedBubbleId: nextSelectedId
    });
  }

  selectBubble(id: string | null) {
    const current = this.stateSubject.getValue();
    if (current.selectedBubbleId !== id) {
      const bubble = id ? current.bubbles.find(b => b.id === id) : null;
      const nextActivePanel = bubble ? bubble.panelIndex : current.activePanelIndex;

      this.stateSubject.next({
        ...current,
        selectedBubbleId: id,
        activePanelIndex: nextActivePanel
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
    this.panelFrameIds = {};
    this.persistedBubbleIds = new Set<string>();
    this.stateSubject.next({
      ...this.initialState,
      bubbles: []
    });
  }
}
