// A deliberately small Markdown renderer for the editable pages: ## headings,
// - / 1. lists, **bold**, *italic* and [links](/url). All input is HTML-escaped first.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, url: string) => {
      const safe = /^(https?:\/\/|mailto:|tel:|\/)/i.test(url) ? url : "#";
      const external = /^https?:\/\//i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${safe}"${external}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
}

export function renderMarkdown(source: string): string {
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(inline).join("<br />")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (listType) html.push(`<${listType}>${listItems.map((item) => `<li>${inline(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  };
  const startList = (type: "ul" | "ol") => {
    flushParagraph();
    if (listType !== type) {
      flushList();
      listType = type;
    }
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    let match: RegExpMatchArray | null;
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if ((match = line.match(/^(#{1,3})\s+(.+)$/))) {
      flushParagraph();
      flushList();
      const level = match[1].length === 3 ? 3 : 2;
      html.push(`<h${level}>${inline(match[2])}</h${level}>`);
    } else if ((match = line.match(/^\s*[-*]\s+(.+)$/))) {
      startList("ul");
      listItems.push(match[1]);
    } else if ((match = line.match(/^\s*\d+[.)]\s+(.+)$/))) {
      startList("ol");
      listItems.push(match[1]);
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}
