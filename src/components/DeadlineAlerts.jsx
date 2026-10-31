// アラートの一覧を作る関数と、何日前からアラートを出すかの設定
import { buildAlerts, ALERT_DAYS } from '../lib/alerts'
// 日付を「2026/1/23」形式にする関数
import { formatDate } from '../lib/phases'

// 種類ごとの札の文字
const TYPE_LABELS = { project: 'プロジェクト', software: 'ソフト', task: 'タスク' }

// 残り日数を文字にする（過ぎていれば「○日超過」、今日なら「今日」、それ以外は「あと○日」）
const daysText = (days) => (days < 0 ? `${-days}日超過` : days === 0 ? '今日' : `あと${days}日`)

// 納期・終了が近いプロジェクト・ソフト・タスクのアラート表示
// projects：フェーズ付きのプロジェクト、softwares：工程付きのソフト、tasks：タスク、members：担当者名の表示用
export default function DeadlineAlerts({ projects, softwares, tasks, members }) {
  // アラートの一覧を作る
  const alerts = buildAlerts({ projects, softwares, tasks, members })

  // 画面に表示する内容
  return (
    // エリア全体（ダッシュボードの他のエリアと同じ間隔）
    <section className="panel">
      {/* エリアの見出し（何日以内を対象にしているかも表示） */}
      <h2 className="panel-title">期日アラート（{ALERT_DAYS}日以内・期日超過）</h2>
      {/* アラートが0件ならメッセージ、あれば一覧を表示 */}
      {alerts.length === 0 ? (
        <p className="alert-empty">期日が近いプロジェクト・ソフト・タスクはありません。</p>
      ) : (
        // アラートを縦に並べる一覧
        <ul className="alert-list">
          {/* アラートの数だけ行を作る（overdue：赤、soon：オレンジ） */}
          {alerts.map((a) => (
            <li key={a.key} className={'alert-item ' + a.level}>
              {/* 残り日数の札 */}
              <span className="alert-badge">{daysText(a.days)}</span>
              {/* 種類（プロジェクト・ソフト・タスク）の札 */}
              <span className={'alert-type ' + a.type}>{TYPE_LABELS[a.type]}</span>
              {/* 対象の名前 */}
              <strong>{a.name}</strong>
              {/* 何の期日かと、その日付 */}
              <span className="alert-detail">{a.label}：{formatDate(a.date)}</span>
              {/* 補足（所属プロジェクト・担当者）があれば表示 */}
              {a.sub && <span className="alert-sub">{a.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
