import { ITEMS } from './items'
import { EVENTS } from './events'

test('there are exactly 13 items, in spec order, with unique ids', () => {
  expect(ITEMS).toHaveLength(13)
  expect(ITEMS.map((i) => i.label)).toEqual([
    'Tiredness',
    'Rumination',
    'Sadness',
    'Loneliness',
    'Social withdrawal — how much I avoided people',
    'Lack of desire for company',
    'Anhedonia — nothing felt enjoyable',
    'Anxiety',
    'Irritability',
    'Difficulty concentrating',
    'Lack of motivation',
    'Hopelessness',
    'Poor sleep',
  ])
  expect(new Set(ITEMS.map((i) => i.id)).size).toBe(13)
})

test('there are 8 events, four good and four bad', () => {
  expect(EVENTS).toHaveLength(8)
  expect(EVENTS.filter((e) => e.valence === 'bad').map((e) => e.label)).toEqual([
    'Bad sleep', 'Conflict', 'Illness', 'Work stress',
  ])
  expect(EVENTS.filter((e) => e.valence === 'good').map((e) => e.label)).toEqual([
    'Good news', 'Social event', 'Exercise', 'Travel',
  ])
})
