// 画面表示時の処理（useEffect）と、状態の保持（useState）
import { useEffect, useState } from 'react'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'
// 上部のタイトル・画面切り替えボタン
import PageHeader from '../components/PageHeader'
// 進捗の横棒
import ProgressBar from '../components/ProgressBar'
// 表示用の関数：日付の整形、メンバー名の取得
import { formatDate, memberName } from '../lib/phases'

// フォームの初期値
const emptyForm = { name: '', start_date: '', end_date: '', assignee_id: '', progress: '0', description: '' }

// タスク一覧画面（一覧表示・登録・編集・削除）
export default function Tasks() {
  // タスクの一覧
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([]) // 担当の選択肢・表示用
  // 読み込み中かどうか
  const [loading, setLoading] = useState(true)
  // 画面に表示するエラーメッセージ
  const [error, setError] = useState('')
  // フォームに入力中の値
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null) // 編集中のタスクID（nullなら新規登録）
  // 保存処理中かどうか（二重送信を防ぐために使う）
  const [saving, setSaving] = useState(false)

  // タスクとメンバーを取得する
  const fetchData = async () => {
    // 2つのテーブルを同時に取得し、両方終わるまで待つ
    const [t, m] = await Promise.all([
      // タスクを登録順に取得
      supabase.from('tasks').select('*').order('created_at'),
      // メンバーは、選択肢に必要なIDと名前だけ取得
      supabase.from('members').select('id, name').order('created_at'),
    ])
    // どちらかでエラーがあればそれを取り出す
    const err = t.error ?? m.error
    // エラーがあった場合
    if (err) {
      // エラーメッセージを表示する
      setError('データの取得に失敗しました：' + err.message)
    // 成功した場合
    } else {
      // 取得したタスクを保存
      setTasks(t.data)
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

  // 登録（INSERT）または更新（UPDATE）
  const handleSubmit = async (e) => {
    // フォーム送信によるページの再読み込みを止める
    e.preventDefault()
    // 前回のエラーを消す
    setError('')
    // 保存中にする
    setSaving(true)

    // 保存する値（空の日付・担当はnull、進捗は0〜100の数値に収める）
    const values = {
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      assignee_id: form.assignee_id || null,
      progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
      description: form.description,
    }
    // 編集中なら該当のタスクを更新し、そうでなければ新規登録する
    const { error } = editingId
      ? await supabase.from('tasks').update(values).eq('id', editingId)
      : await supabase.from('tasks').insert(values)

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

  // 編集開始：選択したタスクの値をフォームに反映
  const handleEdit = (t) => {
    // 編集中のタスクIDを記録する（これで登録ではなく更新になる）
    setEditingId(t.id)
    // タスクの値をフォームに入れる（空の値は空文字、進捗は文字列にする）
    setForm({
      name: t.name,
      start_date: t.start_date ?? '',
      end_date: t.end_date ?? '',
      assignee_id: t.assignee_id ?? '',
      progress: String(t.progress),
      description: t.description ?? '',
    })
    // 画面の一番上（フォームの位置）へ滑らかにスクロールする
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）
  const handleDelete = async (t) => {
    // 確認ダイアログで「キャンセル」されたら何もしない
    if (!window.confirm(`「${t.name}」を削除しますか？`)) return
    // 前回のエラーを消す
    setError('')
    // 該当のIDのタスクを削除する
    const { error } = await supabase.from('tasks').delete().eq('id', t.id)
    // 削除に失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('削除に失敗しました：' + error.message)
      // ここで処理を終える
      return
    }
    // 編集中のタスクを削除した場合はフォームも初期化
    if (editingId === t.id) resetForm()
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

  // 編集中のタスク（新規登録モードなら undefined）
  const editing = tasks.find((t) => t.id === editingId)

  // 画面に表示する内容
  return (
    // 画面全体の外枠
    <div className="container">
      {/* 上部のタイトルと画面切り替えボタン */}
      <PageHeader title="タスク一覧" />

      {/* フォームの見出し（編集中かどうかで切り替える） */}
      <h2 className="form-title">{editing ? `タスクを編集：${editing.name}` : 'タスクを登録'}</h2>
      {/* 登録・編集フォーム（送信されたら handleSubmit を実行） */}
      <form className="edit-form" onSubmit={handleSubmit}>
        {/* 入力欄を横に並べるエリア */}
        <div className="form-row">
          <label>
            タスク名
            {/* タスク名の入力欄（required：必須） */}
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            開始日
            {/* カレンダーから日付を選べる入力欄 */}
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </label>
          <label>
            終了予定日
            {/* 終了予定日の入力欄 */}
            <input name="end_date" type="date" value={form.end_date} onChange={handleChange} />
          </label>
          <label>
            担当
            {/* 担当メンバーを選ぶプルダウン */}
            <select name="assignee_id" value={form.assignee_id} onChange={handleChange}>
              {/* 未設定の選択肢 */}
              <option value="">未設定</option>
              {/* メンバーの数だけ選択肢を作る（値はID、表示は名前） */}
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          {/* 進捗は編集時のみ表示（新規登録時は0％） */}
          {editing && (
            <label>
              進捗（％）
              {/* 0〜100の数値の入力欄 */}
              <input name="progress" type="number" min="0" max="100" value={form.progress} onChange={handleChange} />
            </label>
          )}
        </div>

        {/* タスク内容は編集時のみ表示 */}
        {editing && (
          <label className="textarea-label">
            タスク内容
            {/* 複数行の入力欄（rows：表示する行数の目安） */}
            <textarea name="description" rows={4} value={form.description} onChange={handleChange} />
          </label>
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
      ) : tasks.length === 0 ? (
        <p className="center">タスクがまだ登録されていません。</p>
      ) : (
        // カードを格子状に並べる
        <div className="card-grid">
          {/* タスクの数だけカードを作る */}
          {tasks.map((t) => (
            // 編集中のカードには selected クラスを付けて枠を強調
            <div className={'card' + (t.id === editingId ? ' selected' : '')} key={t.id}>
              {/* タスク名 */}
              <p className="card-title">{t.name}</p>
              {/* 担当メンバー名（未設定なら「-」） */}
              <p>担当：{memberName(t.assignee_id, members)}</p>
              {/* 開始日 */}
              <p>開始日：{formatDate(t.start_date)}</p>
              {/* 終了予定日 */}
              <p>終了予定日：{formatDate(t.end_date)}</p>
              {/* 進捗 */}
              <p>進捗：{t.progress}%</p>
              {/* 進捗の横棒 */}
              <ProgressBar value={t.progress} />
              {/* 編集・削除ボタンのエリア */}
              <div className="card-actions">
                {/* 編集：このタスクをフォームに読み込む */}
                <button className="secondary" onClick={() => handleEdit(t)}>編集</button>
                {/* 削除：このタスクを削除する */}
                <button className="danger" onClick={() => handleDelete(t)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
