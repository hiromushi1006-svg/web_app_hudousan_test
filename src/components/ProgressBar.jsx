// 進捗率・負荷を表す横棒（value：％、100％を超えた分は棒を満タンにして警告色にする）
export default function ProgressBar({ value, warnOver100 = false }) {
  const over = warnOver100 && value > 100
  return (
    <div className="progress">
      <div className={'progress-fill' + (over ? ' over' : '')} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
