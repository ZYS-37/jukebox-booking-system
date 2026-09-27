export const slotStyles = {
  mine: 'bg-primary border-2 border-navy cursor-pointer hover:opacity-80',
  band: 'bg-pink border border-pinkDark cursor-pointer hover:opacity-80',
  individualPrimary: 'bg-primarySoft border border-primary cursor-pointer hover:opacity-80',
  individualExtra: 'bg-cream border border-primary cursor-pointer hover:opacity-80',
  available: 'bg-white border border-beige cursor-pointer hover:bg-primarySoft hover:border-primary',
  unavailable: 'bg-beige border border-beigeDark opacity-40 cursor-not-allowed',
}

export const legendItems = [
  { style: slotStyles.mine, label: 'My booking' },
  { style: slotStyles.band, label: 'Band' },
  { style: slotStyles.individualPrimary, label: 'Individual (primary)' },
  { style: slotStyles.individualExtra, label: 'Individual (extra)' },
  { style: slotStyles.available, label: 'Available' },
  { style: slotStyles.unavailable, label: 'Unavailable' },
]

export const TIME_SLOTS = [
  { label: '7:00am', value: '07:00' },
  { label: '9:00am', value: '09:00' },
  { label: '11:00am', value: '11:00' },
  { label: '1:00pm', value: '13:00' },
  { label: '3:00pm', value: '15:00' },
  { label: '5:00pm', value: '17:00' },
  { label: '7:00pm', value: '19:00' },
  { label: '9:00pm', value: '21:00' },
]

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const TIMES = ['7am', '9am', '11am', '1pm', '3pm', '5pm', '7pm', '9pm']
export const TIME_VALS = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']

export const biddingSlotStyles = {
  available: 'bg-[#d4edda] border border-[#a8d5b5] cursor-pointer hover:opacity-70',
  low: 'bg-[#FFF9C4] border border-[#F5C842] cursor-pointer hover:opacity-70',
  med: 'bg-[#FFE0B2] border border-[#FF9800] cursor-pointer hover:opacity-70',
  high: 'bg-[#FFCDD2] border border-[#E57373] cursor-pointer hover:opacity-70',
  blocked: 'bg-[#333333] border border-[#222222] cursor-not-allowed',
  confirmed: 'bg-[#d4edda] border-2 border-[#2e7d32] cursor-pointer hover:opacity-70',
}

export const biddingLegendItems = [
  { bg: '#d4edda', border: '#a8d5b5', label: 'Available' },
  { bg: '#FFF9C4', border: '#F5C842', label: 'Low (1–2pts)' },
  { bg: '#FFE0B2', border: '#FF9800', label: 'Med (3-4pts)' },
  { bg: '#FFCDD2', border: '#E57373', label: 'High (5+pts)' },
  { bg: '#333', border: '#222', label: 'Blocked' },
]
export function getBiddingSlotStyle(totalPts, isBlocked, isConfirmed, isMyBid) {
  let base
  if (isBlocked) base = biddingSlotStyles.blocked
  else if (isConfirmed) base = biddingSlotStyles.confirmed
  else if (totalPts === 0) base = biddingSlotStyles.available
  else if (totalPts <= 2) base = biddingSlotStyles.low
  else if (totalPts <= 4) base = biddingSlotStyles.med
  else base = biddingSlotStyles.high
  return isMyBid ? base + ' border-2 border-navy' : base
}

export function getDemandLabel(totalPts, isBlocked, isConfirmed) {
  if (isBlocked) return { label: 'Blocked by admin', bg: '#333', color: '#fff' }
  if (isConfirmed) return { label: 'Already confirmed', bg: '#d4edda', color: '#155724' }
  if (totalPts === 0) return { label: 'No competition!', bg: '#d4edda', color: '#155724' }
  if (totalPts <= 4) return { label: `Low demand (${totalPts}pts)`, bg: '#FFF9C4', color: '#09122C' }
  if (totalPts <= 8) return { label: `Medium demand (${totalPts}pts)`, bg: '#FFE0B2', color: '#09122C' }
  return { label: `High demand (${totalPts}pts)`, bg: '#FFCDD2', color: '#09122C' }
}