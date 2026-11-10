import type { ReactNode } from "react";

export function SectionHeader({ icon, title, count, note, children }: {
  icon: string; title: string; count?: number; note?: string; children?: ReactNode;
}) {
  return <div className="digest-section-heading">
    <span className="digest-section-icon" aria-hidden="true">{icon}</span>
    <h2>{title}</h2>
    <span className="digest-section-rule" aria-hidden="true" />
    {note && <span className="digest-meta digest-section-note">{note}</span>}
    {count !== undefined && <span className="digest-meta">{count}</span>}
    {children}
  </div>;
}
