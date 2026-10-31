// 入力値などの状態を保持するための部品
import { useState } from 'react'
// 画面内リンク（Link）と、プログラムから画面を移動する関数（useNavigate）
import { Link, useNavigate } from 'react-router-dom'
// Supabaseに接続するためのクライアント
import { supabase } from '../lib/supabase'

// ログイン画面
export default function Login() {
  // 画面移動用の関数
  const navigate = useNavigate()
  // 入力されたメールアドレス
  const [email, setEmail] = useState('')
  // 入力されたパスワード
  const [password, setPassword] = useState('')
  // 画面に表示するエラーメッセージ（空なら非表示）
  const [error, setError] = useState('')
  // 送信中かどうか（二重送信を防ぐために使う）
  const [submitting, setSubmitting] = useState(false)

  // ログインボタンが押されたときの処理（async：通信の完了を await で待てる関数）
  const handleSubmit = async (e) => {
    // フォーム送信によるページの再読み込みを止める
    e.preventDefault()
    // 前回のエラーを消す
    setError('')
    // 送信中にする
    setSubmitting(true)

    // Supabaseにメールアドレスとパスワードを送ってログインする（結果が返るまで待つ）
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // 送信が終わったので、送信中を解除
    setSubmitting(false)
    // ログインに失敗した場合
    if (error) {
      // エラーメッセージを表示して
      setError('ログインに失敗しました：' + error.message)
      // ここで処理を終える
      return
    }
    // ログイン成功後はダッシュボードへ
    navigate('/')
  }

  // 画面に表示する内容
  return (
    // 画面全体の中央に配置するための外枠
    <div className="auth-wrap">
      {/* 送信されたら handleSubmit を実行するフォーム */}
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* 見出し */}
        <h1>ログイン</h1>
        {/* 項目名と入力欄をひとまとめにする */}
        <label>
          メールアドレス
          {/* 入力のたびに email を更新する（required：未入力では送信できない） */}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          パスワード
          {/* 入力のたびに password を更新する（type="password"：文字が伏せ字になる） */}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {/* エラーがあるときだけ、エラー表示にする */}
        {error && <p className="error">{error}</p>}
        {/* 送信ボタン（送信中は押せなくする） */}
        <button type="submit" disabled={submitting}>
          {/* 送信中は「ログイン中...」、それ以外は「ログイン」と表示 */}
          {submitting ? 'ログイン中...' : 'ログイン'}
        </button>
        <p>
          {/* 会員登録画面へのリンク（ページを再読み込みせずに移動する） */}
          アカウントをお持ちでない方は <Link to="/signup">会員登録</Link>
        </p>
      </form>
    </div>
  )
}
