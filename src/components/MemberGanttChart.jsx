// ソフトの進捗率を求める関数
import { softwareProgress } from '../lib/phases'
// ガントチャート共通の計算：1日の幅、表示期間の作成、バーの位置、土日の判定
import { DAY_WIDTH, buildDays, barStyle, isWeekend } from '../lib/gantt'
// ガントチャート共通の部品：日付の見出し、列の背景
import { GanttHeader, GanttColumns } from './GanttGrid'

// 1行分（ラベルと、進捗入りのバー）
// label：ソフト名・タスク名、kind：'software' か 'task'（色分け用）、style：バーの位置と幅、progress：進捗（％）、dayCount：表示する日数
function ProgressRow({ label, kind, style, progress, dayCount }) {
  // 画面に表示する内容
  return (
    // 1行分の外枠（横並び・下に区切り線）
    <div className="g-row g-item">
      {/* 左側のラベル（種類ごとの色の帯と名前） */}
      <div className={'g-item-name ' + kind}>
        {/* 「ソフト」「タスク」の小さな札 */}
        <span className="g-item-tag">{kind === 'software' ? 'ソフト' : 'タスク'}</span>
        {/* ソフト名・タスク名 */}
        {label}
      </div>
      {/* バーを描く行（幅は 日数 × 1日の幅） */}
      <div className="g-track tall" style={{ width: dayCount * DAY_WIDTH }}>
        {/* 開始日と終了日が両方あるときだけバーを描く。なければ案内の文字 */}
        {style ? (
          // バーの土台（期間全体。種類ごとの薄い色）
          <div className={'g-pbar ' + kind} style={style}>
            {/* 進捗の分だけ濃い色で塗る（0〜100％に収める） */}
            <div className="g-pbar-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            {/* 進捗の数字 */}
            <span className="g-pbar-label">{progress}%</span>
          </div>
        ) : (
          <span className="g-nodate">日付が未設定です</span>
        )}
      </div>
    </div>
  )
}

// メンバーのガントチャート：担当ソフト（開始日〜納入日）と担当タスク（開始日〜終了予定日）を進捗付きで描く
// softwares：メンバーが担当・調査しているソフト（工程付き）、tasks：メンバーが担当しているタスク
export default function MemberGanttChart({ softwares, tasks }) {
  // 表示期間：ソフトの開始日・納期と、タスクの開始日・終了予定日の最小〜最大
  const range = buildDays([
    // 全ソフトの開始日と納期を、1つの配列に平らに並べる
    ...softwares.flatMap((s) => [s.start_date, s.due_date]),
    // 全タスクの開始日と終了予定日
    ...tasks.flatMap((t) => [t.start_date, t.end_date]),
  ])
  // ソフトもタスクもない場合の案内
  if (softwares.length === 0 && tasks.length === 0) {
    return <p className="muted">このメンバーが担当しているソフト・タスクはありません。</p>
  }
  // 日付が1つもなければ、チャートの代わりに案内を表示する
  if (!range) {
    return <p className="muted">ソフト・タスクの日付が入力されていないため、ガントチャートを表示できません。</p>
  }
  // 表示期間の最初の日・日数・全日付を取り出す
  const { start, dayCount, days } = range

  // 開始日と終了日が両方あるときだけ、バーの位置と幅を求める（片方でも空なら null）
  const styleOf = (from, to) => (from && to ? barStyle(start, from, to) : null)

  // 画面に表示する内容
  return (
    // チャート全体の枠（はみ出した分はスクロール）
    <div className="gantt">
      {/* 中身の幅に合わせて横に広がるエリア */}
      <div className="gantt-inner">
        {/* 日付の見出し：縦スクロールしても上部に固定（メンバー用は目印なし） */}
        <GanttHeader days={days} />

        {/* チャートの本体 */}
        <div className="g-body">
          {/* 日付の列の背景（土日だけ灰色）：行の後ろに敷く */}
          <GanttColumns days={days} columnClass={(d) => (isWeekend(d) ? 'weekend' : '')} />

          {/* 行を列の背景より手前に表示するためのまとまり */}
          <div className="g-software-block">
            {/* 担当ソフトの数だけ行を作る（期間は開始日〜納期、進捗は7工程の平均） */}
            {softwares.map((s) => (
              <ProgressRow
                key={s.id}
                label={s.name}
                kind="software"
                style={styleOf(s.start_date, s.due_date)}
                progress={softwareProgress(s.phases)}
                dayCount={dayCount}
              />
            ))}
            {/* 担当タスクの数だけ行を作る（期間は開始日〜終了予定日） */}
            {tasks.map((t) => (
              <ProgressRow
                key={t.id}
                label={t.name}
                kind="task"
                style={styleOf(t.start_date, t.end_date)}
                progress={t.progress}
                dayCount={dayCount}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
