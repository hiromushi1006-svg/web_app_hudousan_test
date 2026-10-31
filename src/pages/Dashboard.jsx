// 画面表示時の処理（useEffect）と、状態の保持（useState）
import { useEffect, useState } from 'react'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'
// 上部のタイトル・画面切り替えボタン
import PageHeader from '../components/PageHeader'
// ソフトの情報カード
import SoftwareCard from '../components/SoftwareCard'
// プロジェクトのガントチャート
import GanttChart from '../components/GanttChart'
// メンバーのガントチャート
import MemberGanttChart from '../components/MemberGanttChart'
// プロジェクト全体（全プロジェクトのフェーズ）のガントチャート
import ProjectsGanttChart from '../components/ProjectsGanttChart'
// 進捗の横棒
import ProgressBar from '../components/ProgressBar'
// 納期・終了が近いプロジェクト・ソフト・タスクのアラート
import DeadlineAlerts from '../components/DeadlineAlerts'
// 計算・表示用の関数：担当ソフト・担当タスクの一覧、所持タスク数、日付の整形、プロジェクトの進捗率、現在のフェーズ
import { assignedSoftwares, assignedTasks, taskCount, formatDate, projectProgress, currentProjectPhase } from '../lib/phases'

// ダッシュボード：メンバー負荷・プロジェクト進捗・ソフト進捗・ガントチャート
export default function Dashboard() {
  // メンバーの一覧
  const [members, setMembers] = useState([])
  // プロジェクトの一覧
  const [projects, setProjects] = useState([])
  // ソフトの一覧（工程付き）
  const [softwares, setSoftwares] = useState([])
  // タスクの一覧
  const [tasks, setTasks] = useState([])
  const [selectedId, setSelectedId] = useState(null) // 選択中のプロジェクトID
  const [ganttMemberId, setGanttMemberId] = useState(null) // ガントチャートに表示するメンバーのID（nullならプロジェクトのチャート）
  const [showAllProjects, setShowAllProjects] = useState(false) // true なら全プロジェクトのフェーズを並べたチャートを表示する
  // 読み込み中かどうか
  const [loading, setLoading] = useState(true)
  // 画面に表示するエラーメッセージ
  const [error, setError] = useState('')
  // 現在の日時（画面上部に表示）
  const [now, setNow] = useState(new Date())

  // 画面表示時に全データを取得する
  useEffect(() => {
    // データを取得する処理（useEffect の中では async を直接使えないため、関数を作って呼ぶ）
    const fetchData = async () => {
      // 4つのテーブルを同時に取得し、すべて終わるまで待つ（Promise.all：並行して実行）
      const [m, p, s, t] = await Promise.all([
        // メンバーを登録順に取得
        supabase.from('members').select('*').order('created_at'),
        // プロジェクトを、ひも付くフェーズ（project_phases）ごと登録順に取得
        supabase.from('projects').select('*, project_phases(*)').order('created_at'),
        // ソフトを、ひも付く工程（phases）ごと登録順に取得
        supabase.from('softwares').select('*, phases(*)').order('created_at'),
        // タスクを登録順に取得
        supabase.from('tasks').select('*').order('created_at'),
      ])
      // 4つのうち、どれかでエラーがあればそれを取り出す（?? ：左が空なら右を使う）
      const err = m.error ?? p.error ?? s.error ?? t.error
      // エラーがあった場合
      if (err) {
        // エラーメッセージを表示する
        setError('データの取得に失敗しました：' + err.message)
      // 成功した場合
      } else {
        // 取得したメンバーを保存
        setMembers(m.data)
        // 取得したプロジェクトを保存
        setProjects(p.data)
        // 取得したソフトを保存
        setSoftwares(s.data)
        // 取得したタスクを保存
        setTasks(t.data)
        // 最初のプロジェクトを選択状態にする
        if (p.data.length > 0) setSelectedId(p.data[0].id)
      }
      // 読み込みが終わったので「読み込み中」を解除
      setLoading(false)
    }
    // 上で作った取得処理を実行する
    fetchData()
  // [] ：最初の1回だけ実行する
  }, [])

  // 現在の日時を1分ごとに更新する
  useEffect(() => {
    // 60秒（60 × 1000ミリ秒）ごとに、現在の日時を入れ直すタイマーを作る
    const timer = setInterval(() => setNow(new Date()), 60 * 1000)
    // 画面が消えるときにタイマーを止める（後始末）
    return () => clearInterval(timer)
  }, [])

  // 指定したプロジェクトに属するソフトだけを取り出す関数
  const softwaresOf = (projectId) => softwares.filter((s) => s.project_id === projectId)
  // 選択中のプロジェクト（見つからなければ undefined）
  const selected = projects.find((p) => p.id === selectedId)
  // 選択中のプロジェクトのソフト（選択がなければ空の配列）
  const selectedSoftwares = selected ? softwaresOf(selected.id) : []
  // ガントチャートに表示するメンバー（プロジェクトのチャートを表示中なら undefined）
  const ganttMember = members.find((m) => m.id === ganttMemberId)

  // 画面に表示する内容
  return (
    // 画面全体の外枠（wide：ダッシュボードは横幅を広めにする）
    <div className="container wide">
      {/* 上部のタイトルと画面切り替えボタン */}
      <PageHeader title="タスク管理ダッシュボード" />
      {/* 現在の日付と時刻 */}
      <p className="now">
        {/* 日付は「2026/10/27」、時刻は「10:58」の形式で表示 */}
        現在の日付：{now.toLocaleDateString('ja-JP')}　{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* エラーがあるときだけ表示 */}
      {error && <p className="error">{error}</p>}
      {/* 読み込み中なら「読み込み中...」、終わったら各エリアを表示 */}
      {loading ? (
        <p className="center">読み込み中...</p>
      ) : (
        <>
          {/* 期日アラート：期日が近い（または過ぎた）プロジェクト・ソフト・タスクを表示 */}
          <DeadlineAlerts projects={projects} softwares={softwares} tasks={tasks} members={members} />

          {/* メンバー負荷状況（クリックで下のガントチャートをそのメンバーのものに切り替え） */}
          <section className="panel">
            {/* エリアの見出し */}
            <h2 className="panel-title">メンバー負荷状況（クリックでメンバーのガントチャートを表示）</h2>
            {/* カードを横一列に並べるエリア */}
            <div className="scroll-row">
              {/* メンバーが0人のときのメッセージ */}
              {members.length === 0 && <p className="muted">メンバーが登録されていません。</p>}
              {/* メンバーの数だけカードを作る */}
              {members.map((m) => (
                // メンバーのカード全体をボタンにして、押せるようにする
                <button
                  // フォーム送信ではない普通のボタン
                  type="button"
                  // 各カードを区別するための目印
                  key={m.id}
                  // ガントチャートに表示中のメンバーには selected クラスを付けて枠を強調
                  className={'card card-button' + (m.id === ganttMemberId ? ' selected' : '')}
                  // 押されたら、このメンバーのガントチャートに切り替える
                  onClick={() => {
                    // このメンバーをガントチャートの表示対象にする
                    setGanttMemberId(m.id)
                    // 全プロジェクト表示を解除する
                    setShowAllProjects(false)
                  }}
                >
                  {/* メンバー名 */}
                  <p className="card-title">{m.name}</p>
                  {/* 役職（未入力なら「-」） */}
                  <p>役職：{m.role || '-'}</p>
                  {/* 担当・調査しているソフトの数 ＋ 担当しているタスクの数 */}
                  <p>所持タスク：{taskCount(m, softwares, tasks)}</p>
                  {/* 負荷が100％を超えたら警告色で表示 */}
                  <p className={m.load > 100 ? 'overload' : ''}>負荷：{m.load}％</p>
                  {/* 負荷の横棒（100％超は赤） */}
                  <ProgressBar value={m.load} warnOver100 />
                </button>
              ))}
            </div>
          </section>

          {/* プロジェクト選択（クリックで下のソフト進捗・ガントチャートを切り替え） */}
          <section className="panel">
            {/* エリアの見出し */}
            <h2 className="panel-title">プロジェクト選択（クリックでプロジェクトのガントチャートを表示）</h2>
            {/* カードを横一列に並べるエリア */}
            <div className="scroll-row">
              {/* プロジェクトが0件のときのメッセージ */}
              {projects.length === 0 && <p className="muted">プロジェクトが登録されていません。</p>}
              {/* 全プロジェクトのカード（押すと、全プロジェクトのフェーズを並べたチャートを表示） */}
              {projects.length > 0 && (
                <button
                  // フォーム送信ではない普通のボタン
                  type="button"
                  // 全プロジェクト表示中なら selected クラスを付けて枠を強調（all-card：他のカードと区別する見た目）
                  className={'card card-button all-card' + (showAllProjects && !ganttMember ? ' selected' : '')}
                  // 押されたら、全プロジェクトのチャートに切り替える
                  onClick={() => {
                    // 全プロジェクト表示にする
                    setShowAllProjects(true)
                    // メンバーの選択を外す
                    setGanttMemberId(null)
                  }}
                >
                  {/* カードのタイトル */}
                  <p className="card-title">全プロジェクト</p>
                  {/* 説明 */}
                  <p>全プロジェクトのフェーズを並べて表示</p>
                  {/* プロジェクトの件数 */}
                  <p>プロジェクト数：{projects.length}</p>
                </button>
              )}
              {/* プロジェクトの数だけカードを作る */}
              {projects.map((p) => (
                // カード全体をボタンにして、押せるようにする
                <button
                  // フォーム送信ではない普通のボタン
                  type="button"
                  // 各カードを区別するための目印
                  key={p.id}
                  // 選択中で、かつこのプロジェクトのチャートを表示中のカードには selected クラスを付けて枠を強調
                  className={'card card-button' + (p.id === selectedId && !ganttMember && !showAllProjects ? ' selected' : '')}
                  // 押されたら、このプロジェクトを選択状態にし、ガントチャートもプロジェクトのものに戻す
                  onClick={() => {
                    // このプロジェクトを選択状態にする
                    setSelectedId(p.id)
                    // メンバーの選択を外す（プロジェクトのガントチャートに戻る）
                    setGanttMemberId(null)
                    // 全プロジェクト表示を解除する
                    setShowAllProjects(false)
                  }}
                >
                  {/* プロジェクト名 */}
                  <p className="card-title">{p.name}</p>
                  {/* 進捗率（配下ソフトの平均） */}
                  <p>進捗率：{projectProgress(softwaresOf(p.id))}%</p>
                  {/* 進捗率の横棒 */}
                  <ProgressBar value={projectProgress(softwaresOf(p.id))} />
                  {/* 現在のフェーズ（進捗100％未満の最初のフェーズ） */}
                  <p>現在のフェーズ：{currentProjectPhase(p.project_phases)}</p>
                  {/* 開始日 */}
                  <p>開始日：{formatDate(p.start_date)}</p>
                  {/* 納入日 */}
                  <p>納入日：{formatDate(p.delivery_date)}</p>
                </button>
              ))}
            </div>
          </section>

          {/* プロジェクトが選択されているときだけ、ソフト進捗状況を表示 */}
          {selected && (
            // 選択中プロジェクトのソフト進捗状況
            <section className="panel">
              {/* エリアの見出し（選択中のプロジェクト名入り） */}
              <h2 className="panel-title">「{selected.name}」：ソフト進捗状況</h2>
              {/* カードを横一列に並べるエリア */}
              <div className="scroll-row">
                {/* ソフトが0件のときのメッセージ */}
                {selectedSoftwares.length === 0 && <p className="muted">ソフトが登録されていません。</p>}
                {/* ソフトの数だけカードを作る */}
                {selectedSoftwares.map((s) => (
                  // ソフトの情報カード（ボタンなし）
                  <SoftwareCard key={s.id} software={s} projectName={selected.name} members={members} />
                ))}
              </div>
            </section>
          )}

          {/* ガントチャート：メンバーを選択中ならメンバー、全プロジェクトを選択中なら全プロジェクト、それ以外は選択中プロジェクトのチャート */}
          {ganttMember ? (
            <section className="panel">
              {/* エリアの見出し（メンバー名入り） */}
              <h2 className="panel-title">ガントチャート：{ganttMember.name}（担当ソフト・タスク）</h2>
              {/* メンバーの担当・調査ソフトと担当タスクを渡して、ガントチャートを描く */}
              <MemberGanttChart softwares={assignedSoftwares(ganttMember, softwares)} tasks={assignedTasks(ganttMember, tasks)} />
            </section>
          ) : showAllProjects ? (
            <section className="panel">
              {/* エリアの見出し */}
              <h2 className="panel-title">ガントチャート：全プロジェクト（フェーズ）</h2>
              {/* 全プロジェクト（フェーズ付き）と、進捗率の計算用に全ソフトを渡して、ガントチャートを描く */}
              <ProjectsGanttChart projects={projects} softwares={softwares} />
            </section>
          ) : (
            // プロジェクトが選択されているときだけ表示
            selected && (
              <section className="panel">
                {/* エリアの見出し */}
                <h2 className="panel-title">ガントチャート：{selected.name}</h2>
                {/* 選択中のプロジェクトとそのソフトを渡して、ガントチャートを描く */}
                <GanttChart project={selected} softwares={selectedSoftwares} members={members} />
              </section>
            )
          )}
        </>
      )}
    </div>
  )
}
