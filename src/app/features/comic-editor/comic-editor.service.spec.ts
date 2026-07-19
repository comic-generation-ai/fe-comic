import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ComicEditorService } from './comic-editor.service';
import { FrameDto } from '../../core/api/frames-api.service';
import { SpeechBubblesApiService } from '../../core/api/speech-bubbles-api.service';

describe('ComicEditorService', () => {
  let service: ComicEditorService;
  let fakeApi: { create: any; update: any; remove: any };

  beforeEach(() => {
    fakeApi = {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SpeechBubblesApiService, useValue: fakeApi }],
    });

    service = TestBed.inject(ComicEditorService);
  });

  describe('thêm/sửa/xoá bong bóng thoại', () => {
    it('addBubble() thêm bong bóng mặc định và tự chọn nó', () => {
      service.addBubble(0);

      const state = service.getState();
      expect(state.bubbles.length).toBe(1);
      expect(state.bubbles[0].panelIndex).toBe(0);
      expect(state.bubbles[0].type).toBe('round');
      expect(state.selectedBubbleId).toBe(state.bubbles[0].id);
    });

    it('addBubble() nhận đúng loại hình dạng truyền vào', () => {
      service.addBubble(1, 'cloud');

      expect(service.getState().bubbles[0].type).toBe('cloud');
    });

    it('deleteBubble() xoá đúng bong bóng và bỏ chọn nếu đang được chọn', () => {
      service.addBubble(0);
      const id = service.getState().bubbles[0].id;

      service.deleteBubble(id);

      const state = service.getState();
      expect(state.bubbles.length).toBe(0);
      expect(state.selectedBubbleId).toBeNull();
    });

    it('deleteBubblesOnPanel() chỉ xoá bong bóng thuộc đúng panel', () => {
      service.addBubble(0);
      service.addBubble(1);

      service.deleteBubblesOnPanel(0);

      const state = service.getState();
      expect(state.bubbles.length).toBe(1);
      expect(state.bubbles[0].panelIndex).toBe(1);
    });

    it('updateBubble() tự tăng chiều cao khi văn bản dài hơn không gian hiện có, giới hạn tối đa 240px', () => {
      service.addBubble(0); // w:160, fontSize:16, lineHeight:1.2, h mặc định 100
      const id = service.getState().bubbles[0].id;

      service.updateBubble(id, { text: 'x'.repeat(200) });

      expect(service.getState().bubbles[0].h).toBe(240);
    });

    it('updateBubble() không tự thu nhỏ chiều cao khi văn bản ngắn hơn không gian hiện có', () => {
      service.addBubble(0);
      const id = service.getState().bubbles[0].id;

      service.updateBubble(id, { text: 'hi' });

      expect(service.getState().bubbles[0].h).toBe(100);
    });

    it('updateBubble() tôn trọng chiều cao do người dùng tự kéo (partial.h) thay vì tự tính lại', () => {
      service.addBubble(0);
      const id = service.getState().bubbles[0].id;

      service.updateBubble(id, { h: 50, text: 'x'.repeat(200) });

      expect(service.getState().bubbles[0].h).toBe(50);
    });
  });

  describe('chọn bong bóng/khung tranh', () => {
    it('selectBubble() đồng bộ activePanelIndex theo panel của bong bóng được chọn', () => {
      service.addBubble(2);
      const id = service.getState().bubbles[0].id;
      // addBubble() đã tự chọn id này rồi (selectedBubbleId === id) — selectBubble()
      // chỉ đồng bộ lại activePanelIndex khi selectedBubbleId thực sự thay đổi, nên
      // phải bỏ chọn trước để lần gọi selectBubble(id) tiếp theo không bị no-op.
      service.selectBubble(null);

      service.selectBubble(id);

      expect(service.getState().activePanelIndex).toBe(2);
    });

    it('selectBubble(null) bỏ chọn nhưng giữ nguyên activePanelIndex hiện tại', () => {
      service.addBubble(2);
      const id = service.getState().bubbles[0].id;
      service.selectBubble(null);
      service.selectBubble(id);

      service.selectBubble(null);

      const state = service.getState();
      expect(state.selectedBubbleId).toBeNull();
      expect(state.activePanelIndex).toBe(2);
    });

    it('selectPanel()/selectBubble() không ghi lịch sử undo — chỉ thao tác cấu trúc mới ghi lịch sử', () => {
      service.selectPanel(3);
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('hoàn tác / làm lại (undo/redo)', () => {
    it('undo() khôi phục trạng thái trước đó, redo() áp dụng lại thay đổi', () => {
      service.addBubble(0);
      expect(service.getState().bubbles.length).toBe(1);

      service.undo();
      expect(service.getState().bubbles.length).toBe(0);
      expect(service.canRedo()).toBe(true);

      service.redo();
      expect(service.getState().bubbles.length).toBe(1);
    });

    it('undo()/redo() không làm gì khi không còn lịch sử', () => {
      expect(service.canUndo()).toBe(false);
      service.undo();
      expect(service.getState().bubbles.length).toBe(0);

      expect(service.canRedo()).toBe(false);
      service.redo();
      expect(service.getState().bubbles.length).toBe(0);
    });

    it('giới hạn lịch sử tối đa 50 bước: vượt quá 50 lần sửa thì các bước xa nhất bị loại bỏ', () => {
      for (let i = 0; i < 60; i++) {
        service.addBubble(0);
      }
      expect(service.getState().bubbles.length).toBe(60);

      for (let i = 0; i < 50; i++) {
        service.undo();
      }

      // Chỉ hoàn tác được tối đa 50/60 bước do ngăn xếp lịch sử giới hạn 50 phần tử
      expect(service.getState().bubbles.length).toBe(10);
      expect(service.canUndo()).toBe(false);
    });
  });

  describe('nạp bong bóng từ dữ liệu backend (hydrateBubblesFromFrames)', () => {
    const frames: FrameDto[] = [
      {
        id: 'f0', project_id: 'p', order_index: 0, image_prompt: null, image_url: null,
        thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null,
        speech_bubbles: [
          { id: 'b1', frame_id: 'f0', text_content: 'Xin chào', bubble_type: 'SPEECH', pos_x: 20, pos_y: 30, width: 150, height: 90, tail_direction: 'down-left', style_config: {} },
        ],
      },
      {
        id: 'f1', project_id: 'p', order_index: 1, image_prompt: null, image_url: null,
        thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null,
        speech_bubbles: [
          { id: 'b2', frame_id: 'f1', text_content: 'Suy nghĩ', bubble_type: 'THOUGHT', pos_x: 10, pos_y: 10, width: 100, height: 80, tail_direction: 'down', style_config: { tailX: 12, tailY: 34, hasTail: false } },
        ],
      },
      {
        id: 'f2', project_id: 'p', order_index: 2, image_prompt: null, image_url: null,
        thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null,
        speech_bubbles: [
          { id: 'b3', frame_id: 'f2', text_content: 'Người dẫn chuyện nói...', bubble_type: 'NARRATION', pos_x: 0, pos_y: 88, width: 400, height: 60, tail_direction: 'none', style_config: { fontFamily: 'Custom', fontSize: 20, fontColor: '#ffffff', textAlign: 'left', lineHeight: 1.5 } },
        ],
      },
      {
        id: 'f3', project_id: 'p', order_index: 3, image_prompt: null, image_url: null,
        thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null,
        speech_bubbles: [
          { id: 'b4', frame_id: 'f3', text_content: 'Hét lên!', bubble_type: 'SHOUT', pos_x: 60, pos_y: 40, width: 130, height: 70, tail_direction: 'down-right', style_config: {} },
        ],
      },
    ];

    it('ánh xạ đúng bubble_type sang hình dạng hiển thị (SPEECH/SHOUT→round, THOUGHT→cloud, NARRATION→square)', () => {
      service.hydrateBubblesFromFrames(frames);

      const bubbles = service.getState().bubbles;
      expect(bubbles.find((b) => b.id === 'b1')!.type).toBe('round');
      expect(bubbles.find((b) => b.id === 'b2')!.type).toBe('cloud');
      expect(bubbles.find((b) => b.id === 'b3')!.type).toBe('square');
      expect(bubbles.find((b) => b.id === 'b4')!.type).toBe('round');
    });

    it('ưu tiên toạ độ đuôi chính xác trong style_config thay vì suy ra gần đúng từ tail_direction', () => {
      service.hydrateBubblesFromFrames(frames);

      const b2 = service.getState().bubbles.find((b) => b.id === 'b2')!;
      expect(b2.tailX).toBe(12);
      expect(b2.tailY).toBe(34);
      expect(b2.hasTail).toBe(false);
    });

    it('suy ra toạ độ đuôi gần đúng từ tail_direction khi style_config không có toạ độ chính xác', () => {
      service.hydrateBubblesFromFrames(frames);

      const b1 = service.getState().bubbles.find((b) => b.id === 'b1')!;
      expect(b1.tailX).toBe(-0.25 * 150);
      expect(b1.tailY).toBe(0.6 * 90);
      expect(b1.hasTail).toBe(true);

      const b4 = service.getState().bubbles.find((b) => b.id === 'b4')!;
      expect(b4.tailX).toBe(0.25 * 130);
      expect(b4.tailY).toBe(0.6 * 70);
    });

    it('dùng giá trị mặc định khi style_config không khai báo font/màu/canh lề, và giữ nguyên khi có khai báo', () => {
      service.hydrateBubblesFromFrames(frames);

      const b1 = service.getState().bubbles.find((b) => b.id === 'b1')!;
      expect(b1.fontFamily).toBe('Comic Neue');
      expect(b1.fontSize).toBe(16);
      expect(b1.fontColor).toBe('#000000');
      expect(b1.textAlign).toBe('center');
      expect(b1.lineHeight).toBe(1.2);

      const b3 = service.getState().bubbles.find((b) => b.id === 'b3')!;
      expect(b3.fontFamily).toBe('Custom');
      expect(b3.fontSize).toBe(20);
      expect(b3.textAlign).toBe('left');
      expect(b3.lineHeight).toBe(1.5);
    });

    it('ghi nhớ frameId theo order_index để bong bóng thêm mới sau đó gắn đúng frame', () => {
      service.hydrateBubblesFromFrames(frames);

      service.addBubble(1);

      const newest = service.getState().bubbles.find((b) => b.panelIndex === 1 && b.id !== 'b2')!;
      expect(newest.frameId).toBe('f1');
    });
  });

  describe('lưu bong bóng lên backend (saveBubbles) — đối chiếu tập định danh để suy ra POST/PATCH/DELETE', () => {
    const singleFrame: FrameDto[] = [
      {
        id: 'frame-1', project_id: 'p', order_index: 0, image_prompt: null, image_url: null,
        thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null,
        speech_bubbles: [
          { id: 'b1', frame_id: 'frame-1', text_content: 'Đã có sẵn', bubble_type: 'SPEECH', pos_x: 10, pos_y: 10, width: 120, height: 80, tail_direction: 'down', style_config: {} },
        ],
      },
    ];

    it('bong bóng mới thêm ở FE → gọi create(); bong bóng đã xoá cục bộ → gọi remove(); không đụng tới bong bóng không đổi', () => {
      service.hydrateBubblesFromFrames(singleFrame);
      service.addBubble(0); // bong bóng mới, id tạm local
      const newLocalId = service.getState().selectedBubbleId!;
      service.deleteBubble('b1'); // xoá bong bóng đã tồn tại trong DB

      fakeApi.create.mockReturnValue(of({ id: 'server-id-123' }));
      fakeApi.remove.mockReturnValue(of({}));

      service.saveBubbles().subscribe();

      expect(fakeApi.create).toHaveBeenCalledTimes(1);
      expect(fakeApi.create.mock.calls[0][0]).toMatchObject({
        frameId: 'frame-1',
        textContent: 'Lời thoại mới',
        bubbleType: 'SPEECH',
        posX: 50,
        posY: 50,
        width: 160,
        height: 100,
        tailDirection: 'down-right',
      });
      expect(fakeApi.remove).toHaveBeenCalledTimes(1);
      expect(fakeApi.remove).toHaveBeenCalledWith('b1');
      expect(fakeApi.update).not.toHaveBeenCalled();

      // Bong bóng mới được gán lại id thật do BE trả về
      const state = service.getState();
      expect(state.bubbles.find((b) => b.id === newLocalId)).toBeUndefined();
      expect(state.bubbles.find((b) => b.id === 'server-id-123')).toBeTruthy();
      expect(state.selectedBubbleId).toBe('server-id-123');
    });

    it('sau khi lưu thành công, lần lưu kế tiếp nhận diện đúng là cập nhật (update) thay vì tạo mới lại', () => {
      service.hydrateBubblesFromFrames(singleFrame);
      service.addBubble(0);
      service.deleteBubble('b1');

      fakeApi.create.mockReturnValue(of({ id: 'server-id-123' }));
      fakeApi.remove.mockReturnValue(of({}));
      service.saveBubbles().subscribe();

      fakeApi.update.mockReturnValue(of({}));
      service.saveBubbles().subscribe();

      expect(fakeApi.update).toHaveBeenCalledTimes(1);
      expect(fakeApi.update.mock.calls[0][0]).toBe('server-id-123');
      // Không tạo mới/xoá lại vì không còn gì thay đổi thêm so với lần lưu trước
      expect(fakeApi.create).toHaveBeenCalledTimes(1);
      expect(fakeApi.remove).toHaveBeenCalledTimes(1);
    });

    it('bong bóng không đổi vẫn được PATCH lại mỗi lần lưu — saveBubbles() chỉ đối chiếu tập định danh, không diff theo nội dung', () => {
      service.hydrateBubblesFromFrames(singleFrame);
      fakeApi.update.mockReturnValue(of({}));

      service.saveBubbles().subscribe();

      expect(fakeApi.create).not.toHaveBeenCalled();
      expect(fakeApi.remove).not.toHaveBeenCalled();
      expect(fakeApi.update).toHaveBeenCalledTimes(1);
      expect(fakeApi.update.mock.calls[0][0]).toBe('b1');
    });
  });

  describe('reset()', () => {
    it('đưa state, lịch sử và các map nội bộ về trạng thái khởi tạo', () => {
      service.addBubble(0);
      service.addBubble(1);

      service.reset();

      const state = service.getState();
      expect(state.bubbles).toEqual([]);
      expect(state.selectedBubbleId).toBeNull();
      expect(state.activePanelIndex).toBe(0);
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);
    });
  });
});
