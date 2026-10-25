import ProgressBar from './ProgressBar'
import { currentPhase, formatDate, memberName, softwareProgress } from '../lib/phases'

// ソフトの情報カード（ソフト一覧画面とダッシュボードで共用）
// children には、編集・削除ボタンなどカード下部に表示する部品が入る
export default function SoftwareCard({ software: s, projectName, members, selected, children }) {
  return (
    <div className={'card' + (selected ? ' selected' : '')}>
      <p className="card-title">{s.name}</p>
      <p>進捗率：{softwareProgress(s.phases)}%</p>
      <ProgressBar value={softwareProgress(s.phases)} />
      <p>対象プロジェクト：{projectName}</p>
      <p>開発規模：{s.scale ?? '-'}</p>
      <p>担当メンバー：{memberName(s.assignee_id, members)}</p>
      <p>調査：{memberName(s.reviewer_id, members)}</p>
      <p>現在の工程：{currentPhase(s.phases)}</p>
      <p>開始日：{formatDate(s.start_date)}</p>
      <p>終了予定日：{formatDate(s.planned_end_date)}</p>
      <p>納期：{formatDate(s.due_date)}</p>
      {children}
    </div>
  )
}
