// フェーズの定義と、表示用の関数：現在のフェーズ、プロジェクトの進捗率、日付の整形
import { PROJECT_PHASES, currentProjectPhase, projectProgress, formatDate } from '../lib/phases'
// ガントチャート共通の計算：表示期間の作成、バーの位置、土日の判定
import { buildDays, barStyle, isWeekend } from '../lib/gantt'
// ガントチャート共通の部品：日付の見出し、列の背景、予定・実績の1行
import { GanttHeader, GanttColumns, PlanActualRow } from './GanttGrid'

// プロジェクト全体のガントチャート：全プロジェクトの4フェーズを「予定行」と「実績行」の2行で並べる
// projects：表示するプロジェクト（フェーズ付き）、softwares：進捗率の計算用（工程付きの全ソフト）
export default function ProjectsGanttChart({ projects, softwares }) {
  // 表示期間：全プロジェクトの開始日・納入日と、全フェーズの予定・実績の日付の最小〜最大（実績が終わっていないフェーズは今日まで）
  const range = buildDays(
    // 全プロジェクトの日付を、1つの配列に平らに並べる
    projects.flatMap((p) => [
      // プロジェクトの開始日と納入日
      p.start_date, p.delivery_date,
      // 全フェーズの日付
      ...p.project_phases.flatMap((ph) => [
        // 予定開始・予定終了・実績開始・実績終了
        ph.plan_start, ph.plan_end, ph.actual_start, ph.actual_end,
        // 実績が始まっていて終わっていないフェーズは、今日までを期間に含める目印
        ph.actual_start && !ph.actual_end ? 'TODAY' : null,
      ]),
    ]),
  )
  // プロジェクトが1件もなければ案内を表示する
  if (projects.length === 0) {
    return <p className="muted">プロジェクトが登録されていません。</p>
  }
  // 日付が1つもなければ、チャートの代わりに案内を表示する
  if (!range) {
    return <p className="muted">フェーズの予定・実績が入力されていないため、ガントチャートを表示できません。</p>
  }
  // 表示期間の最初の日・日数・全日付を取り出す
  const { start, dayCount, days } = range

  // 画面に表示する内容
  return (
    // チャート全体の枠（はみ出した分はスクロール）
    <div className="gantt">
      {/* 中身の幅に合わせて横に広がるエリア */}
      <div className="gantt-inner">
        {/* 日付の見出し：縦スクロールしても上部に固定（複数プロジェクトなので目印はなし） */}
        <GanttHeader days={days} />

        {/* チャートの本体 */}
        <div className="g-body">
          {/* 日付の列の背景（土日だけ灰色）：行の後ろに敷く */}
          <GanttColumns days={days} columnClass={(d) => (isWeekend(d) ? 'weekend' : '')} />

          {/* プロジェクトの数だけ、ブロックを作る */}
          {projects.map((p) => (
            <div key={p.id} className="g-software-block">
              {/* プロジェクトの見出し行（ソフトの見出し行と同じ見た目） */}
              <div className="g-software">
                {/* プロジェクト名 */}
                <strong>{p.name}</strong>
                {/* 進捗率（配下ソフトの平均） */}
                <span>進捗：{projectProgress(softwares.filter((s) => s.project_id === p.id))}%</span>
                {/* 現在のフェーズ */}
                <span>現在のフェーズ：{currentProjectPhase(p.project_phases)}</span>
                {/* 開始日 */}
                <span>開始日：{formatDate(p.start_date)}</span>
                {/* 納入日 */}
                <span>納入日：{formatDate(p.delivery_date)}</span>
              </div>

              {/* 4フェーズ × 予定・実績の2行 */}
              {PROJECT_PHASES.map((def) => {
                // このプロジェクトの、このフェーズのデータを探す（なければ空のデータとして扱う）
                const ph = p.project_phases.find((x) => x.phase_no === def.no) ?? {}
                // 1フェーズ分の表示
                return (
                  <div key={def.no} className="g-phase">
                    {/* フェーズ名（フェーズごとの色を背景に付ける） */}
                    <div className="g-phase-name" style={{ background: def.color }}>{def.name}</div>
                    {/* 予定行と実績行を縦に並べる */}
                    <div>
                      {/* 予定行：予定開始日〜予定終了日のバー */}
                      <PlanActualRow label="予定" kind="plan" style={barStyle(start, ph.plan_start, ph.plan_end)} dayCount={dayCount} />
                      {/* 実績行：終了日が未入力なら今日まで伸ばす */}
                      <PlanActualRow label="実績" kind="actual" style={barStyle(start, ph.actual_start, ph.actual_end)} dayCount={dayCount} />
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
