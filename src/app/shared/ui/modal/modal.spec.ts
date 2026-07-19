import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modal } from './modal';

describe('Modal', () => {
  let component: Modal;
  let fixture: ComponentFixture<Modal>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Modal],
    });

    fixture = TestBed.createComponent(Modal);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('không render gì khi isOpen=false', () => {
    component.isOpen = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.notification-popup')).toBeNull();
  });

  it('hiện trạng thái rỗng và ẩn nút "đánh dấu tất cả" khi danh sách thông báo trống', () => {
    component.isOpen = true;
    component.notifications = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.btn-mark-all')).toBeNull();
  });

  it('hiện danh sách thông báo, chấm đỏ cho thông báo chưa đọc', () => {
    component.isOpen = true;
    component.notifications = [
      { id: 1, type: 'feature', title: 'A', content: 'noi dung A', timestamp: '1 gio truoc', isRead: false },
      { id: 2, type: 'billing', title: 'B', content: 'noi dung B', timestamp: '2 gio truoc', isRead: true },
    ];
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.notification-item');
    expect(items.length).toBe(2);
    expect(items[0].classList).toContain('unread');
    expect(items[0].querySelector('.unread-dot')).toBeTruthy();
    expect(items[1].classList).not.toContain('unread');
    expect(items[1].querySelector('.unread-dot')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-mark-all')).toBeTruthy();
  });

  describe('getIconName()', () => {
    it('ánh xạ đúng icon theo loại thông báo, mặc định "notifications" cho loại lạ', () => {
      expect(component.getIconName('feature')).toBe('bolt');
      expect(component.getIconName('billing')).toBe('credit_card');
      expect(component.getIconName('update')).toBe('campaign');
      expect(component.getIconName('unknown')).toBe('notifications');
    });
  });

  describe('phát sự kiện ra ngoài (đều stopPropagation)', () => {
    it('onClose() phát close', () => {
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');
      let closed = false;
      component.close.subscribe(() => (closed = true));

      component.onClose(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(closed).toBe(true);
    });

    it('onMarkAllAsRead() phát markAllAsRead', () => {
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');
      let marked = false;
      component.markAllAsRead.subscribe(() => (marked = true));

      component.onMarkAllAsRead(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(marked).toBe(true);
    });

    it('onMarkAsRead(id) phát markAsRead kèm đúng id', () => {
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');
      let markedId: number | undefined;
      component.markAsRead.subscribe((id) => (markedId = id));

      component.onMarkAsRead(42, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(markedId).toBe(42);
    });
  });

  it('bấm nút đánh dấu tất cả trên DOM phát đúng sự kiện', () => {
    component.isOpen = true;
    component.notifications = [{ id: 1, type: 'update', title: 'A', content: 'c', timestamp: 't', isRead: false }];
    fixture.detectChanges();
    let marked = false;
    component.markAllAsRead.subscribe(() => (marked = true));

    fixture.nativeElement.querySelector('.btn-mark-all').click();

    expect(marked).toBe(true);
  });
});
