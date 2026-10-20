'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import styles from './dropdown.module.css';

type ItemBase = {
  id: string;
  title: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
};

/** A link OR a client-side action. TypeScript rejects supplying both. */
export type DropdownItem = ItemBase & (
  | { href: string; action?: never; target?: '_blank' | '_self' }
  | { action: () => void; href?: never; target?: never }
);

export type DropdownProps = {
  /** Current value displayed on the trigger. */
  title: string;
  icon?: ReactNode;
  /** Small field label above the current value. */
  label?: string;
  items: readonly DropdownItem[];
  selectedId?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  footer?: string;
  disabled?: boolean;
  className?: string;
  menuMinWidth?: number;
  id?: string;
};

type Position = { top: number; left: number; width: number; maxHeight: number };

function normalize(value: string) {
  return value.toLocaleLowerCase('et').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function Dropdown({
  title,
  icon,
  label,
  items,
  selectedId,
  searchable = false,
  searchPlaceholder = 'Otsi...',
  emptyMessage = 'Sobivaid valikuid ei leitud.',
  footer,
  disabled = false,
  className,
  menuMinWidth = 340,
  id,
}: DropdownProps) {
  const generatedId = useId();
  const triggerId = id ?? `dropdown-${generatedId}`;
  const popupId = `${triggerId}-popup`;
  const menuId = `${triggerId}-menu`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const initialFocus = useRef<'first' | 'last' | 'search'>('search');

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return term
      ? items.filter(item => normalize(`${item.title} ${item.description ?? ''}`).includes(term))
      : items;
  }, [items, query]);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function show(focus: 'first' | 'last' | 'search' = 'search') {
    initialFocus.current = focus;
    setQuery('');
    setPosition(null);
    setOpen(true);
  }

  function focusItem(index: number) {
    const element = itemRefs.current[index];
    element?.focus();
    element?.scrollIntoView({ block: 'nearest' });
  }

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;

    function measure() {
      const trigger = triggerRef.current;
      const popup = popupRef.current;
      if (!trigger || !popup) return;
      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const startX = viewport?.offsetLeft ?? 0;
      const startY = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      if (rect.bottom < startY || rect.top > startY + viewportHeight) {
        setOpen(false);
        return;
      }
      const edge = 12;
      const gap = 8;
      const width = Math.min(Math.max(rect.width, menuMinWidth), viewportWidth - edge * 2);
      const below = startY + viewportHeight - rect.bottom - gap - edge;
      const above = rect.top - startY - gap - edge;
      const upward = below < Math.min(280, popup.scrollHeight) && above > below;
      const maxHeight = Math.max(80, Math.min(420, upward ? above : below));
      const height = Math.min(popup.scrollHeight, maxHeight);
      const next = {
        top: Math.max(startY + edge, upward ? rect.top - gap - height : rect.bottom + gap),
        left: Math.max(startX + edge, Math.min(rect.left, startX + viewportWidth - width - edge)),
        width,
        maxHeight,
      };
      setPosition(previous => previous && Object.keys(next).every(
        key => previous[key as keyof Position] === next[key as keyof Position],
      ) ? previous : next);
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    const observer = new ResizeObserver(schedule);
    if (popupRef.current) observer.observe(popupRef.current);
    if (triggerRef.current) observer.observe(triggerRef.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [open, query, menuMinWidth]);

  useEffect(() => {
    if (!open) return;
    if (initialFocus.current === 'search' && searchable) {
      searchRef.current?.focus({ preventScroll: true });
    } else {
      const enabled = items.map((item, index) => ({ item, index })).filter(x => !x.item.disabled);
      const selected = enabled.find(x => x.item.id === selectedId);
      const target = initialFocus.current === 'last'
        ? enabled.at(-1)
        : initialFocus.current === 'first' ? enabled[0] : selected ?? enabled[0];
      if (target) focusItem(target.index);
      else popupRef.current?.focus({ preventScroll: true });
    }

    function dismiss(event: Event) {
      const target = event.target;
      if (target instanceof Node && !popupRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('focusin', dismiss);
    };
    // Focus once when opened, not on every filter keystroke or parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) show(event.key === 'ArrowUp' ? 'last' : searchable ? 'search' : 'first');
      else if (searchable) searchRef.current?.focus();
      else focusItem(filtered.findIndex(item => !item.disabled));
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    }
  }

  function handlePopupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }

    // A portal lives at the end of body. Keep Tab in the trigger's form order.
    if (event.key === 'Tab') {
      const tabbable = Array.from(document.querySelectorAll<HTMLElement>(
        'a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]',
      )).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]') && !popupRef.current?.contains(element));
      const index = tabbable.indexOf(triggerRef.current!);
      const next = index >= 0 ? tabbable[index + (event.shiftKey ? -1 : 1)] : undefined;
      close();
      if (next) {
        event.preventDefault();
        next.focus();
      }
      return;
    }

    const inSearch = event.target === searchRef.current;
    if (!inSearch && event.key === ' ' && document.activeElement?.tagName === 'A') {
      event.preventDefault();
      (document.activeElement as HTMLAnchorElement).click();
      return;
    }
    const enabled = filtered.map((item, index) => ({ item, index })).filter(x => !x.item.disabled);
    const current = enabled.findIndex(x => itemRefs.current[x.index] === document.activeElement);

    if (inSearch && event.key === 'Enter') {
      event.preventDefault();
      const first = enabled[0];
      if (first) itemRefs.current[first.index]?.click();
      return;
    }
    if (!enabled.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const index = current < 0
        ? event.key === 'ArrowDown' ? 0 : enabled.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
      focusItem(enabled[index]!.index);
    } else if (!inSearch && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      focusItem((event.key === 'Home' ? enabled[0] : enabled.at(-1))!.index);
    }
  }

  const selectable = selectedId !== undefined;
  const popup = open ? (
    <div
      ref={popupRef}
      id={popupId}
      className={styles.popup}
      role="dialog"
      aria-label={label ?? title}
      tabIndex={-1}
      style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
      onKeyDown={handlePopupKeyDown}
    >
      {searchable && (
        <div className={styles.searchArea}>
          <label className={styles.searchBox}>
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              className={styles.searchInput}
              type="search"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={event => setQuery(event.target.value)}
              autoComplete="off"
              maxLength={120}
            />
          </label>
        </div>
      )}
      <div className={styles.options} role="menu" id={menuId} aria-label={label ?? title}>
        {filtered.map((item, index) => {
          const selected = item.id === selectedId;
          const content = <>
            {item.icon && <span className={styles.itemIcon} aria-hidden="true">{item.icon}</span>}
            <span className={styles.itemCopy}>
              <span>{item.title}</span>
              {item.description && <small>{item.description}</small>}
            </span>
            {selected && <Check size={18} className={styles.check} aria-hidden="true" />}
          </>;
          const shared = {
            className: `${styles.item} ${selected ? styles.selected : ''}`,
            role: selectable ? 'menuitemradio' as const : 'menuitem' as const,
            'aria-checked': selectable ? selected : undefined,
            'aria-disabled': item.disabled || undefined,
            tabIndex: -1,
          };

          if (item.disabled) {
            return <span key={item.id} {...shared}>{content}</span>;
          }
          if (item.href !== undefined) {
            return <a
              key={item.id}
              {...shared}
              ref={element => { itemRefs.current[index] = element; }}
              href={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
              onClick={() => close(true)}
            >{content}</a>;
          }
          return <button
            key={item.id}
            {...shared}
            ref={element => { itemRefs.current[index] = element; }}
            type="button"
            onClick={() => { close(true); item.action(); }}
          >{content}</button>;
        })}
      </div>
      {!filtered.length && <p className={styles.empty} role="status">{emptyMessage}</p>}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  ) : null;

  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <button
        ref={triggerRef}
        id={triggerId}
        className={styles.trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        disabled={disabled}
        onClick={() => open ? close() : show()}
        onKeyDown={handleTriggerKeyDown}
      >
        {icon && <span className={styles.triggerIcon} aria-hidden="true">{icon}</span>}
        <span className={styles.triggerCopy}>
          {label && <span className={styles.label}>{label}</span>}
          <span className={styles.title}>{title}</span>
        </span>
        <ChevronDown className={styles.chevron} size={19} aria-hidden="true" />
      </button>
      {open && createPortal(popup, document.body)}
    </div>
  );
}
