import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import ProgressBar from '../components/ProgressBar'
import { assignedSoftwares } from '../lib/phases'

// フォームの初期値
const emptyForm = { name: '', role: '', load: '0' }

// メンバー一覧画面（一覧表示・登録・編集・削除）
export default function Members() {
  const [members, setMembers] = useState([])
  const [softwares, setSoftwares] = useState([]) // 所持タスク（担当ソフト）の集計用
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null) // 編集中のメンバーID（nullなら新規登録）
  const [saving, setSaving] = useState(false)

  // メンバーとソフトを取得する
  const fetchData = async () => {
    const [m, s] = await Promise.all([
      supabase.from('members').select('*').order('created_at'),
      supabase.from('softwares').select('id, name, assignee_id, reviewer_id').order('created_at'),
    ])
    if (m.error || s.error) {
      setError('データの取得に失敗しました：' + (m.error ?? s.error).message)
    } else {
      setMembers(m.data)
      setSoftwares(s.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // 登録（INSERT）または更新（UPDATE）
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const values = { name: form.name, role: form.role, load: Number(form.load) || 0 }
    const { error } = editingId
      ? await supabase.from('members').update(values).eq('id', editingId)
      : await supabase.from('members').insert(values)

    setSaving(false)
    if (error) {
      setError('保存に失敗しました：' + error.message)
      return
    }
    resetForm()
    fetchData()
  }

  // 編集開始：選択したメンバーの値をフォームに反映
  const handleEdit = (m) => {
    setEditingId(m.id)
    setForm({ name: m.name, role: m.role, load: String(m.load) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）：担当していたソフトの担当欄は空になる
  const handleDelete = async (m) => {
    if (!window.confirm(`「${m.name}」を削除しますか？`)) return
    setError('')
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    if (error) {
      setError('削除に失敗しました：' + error.message)
      return
    }
    if (editingId === m.id) resetForm()
    fetchData()
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  // 編集中のメンバーと、その担当ソフト
  const editing = members.find((m) => m.id === editingId)
  const editingTasks = editing ? assignedSoftwares(editing, softwares) : []

  return (
    <div className="container">
      <PageHeader title="メンバー一覧" />

      <h2 className="form-title">{editing ? `メンバーを編集：${editing.name}` : 'メンバーを登録'}</h2>
      <form className="edit-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            メンバー名
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            役職
            <input name="role" value={form.role} onChange={handleChange} />
          </label>
          {/* 負荷とタスク数は編集時のみ表示 */}
          {editing && (
            <>
              <label>
                負荷（％）
                <input name="load" type="number" min="0" value={form.load} onChange={handleChange} />
              </label>
              <label>
                タスク数
                <input value={editingTasks.length} readOnly className="readonly" />
              </label>
            </>
          )}
        </div>

        {/* 担当業務（担当メンバー・調査に設定されているソフト。割り当てはソフト画面で行う） */}
        {editing && (
          <div className="sub-section">
            <span className="sub-label">担当業務（ソフト登録/編集の画面で割り当て）</span>
            {editingTasks.length === 0 ? (
              <p className="muted">担当しているソフトはありません。</p>
            ) : (
              <ul className="task-list">
                {editingTasks.map((s) => (
                  <li key={s.id}>
                    {s.name}（{s.assignee_id === editing.id ? '担当' : '調査'}）
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? '保存中...' : editing ? '更新する' : '登録する'}
          </button>
          {editing && (
            <button type="button" className="secondary" onClick={resetForm}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="center">読み込み中...</p>
      ) : members.length === 0 ? (
        <p className="center">メンバーがまだ登録されていません。</p>
      ) : (
        <div className="card-grid">
          {members.map((m) => (
            <div className={'card' + (m.id === editingId ? ' selected' : '')} key={m.id}>
              <p className="card-title">{m.name}</p>
              <p>役職：{m.role || '-'}</p>
              <p>所持タスク：{assignedSoftwares(m, softwares).length}</p>
              <p className={m.load > 100 ? 'overload' : ''}>負荷：{m.load}％</p>
              <ProgressBar value={m.load} warnOver100 />
              <div className="card-actions">
                <button className="secondary" onClick={() => handleEdit(m)}>編集</button>
                <button className="danger" onClick={() => handleDelete(m)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
