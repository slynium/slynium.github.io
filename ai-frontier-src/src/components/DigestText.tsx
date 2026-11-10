import ReactMarkdown from "react-markdown";

// All editorial and article prose uses one renderer. Do not auto-bold every
// number: dates and version strings are not necessarily the important evidence.
export function DigestText({ children, className = "", label }: { children: string; className?: string; label?: string }) {
  return <div className={`digest-body prose-digest ${className}`}>{label && <strong className="digest-label">{label}</strong>}<ReactMarkdown components={{
    a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
  }}>{children}</ReactMarkdown></div>;
}
