import type { CollectionOptions, DeepLTranslationSettings } from "./types";
import { DeepLService } from "./deeplService";
import { translateTextAndObjects } from "./translateTextAndObjects";

// Lexical format bits → HTML tag names
const FORMAT_BIT_TO_TAG: [number, string][] = [
  [1, "b"],
  [2, "i"],
  [4, "s"],
  [8, "u"],
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function wrapWithFormatTags(text: string, format: number): string {
  let result = escapeHtml(text);
  for (const [bit, tag] of FORMAT_BIT_TO_TAG) {
    if (format & bit) result = `<${tag}>${result}</${tag}>`;
  }
  return result;
}

interface TextSegment {
  text: string;
  format: number;
}

function parseTranslatedHtml(html: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let activeFormat = 0;
  let pos = 0;

  const tagPattern = /<\/?(b|i|s|u|code|sub|sup|br)\s*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    if (match.index > pos) {
      const text = unescapeHtml(html.slice(pos, match.index));
      if (text) segments.push({ text, format: activeFormat });
    }

    const tag = match[0];
    const tagName = match[1].toLowerCase();

    if (tagName === "br") {
      segments.push({ text: "\n", format: 0 });
    } else {
      const bit =
        tagName === "b"
          ? 1
          : tagName === "i"
            ? 2
            : tagName === "s"
              ? 4
              : tagName === "u"
                ? 8
                : 0;
      if (tag.startsWith("</")) {
        activeFormat &= ~bit;
      } else {
        activeFormat |= bit;
      }
    }

    pos = tagPattern.lastIndex;
  }

  if (pos < html.length) {
    const text = unescapeHtml(html.slice(pos));
    if (text) segments.push({ text, format: activeFormat });
  }

  return segments;
}

function isTextLeaf(node: any): boolean {
  return typeof node.text === "string" || node.type === "linebreak";
}

/**
 * Translate a consecutive run of text-leaf nodes as a single HTML string
 * and splice the result back into the children array.
 * Returns the number of new nodes that replaced the original group.
 */
async function translateTextGroupAsHtml(
  children: any[],
  start: number,
  end: number,
  deeplService: DeepLService,
  targetLanguage: string,
  sourceLanguage: string,
  settings: DeepLTranslationSettings,
): Promise<number> {
  let html = "";
  for (let idx = start; idx < end; idx++) {
    const child = children[idx];
    if (typeof child.text === "string") {
      html += wrapWithFormatTags(child.text, child.format || 0);
    } else if (child.type === "linebreak") {
      html += "<br/>";
    }
  }

  if (!html.trim()) return end - start;

  const translatedHtml = await deeplService.translateText(
    html,
    targetLanguage,
    sourceLanguage,
    { ...settings, tagHandling: "html" },
  );

  const segments = parseTranslatedHtml(translatedHtml);
  if (segments.length === 0) return end - start;

  const template =
    children.slice(start, end).find((c: any) => typeof c.text === "string") ||
    {};

  const newNodes: any[] = [];
  for (const seg of segments) {
    if (seg.text === "\n") {
      newNodes.push({ type: "linebreak", version: 1 });
    } else {
      newNodes.push({
        detail: template.detail ?? 0,
        mode: template.mode ?? "normal",
        style: template.style ?? "",
        type: "text",
        version: template.version ?? 1,
        text: seg.text,
        format: seg.format,
      });
    }
  }

  children.splice(start, end - start, ...newNodes);
  return newNodes.length;
}

/**
 * Process RichText nodes recursively for translation.
 *
 * Children of each node are scanned left-to-right. Consecutive text leaves
 * are grouped together and translated as a single HTML string so DeepL sees
 * the full sentence context and preserves whitespace around inline formatting
 * (bold, italic, …). Non-text children (links, nested blocks, etc.) act as
 * group boundaries and are processed recursively.
 */
async function processRichTextNode(
  node: any,
  deeplService: DeepLService,
  targetLanguage: string,
  sourceLanguage: string,
  settings: DeepLTranslationSettings,
): Promise<void> {
  try {
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      let i = 0;
      while (i < node.children.length) {
        if (isTextLeaf(node.children[i])) {
          const start = i;
          while (i < node.children.length && isTextLeaf(node.children[i])) i++;
          const newGroupLen = await translateTextGroupAsHtml(
            node.children,
            start,
            i,
            deeplService,
            targetLanguage,
            sourceLanguage,
            settings,
          );
          i = start + newGroupLen;
        } else {
          await processRichTextNode(
            node.children[i],
            deeplService,
            targetLanguage,
            sourceLanguage,
            settings,
          );
          i++;
        }
      }
      return;
    }

    // Standalone text node fallback — preserve leading/trailing whitespace
    if (typeof node.text === "string" && node.text.trim()) {
      const leadingWS = node.text.match(/^\s*/)?.[0] || "";
      const trailingWS = node.text.match(/\s*$/)?.[0] || "";
      const translated = await deeplService.translateText(
        node.text.trim(),
        targetLanguage,
        sourceLanguage,
        settings,
      );
      node.text = leadingWS + translated.trim() + trailingWS;
    }
  } catch (error) {
    console.error("Error processing richText node:", error);
  }
}

export async function translateCollection({
  req,
  doc,
  collection,
  collectionOptions,
  codes,
  settings,
  sourceLanguage,
}: {
  req: any;
  doc: any;
  collection: any;
  collectionOptions: CollectionOptions;
  codes?: string[];
  settings?: DeepLTranslationSettings;
  sourceLanguage?: string;
}) {
  const sourceLanguageI =
    sourceLanguage ||
    doc.sourceLanguage ||
    req.payload.config.localization?.defaultLocale ||
    "en";

  // Get available locales
  const localCodes: string[] = req.payload.config.localization?.localeCodes || [
    "en",
  ];

  // Initialize DeepL service
  const deeplService = new DeepLService({
    deeplApiKey: process.env.DEEPL_API_KEY,
  });

  const translationPromises = localCodes
    .filter(
      (targetLanguage) =>
        targetLanguage !== sourceLanguageI &&
        (!codes || codes.includes(targetLanguage)),
    )
    .map(async (targetLanguage: string) => {
      try {
        const targetDoc = await req.payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: targetLanguage,
          fallbackLocale: false,
          limit: 0,
          depth: 0,
        });

        const dataForUpdate: any = {};

        // Translate each field individually
        for (const fieldName of collectionOptions.fields) {
          if (doc[fieldName] !== undefined && doc[fieldName] !== null) {
            try {
              if (typeof doc[fieldName] === "string") {
                // Simple string field
                const originalText = doc[fieldName];
                const translatedText = await deeplService.translateText(
                  originalText,
                  targetLanguage,
                  sourceLanguageI,
                  settings || {},
                );
                dataForUpdate[fieldName] = translatedText;
              } else if (
                doc[fieldName] &&
                typeof doc[fieldName] === "object" &&
                doc[fieldName].root
              ) {
                // RichText field
                try {
                  const richTextContent = doc[fieldName];

                  if (richTextContent.root && richTextContent.root.children) {
                    // Create a deep copy of the structure
                    const cleanRichText = JSON.parse(
                      JSON.stringify(richTextContent),
                    );

                    // Process each child element recursively
                    for (const child of cleanRichText.root.children) {
                      await processRichTextNode(
                        child,
                        deeplService,
                        targetLanguage,
                        sourceLanguageI,
                        settings || {},
                      );
                    }

                    dataForUpdate[fieldName] = cleanRichText;
                  } else {
                    // Fallback: keep original structure
                    dataForUpdate[fieldName] = { ...doc[fieldName] };
                  }
                } catch (error) {
                  console.error(
                    `Failed to process RichText field ${fieldName}:`,
                    error,
                  );
                  dataForUpdate[fieldName] = { ...doc[fieldName] };
                }
              } else if (
                doc[fieldName] &&
                typeof doc[fieldName] === "object" &&
                !doc[fieldName].root
              ) {
                // Array or nested object field (e.g., includes array with feature fields)
                try {
                  console.log(
                    `🔄 Processing array/object field "${fieldName}":`,
                    JSON.stringify(doc[fieldName], null, 2),
                  );

                  // Check if it's an array and if it has items
                  if (Array.isArray(doc[fieldName])) {
                    if (doc[fieldName].length === 0) {
                      console.warn(
                        `⚠️ Field "${fieldName}" is an empty array, skipping translation`,
                      );
                      // Don't set empty arrays, let Payload handle fallback
                      continue;
                    }
                    console.log(
                      `📦 Array "${fieldName}" has ${doc[fieldName].length} items`,
                    );
                  }

                  // Create a deep copy of the structure
                  const fieldValue = JSON.parse(JSON.stringify(doc[fieldName]));

                  // Use translateTextAndObjects to handle nested structures recursively
                  const translatedField = await translateTextAndObjects(
                    { [fieldName]: doc[fieldName] },
                    { [fieldName]: fieldValue },
                    [fieldName],
                    targetLanguage,
                    sourceLanguageI,
                    settings || {},
                    deeplService,
                  );

                  console.log(
                    `✅ Translated field "${fieldName}":`,
                    JSON.stringify(translatedField[fieldName], null, 2),
                  );

                  // Ensure the translated field is set, even if it's an array
                  if (
                    translatedField[fieldName] !== undefined &&
                    translatedField[fieldName] !== null
                  ) {
                    dataForUpdate[fieldName] = translatedField[fieldName];
                  } else {
                    console.warn(
                      `⚠️ Translated field "${fieldName}" is undefined or null`,
                    );
                  }
                } catch (error) {
                  console.error(
                    `Failed to translate nested field ${fieldName}:`,
                    error,
                  );
                  // Don't set the field if translation failed
                }
              }
            } catch (error) {
              console.error(
                `Translation failed for field ${fieldName}:`,
                error,
              );
              dataForUpdate[fieldName] = doc[fieldName];
            }
          }
        }

        return { dataNew: dataForUpdate, targetLanguage };
      } catch (error) {
        console.error(
          `Translation failed for locale ${targetLanguage}:`,
          error,
        );
        return null;
      }
    });

  const translationResults = await Promise.all(translationPromises);
  const validResults = translationResults.filter((result) => result !== null);

  for (const translatedContent of validResults) {
    if (translatedContent) {
      try {
        const existingDoc = await req.payload.findByID({
          collection: collection.slug,
          id: doc.id,
          locale: translatedContent.targetLanguage,
          fallbackLocale: false,
        });

        // Clean the data to remove any circular references
        const cleanData = { ...translatedContent.dataNew };

        // For RichText fields, ensure they don't have circular references
        for (const key in cleanData) {
          if (
            cleanData[key] &&
            typeof cleanData[key] === "object" &&
            cleanData[key].root
          ) {
            try {
              cleanData[key] = JSON.parse(JSON.stringify(cleanData[key]));
            } catch (error) {
              console.warn(
                `Could not clean RichText field ${key}, using original:`,
                error,
              );
              const originalField = doc[key];
              if (
                originalField &&
                typeof originalField === "object" &&
                originalField.root
              ) {
                cleanData[key] = {
                  root: {
                    children: originalField.root.children || [],
                  },
                };
              }
            }
          }
        }

        // Ensure array fields are properly formatted for Payload
        // Payload requires arrays to be explicitly set, even if empty
        for (const fieldName of collectionOptions.fields) {
          if (
            cleanData[fieldName] !== undefined &&
            Array.isArray(cleanData[fieldName])
          ) {
            // Ensure array structure is preserved
            // IMPORTANT: Remove 'id' fields from array items as Payload generates them automatically
            cleanData[fieldName] = cleanData[fieldName].map((item: any) => {
              if (typeof item === "object" && item !== null) {
                // Create a copy without the 'id' field
                const { id, ...itemWithoutId } = item;
                return itemWithoutId;
              }
              return item;
            });
            console.log(
              `📦 Final array data for "${fieldName}" (ids removed):`,
              cleanData[fieldName],
            );
          }
        }

        if (existingDoc) {
          // Update existing document
          await req.payload.update({
            collection: collection.slug,
            id: doc.id,
            data: cleanData,
            locale: translatedContent.targetLanguage,
            depth: 0,
            overrideAccess: true,
            context: {
              skipTranslate: true,
              skipSlug: true,
            },
          });
        } else {
          // Create new localized document
          await req.payload.create({
            collection: collection.slug,
            data: {
              ...cleanData,
              _status: "draft",
            },
            locale: translatedContent.targetLanguage,
            depth: 0,
            overrideAccess: true,
            context: {
              skipTranslate: true,
              skipSlug: true,
            },
          });
        }
      } catch (error) {
        console.error(
          `Failed to update translation for locale ${translatedContent.targetLanguage}:`,
          error,
        );
      }
    }
  }
}
