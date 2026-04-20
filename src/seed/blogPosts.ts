const TOP_LEVEL_HEADING = /^#(?!#)\s+/;
const SECTION_HEADING = /^###\s+\*\*(.+?)\*\*\s*$/;
const PREVIEW_MARKER = /^\*Short preview for blog page:\*/i;
const BULLET_ITEM = /^\*\s+/;
const EMPTY_MARKER_HEADING = /^##+\s*$/;
const DISCLAIMER_LINE = /^\*\*\*.*\*\*\*$/;
const MARKDOWN_ESCAPE = /\\([\\`*{}\[\]()#+\-.!_>])/g;
const INLINE_MARKUP = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

export type BlogPostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  info: Record<string, unknown>;
  content: Record<string, unknown>;
};

type ParsedArticle = {
  title: string;
  bodyLines: string[];
  preview: string;
};

type SectionDraft = {
  title: string;
  nodes: Record<string, unknown>[];
};

const normalizeWhitespace = (value: string) =>
  value
    .replace(MARKDOWN_ESCAPE, "$1")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const rootNode = (children: Record<string, unknown>[]) => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    children,
  },
});

const textNode = (text: string, format = 0) => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text,
  type: "text",
  version: 1,
});

const buildInlineNodes = (value: string) => {
  const normalized = value.replace(MARKDOWN_ESCAPE, "$1");
  const children: Record<string, unknown>[] = [];
  let lastIndex = 0;

  for (const match of normalized.matchAll(INLINE_MARKUP)) {
    const fullMatch = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      children.push(textNode(normalized.slice(lastIndex, index)));
    }

    if (match[1] || match[2]) {
      children.push(textNode(match[1] ?? match[2] ?? "", 1));
    } else if (match[3] && match[4]) {
      children.push({
        type: "link",
        format: "",
        indent: 0,
        version: 1,
        fields: {
          url: match[4],
          newTab: true,
          linkType: "custom",
        },
        children: [textNode(match[3])],
      });
    }

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < normalized.length) {
    children.push(textNode(normalized.slice(lastIndex)));
  }

  return children.length > 0 ? children : [textNode(normalized)];
};

const paragraphNode = (text: string) => ({
  type: "paragraph",
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
  textFormat: 0,
  textStyle: "",
  children: buildInlineNodes(text),
});

const listNode = (items: string[]) => ({
  type: "list",
  listType: "bullet",
  tag: "ul",
  start: 1,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
  children: items.map((item, index) => ({
    type: "listitem",
    value: index + 1,
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    children: buildInlineNodes(item),
  })),
});

const headingNode = (title: string) => ({
  type: "heading",
  tag: "h2",
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
  children: [textNode(normalizeWhitespace(title))],
});

const slugify = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");

const stripMarkdown = (value: string) =>
  normalizeWhitespace(
    value
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1"),
  );

const buildExcerpt = (preview: string, infoNodes: string[]) => {
  const source = preview || infoNodes.join(" ");
  const normalized = stripMarkdown(source);

  if (normalized.length <= 220) {
    return normalized;
  }

  return `${normalized.slice(0, 217).trimEnd()}...`;
};

const splitArticles = (markdown: string): ParsedArticle[] => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const articles: ParsedArticle[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const pushCurrent = () => {
    if (!currentTitle) {
      return;
    }

    const previewIndex = currentLines.findIndex((line) => PREVIEW_MARKER.test(line.trim()));
    const previewLines =
      previewIndex >= 0
        ? currentLines
            .slice(previewIndex + 1)
            .map((line) => line.trim())
            .filter((line) => line && !EMPTY_MARKER_HEADING.test(line))
        : [];

    const bodyLines = previewIndex >= 0 ? currentLines.slice(0, previewIndex) : currentLines;

    articles.push({
      title: normalizeWhitespace(currentTitle.replace(TOP_LEVEL_HEADING, "")),
      bodyLines,
      preview: stripMarkdown(previewLines.join(" ")),
    });
  };

  for (const line of lines) {
    if (TOP_LEVEL_HEADING.test(line.trim())) {
      pushCurrent();
      currentTitle = line.trim();
      currentLines = [];
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
    }
  }

  pushCurrent();

  return articles;
};

const parseArticleToSeed = ({ title, bodyLines, preview }: ParsedArticle): BlogPostSeed => {
  const infoNodes: Record<string, unknown>[] = [];
  const infoParagraphs: string[] = [];
  const sections: SectionDraft[] = [];
  let currentSection: SectionDraft | null = null;
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const pushNode = (node: Record<string, unknown>) => {
    if (currentSection) {
      currentSection.nodes.push(node);
      return;
    }

    infoNodes.push(node);
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    const text = normalizeWhitespace(paragraphBuffer.join(" "));

    if (!text) {
      paragraphBuffer = [];
      return;
    }

    pushNode(paragraphNode(text));

    if (!currentSection) {
      infoParagraphs.push(text);
    }

    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) {
      return;
    }

    pushNode(listNode(listBuffer.map((item) => normalizeWhitespace(item))));
    listBuffer = [];
  };

  const meaningfulLines = bodyLines.filter((line) => {
    const trimmed = line.trim();
    return !DISCLAIMER_LINE.test(trimmed);
  });

  for (const rawLine of meaningfulLines) {
    const line = rawLine.trim();

    if (!line || EMPTY_MARKER_HEADING.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }

    const sectionMatch = line.match(SECTION_HEADING);

    if (sectionMatch) {
      flushParagraph();
      flushList();

      currentSection = {
        title: normalizeWhitespace(sectionMatch[1]),
        nodes: [],
      };

      sections.push(currentSection);
      continue;
    }

    if (BULLET_ITEM.test(line)) {
      flushParagraph();
      listBuffer.push(line.replace(BULLET_ITEM, ""));
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  const contentNodes = sections.flatMap((section) => [headingNode(section.title), ...section.nodes]);
  const excerpt = buildExcerpt(preview, infoParagraphs);

  return {
    slug: slugify(title),
    title,
    excerpt,
    seoTitle: `${title} | Bitvera`,
    seoDescription: excerpt,
    info: rootNode(infoNodes),
    content: rootNode(contentNodes),
  };
};

export const parseBlogPostsMarkdown = (markdown: string) =>
  splitArticles(markdown)
    .map(parseArticleToSeed)
    .filter((article) => article.title && article.slug);
