import { setText } from './dom';

export type TabId = 'muestra' | 'dependencia' | 'ampliacion';

/** Pestañas del inspector, con una insignia viva en cada una. */
export const createTabs = (tablist: HTMLElement, onChange: () => void) => {
  const tabs = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (tab: HTMLButtonElement, focus = false): void => {
    tabs.forEach((t) => {
      const isSelected = t === tab;
      t.setAttribute('aria-selected', String(isSelected));
      t.tabIndex = isSelected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !isSelected;
    });
    if (focus) tab.focus();
    onChange();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      select(tabs[(i + delta + tabs.length) % tabs.length], true);
    });
  });
  const initial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0];
  select(initial);

  return (id: TabId, badge: string, tone: 'ok' | 'warn' | 'none' = 'none'): void => {
    const tab = tabs.find((t) => t.dataset.tab === id);
    const el = tab?.querySelector('.tab-badge');
    if (!el) return;
    setText(el, badge);
    el.className = `tab-badge tone-${tone}`;
  };
};
