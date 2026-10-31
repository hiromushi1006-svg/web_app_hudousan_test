// 進捗の横棒の部品
import ProgressBar from './ProgressBar'
// 計算・表示用の関数：現在の工程、日付の整形、メンバー名の取得、ソフトの進捗率
import { currentPhase, formatDate, memberName, softwareProgress } from '../lib/phases'

// ソフトの情報カード（ソフト一覧画面とダッシュボードで共用）
// children には、編集・削除ボタンなどカード下部に表示する部品が入る
// software: s は「software という名前で受け取ったものを、この中では s と呼ぶ」という意味
export default function SoftwareCard({ software: s, projectName, members, selected, children }) {
  // 画面に表示する内容
  return (
    // カードの外枠（selected が true なら selected クラスを付けて枠を強調）
    <div className={'card' + (selected ? ' selected' : '')}>
      {/* ソフト名 */}
      <p className="card-title">{s.name}</p>
      {/* 進捗率（7工程の進捗の平均） */}
      <p>進捗率：{softwareProgress(s.phases)}%</p>
      {/* 進捗率の横棒 */}
      <ProgressBar value={softwareProgress(s.phases)} />
      {/* 対象プロジェクト名（呼び出し側から渡される） */}
      <p>対象プロジェクト：{projectName}</p>
      {/* 開発規模（未入力なら「-」） */}
      <p>開発規模：{s.scale ?? '-'}</p>
      {/* 担当メンバーのIDから名前を探して表示 */}
      <p>担当メンバー：{memberName(s.assignee_id, members)}</p>
      {/* 調査担当のIDから名前を探して表示 */}
      <p>調査：{memberName(s.reviewer_id, members)}</p>
      {/* 現在の工程（進捗100％未満の最初の工程） */}
      <p>現在の工程：{currentPhase(s.phases)}</p>
      {/* 開始日（2026/1/23 の形式で表示） */}
      <p>開始日：{formatDate(s.start_date)}</p>
      {/* 終了予定日 */}
      <p>終了予定日：{formatDate(s.planned_end_date)}</p>
      {/* 納期 */}
      <p>納期：{formatDate(s.due_date)}</p>
      {/* 呼び出し側から渡された部品（編集・削除ボタンなど）を表示 */}
      {children}
    </div>
  )
}
