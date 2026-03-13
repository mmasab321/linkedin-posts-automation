import removeMarkdown from "remove-markdown";

export function toPlainLinkedInText(input: string): string {
  // remove-markdown keeps line breaks reasonably well; we also trim and normalize
  const noMd = removeMarkdown(input ?? "", { useImgAltText: false });
  return noMd.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

