// 工程の定義（固定・順序あり）と、進捗計算の共通処理

// 7つの工程（番号・名前・表示色）。export で他のファイルから使えるように公開する
export const PHASES = [
  { no: 1, name: '開発準備', color: '#dbe8f7' },
  { no: 2, name: '要件定義', color: '#bfe6f2' },
  { no: 3, name: '設計', color: '#fde0d4' },
  { no: 4, name: 'コーディング', color: '#c6efce' },
  { no: 5, name: '単体テスト', color: '#cdeefc' },
  { no: 6, name: '結合テスト', color: '#f2cdee' },
  { no: 7, name: '納品', color: '#dcf2cf' },
]

// プロジェクトの4つのフェーズ（番号・名前・表示色）。ソフトの工程と同じ形で持つ
export const PROJECT_PHASES = [
  { no: 1, name: '原理試作', color: '#e0e7ff' },
  { no: 2, name: '機能試作', color: '#cffafe' },
  { no: 3, name: '量産試作', color: '#fef3c7' },
  { no: 4, name: 'リリース', color: '#dcfce7' },
]

// 工程番号から工程名を取得する（defs から番号が一致するものを探す。見つからなければ空文字）
// defs = PHASES は「何も渡されなければソフトの工程の定義を使う」という意味
export const phaseName = (no, defs = PHASES) => defs.find((p) => p.no === no)?.name ?? ''

// ソフトの進捗率（7工程の進捗の平均・工程がなければ0）
// phases = [] は「何も渡されなければ空の配列として扱う」という意味
export function softwareProgress(phases = []) {
  // 工程が1つもなければ0％
  if (phases.length === 0) return 0
  // 全工程の進捗を足し合わせる（reduce：配列を順に処理して1つの値にまとめる。未入力は0として扱う）
  const total = phases.reduce((sum, p) => sum + (p.progress ?? 0), 0)
  // 合計を工程数（7）で割り、四捨五入して返す
  return Math.round(total / PHASES.length)
}

// 現在の工程（進捗が100％未満の最初の工程・すべて100％なら「完了」）
// defs：工程の定義（省略時はソフトの7工程。プロジェクトのフェーズは PROJECT_PHASES を渡す）
export function currentPhase(phases = [], defs = PHASES) {
  // 工程を番号順に並べ替える（[...phases] で元の配列をコピーしてから並べ替え、元のデータは変えない）
  const sorted = [...phases].sort((a, b) => a.phase_no - b.phase_no)
  // 進捗が100％未満の最初の工程を探す
  const current = sorted.find((p) => (p.progress ?? 0) < 100)
  // 見つからない場合：工程があれば全部終わっているので「完了」、工程がなければ「未着手」
  if (!current) return sorted.length > 0 ? '完了' : '未着手'
  // 見つかった工程の名前を返す
  return phaseName(current.phase_no, defs)
}

// プロジェクトの現在のフェーズ（進捗が100％未満の最初のフェーズ・すべて100％なら「完了」）
export const currentProjectPhase = (projectPhases = []) => currentPhase(projectPhases, PROJECT_PHASES)

// プロジェクトの進捗率（配下ソフトの進捗の平均・ソフトがなければ0）
export function projectProgress(softwares = []) {
  // ソフトが1つもなければ0％
  if (softwares.length === 0) return 0
  // 各ソフトの進捗率を足し合わせる
  const total = softwares.reduce((sum, s) => sum + softwareProgress(s.phases), 0)
  // 合計をソフトの数で割り、四捨五入して返す
  return Math.round(total / softwares.length)
}

// メンバーが担当（担当メンバーまたは調査）しているソフトの一覧
export const assignedSoftwares = (member, softwares) =>
  // 担当メンバーか調査のどちらかが、このメンバーのIDと一致するソフトだけを残す
  softwares.filter((s) => s.assignee_id === member.id || s.reviewer_id === member.id)

// メンバーが担当しているタスクの一覧
export const assignedTasks = (member, tasks) =>
  // 担当がこのメンバーのIDと一致するタスクだけを残す
  tasks.filter((t) => t.assignee_id === member.id)

// メンバーの所持タスク数（担当・調査しているソフトの数 ＋ 担当しているタスクの数）
export const taskCount = (member, softwares, tasks) =>
  assignedSoftwares(member, softwares).length + assignedTasks(member, tasks).length

// メンバーIDからメンバー名を取得する（未設定なら「-」）
export const memberName = (id, members) => members.find((m) => m.id === id)?.name ?? '-'

// 日付を「2026/1/23」形式で表示する（空なら「-」）
export function formatDate(value) {
  // 日付が空なら「-」
  if (!value) return '-'
  // 「2026-01-23」を「-」で分けて数値にする（Number で 01 → 1 になる）
  const [y, m, d] = value.split('-').map(Number)
  // 「年/月/日」の形にして返す
  return `${y}/${m}/${d}`
}
