// 画面表示時の処理（useEffect）と、状態の保持（useState）
import { useEffect, useState } from 'react'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'
// 上部のタイトル・画面切り替えボタン
import PageHeader from '../components/PageHeader'
// 進捗（負荷）の横棒
import ProgressBar from '../components/ProgressBar'
// メンバーが担当しているソフト・タスクの一覧と、所持タスク数を求める関数
import { assignedSoftwares, assignedTasks, taskCount } from '../lib/phases'

// フォームの初期値
const emptyForm = { name: '', role: '', load: '0' }

// メンバー一覧画面（一覧表示・登録・編集・削除）
export default function Members() {
  // メンバーの一覧
  const [members, setMembers] = useState([])
  const [softwares, setSoftwares] = useState([]) // 所持タスク（担当ソフト）の集計用
  const [tasks, setTasks] = useState([]) // 所持タスク（担当タスク）の集計用
  // 読み込み中かどうか
  const [loading, setLoading] = useState(true)
  // 画面に表示するエラーメッセージ
  const [error, setError] = useState('')
  // フォームに入力中の値
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null) // 編集中のメンバーID（nullなら新規登録）
  // 保存処理中かどうか（二重送信を防ぐために使う）
  const [saving, setSaving] = useState(false)

  // メンバー・ソフト・タスクを取得する
  const fetchData = async () => {
    // 3つのテーブルを同時に取得し、すべて終わるまで待つ
    const [m, s, t] = await Promise.all([
      // メンバーを登録順に取得
      supabase.from('members').select('*').order('created_at'),
      // ソフトは、担当の集計に必要な列だけを取得
      supabase.from('softwares').select('id, name, assignee_id, reviewer_id').order('created_at'),
      // タスクも、担当の集計に必要な列だけを取得
      supabase.from('tasks').select('id, name, assignee_id').order('created_at'),
    ])
    // どれかでエラーがあった場合
    if (m.error || s.error || t.error) {
      // エラーメッセージを表示する
      setError('データの取得に失敗しました：' + (m.error ?? s.error ?? t.error).message)
    // 成功した場合
    } else {
      // 取得したメンバーを保存
      setMembers(m.data)
      // 取得したソフトを保存
      setSoftwares(s.data)
      // 取得したタスクを保存
      setTasks(t.data)
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

  // 登録（INSERT）または更新（UPDATE）
  const handleSubmit = async (e) => {
    // フォーム送信によるページの再読み込みを止める
    e.preventDefault()
    // 前回のエラーを消す
    setError('')
    // 保存中にする
    setSaving(true)

    // 保存する値（負荷は文字列から数値に変換。変換できなければ0）
    const values = { name: form.name, role: form.role, load: Number(form.load) || 0 }
    // 編集中なら該当のメンバーを更新し、そうでなければ新規登録する
    const { error } = editingId
      ? await supabase.from('members').update(values).eq('id', editingId)
      : await supabase.from('members').insert(values)

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

  // 編集開始：選択したメンバーの値をフォームに反映
  const handleEdit = (m) => {
    // 編集中のメンバーIDを記録する（これで登録ではなく更新になる）
    setEditingId(m.id)
    // メンバーの値をフォームに入れる（負荷は入力欄用に文字列へ変換）
    setForm({ name: m.name, role: m.role, load: String(m.load) })
    // 画面の一番上（フォームの位置）へ滑らかにスクロールする
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）：担当していたソフトの担当欄は空になる
  const handleDelete = async (m) => {
    // 確認ダイアログで「キャンセル」されたら何もしない
    if (!window.confirm(`「${m.name}」を削除しますか？`)) return
    // 前回のエラーを消す
    setError('')
    // 該当のIDのメンバーを削除する
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    // 削除に失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('削除に失敗しました：' + error.message)
      // ここで処理を終える
      return
    }
    // 編集中のメンバーを削除した場合はフォームも初期化
    if (editingId === m.id) resetForm()
    // 最新の一覧を取得し直す
    fetchData()
  }

  // フォームを初期状態（新規登録モード・空欄）に戻す
  const resetForm = () => {
    // 編集中のIDを空にする（新規登録モードに戻る）
    setEditingId(null)
    // 入力欄を初期値に戻す
    setForm(emptyForm)
  }

  // 編集中のメンバーと、その担当ソフト
  // 編集中のメンバー（新規登録モードなら undefined）
  const editing = members.find((m) => m.id === editingId)
  // 編集中のメンバーの担当ソフト（新規登録モードなら空の配列）
  const editingSoftwares = editing ? assignedSoftwares(editing, softwares) : []
  // 編集中のメンバーの担当タスク（新規登録モードなら空の配列）
  const editingTasks = editing ? assignedTasks(editing, tasks) : []

  // 画面に表示する内容
  return (
    // 画面全体の外枠
    <div className="container">
      {/* 上部のタイトルと画面切り替えボタン */}
      <PageHeader title="メンバー一覧" />

      {/* フォームの見出し（編集中かどうかで切り替える） */}
      <h2 className="form-title">{editing ? `メンバーを編集：${editing.name}` : 'メンバーを登録'}</h2>
      {/* 登録・編集フォーム（送信されたら handleSubmit を実行） */}
      <form className="edit-form" onSubmit={handleSubmit}>
        {/* 入力欄を横に並べるエリア */}
        <div className="form-row">
          <label>
            メンバー名
            {/* name属性が、handleChangeで更新するフォームの項目名と対応する（required：必須） */}
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            役職
            {/* 役職の入力欄 */}
            <input name="role" value={form.role} onChange={handleChange} />
          </label>
          {/* 負荷とタスク数は編集時のみ表示 */}
          {editing && (
            <>
              <label>
                負荷（％）
                {/* 数値のみ・0以上の入力に制限する */}
                <input name="load" type="number" min="0" value={form.load} onChange={handleChange} />
              </label>
              <label>
                タスク数
                {/* 担当ソフトと担当タスクの合計数を表示するだけ（readOnly：入力できない） */}
                <input value={editingSoftwares.length + editingTasks.length} readOnly className="readonly" />
              </label>
            </>
          )}
        </div>

        {/* 担当業務（ソフトの担当・調査と、担当タスク。割り当てはソフト・タスクの画面で行う） */}
        {editing && (
          <div className="sub-section">
            {/* エリアの見出し */}
            <span className="sub-label">担当業務（ソフト登録/編集・タスク登録/編集の画面で割り当て）</span>
            {/* 担当ソフトも担当タスクも0件ならメッセージ、あれば一覧を表示 */}
            {editingSoftwares.length + editingTasks.length === 0 ? (
              <p className="muted">担当しているソフト・タスクはありません。</p>
            ) : (
              // 箇条書きの一覧
              <ul className="task-list">
                {/* 担当ソフトの数だけ行を作る */}
                {editingSoftwares.map((s) => (
                  <li key={s.id}>
                    {/* ソフト名と、担当か調査かの区別 */}
                    ソフト：{s.name}（{s.assignee_id === editing.id ? '担当' : '調査'}）
                  </li>
                ))}
                {/* 担当タスクの数だけ行を作る */}
                {editingTasks.map((t) => (
                  <li key={t.id}>
                    {/* タスク名 */}
                    タスク：{t.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
      ) : members.length === 0 ? (
        <p className="center">メンバーがまだ登録されていません。</p>
      ) : (
        // カードを格子状に並べる
        <div className="card-grid">
          {/* メンバーの数だけカードを作る */}
          {members.map((m) => (
            // 編集中のカードには selected クラスを付けて枠を強調
            <div className={'card' + (m.id === editingId ? ' selected' : '')} key={m.id}>
              {/* メンバー名 */}
              <p className="card-title">{m.name}</p>
              {/* 役職（未入力なら「-」） */}
              <p>役職：{m.role || '-'}</p>
              {/* 担当・調査しているソフトの数 ＋ 担当しているタスクの数 */}
              <p>所持タスク：{taskCount(m, softwares, tasks)}</p>
              {/* 負荷（100％超は赤） */}
              <p className={m.load > 100 ? 'overload' : ''}>負荷：{m.load}％</p>
              {/* 負荷の横棒 */}
              <ProgressBar value={m.load} warnOver100 />
              {/* 編集・削除ボタンのエリア */}
              <div className="card-actions">
                {/* 編集：このメンバーをフォームに読み込む */}
                <button className="secondary" onClick={() => handleEdit(m)}>編集</button>
                {/* 削除：このメンバーを削除する */}
                <button className="danger" onClick={() => handleDelete(m)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
