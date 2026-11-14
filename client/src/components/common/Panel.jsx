export default function Panel({ title, extra, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || extra) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-base font-bold">{title}</h2>
          {extra}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
