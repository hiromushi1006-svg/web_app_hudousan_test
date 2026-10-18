import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../AuthContext'

// フォームの初期値
const emptyForm = { name: '', rent: '', area: '', layout: '' }

export default function Properties() {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null) // 編集中の物件ID（nullなら新規登録）
  const [saving, setSaving] = useState(false)

  // 一覧取得（SELECT）：RLSにより自分の物件のみ返る
  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError('物件の取得に失敗しました：' + error.message)
    } else {
      setProperties(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // 登録（INSERT）または更新（UPDATE）
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const values = {
      name: form.name,
      rent: Number(form.rent),
      area: form.area,
      layout: form.layout,
    }

    const { error } = editingId
      ? await supabase.from('properties').update(values).eq('id', editingId)
      : await supabase.from('properties').insert({ ...values, user_id: user.id })

    setSaving(false)
    if (error) {
      setError('保存に失敗しました：' + error.message)
      return
    }

    resetForm()
    fetchProperties()
  }

  // 編集開始：選択した物件の値をフォームに反映
  const handleEdit = (p) => {
    setEditingId(p.id)
    setForm({ name: p.name, rent: String(p.rent), area: p.area, layout: p.layout })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）
  const handleDelete = async (p) => {
    if (!window.confirm(`「${p.name}」を削除しますか？`)) return
    setError('')

    const { error } = await supabase.from('properties').delete().eq('id', p.id)
    if (error) {
      setError('削除に失敗しました：' + error.message)
      return
    }
    // 編集中の物件を削除した場合はフォームも初期化
    if (editingId === p.id) resetForm()
    fetchProperties()
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  // ログアウト処理（セッション破棄後、ProtectedRouteが自動でログイン画面へ遷移）
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="container">
      <header className="header">
        <h1>物件一覧</h1>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout}>ログアウト</button>
        </div>
      </header>

      <form className="property-form" onSubmit={handleSubmit}>
        <h2>{editingId ? '物件を編集' : '物件を登録'}</h2>
        <div className="form-row">
          <label>
            物件名
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            家賃（円）
            <input name="rent" type="number" min="0" value={form.rent} onChange={handleChange} required />
          </label>
          <label>
            エリア
            <input name="area" value={form.area} onChange={handleChange} required />
          </label>
          <label>
            間取り（例：1LDK）
            <input name="layout" value={form.layout} onChange={handleChange} required />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? '保存中...' : editingId ? '更新する' : '登録する'}
          </button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              キャンセル
            </button>
          )}
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="center">読み込み中...</p>
      ) : properties.length === 0 ? (
        <p className="center">物件がまだ登録されていません。</p>
      ) : (
        <div className="card-grid">
          {properties.map((p) => (
            <div className="card" key={p.id}>
              <h2>{p.name}</h2>
              <p className="rent">¥{p.rent.toLocaleString()} / 月</p>
              <p className="area">
                {p.area}・{p.layout}
              </p>
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
