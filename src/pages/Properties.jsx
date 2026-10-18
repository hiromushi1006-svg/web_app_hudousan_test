import { supabase } from '../lib/supabase'
import { useAuth } from '../AuthContext'

// ダミーの物件データ
const properties = [
  { id: 1, name: 'グランドメゾン渋谷', rent: 128000, area: '東京都渋谷区' },
  { id: 2, name: 'サンライズ新宿', rent: 95000, area: '東京都新宿区' },
  { id: 3, name: 'パークハイツ横浜', rent: 82000, area: '神奈川県横浜市' },
  { id: 4, name: 'リバーサイド大阪', rent: 74000, area: '大阪府大阪市' },
  { id: 5, name: 'コーポ名古屋駅前', rent: 68000, area: '愛知県名古屋市' },
  { id: 6, name: 'シティタワー福岡', rent: 79000, area: '福岡県福岡市' },
]

export default function Properties() {
  const { user } = useAuth()

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

      <div className="card-grid">
        {properties.map((p) => (
          <div className="card" key={p.id}>
            <h2>{p.name}</h2>
            <p className="rent">¥{p.rent.toLocaleString()} / 月</p>
            <p className="area">{p.area}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
