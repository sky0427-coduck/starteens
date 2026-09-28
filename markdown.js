// Minimal markdown parser — supports headings, bold, italic,
// blockquote, unordered/ordered lists, links, inline code, and paragraphs.
// No external dependencies.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(s) {
  let out = escapeHtml(s);
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic (avoid matching bold **)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  return out;
}

export function renderMarkdown(md) {
  if (!md || !md.trim()) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  };

  while (i < lines.length) {
    const line = lines[i];

    // blank line
    if (line.trim() === '') {
      closeLists();
      i++;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeLists();
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // blockquote
    if (line.trim().startsWith('>')) {
      closeLists();
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${inline(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    // ordered list item
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (!inOl) { closeLists(); html.push('<ol>'); inOl = true; }
      html.push(`<li>${inline(ol[1])}</li>`);
      i++;
      continue;
    }

    // unordered list item
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (!inUl) { closeLists(); html.push('<ul>'); inUl = true; }
      html.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }

    // paragraph (collect consecutive non-empty, non-special lines)
    closeLists();
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    html.push(`<p>${inline(paraLines.join(' '))}</p>`);
  }

  closeLists();
  return html.join('\n');
}
