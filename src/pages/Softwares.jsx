// 画面表示時の処理（useEffect）と、状態の保持（useState）
import { useEffect, useState } from 'react'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'
// 上部のタイトル・画面切り替えボタン
import PageHeader from '../components/PageHeader'
// ソフトの情報カード
import SoftwareCard from '../components/SoftwareCard'
// 7工程の定義と、現在の工程を判定する関数
import { PHASES, currentPhase } from '../lib/phases'

// フォームの初期値
const emptyForm = {
  name: '', project_id: '', scale: '', due_date: '',
  start_date: '', planned_end_date: '', assignee_id: '', reviewer_id: '',
}

// 7工程分の空の入力欄を作る
const emptyPhases = () =>
  // 工程ごとに、番号と空の日付・進捗0の入力値を作る
  PHASES.map((p) => ({ phase_no: p.no, plan_start: '', plan_end: '', actual_start: '', actual_end: '', progress: '0' }))

// ソフト一覧画面（一覧表示・登録・編集・削除）
export default function Softwares() {
  // ソフトの一覧（工程付き）
  const [softwares, setSoftwares] = useState([])
  const [projects, setProjects] = useState([]) // 対象プロジェクトの選択肢
  const [members, setMembers] = useState([]) // 担当メンバー・調査の選択肢
  // 読み込み中かどうか
  const [loading, setLoading] = useState(true)
  // 画面に表示するエラーメッセージ
  const [error, setError] = useState('')
  // フォームに入力中の値（ソフトの情報）
  const [form, setForm] = useState(emptyForm)
  const [phaseForm, setPhaseForm] = useState(emptyPhases) // 工程の入力値（編集時のみ使用）
  const [editingId, setEditingId] = useState(null) // 編集中のソフトID（nullなら新規登録）
  // 保存処理中かどうか（二重送信を防ぐために使う）
  const [saving, setSaving] = useState(false)

  // ソフト（工程付き）・プロジェクト・メンバーを取得する
  const fetchData = async () => {
    // 3つのテーブルを同時に取得し、すべて終わるまで待つ
    const [s, p, m] = await Promise.all([
      // ソフトを、ひも付く工程（phases）ごと登録順に取得
      supabase.from('softwares').select('*, phases(*)').order('created_at'),
      // プロジェクトは、選択肢に必要なIDと名前だけ取得
      supabase.from('projects').select('id, name').order('created_at'),
      // メンバーも、選択肢に必要なIDと名前だけ取得
      supabase.from('members').select('id, name').order('created_at'),
    ])
    // 3つのうち、どれかでエラーがあればそれを取り出す
    const err = s.error ?? p.error ?? m.error
    // エラーがあった場合
    if (err) {
      // エラーメッセージを表示する
      setError('データの取得に失敗しました：' + err.message)
    // 成功した場合
    } else {
      // 取得したソフトを保存
      setSoftwares(s.data)
      // 取得したプロジェクトを保存
      setProjects(p.data)
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

  // 工程の入力欄が変わったとき（index番目の工程の field を更新）
  const handlePhaseChange = (index, field, value) => {
    // index番目の工程だけ field の値を差し替え、それ以外はそのままの新しい配列を作る
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
    // 編集中なら更新、そうでなければ新規登録の処理を実行し、結果を受け取る
    const result = editingId ? await updateSoftware() : await insertSoftware()
    // 保存処理が終わったので、保存中を解除
    setSaving(false)

    // 保存に失敗した場合
    if (result.error) {
      // エラーメッセージを表示して
      setError('保存に失敗しました：' + result.error.message)
      // ここで処理を終える
      return
    }
    // 成功したらフォームを空に戻し
    resetForm()
    // 最新の一覧を取得し直す
    fetchData()
  }

  // 新規登録：ソフトを登録し、続けて7工程分の空の行を作る
  const insertSoftware = async () => {
    // ソフトを1件登録し、登録された行（自動で付いたIDを含む）を受け取る
    const { data, error } = await supabase
      // softwares テーブルに
      .from('softwares')
      // 入力値を登録する
      .insert({
        name: form.name,
        project_id: form.project_id,
        // 開発規模は空ならnull、入力があれば数値にする
        scale: form.scale === '' ? null : Number(form.scale),
        // 納期は空ならnull
        due_date: form.due_date || null,
      })
      // 登録した行を返してもらう
      .select()
      // 1件だけなので、配列ではなく1件のデータとして受け取る
      .single()
    // 登録に失敗したら、エラーを返して終わる
    if (error) return { error }

    // 登録したソフトのIDを使って、7工程分の行をまとめて登録する
    return supabase.from('phases').insert(PHASES.map((p) => ({ software_id: data.id, phase_no: p.no })))
  }

  // 更新：ソフトの情報と7工程の予定・実績・進捗を保存する
  const updateSoftware = async () => {
    // ソフトの情報を更新する
    const { error } = await supabase
      // softwares テーブルの
      .from('softwares')
      // 入力値で更新する（空の項目はnullにする）
      .update({
        name: form.name,
        project_id: form.project_id,
        scale: form.scale === '' ? null : Number(form.scale),
        due_date: form.due_date || null,
        start_date: form.start_date || null,
        planned_end_date: form.planned_end_date || null,
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
      })
      // 対象は編集中のソフトだけ
      .eq('id', editingId)
    // 更新に失敗したら、エラーを返して終わる
    if (error) return { error }

    // 工程は「ソフトID＋工程番号」が同じ行があれば更新、なければ登録する（upsert）
    const rows = phaseForm.map((p) => ({
      software_id: editingId,
      phase_no: p.phase_no,
      // 日付は空ならnull
      plan_start: p.plan_start || null,
      plan_end: p.plan_end || null,
      actual_start: p.actual_start || null,
      actual_end: p.actual_end || null,
      // 進捗は数値にし、0〜100の範囲に収める
      progress: Math.min(100, Math.max(0, Number(p.progress) || 0)),
    }))
    // 7工程分をまとめて保存する（onConflict：この2つの列が同じなら同じ行とみなす）
    return supabase.from('phases').upsert(rows, { onConflict: 'software_id,phase_no' })
  }

  // 編集開始：選択したソフトと工程の値をフォームに反映
  const handleEdit = (s) => {
    // 編集中のソフトIDを記録する（これで登録ではなく更新になる）
    setEditingId(s.id)
    // ソフトの値をフォームに入れる（数値は文字列に、空の値は空文字にする）
    setForm({
      name: s.name,
      project_id: s.project_id,
      scale: s.scale == null ? '' : String(s.scale),
      due_date: s.due_date ?? '',
      start_date: s.start_date ?? '',
      planned_end_date: s.planned_end_date ?? '',
      assignee_id: s.assignee_id ?? '',
      reviewer_id: s.reviewer_id ?? '',
    })
    // 保存済みの工程を番号順に入力欄へ反映（未保存の工程は空欄）
    setPhaseForm(
      // 7工程分の空の入力値を作り、1つずつ処理する
      emptyPhases().map((empty) => {
        // 同じ工程番号の保存済みデータを探す
        const saved = s.phases.find((p) => p.phase_no === empty.phase_no)
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

  // 削除（DELETE）：工程もまとめて削除される
  const handleDelete = async (s) => {
    // 確認ダイアログで「キャンセル」されたら何もしない
    if (!window.confirm(`「${s.name}」を削除しますか？`)) return
    // 前回のエラーを消す
    setError('')
    // 該当のIDのソフトを削除する
    const { error } = await supabase.from('softwares').delete().eq('id', s.id)
    // 削除に失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('削除に失敗しました：' + error.message)
      // ここで処理を終える
      return
    }
    // 編集中のソフトを削除した場合はフォームも初期化
    if (editingId === s.id) resetForm()
    // 最新の一覧を取得し直す
    fetchData()
  }

  // フォームを初期状態（新規登録モード・空欄）に戻す
  const resetForm = () => {
    // 編集中のIDを空にする（新規登録モードに戻る）
    setEditingId(null)
    // ソフトの入力欄を初期値に戻す
    setForm(emptyForm)
    // 工程の入力欄を初期値に戻す
    setPhaseForm(emptyPhases())
  }

  // プロジェクトIDからプロジェクト名を取得する（見つからなければ「-」）
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? '-'
  // 編集中のソフト（新規登録モードなら undefined）
  const editing = softwares.find((s) => s.id === editingId)

  // 画面に表示する内容
  return (
    // 画面全体の外枠
    <div className="container">
      {/* 上部のタイトルと画面切り替えボタン */}
      <PageHeader title="ソフト一覧" />

      {/* フォームの見出し（編集中かどうかで切り替える） */}
      <h2 className="form-title">{editing ? `ソフトを編集：${editing.name}` : 'ソフトを登録'}</h2>
      {/* 登録・編集フォーム（送信されたら handleSubmit を実行） */}
      <form className="edit-form" onSubmit={handleSubmit}>
        {/* 入力欄を横に並べるエリア */}
        <div className="form-row">
          <label>
            ソフト名
            {/* ソフト名の入力欄（required：必須） */}
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            対象プロジェクト
            {/* プロジェクトを選ぶプルダウン（必須） */}
            <select name="project_id" value={form.project_id} onChange={handleChange} required>
              {/* 未選択のときの表示 */}
              <option value="">選択してください</option>
              {/* プロジェクトの数だけ選択肢を作る（値はID、表示は名前） */}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            開発規模
            {/* 数値のみ・0以上 */}
            <input name="scale" type="number" min="0" value={form.scale} onChange={handleChange} />
          </label>
          <label>
            納期
            {/* カレンダーから日付を選べる入力欄 */}
            <input name="due_date" type="date" value={form.due_date} onChange={handleChange} />
          </label>
          {/* 開始日・終了予定日は編集時のみ表示 */}
          {editing && (
            <>
              <label>
                開始日
                <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
              </label>
              <label>
                終了予定日
                <input name="planned_end_date" type="date" value={form.planned_end_date} onChange={handleChange} />
              </label>
            </>
          )}
        </div>

        {/* 担当・工程の入力は編集時のみ表示 */}
        {editing && (
          <>
            {/* 入力欄を横に並べるエリア */}
            <div className="form-row">
              <label>
                担当メンバー
                {/* メンバーを選ぶプルダウン */}
                <select name="assignee_id" value={form.assignee_id} onChange={handleChange}>
                  {/* 未設定の選択肢 */}
                  <option value="">未設定</option>
                  {/* メンバーの数だけ選択肢を作る */}
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                調査
                {/* 調査担当のメンバーを選ぶプルダウン */}
                <select name="reviewer_id" value={form.reviewer_id} onChange={handleChange}>
                  <option value="">未設定</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                現在の工程（自動判定）
                {/* 入力中の工程進捗から現在の工程を判定して表示する（進捗は数値に変換して判定。入力はできない） */}
                <input value={currentPhase(phaseForm.map((p) => ({ ...p, progress: Number(p.progress) })))} readOnly className="readonly" />
              </label>
            </div>

            {/* 7工程の予定・実績・進捗 */}
            <div className="sub-section">
              {/* エリアの見出し */}
              <span className="sub-label">工程</span>
              {/* 表が画面に収まらないときは横スクロールさせる */}
              <div className="phase-table-wrap">
                {/* 工程の入力表 */}
                <table className="phase-table">
                  {/* 表の見出し行 */}
                  <thead>
                    <tr>
                      <th>工程</th><th>予定開始日</th><th>予定終了日</th>
                      <th>実績開始日</th><th>実績終了日</th><th>工程進捗（％）</th>
                    </tr>
                  </thead>
                  {/* 表の中身 */}
                  <tbody>
                    {/* 7工程の数だけ行を作る（i：何番目の工程か） */}
                    {phaseForm.map((p, i) => (
                      <tr key={p.phase_no}>
                        {/* 工程名（工程ごとの色を背景に付ける） */}
                        <td className="phase-name" style={{ background: PHASES[i].color }}>{PHASES[i].name}</td>
                        {/* 4つの日付欄を同じ形で作る */}
                        {['plan_start', 'plan_end', 'actual_start', 'actual_end'].map((field) => (
                          <td key={field}>
                            {/* 変更されたら、i番目の工程の field を更新する */}
                            <input type="date" value={p[field]} onChange={(e) => handlePhaseChange(i, field, e.target.value)} />
                          </td>
                        ))}
                        <td>
                          {/* 工程進捗（0〜100の数値） */}
                          <input type="number" min="0" max="100" value={p.progress} onChange={(e) => handlePhaseChange(i, 'progress', e.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ボタンを並べるエリア */}
        <div className="form-actions">
          {/* プロジェクトが1件もないとソフトを登録できない */}
          <button type="submit" disabled={saving || projects.length === 0}>
            {/* 保存中・編集中・新規登録で文字を切り替える */}
            {saving ? '保存中...' : editing ? '更新する' : '登録する'}
          </button>
          {/* 編集中のときだけ、キャンセルボタンを表示する */}
          {editing && (
            <button type="button" className="secondary" onClick={resetForm}>
              キャンセル
            </button>
          )}
          {/* プロジェクトが0件で、読み込みも終わっているときだけ案内を表示 */}
          {projects.length === 0 && !loading && <span className="muted">先にプロジェクトを登録してください。</span>}
        </div>
      </form>

      {/* エラーがあるときだけ表示 */}
      {error && <p className="error">{error}</p>}

      {/* 状態に応じて「読み込み中」「0件のメッセージ」「一覧」のどれかを表示する */}
      {loading ? (
        <p className="center">読み込み中...</p>
      ) : softwares.length === 0 ? (
        <p className="center">ソフトがまだ登録されていません。</p>
      ) : (
        // カードを格子状に並べる
        <div className="card-grid">
          {/* ソフトの数だけカードを作る（編集中のカードは枠を強調） */}
          {softwares.map((s) => (
            <SoftwareCard key={s.id} software={s} projectName={projectName(s.project_id)} members={members} selected={s.id === editingId}>
              {/* カード下部に表示する編集・削除ボタン（SoftwareCard の children として渡す） */}
              <div className="card-actions">
                {/* 編集：このソフトをフォームに読み込む */}
                <button className="secondary" onClick={() => handleEdit(s)}>編集</button>
                {/* 削除：このソフトを削除する */}
                <button className="danger" onClick={() => handleDelete(s)}>削除</button>
              </div>
            </SoftwareCard>
          ))}
        </div>
      )}
    </div>
  )
}
