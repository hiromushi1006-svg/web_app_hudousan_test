// 画面表示時の処理（useEffect）と、状態の保持（useState）
import { useEffect, useState } from 'react'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'
// 上部のタイトル・画面切り替えボタン
import PageHeader from '../components/PageHeader'
// 進捗の横棒
import ProgressBar from '../components/ProgressBar'
// 計算・表示用の関数：フェーズの定義、現在のフェーズ、日付の整形、プロジェクトの進捗率、ソフトの進捗率
import { PROJECT_PHASES, currentProjectPhase, formatDate, projectProgress, softwareProgress } from '../lib/phases'

// フォームの初期値
const emptyForm = { name: '', start_date: '', delivery_date: '' }

// 4フェーズ分の空の入力欄を作る
const emptyPhases = () =>
  // フェーズごとに、番号と空の日付・進捗0の入力値を作る
  PROJECT_PHASES.map((p) => ({ phase_no: p.no, plan_start: '', plan_end: '', actual_start: '', actual_end: '', progress: '0' }))

// プロジェクト一覧画面（一覧表示・登録・編集・削除）
export default function Projects() {
  // プロジェクトの一覧
  const [projects, setProjects] = useState([])
  const [softwares, setSoftwares] = useState([]) // 進捗・開発ソフト一覧の集計用（工程付き）
  const [members, setMembers] = useState([]) // プロジェクトメンバー一覧の表示用
  // 読み込み中かどうか
  const [loading, setLoading] = useState(true)
  // 画面に表示するエラーメッセージ
  const [error, setError] = useState('')
  // フォームに入力中の値
  const [form, setForm] = useState(emptyForm)
  const [phaseForm, setPhaseForm] = useState(emptyPhases) // フェーズの入力値（編集時のみ使用）
  const [editingId, setEditingId] = useState(null) // 編集中のプロジェクトID（nullなら新規登録）
  // 保存処理中かどうか（二重送信を防ぐために使う）
  const [saving, setSaving] = useState(false)

  // プロジェクト・ソフト（工程付き）・メンバーを取得する
  const fetchData = async () => {
    // 3つのテーブルを同時に取得し、すべて終わるまで待つ
    const [p, s, m] = await Promise.all([
      // プロジェクトを、ひも付くフェーズ（project_phases）ごと登録順に取得
      supabase.from('projects').select('*, project_phases(*)').order('created_at'),
      // ソフトを、ひも付く工程（phases）ごと取得
      supabase.from('softwares').select('*, phases(*)').order('created_at'),
      // メンバーを登録順に取得
      supabase.from('members').select('*').order('created_at'),
    ])
    // 3つのうち、どれかでエラーがあればそれを取り出す
    const err = p.error ?? s.error ?? m.error
    // エラーがあった場合
    if (err) {
      // エラーメッセージを表示する
      setError('データの取得に失敗しました：' + err.message)
    // 成功した場合
    } else {
      // 取得したプロジェクトを保存
      setProjects(p.data)
      // 取得したソフトを保存
      setSoftwares(s.data)
      // 取得したメンバーを保存
      setMembers(m.data)
    }
    // 読み込みが終わったので「読み込み中」を解除
    setLoading(false)
  }

  // 画面が最初に表示されたときに1回だけ、データを取得する
  useEffect(() => {
    fetchData()
  }, [])

  // 入力欄が変わるたびに、対応する項目（name属性と同名）だけフォームの値を更新する
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // フェーズの入力欄が変わったとき（index番目のフェーズの field を更新）
  const handlePhaseChange = (index, field, value) => {
    // index番目のフェーズだけ field の値を差し替え、それ以外はそのままの新しい配列を作る
    setPhaseForm(phaseForm.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  // 登録（INSERT）または更新（UPDATE）
  const handleSubmit = async (e) => {
    // フォーム送信によるページの再読み込みを止める
    e.preventDefault()
    // 前回のエラーを消す
    setError('')
    // 保存中にする
    setSaving(true)

    // 日付が空の場合はnullで保存する
    const values = {
      name: form.name,
      start_date: form.start_date || null,
      delivery_date: form.delivery_date || null,
    }
    // 編集中ならプロジェクトとフェーズを更新し、そうでなければプロジェクトとフェーズを新規登録する
    const { error } = editingId ? await updateProject(values) : await insertProject(values)

    // 保存処理が終わったので、保存中を解除
    setSaving(false)
    // 保存に失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('保存に失敗しました：' + error.message)
      // ここで処理を終える
      return
    }
    // 成功したらフォームを空に戻し
    resetForm()
    // 最新の一覧を取得し直す
    fetchData()
  }

  // 新規登録：プロジェクトを登録し、続けて4フェーズ分の空の行を作る
  const insertProject = async (values) => {
    // プロジェクトを1件登録し、登録された行（自動で付いたIDを含む）を1件のデータとして受け取る
    const { data, error } = await supabase.from('projects').insert(values).select().single()
    // 登録に失敗したら、エラーを返して終わる
    if (error) return { error }
    // 登録したプロジェクトのIDを使って、4フェーズ分の行をまとめて登録する
    return supabase.from('project_phases').insert(PROJECT_PHASES.map((p) => ({ project_id: data.id, phase_no: p.no })))
  }

  // 更新：プロジェクトの情報と4フェーズの予定・実績・進捗を保存する
  const updateProject = async (values) => {
    // プロジェクトの情報を更新する（対象は編集中のプロジェクトだけ）
    const { error } = await supabase.from('projects').update(values).eq('id', editingId)
    // 更新に失敗したら、エラーを返して終わる
    if (error) return { error }
    // フェーズは「プロジェクトID＋フェーズ番号」が同じ行があれば更新、なければ登録する（upsert）
    const rows = phaseForm.map((p) => ({
      project_id: editingId,
      phase_no: p.phase_no,
      // 日付は空ならnull
      plan_start: p.plan_start || null,
      plan_end: p.plan_end || null,
      actual_start: p.actual_start || null,
      actual_end: p.actual_end || null,
      // 進捗は数値にし、0〜100の範囲に収める
      progress: Math.min(100, Math.max(0, Number(p.progress) || 0)),
    }))
    // 4フェーズ分をまとめて保存する（onConflict：この2つの列が同じなら同じ行とみなす）
    return supabase.from('project_phases').upsert(rows, { onConflict: 'project_id,phase_no' })
  }

  // 編集開始：選択したプロジェクトの値をフォームに反映
  const handleEdit = (p) => {
    // 編集中のプロジェクトIDを記録する（これで登録ではなく更新になる）
    setEditingId(p.id)
    // プロジェクトの値をフォームに入れる（日付が空なら空文字にする）
    setForm({ name: p.name, start_date: p.start_date ?? '', delivery_date: p.delivery_date ?? '' })
    // 保存済みのフェーズを番号順に入力欄へ反映（未保存のフェーズは空欄）
    setPhaseForm(
      // 4フェーズ分の空の入力値を作り、1つずつ処理する
      emptyPhases().map((empty) => {
        // 同じフェーズ番号の保存済みデータを探す
        const saved = p.project_phases.find((x) => x.phase_no === empty.phase_no)
        // 保存済みデータがなければ空のまま
        if (!saved) return empty
        // あれば、その値を入力欄用に変換して使う
        return {
          phase_no: saved.phase_no,
          plan_start: saved.plan_start ?? '',
          plan_end: saved.plan_end ?? '',
          actual_start: saved.actual_start ?? '',
          actual_end: saved.actual_end ?? '',
          progress: String(saved.progress),
        }
      }),
    )
    // 画面の一番上（フォームの位置）へ滑らかにスクロールする
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）：配下のソフトと工程もまとめて削除される
  const handleDelete = async (p) => {
    // 確認ダイアログで「キャンセル」されたら何もしない（\n は改行）
    if (!window.confirm(`「${p.name}」を削除しますか？\n配下のソフトと工程もすべて削除されます。`)) return
    // 前回のエラーを消す
    setError('')
    // 該当のIDのプロジェクトを削除する
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    // 削除に失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('削除に失敗しました：' + error.message)
      // ここで処理を終える
      return
    }
    // 編集中のプロジェクトを削除した場合はフォームも初期化
    if (editingId === p.id) resetForm()
    // 最新の一覧を取得し直す
    fetchData()
  }

  // フォームを初期状態（新規登録モード・空欄）に戻す
  const resetForm = () => {
    // 編集中のIDを空にする（新規登録モードに戻る）
    setEditingId(null)
    // 入力欄を初期値に戻す
    setForm(emptyForm)
    // フェーズの入力欄を初期値に戻す
    setPhaseForm(emptyPhases())
  }

  // プロジェクトに属するソフト
  const softwaresOf = (projectId) => softwares.filter((s) => s.project_id === projectId)

  // 編集中のプロジェクトと、そのソフト・メンバー（ソフトの担当または調査に設定されている人）
  // 編集中のプロジェクト（新規登録モードなら undefined）
  const editing = projects.find((p) => p.id === editingId)
  // 編集中のプロジェクトのソフト
  const editingSoftwares = editing ? softwaresOf(editing.id) : []
  // ソフトの担当・調査のメンバーIDを集め、空を除いて重複なしの集合（Set）にする
  const memberIds = new Set(editingSoftwares.flatMap((s) => [s.assignee_id, s.reviewer_id]).filter(Boolean))
  // そのIDに当てはまるメンバーだけを取り出す
  const editingMembers = members.filter((m) => memberIds.has(m.id))

  // 画面に表示する内容
  return (
    // 画面全体の外枠
    <div className="container">
      {/* 上部のタイトルと画面切り替えボタン */}
      <PageHeader title="プロジェクト一覧" />

      {/* フォームの見出し（編集中かどうかで切り替える） */}
      <h2 className="form-title">{editing ? `プロジェクトを編集：${editing.name}` : 'プロジェクトを登録'}</h2>
      {/* 登録・編集フォーム（送信されたら handleSubmit を実行） */}
      <form className="edit-form" onSubmit={handleSubmit}>
        {/* 入力欄を横に並べるエリア */}
        <div className="form-row">
          <label>
            プロジェクト名
            {/* プロジェクト名の入力欄（required：必須） */}
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            開始日
            {/* type="date"：カレンダーから日付を選べる入力欄 */}
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </label>
          <label>
            納入日
            {/* 納入日の入力欄 */}
            <input name="delivery_date" type="date" value={form.delivery_date} onChange={handleChange} />
          </label>
          {/* 編集中のときだけ、進捗を表示する */}
          {editing && (
            <label>
              進捗（自動計算）
              {/* 配下ソフトの進捗の平均を表示するだけ（入力できない） */}
              <input value={`${projectProgress(editingSoftwares)}%`} readOnly className="readonly" />
            </label>
          )}
          {/* 編集中のときだけ、現在のフェーズを表示する */}
          {editing && (
            <label>
              現在のフェーズ（自動判定）
              {/* 入力中のフェーズ進捗から現在のフェーズを判定して表示する（進捗は数値に変換して判定。入力はできない） */}
              <input value={currentProjectPhase(phaseForm.map((p) => ({ ...p, progress: Number(p.progress) })))} readOnly className="readonly" />
            </label>
          )}
        </div>

        {/* 編集中のときだけ、フェーズ・メンバー一覧・ソフト一覧を表示する */}
        {editing && (
          <>
            {/* 4フェーズの予定・実績・進捗 */}
            <div className="sub-section">
              {/* エリアの見出し */}
              <span className="sub-label">フェーズ</span>
              {/* 表が画面に収まらないときは横スクロールさせる */}
              <div className="phase-table-wrap">
                {/* フェーズの入力表（ソフトの工程の入力表と同じ見た目） */}
                <table className="phase-table">
                  {/* 表の見出し行 */}
                  <thead>
                    <tr>
                      <th>フェーズ</th><th>予定開始日</th><th>予定終了日</th>
                      <th>実績開始日</th><th>実績終了日</th><th>フェーズ進捗（％）</th>
                    </tr>
                  </thead>
                  {/* 表の中身 */}
                  <tbody>
                    {/* 4フェーズの数だけ行を作る（i：何番目のフェーズか） */}
                    {phaseForm.map((p, i) => (
                      <tr key={p.phase_no}>
                        {/* フェーズ名（フェーズごとの色を背景に付ける） */}
                        <td className="phase-name" style={{ background: PROJECT_PHASES[i].color }}>{PROJECT_PHASES[i].name}</td>
                        {/* 4つの日付欄を同じ形で作る */}
                        {['plan_start', 'plan_end', 'actual_start', 'actual_end'].map((field) => (
                          <td key={field}>
                            {/* 変更されたら、i番目のフェーズの field を更新する */}
                            <input type="date" value={p[field]} onChange={(e) => handlePhaseChange(i, field, e.target.value)} />
                          </td>
                        ))}
                        <td>
                          {/* フェーズ進捗（0〜100の数値） */}
                          <input type="number" min="0" max="100" value={p.progress} onChange={(e) => handlePhaseChange(i, 'progress', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* プロジェクトメンバー一覧（ソフト登録/編集の画面で担当・調査に設定した人） */}
            <div className="sub-section">
              {/* エリアの見出し */}
              <span className="sub-label">プロジェクトメンバー一覧</span>
              {/* メンバーが0人ならメッセージ、いれば表を表示 */}
              {editingMembers.length === 0 ? (
                <p className="muted">ソフトに担当メンバーが設定されていません。</p>
              ) : (
                // 表
                <table className="list-table">
                  {/* 表の見出し行 */}
                  <thead>
                    <tr><th>メンバー</th><th>役職</th><th>負荷</th></tr>
                  </thead>
                  {/* 表の中身 */}
                  <tbody>
                    {/* メンバーの数だけ行を作る */}
                    {editingMembers.map((m) => (
                      <tr key={m.id}><td>{m.name}</td><td>{m.role}</td><td>{m.load}%</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* プロジェクト開発ソフト一覧 */}
            <div className="sub-section">
              {/* エリアの見出し */}
              <span className="sub-label">プロジェクト開発ソフト一覧</span>
              {/* ソフトが0件ならメッセージ、あれば表を表示 */}
              {editingSoftwares.length === 0 ? (
                <p className="muted">ソフトがまだ登録されていません。</p>
              ) : (
                // 表
                <table className="list-table">
                  {/* 表の見出し行 */}
                  <thead>
                    <tr><th>ソフト</th><th>規模</th><th>進捗</th></tr>
                  </thead>
                  {/* 表の中身 */}
                  <tbody>
                    {/* ソフトの数だけ行を作る（規模が未入力なら「-」） */}
                    {editingSoftwares.map((s) => (
                      <tr key={s.id}><td>{s.name}</td><td>{s.scale ?? '-'}</td><td>{softwareProgress(s.phases)}%</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ボタンを並べるエリア */}
        <div className="form-actions">
          {/* 保存ボタン（保存中は押せなくする） */}
          <button type="submit" disabled={saving}>
            {/* 保存中・編集中・新規登録で文字を切り替える */}
            {saving ? '保存中...' : editing ? '更新する' : '登録する'}
          </button>
          {/* 編集中のときだけ、キャンセルボタンを表示する */}
          {editing && (
            <button type="button" className="secondary" onClick={resetForm}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      {/* エラーがあるときだけ表示 */}
      {error && <p className="error">{error}</p>}

      {/* 状態に応じて「読み込み中」「0件のメッセージ」「一覧」のどれかを表示する */}
      {loading ? (
        <p className="center">読み込み中...</p>
      ) : projects.length === 0 ? (
        <p className="center">プロジェクトがまだ登録されていません。</p>
      ) : (
        // カードを格子状に並べる
        <div className="card-grid">
          {/* プロジェクトの数だけカードを作る */}
          {projects.map((p) => (
            // 編集中のカードには selected クラスを付けて枠を強調
            <div className={'card' + (p.id === editingId ? ' selected' : '')} key={p.id}>
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
              {/* 編集・削除ボタンのエリア */}
              <div className="card-actions">
                {/* 編集：このプロジェクトをフォームに読み込む */}
                <button className="secondary" onClick={() => handleEdit(p)}>編集</button>
                {/* 削除：このプロジェクトを削除する */}
                <button className="danger" onClick={() => handleDelete(p)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
