import { PHASES, memberName, softwareProgress, formatDate } from '../lib/phases'

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_WIDTH = 44 // 1日分の列の幅（px）

// 「2026-10-24」形式の文字列を日付に変換する（時差の影響を受けないよう0時で作る）
const toDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 今日の0時
const today = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// 予定・実績の1行分（ラベルとバー）
function BarRow({ label, style, kind, dayCount }) {
  return (
    <div className="g-row">
      <div className="g-kind">{label}</div>
      <div className="g-track" style={{ width: dayCount * DAY_WIDTH }}>
        {style && <div className={'g-bar ' + kind} style={style} />}
      </div>
    </div>
  )
}

// ガントチャート：1工程を「予定行」と「実績行」の2行で描く
// project：選択中のプロジェクト（開始日・納入日の表示用）、softwares：表示するソフト（工程付き）、members：担当者名の表示用
export default function GanttChart({ project, softwares, members }) {
  // 表示期間：プロジェクトの開始日・納入日と、全工程の予定・実績の日付の最小〜最大（実績が終わっていない工程は今日まで）
  const dates = [
    project?.start_date,
    project?.delivery_date,
    ...softwares.flatMap((s) =>
      s.phases.flatMap((p) => [
        p.plan_start, p.plan_end, p.actual_start, p.actual_end,
        p.actual_start && !p.actual_end ? 'TODAY' : null,
      ]),
    ),
  ]
  const valid = dates.filter(Boolean).map((d) => (d === 'TODAY' ? today() : toDate(d)))
  if (valid.length === 0) {
    return <p className="muted">工程の予定・実績が入力されていないため、ガントチャートを表示できません。</p>
  }
  const start = new Date(Math.min(...valid))
  const end = new Date(Math.max(...valid))
  const dayCount = Math.round((end - start) / DAY_MS) + 1
  const days = Array.from({ length: dayCount }, (_, i) => new Date(start.getTime() + i * DAY_MS))

  // プロジェクトの開始日・納入日（日付の比較用に数値化）
  const startTime = project?.start_date ? toDate(project.start_date).getTime() : null
  const deliveryTime = project?.delivery_date ? toDate(project.delivery_date).getTime() : null
  const todayTime = today().getTime()

  // 日付の列の種類（色分け用）：開始日・納入日を土日より優先する
  const columnClass = (d) => {
    const t = d.getTime()
    if (t === startTime) return 'start'
    if (t === deliveryTime) return 'delivery'
    if (d.getDay() === 0 || d.getDay() === 6) return 'weekend' // 0：日曜、6：土曜
    return ''
  }

  // 開始日〜終了日を、左端からの位置と幅（px）に変換する（終了日がなければ今日まで）
  const barStyle = (from, to) => {
    if (!from) return null
    const s = toDate(from)
    const e = to ? toDate(to) : today()
    if (e < s) return null
    return {
      left: Math.round((s - start) / DAY_MS) * DAY_WIDTH,
      width: (Math.round((e - s) / DAY_MS) + 1) * DAY_WIDTH,
    }
  }

  return (
    <div className="gantt">
      <div className="gantt-inner">
        {/* 見出し（開始日・納入日の目印と日付）：縦スクロールしても上部に固定 */}
        <div className="g-head">
          <div className="g-row">
            <div className="g-label-head" />
            <div className="g-days">
              {days.map((d) => (
                <div key={d.getTime()} className="g-mark" style={{ width: DAY_WIDTH }}>
                  {d.getTime() === startTime && <span>★開始日</span>}
                  {d.getTime() === deliveryTime && <span>☆納入日</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="g-row">
            <div className="g-label-head" />
            <div className="g-days">
              {days.map((d) => (
                <div key={d.getTime()} className={'g-day' + (d.getTime() === todayTime ? ' today' : '')} style={{ width: DAY_WIDTH }}>
                  {d.getMonth() + 1}/{d.getDate()}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="g-body">
          {/* 日付の列の背景（土日は灰色、開始日・納入日は色付き）：行の後ろに敷く */}
          <div className="g-columns">
            {days.map((d) => (
              <div key={d.getTime()} className={'g-col ' + columnClass(d)} style={{ width: DAY_WIDTH }} />
            ))}
          </div>

          {softwares.map((s) => (
            <div key={s.id} className="g-software-block">
              {/* ソフトの見出し行 */}
              <div className="g-software">
                <strong>{s.name}</strong>
                <span>進捗：{softwareProgress(s.phases)}%</span>
                <span>担当：{memberName(s.assignee_id, members)}</span>
                <span>調査：{memberName(s.reviewer_id, members)}</span>
                <span>終了予定日：{formatDate(s.planned_end_date)}</span>
              </div>

              {/* 7工程 × 予定・実績の2行 */}
              {PHASES.map((ph) => {
                const p = s.phases.find((x) => x.phase_no === ph.no) ?? {}
                return (
                  <div key={ph.no} className="g-phase">
                    <div className="g-phase-name" style={{ background: ph.color }}>{ph.name}</div>
                    <div>
                      <BarRow label="予定" kind="plan" style={barStyle(p.plan_start, p.plan_end)} dayCount={dayCount} />
                      {/* 実績は終了日が未入力なら今日まで伸ばす */}
                      <BarRow label="実績" kind="actual" style={barStyle(p.actual_start, p.actual_end)} dayCount={dayCount} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
