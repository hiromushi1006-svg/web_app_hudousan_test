// 7工程の定義と、表示用の関数：メンバー名の取得、ソフトの進捗率、日付の整形
import { PHASES, memberName, softwareProgress, formatDate } from '../lib/phases'
// ガントチャート共通の計算：日付の変換、表示期間の作成、バーの位置、土日の判定
import { toDate, buildDays, barStyle, isWeekend } from '../lib/gantt'
// ガントチャート共通の部品：日付の見出し、列の背景、予定・実績の1行
import { GanttHeader, GanttColumns, PlanActualRow } from './GanttGrid'

// プロジェクトのガントチャート：1工程を「予定行」と「実績行」の2行で描く
// project：選択中のプロジェクト（開始日・納入日の表示用）、softwares：表示するソフト（工程付き）、members：担当者名の表示用
export default function GanttChart({ project, softwares, members }) {
  // 表示期間：プロジェクトの開始日・納入日と、全工程の予定・実績の日付の最小〜最大（実績が終わっていない工程は今日まで）
  const range = buildDays([
    // プロジェクトの開始日（project が空なら undefined）
    project?.start_date,
    // プロジェクトの納入日
    project?.delivery_date,
    // 全ソフトの全工程の日付を、1つの配列に平らに並べる（flatMap）
    ...softwares.flatMap((s) =>
      s.phases.flatMap((p) => [
        // 予定開始・予定終了・実績開始・実績終了
        p.plan_start, p.plan_end, p.actual_start, p.actual_end,
        // 実績が始まっていて終わっていない工程は、今日までを期間に含める目印
        p.actual_start && !p.actual_end ? 'TODAY' : null,
      ]),
    ),
  ])
  // 日付が1つもなければ、チャートの代わりに案内を表示する
  if (!range) {
    return <p className="muted">工程の予定・実績が入力されていないため、ガントチャートを表示できません。</p>
  }
  // 表示期間の最初の日・日数・全日付を取り出す
  const { start, dayCount, days } = range

  // プロジェクトの開始日・納入日（日付の比較用に数値化）
  // 開始日を数値（ミリ秒）にする。未入力なら null
  const startTime = project?.start_date ? toDate(project.start_date).getTime() : null
  // 納入日を数値（ミリ秒）にする。未入力なら null
  const deliveryTime = project?.delivery_date ? toDate(project.delivery_date).getTime() : null

  // 見出しに表示する目印（日付の数値 → 文字）
  const marks = {}
  // 開始日があれば「★開始日」
  if (startTime) marks[startTime] = '★開始日'
  // 納入日があれば「☆納入日」（開始日と同じ日なら2つ並べる）
  if (deliveryTime) marks[deliveryTime] = (marks[deliveryTime] ? marks[deliveryTime] + ' ' : '') + '☆納入日'

  // 日付の列の種類（色分け用）：開始日・納入日を土日より優先する
  const columnClass = (d) => {
    // 比較用に日付を数値にする
    const t = d.getTime()
    // 開始日なら start（薄い黄色）
    if (t === startTime) return 'start'
    // 納入日なら delivery（薄い紫）
    if (t === deliveryTime) return 'delivery'
    // 土日なら weekend（灰色）
    if (isWeekend(d)) return 'weekend'
    // それ以外は色なし
    return ''
  }

  // 画面に表示する内容
  return (
    // チャート全体の枠（はみ出した分はスクロール）
    <div className="gantt">
      {/* 中身の幅に合わせて横に広がるエリア */}
      <div className="gantt-inner">
        {/* 見出し（開始日・納入日の目印と日付）：縦スクロールしても上部に固定 */}
        <GanttHeader days={days} marks={marks} />

        {/* チャートの本体 */}
        <div className="g-body">
          {/* 日付の列の背景（土日は灰色、開始日・納入日は色付き）：行の後ろに敷く */}
          <GanttColumns days={days} columnClass={columnClass} />

          {/* ソフトの数だけ、ブロックを作る */}
          {softwares.map((s) => (
            <div key={s.id} className="g-software-block">
              {/* ソフトの見出し行 */}
              <div className="g-software">
                {/* ソフト名 */}
                <strong>{s.name}</strong>
                {/* 進捗率 */}
                <span>進捗：{softwareProgress(s.phases)}%</span>
                {/* 担当メンバー */}
                <span>担当：{memberName(s.assignee_id, members)}</span>
                {/* 調査担当 */}
                <span>調査：{memberName(s.reviewer_id, members)}</span>
                {/* 終了予定日 */}
                <span>終了予定日：{formatDate(s.planned_end_date)}</span>
              </div>

              {/* 7工程 × 予定・実績の2行 */}
              {PHASES.map((ph) => {
                // このソフトの、この工程のデータを探す（なければ空のデータとして扱う）
                const p = s.phases.find((x) => x.phase_no === ph.no) ?? {}
                // 1工程分の表示
                return (
                  <div key={ph.no} className="g-phase">
                    {/* 工程名（工程ごとの色を背景に付ける） */}
                    <div className="g-phase-name" style={{ background: ph.color }}>{ph.name}</div>
                    {/* 予定行と実績行を縦に並べる */}
                    <div>
                      {/* 予定行：予定開始日〜予定終了日のバー */}
                      <PlanActualRow label="予定" kind="plan" style={barStyle(start, p.plan_start, p.plan_end)} dayCount={dayCount} />
                      {/* 実績は終了日が未入力なら今日まで伸ばす */}
                      <PlanActualRow label="実績" kind="actual" style={barStyle(start, p.actual_start, p.actual_end)} dayCount={dayCount} />
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
