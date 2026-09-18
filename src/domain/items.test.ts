import { ITEMS } from './items'

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
