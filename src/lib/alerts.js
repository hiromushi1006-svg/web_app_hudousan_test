// 納期・終了が近いプロジェクト・ソフト・タスクのアラートを作る処理

// 1日のミリ秒数、日付の変換、今日の日付
import { DAY_MS, toDate, today } from './gantt'
// フェーズの名前、フェーズの定義、ソフトの進捗率、メンバー名を求める関数
import { phaseName, PROJECT_PHASES, softwareProgress, memberName } from './phases'

// 何日前からアラートを出すか（この日数以内に期日が来るものを「間近」とする）
export const ALERT_DAYS = 14

// 期日までの残り日数（今日なら0、過ぎていればマイナス）
const daysUntil = (dateStr) => Math.round((toDate(dateStr) - today()) / DAY_MS)

// アラートの一覧を作る
// projects：フェーズ（project_phases）付きのプロジェクト、softwares：工程（phases）付きのソフト、tasks：タスク、members：担当者名の表示用
// 戻り値：{ key, type, name, label, sub, date, days, level } の配列（期日が近い順）
//   type：'project' / 'software' / 'task'、name：対象の名前、label：何の期日か、sub：補足（所属プロジェクト・担当者）
export function buildAlerts({ projects = [], softwares = [], tasks = [], members = [] }) {
  // アラートをためていく配列
  const alerts = []

  // 期日が ALERT_DAYS 日以内（または過ぎている）なら、アラートとして追加する関数
  const addIfNear = (item) => {
    // 期日が空なら何もしない
    if (!item.date) return
    // 期日までの残り日数
    const days = daysUntil(item.date)
    // 期日を過ぎているか、ALERT_DAYS 日以内なら追加する
    if (days <= ALERT_DAYS) alerts.push({ ...item, days })
  }

  // プロジェクトIDからプロジェクト名を求める関数（見つからなければ「-」）
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? '-'

  // ① プロジェクト：納入日と、現在のフェーズの予定終了日
  projects.forEach((p) => {
    // フェーズを番号順に並べる（元のデータは変えないようにコピーしてから並べ替える）
    const phases = [...(p.project_phases ?? [])].sort((a, b) => a.phase_no - b.phase_no)
    // 全フェーズが100％なら完了済みなので、アラートは出さない
    if (phases.length > 0 && phases.every((ph) => ph.progress >= 100)) return

    // プロジェクトの納入日
    addIfNear({ key: p.id + '-delivery', type: 'project', name: p.name, label: '納入日', sub: '', date: p.delivery_date })

    // 現在のフェーズ（進捗100％未満の最初のフェーズ）
    const current = phases.find((ph) => ph.progress < 100)
    // 現在のフェーズがあり、まだ実績終了日が入っていない場合だけ、予定終了日を調べる
    if (current && !current.actual_end) {
      addIfNear({
        key: p.id + '-phase',
        type: 'project',
        name: p.name,
        // 例：「フェーズ「機能試作」の終了予定日」
        label: `フェーズ「${phaseName(current.phase_no, PROJECT_PHASES)}」の終了予定日`,
        sub: '',
        date: current.plan_end,
      })
    }
  })

  // ② ソフト：納期（7工程がすべて100％の完了済みソフトは対象外）
  softwares.forEach((s) => {
    // 進捗が100％なら完了済みなので、アラートは出さない
    if (softwareProgress(s.phases) >= 100) return
    // ソフトの納期（補足に所属プロジェクト名と担当者を出す）
    addIfNear({
      key: s.id + '-due',
      type: 'software',
      name: s.name,
      label: '納期',
      sub: `${projectName(s.project_id)}／担当：${memberName(s.assignee_id, members)}`,
      date: s.due_date,
    })
  })

  // ③ タスク：終了予定日（進捗100％の完了済みタスクは対象外）
  tasks.forEach((t) => {
    // 進捗が100％なら完了済みなので、アラートは出さない
    if (t.progress >= 100) return
    // タスクの終了予定日（補足に担当者を出す）
    addIfNear({
      key: t.id + '-end',
      type: 'task',
      name: t.name,
      label: '終了予定日',
      sub: `担当：${memberName(t.assignee_id, members)}`,
      date: t.end_date,
    })
  })

  // 期日を過ぎたものは overdue（赤）、それ以外は soon（オレンジ）とし、残り日数が少ない順に並べて返す
  return alerts
    .map((a) => ({ ...a, level: a.days < 0 ? 'overdue' : 'soon' }))
    .sort((a, b) => a.days - b.days)
}
