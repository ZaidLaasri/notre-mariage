import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  inject,
} from "@angular/core";
@Directive({
  selector: "[appFocusTrap]",
  standalone: true,
  host: { tabindex: "-1" },
})
export class FocusTrap implements AfterViewInit, OnDestroy {
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private previous: HTMLElement | null = null;
  private items() {
    return Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
      ),
    ).filter((el) => el.getClientRects().length > 0);
  }
  ngAfterViewInit() {
    this.previous = document.activeElement as HTMLElement | null;
    (this.items()[0] ?? this.element).focus();
  }
  @HostListener("keydown", ["$event"]) trap(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const items = this.items(),
      first = items[0],
      last = items.at(-1);
    if (!first) {
      event.preventDefault();
      this.element.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  ngOnDestroy() {
    this.previous?.focus();
  }
}
