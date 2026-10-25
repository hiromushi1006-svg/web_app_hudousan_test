import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import SoftwareCard from '../components/SoftwareCard'
import GanttChart from '../components/GanttChart'
import ProgressBar from '../components/ProgressBar'
import { assignedSoftwares, formatDate, projectProgress } from '../lib/phases'

// ダッシュボード：メンバー負荷・プロジェクト進捗・ソフト進捗・ガントチャート
export default function Dashboard() {
  const [members, setMembers] = useState([])
  const [projects, setProjects] = useState([])
  const [softwares, setSoftwares] = useState([])
  const [selectedId, setSelectedId] = useState(null) // 選択中のプロジェクトID
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  // 画面表示時に全データを取得する
  useEffect(() => {
    const fetchData = async () => {
      const [m, p, s] = await Promise.all([
        supabase.from('members').select('*').order('created_at'),
        supabase.from('projects').select('*').order('created_at'),
        supabase.from('softwares').select('*, phases(*)').order('created_at'),
      ])
      const err = m.error ?? p.error ?? s.error
      if (err) {
        setError('データの取得に失敗しました：' + err.message)
      } else {
        setMembers(m.data)
        setProjects(p.data)
        setSoftwares(s.data)
        // 最初のプロジェクトを選択状態にする
        if (p.data.length > 0) setSelectedId(p.data[0].id)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // 現在の日時を1分ごとに更新する
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const softwaresOf = (projectId) => softwares.filter((s) => s.project_id === projectId)
  const selected = projects.find((p) => p.id === selectedId)
  const selectedSoftwares = selected ? softwaresOf(selected.id) : []

  return (
    <div className="container wide">
      <PageHeader title="タスク管理ダッシュボード" />
      <p className="now">
        現在の日付：{now.toLocaleDateString('ja-JP')}　{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="center">読み込み中...</p>
      ) : (
        <>
          {/* メンバー負荷状況 */}
          <section className="panel">
            <h2 className="panel-title">メンバー負荷状況</h2>
            <div className="scroll-row">
              {members.length === 0 && <p className="muted">メンバーが登録されていません。</p>}
              {members.map((m) => (
                <div className="card" key={m.id}>
                  <p className="card-title">{m.name}</p>
                  <p>役職：{m.role || '-'}</p>
                  <p>所持タスク：{assignedSoftwares(m, softwares).length}</p>
                  {/* 負荷が100％を超えたら警告色で表示 */}
                  <p className={m.load > 100 ? 'overload' : ''}>負荷：{m.load}％</p>
                  <ProgressBar value={m.load} warnOver100 />
                </div>
              ))}
            </div>
          </section>

          {/* プロジェクト選択（クリックで下のソフト進捗・ガントチャートを切り替え） */}
          <section className="panel">
            <h2 className="panel-title">プロジェクト選択</h2>
            <div className="scroll-row">
              {projects.length === 0 && <p className="muted">プロジェクトが登録されていません。</p>}
              {projects.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={'card card-button' + (p.id === selectedId ? ' selected' : '')}
                  onClick={() => setSelectedId(p.id)}
                >
                  <p className="card-title">{p.name}</p>
                  <p>進捗率：{projectProgress(softwaresOf(p.id))}%</p>
                  <ProgressBar value={projectProgress(softwaresOf(p.id))} />
                  <p>開始日：{formatDate(p.start_date)}</p>
                  <p>納入日：{formatDate(p.delivery_date)}</p>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <>
              {/* 選択中プロジェクトのソフト進捗状況 */}
              <section className="panel">
                <h2 className="panel-title">「{selected.name}」：ソフト進捗状況</h2>
                <div className="scroll-row">
                  {selectedSoftwares.length === 0 && <p className="muted">ソフトが登録されていません。</p>}
                  {selectedSoftwares.map((s) => (
                    <SoftwareCard key={s.id} software={s} projectName={selected.name} members={members} />
                  ))}
                </div>
              </section>

              {/* ガントチャート */}
              <section className="panel">
                <h2 className="panel-title">ガントチャート：{selected.name}</h2>
                <GanttChart project={selected} softwares={selectedSoftwares} members={members} />
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
