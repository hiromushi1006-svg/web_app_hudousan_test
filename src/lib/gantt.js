// ガントチャート共通の日付計算（プロジェクト用・メンバー用のチャートで共用）

// 1日のミリ秒数（24時間 × 60分 × 60秒 × 1000ミリ秒）。日付の差を日数に直すのに使う
export const DAY_MS = 24 * 60 * 60 * 1000
// 1日分の列の幅（px）
export const DAY_WIDTH = 44

// 「2026-10-24」形式の文字列を日付に変換する（時差の影響を受けないよう0時で作る）
export const toDate = (s) => {
  // 「-」で分けて、年・月・日の数値にする
  const [y, m, d] = s.split('-').map(Number)
  // 日付を作る（JavaScriptの月は0から数えるため、m - 1 にする）
  return new Date(y, m - 1, d)
}

// 今日の0時
export const today = () => {
  // 現在の日時を取得
  const now = new Date()
  // 時刻を切り捨てて、今日の0時の日付を作る
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// 日付の一覧から、表示期間（最初の日と全日付の配列）を作る
// values：「2026-10-24」形式の文字列か 'TODAY'（今日）の配列。空の値は無視する
// 日付が1つもなければ null を返す
export function buildDays(values) {
  // 空の値を除き、日付に変換する（'TODAY' は今日の日付にする）
  const valid = values.filter(Boolean).map((d) => (d === 'TODAY' ? today() : toDate(d)))
  // 日付が1つもなければ、期間を作れないので null
  if (valid.length === 0) return null
  // 表示期間の最初の日（最も古い日付）
  const start = new Date(Math.min(...valid))
  // 表示期間の最後の日（最も新しい日付）
  const end = new Date(Math.max(...valid))
  // 表示する日数（最後の日 − 最初の日 ＋ 1日）
  const dayCount = Math.round((end - start) / DAY_MS) + 1
  // 最初の日から1日ずつ、表示する全日付の配列を作る
  const days = Array.from({ length: dayCount }, (_, i) => new Date(start.getTime() + i * DAY_MS))
  // 最初の日・日数・全日付をまとめて返す
  return { start, dayCount, days }
}

// 開始日〜終了日を、左端からの位置と幅（px）に変換する（終了日がなければ今日まで）
// start：表示期間の最初の日、from・to：「2026-10-24」形式の開始日・終了日
export function barStyle(start, from, to) {
  // 開始日がなければバーは描かない
  if (!from) return null
  // 開始日を日付に変換
  const s = toDate(from)
  // 終了日を日付に変換（未入力なら今日）
  const e = to ? toDate(to) : today()
  // 終了日が開始日より前なら、おかしな入力なのでバーは描かない
  if (e < s) return null
  // 位置と幅を返す
  return {
    // 左端から何日目か × 1日の幅
    left: Math.round((s - start) / DAY_MS) * DAY_WIDTH,
    // 期間の日数（終了日も含めるので ＋1） × 1日の幅
    width: (Math.round((e - s) / DAY_MS) + 1) * DAY_WIDTH,
  }
}

// 土曜日・日曜日かどうか（getDay()：0が日曜、6が土曜）
export const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6
