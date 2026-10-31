// 入力値などの状態を保持するための部品
import { useState } from 'react'
// 画面内リンク（Link）と、プログラムから画面を移動する関数（useNavigate）
import { Link, useNavigate } from 'react-router-dom'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'

// 会員登録画面
export default function Signup() {
  // 画面移動用の関数
  const navigate = useNavigate()
  // 入力されたメールアドレス
  const [email, setEmail] = useState('')
  // 入力されたパスワード
  const [password, setPassword] = useState('')
  // 画面に表示するエラーメッセージ（空なら非表示）
  const [error, setError] = useState('')
  // 画面に表示する案内メッセージ（確認メール送信のお知らせなど）
  const [message, setMessage] = useState('')
  // 送信中かどうか（二重送信を防ぐために使う）
  const [submitting, setSubmitting] = useState(false)

  // 会員登録ボタンが押されたときの処理
  const handleSubmit = async (e) => {
    // フォーム送信によるページの再読み込みを止める
    e.preventDefault()
    // 前回のエラーを消す
    setError('')
    // 前回の案内を消す
    setMessage('')
    // 送信中にする
    setSubmitting(true)

    // Supabaseにメールアドレスとパスワードを送って会員登録する
    const { data, error } = await supabase.auth.signUp({ email, password })

    // 送信が終わったので、送信中を解除
    setSubmitting(false)
    // 会員登録に失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('会員登録に失敗しました：' + error.message)
      // ここで処理を終える
      return
    }

    // 登録と同時にログイン状態（セッション）が返ってきた場合
    if (data.session) {
      // メール確認が無効の場合はそのままログイン状態になる
      navigate('/')
    // セッションが返ってこなかった場合
    } else {
      // メール確認が有効の場合は確認メールの案内を表示
      setMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。')
    }
  }

  // 画面に表示する内容
  return (
    // 画面全体の中央に配置するための外枠
    <div className="auth-wrap">
      {/* 送信されたら handleSubmit を実行するフォーム */}
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* 見出し */}
        <h1>会員登録</h1>
        {/* 項目名と入力欄をひとまとめにする */}
        <label>
          メールアドレス
          {/* 入力のたびに email を更新する（required：未入力では送信できない） */}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          パスワード（6文字以上）
          {/* パスワードの入力欄（属性が多いので複数行に分けて書いている） */}
          <input
            // 文字を伏せ字にする
            type="password"
            // 表示する値は password の状態
            value={password}
            // 入力のたびに password を更新する
            onChange={(e) => setPassword(e.target.value)}
            // 6文字未満では送信できない
            minLength={6}
            // 未入力では送信できない
            required
          />
        </label>
        {/* エラーがあるときだけ、エラー表示にする */}
        {error && <p className="error">{error}</p>}
        {/* 案内があるときだけ、成功表示（緑）にする */}
        {message && <p className="success">{message}</p>}
        {/* 送信ボタン（送信中は押せなくする） */}
        <button type="submit" disabled={submitting}>
          {/* 送信中は「登録中...」、それ以外は「会員登録」と表示 */}
          {submitting ? '登録中...' : '会員登録'}
        </button>
        <p>
          {/* ログイン画面へのリンク（ページを再読み込みせずに移動する） */}
          すでにアカウントをお持ちの方は <Link to="/login">ログイン</Link>
        </p>
      </form>
    </div>
  )
}
