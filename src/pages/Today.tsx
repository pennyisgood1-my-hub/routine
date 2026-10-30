import { DayView } from '../components/DayView'
import { useToday } from '../lib/useToday'

export default function TodayPage() {
  const today = useToday()
  return <DayView date={today} isToday />
}
