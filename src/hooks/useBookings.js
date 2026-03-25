import { useApp } from '../context/AppContext'

export function useBookings() {
  const { bookings, addBooking } = useApp()
  return { bookings, addBooking }
}
