"use client";
import { useEffect } from "react";

export function useReaderKeyboard(clearSearch: () => void, navigate: (id: string) => void, sections: { id: string; key: string }[]) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (document.querySelector("dialog[open]")) return; // Native dialog handles Escape and focus trapping.
      const editable = target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
      if (event.key === "Escape") {
        if (editable && !target?.matches("[data-reader-search]")) return;
        clearSearch(); target?.blur(); return;
      }
      if (editable) return;
      const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
      if (event.key === "/") {
        event.preventDefault();
        const search = [...document.querySelectorAll<HTMLInputElement>("[data-reader-search]")].find((el) => el.getClientRects().length);
        search?.focus(); return;
      }
      if (event.key === "?") {
        event.preventDefault(); document.querySelector<HTMLDialogElement>("#keyboard-help")?.showModal(); return;
      }
      const section = sections.find((s) => s.key === event.key);
      if (section) { event.preventDefault(); navigate(section.id); return; }
      // Preserve native activation and caret behavior on controls.
      if (target?.closest('button,a,summary,[role="button"],[role="slider"],[role="tab"]')) return;
      if (["PageDown", "PageUp", " "].includes(event.key)) {
        event.preventDefault();
        const direction = event.key === "PageUp" || (event.key === " " && event.shiftKey) ? -1 : 1;
        window.scrollBy({ top: Math.max(200, window.innerHeight - 140) * direction, behavior }); return;
      }
      if (!["j", "k", "ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
      const cards = [...document.querySelectorAll<HTMLElement>("[data-reader-card]")].filter((el) => el.getClientRects().length);
      if (!cards.length) return;
      const current = target?.closest<HTMLElement>("[data-reader-card]");
      const index = current ? cards.indexOf(current) : -1;
      if (event.key === "Enter") {
        if (index < 0) return;
        event.preventDefault();
        const summary = current?.querySelector("summary");
        if (summary) summary.click(); else current?.querySelector<HTMLAnchorElement>("a[href]")?.click();
        return;
      }
      event.preventDefault();
      const direction = event.key === "j" || event.key === "ArrowDown" ? 1 : -1;
      const next = index < 0 ? Math.max(0, cards.findIndex((el) => el.getBoundingClientRect().bottom > 140)) : Math.max(0, Math.min(cards.length - 1, index + direction));
      cards[next].focus({ preventScroll: true });
      cards[next].scrollIntoView({ block: "center", behavior });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSearch, navigate, sections]);
}
export function KeyboardHelp() {
  return <dialog id="keyboard-help" className="digest-dialog" aria-labelledby="keyboard-help-title">
    <h2 id="keyboard-help-title" className="digest-card-title mb-4">键盘阅读</h2>
    <dl className="digest-shortcuts">{[["j / k · ↑ / ↓", "下一条 / 上一条"], ["PageDown / PageUp", "下翻 / 上翻一屏"], ["空格 / Shift + 空格", "下翻 / 上翻一屏"], ["1–9", "跳到对应栏目"], ["/", "搜索资讯与专题"], ["Enter", "展开卡片详情或打开原文"], ["Esc", "退出搜索 / 关闭帮助"], ["?", "打开本帮助"]].map(([key, text]) => <div key={key} className="contents"><dt><kbd>{key}</kbd></dt><dd>{text}</dd></div>)}</dl>
    <p className="digest-caption mt-5">输入文字、中文输入法选词时不触发快捷键。Tab 可依次访问链接和按钮。</p>
    <form method="dialog" className="mt-5"><button className="digest-button">关闭</button></form>
  </dialog>;
}
