// 工程の定義（固定・順序あり）と、進捗計算の共通処理

// 7つの工程（番号・名前・表示色）
export const PHASES = [
  { no: 1, name: '開発準備', color: '#dbe8f7' },
  { no: 2, name: '要件定義', color: '#bfe6f2' },
  { no: 3, name: '設計', color: '#fde0d4' },
  { no: 4, name: 'コーディング', color: '#c6efce' },
  { no: 5, name: '単体テスト', color: '#cdeefc' },
  { no: 6, name: '結合テスト', color: '#f2cdee' },
  { no: 7, name: '納品', color: '#dcf2cf' },
]

// 工程番号から工程名を取得する
export const phaseName = (no) => PHASES.find((p) => p.no === no)?.name ?? ''

// ソフトの進捗率（7工程の進捗の平均・工程がなければ0）
export function softwareProgress(phases = []) {
  if (phases.length === 0) return 0
  const total = phases.reduce((sum, p) => sum + (p.progress ?? 0), 0)
  return Math.round(total / PHASES.length)
}

// 現在の工程（進捗が100％未満の最初の工程・すべて100％なら「完了」）
export function currentPhase(phases = []) {
  const sorted = [...phases].sort((a, b) => a.phase_no - b.phase_no)
  const current = sorted.find((p) => (p.progress ?? 0) < 100)
  if (!current) return sorted.length > 0 ? '完了' : '未着手'
  return phaseName(current.phase_no)
}

// プロジェクトの進捗率（配下ソフトの進捗の平均・ソフトがなければ0）
export function projectProgress(softwares = []) {
  if (softwares.length === 0) return 0
  const total = softwares.reduce((sum, s) => sum + softwareProgress(s.phases), 0)
  return Math.round(total / softwares.length)
}

// メンバーが担当（担当メンバーまたは調査）しているソフトの一覧
export const assignedSoftwares = (member, softwares) =>
  softwares.filter((s) => s.assignee_id === member.id || s.reviewer_id === member.id)

// メンバーIDからメンバー名を取得する（未設定なら「-」）
export const memberName = (id, members) => members.find((m) => m.id === id)?.name ?? '-'

// 日付を「2026/1/23」形式で表示する（空なら「-」）
export function formatDate(value) {
  if (!value) return '-'
  const [y, m, d] = value.split('-').map(Number)
  return `${y}/${m}/${d}`
}
