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

// APIの料金設定（1分あたり）
const API_RATES = {
  WHISPER: 0.006 * 150, // $0.006/min → 0.9円/分
  CHATGPT: 0.01 * 150, // $0.02/min → 3円/分
};

// 音声の長さから料金を計算（小数点以下2桁まで）
export const calculateApiCosts = (durationInSeconds: number) => {
  const durationInMinutes = Math.ceil(durationInSeconds / 60);
  return {
    whisper: Number((durationInMinutes * API_RATES.WHISPER).toFixed(2)),
    chatgpt: Number((durationInMinutes * API_RATES.CHATGPT).toFixed(2)),
    total: Number(
      (durationInMinutes * (API_RATES.WHISPER + API_RATES.CHATGPT)).toFixed(2)
    ),
  };
};

// 1分あたりの料金を取得
export const getRatesPerMinute = () => ({
  whisper: API_RATES.WHISPER,
  chatgpt: API_RATES.CHATGPT,
  total: API_RATES.WHISPER + API_RATES.CHATGPT,
});
