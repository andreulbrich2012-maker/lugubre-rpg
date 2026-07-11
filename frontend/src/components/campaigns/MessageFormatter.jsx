function InlineFormattedText({ text }) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function MessageFormatter({ content }) {
  const text = String(content || '');
  const isAction = text.trim().toLowerCase().startsWith('/ação ') || text.trim().toLowerCase().startsWith('/acao ');
  const cleanText = isAction ? text.trim().replace(/^\/(?:aç[aã]o|acao)\s+/i, '') : text;

  return (
    <div className={isAction ? 'font-display text-base italic text-ember' : 'text-sm leading-relaxed text-white/90'}>
      {cleanText.split('\n').map((line, index) => (
        <p key={`${line}-${index}`} className={index > 0 ? 'mt-1' : ''}>
          {isAction && index === 0 ? 'Acao: ' : null}
          <InlineFormattedText text={line} />
        </p>
      ))}
    </div>
  );
}
