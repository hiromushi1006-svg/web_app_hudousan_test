import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import ProgressBar from '../components/ProgressBar'
import { formatDate, projectProgress, softwareProgress } from '../lib/phases'

// フォームの初期値
const emptyForm = { name: '', start_date: '', delivery_date: '' }

// プロジェクト一覧画面（一覧表示・登録・編集・削除）
export default function Projects() {
  const [projects, setProjects] = useState([])
  const [softwares, setSoftwares] = useState([]) // 進捗・開発ソフト一覧の集計用（工程付き）
  const [members, setMembers] = useState([]) // プロジェクトメンバー一覧の表示用
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null) // 編集中のプロジェクトID（nullなら新規登録）
  const [saving, setSaving] = useState(false)

  // プロジェクト・ソフト（工程付き）・メンバーを取得する
  const fetchData = async () => {
    const [p, s, m] = await Promise.all([
      supabase.from('projects').select('*').order('created_at'),
      supabase.from('softwares').select('*, phases(*)').order('created_at'),
      supabase.from('members').select('*').order('created_at'),
    ])
    const err = p.error ?? s.error ?? m.error
    if (err) {
      setError('データの取得に失敗しました：' + err.message)
    } else {
      setProjects(p.data)
      setSoftwares(s.data)
      setMembers(m.data)
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

    // 日付が空の場合はnullで保存する
    const values = {
      name: form.name,
      start_date: form.start_date || null,
      delivery_date: form.delivery_date || null,
    }
    const { error } = editingId
      ? await supabase.from('projects').update(values).eq('id', editingId)
      : await supabase.from('projects').insert(values)

    setSaving(false)
    if (error) {
      setError('保存に失敗しました：' + error.message)
      return
    }
    resetForm()
    fetchData()
  }

  // 編集開始：選択したプロジェクトの値をフォームに反映
  const handleEdit = (p) => {
    setEditingId(p.id)
    setForm({ name: p.name, start_date: p.start_date ?? '', delivery_date: p.delivery_date ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）：配下のソフトと工程もまとめて削除される
  const handleDelete = async (p) => {
    if (!window.confirm(`「${p.name}」を削除しますか？\n配下のソフトと工程もすべて削除されます。`)) return
    setError('')
    const { error } = await supabase.from('projects').delete().eq('id', p.id)
    if (error) {
      setError('削除に失敗しました：' + error.message)
      return
    }
    if (editingId === p.id) resetForm()
    fetchData()
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  // プロジェクトに属するソフト
  const softwaresOf = (projectId) => softwares.filter((s) => s.project_id === projectId)

  // 編集中のプロジェクトと、そのソフト・メンバー（ソフトの担当または調査に設定されている人）
  const editing = projects.find((p) => p.id === editingId)
  const editingSoftwares = editing ? softwaresOf(editing.id) : []
  const memberIds = new Set(editingSoftwares.flatMap((s) => [s.assignee_id, s.reviewer_id]).filter(Boolean))
  const editingMembers = members.filter((m) => memberIds.has(m.id))

  return (
    <div className="container">
      <PageHeader title="プロジェクト一覧" />

      <h2 className="form-title">{editing ? `プロジェクトを編集：${editing.name}` : 'プロジェクトを登録'}</h2>
      <form className="edit-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            プロジェクト名
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            開始日
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </label>
          <label>
            納入日
            <input name="delivery_date" type="date" value={form.delivery_date} onChange={handleChange} />
          </label>
          {editing && (
            <label>
              進捗（自動計算）
              <input value={`${projectProgress(editingSoftwares)}%`} readOnly className="readonly" />
            </label>
          )}
        </div>

        {editing && (
          <>
            {/* プロジェクトメンバー一覧（ソフト登録/編集の画面で担当・調査に設定した人） */}
            <div className="sub-section">
              <span className="sub-label">プロジェクトメンバー一覧</span>
              {editingMembers.length === 0 ? (
                <p className="muted">ソフトに担当メンバーが設定されていません。</p>
              ) : (
                <table className="list-table">
                  <thead>
                    <tr><th>メンバー</th><th>役職</th><th>負荷</th></tr>
                  </thead>
                  <tbody>
                    {editingMembers.map((m) => (
                      <tr key={m.id}><td>{m.name}</td><td>{m.role}</td><td>{m.load}%</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* プロジェクト開発ソフト一覧 */}
            <div className="sub-section">
              <span className="sub-label">プロジェクト開発ソフト一覧</span>
              {editingSoftwares.length === 0 ? (
                <p className="muted">ソフトがまだ登録されていません。</p>
              ) : (
                <table className="list-table">
                  <thead>
                    <tr><th>ソフト</th><th>規模</th><th>進捗</th></tr>
                  </thead>
                  <tbody>
                    {editingSoftwares.map((s) => (
                      <tr key={s.id}><td>{s.name}</td><td>{s.scale ?? '-'}</td><td>{softwareProgress(s.phases)}%</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
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
      ) : projects.length === 0 ? (
        <p className="center">プロジェクトがまだ登録されていません。</p>
      ) : (
        <div className="card-grid">
          {projects.map((p) => (
            <div className={'card' + (p.id === editingId ? ' selected' : '')} key={p.id}>
              <p className="card-title">{p.name}</p>
              <p>進捗率：{projectProgress(softwaresOf(p.id))}%</p>
              <ProgressBar value={projectProgress(softwaresOf(p.id))} />
              <p>開始日：{formatDate(p.start_date)}</p>
              <p>納入日：{formatDate(p.delivery_date)}</p>
              <div className="card-actions">
                <button className="secondary" onClick={() => handleEdit(p)}>編集</button>
                <button className="danger" onClick={() => handleDelete(p)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
