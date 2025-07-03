/**
 * テキストを整形する関数
 *
 * @param text 整形する元のテキスト
 * @returns 整形されたテキスト
 */
export function formatText(text: string): string {
  if (!text) return "";

  let formatted = text
    .trim()
    .replace(/\n+/g, "\n")
    .replace(/[ 　]+/g, " ")
    .replace(/([。！？、]) /g, "$1");

  formatted = formatted
    .replace(/([。！？])(?![」』）\)])/g, "$1\n")
    .replace(/([、])(?![」』）\)])/g, "$1 ");

  return formatted;
}
