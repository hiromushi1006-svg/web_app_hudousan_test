import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import SoftwareCard from '../components/SoftwareCard'
import { PHASES, currentPhase } from '../lib/phases'

// フォームの初期値
const emptyForm = {
  name: '', project_id: '', scale: '', due_date: '',
  start_date: '', planned_end_date: '', assignee_id: '', reviewer_id: '',
}

// 7工程分の空の入力欄を作る
const emptyPhases = () =>
  PHASES.map((p) => ({ phase_no: p.no, plan_start: '', plan_end: '', actual_start: '', actual_end: '', progress: '0' }))

// ソフト一覧画面（一覧表示・登録・編集・削除）
export default function Softwares() {
  const [softwares, setSoftwares] = useState([])
  const [projects, setProjects] = useState([]) // 対象プロジェクトの選択肢
  const [members, setMembers] = useState([]) // 担当メンバー・調査の選択肢
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [phaseForm, setPhaseForm] = useState(emptyPhases) // 工程の入力値（編集時のみ使用）
  const [editingId, setEditingId] = useState(null) // 編集中のソフトID（nullなら新規登録）
  const [saving, setSaving] = useState(false)

  // ソフト（工程付き）・プロジェクト・メンバーを取得する
  const fetchData = async () => {
    const [s, p, m] = await Promise.all([
      supabase.from('softwares').select('*, phases(*)').order('created_at'),
      supabase.from('projects').select('id, name').order('created_at'),
      supabase.from('members').select('id, name').order('created_at'),
    ])
    const err = s.error ?? p.error ?? m.error
    if (err) {
      setError('データの取得に失敗しました：' + err.message)
    } else {
      setSoftwares(s.data)
      setProjects(p.data)
      setMembers(m.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // 工程の入力欄が変わったとき（index番目の工程の field を更新）
  const handlePhaseChange = (index, field, value) => {
    setPhaseForm(phaseForm.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  // 登録（INSERT）または更新（UPDATE）
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const result = editingId ? await updateSoftware() : await insertSoftware()
    setSaving(false)

    if (result.error) {
      setError('保存に失敗しました：' + result.error.message)
      return
    }
    resetForm()
    fetchData()
  }

  // 新規登録：ソフトを登録し、続けて7工程分の空の行を作る
  const insertSoftware = async () => {
    const { data, error } = await supabase
      .from('softwares')
      .insert({
        name: form.name,
        project_id: form.project_id,
        scale: form.scale === '' ? null : Number(form.scale),
        due_date: form.due_date || null,
      })
      .select()
      .single()
    if (error) return { error }

    return supabase.from('phases').insert(PHASES.map((p) => ({ software_id: data.id, phase_no: p.no })))
  }

  // 更新：ソフトの情報と7工程の予定・実績・進捗を保存する
  const updateSoftware = async () => {
    const { error } = await supabase
      .from('softwares')
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
      .eq('id', editingId)
    if (error) return { error }

    // 工程は「ソフトID＋工程番号」が同じ行があれば更新、なければ登録する（upsert）
    const rows = phaseForm.map((p) => ({
      software_id: editingId,
      phase_no: p.phase_no,
      plan_start: p.plan_start || null,
      plan_end: p.plan_end || null,
      actual_start: p.actual_start || null,
      actual_end: p.actual_end || null,
      progress: Math.min(100, Math.max(0, Number(p.progress) || 0)),
    }))
    return supabase.from('phases').upsert(rows, { onConflict: 'software_id,phase_no' })
  }

  // 編集開始：選択したソフトと工程の値をフォームに反映
  const handleEdit = (s) => {
    setEditingId(s.id)
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
      emptyPhases().map((empty) => {
        const saved = s.phases.find((p) => p.phase_no === empty.phase_no)
        if (!saved) return empty
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 削除（DELETE）：工程もまとめて削除される
  const handleDelete = async (s) => {
    if (!window.confirm(`「${s.name}」を削除しますか？`)) return
    setError('')
    const { error } = await supabase.from('softwares').delete().eq('id', s.id)
    if (error) {
      setError('削除に失敗しました：' + error.message)
      return
    }
    if (editingId === s.id) resetForm()
    fetchData()
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setPhaseForm(emptyPhases())
  }

  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? '-'
  const editing = softwares.find((s) => s.id === editingId)

  return (
    <div className="container">
      <PageHeader title="ソフト一覧" />

      <h2 className="form-title">{editing ? `ソフトを編集：${editing.name}` : 'ソフトを登録'}</h2>
      <form className="edit-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            ソフト名
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            対象プロジェクト
            <select name="project_id" value={form.project_id} onChange={handleChange} required>
              <option value="">選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            開発規模
            <input name="scale" type="number" min="0" value={form.scale} onChange={handleChange} />
          </label>
          <label>
            納期
            <input name="due_date" type="date" value={form.due_date} onChange={handleChange} />
          </label>
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

        {editing && (
          <>
            <div className="form-row">
              <label>
                担当メンバー
                <select name="assignee_id" value={form.assignee_id} onChange={handleChange}>
                  <option value="">未設定</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                調査
                <select name="reviewer_id" value={form.reviewer_id} onChange={handleChange}>
                  <option value="">未設定</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                現在の工程（自動判定）
                <input value={currentPhase(phaseForm.map((p) => ({ ...p, progress: Number(p.progress) })))} readOnly className="readonly" />
              </label>
            </div>

            {/* 7工程の予定・実績・進捗 */}
            <div className="sub-section">
              <span className="sub-label">工程</span>
              <div className="phase-table-wrap">
                <table className="phase-table">
                  <thead>
                    <tr>
                      <th>工程</th><th>予定開始日</th><th>予定終了日</th>
                      <th>実績開始日</th><th>実績終了日</th><th>工程進捗（％）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseForm.map((p, i) => (
                      <tr key={p.phase_no}>
                        <td className="phase-name" style={{ background: PHASES[i].color }}>{PHASES[i].name}</td>
                        {['plan_start', 'plan_end', 'actual_start', 'actual_end'].map((field) => (
                          <td key={field}>
                            <input type="date" value={p[field]} onChange={(e) => handlePhaseChange(i, field, e.target.value)} />
                          </td>
                        ))}
                        <td>
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

        <div className="form-actions">
          {/* プロジェクトが1件もないとソフトを登録できない */}
          <button type="submit" disabled={saving || projects.length === 0}>
            {saving ? '保存中...' : editing ? '更新する' : '登録する'}
          </button>
          {editing && (
            <button type="button" className="secondary" onClick={resetForm}>
              キャンセル
            </button>
          )}
          {projects.length === 0 && !loading && <span className="muted">先にプロジェクトを登録してください。</span>}
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="center">読み込み中...</p>
      ) : softwares.length === 0 ? (
        <p className="center">ソフトがまだ登録されていません。</p>
      ) : (
        <div className="card-grid">
          {softwares.map((s) => (
            <SoftwareCard key={s.id} software={s} projectName={projectName(s.project_id)} members={members} selected={s.id === editingId}>
              <div className="card-actions">
                <button className="secondary" onClick={() => handleEdit(s)}>編集</button>
                <button className="danger" onClick={() => handleDelete(s)}>削除</button>
              </div>
            </SoftwareCard>
          ))}
        </div>
      )}
    </div>
  )
}
