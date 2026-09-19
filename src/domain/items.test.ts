import { ITEMS } from './items'

test('there are exactly 11 items, in spec order, with unique ids', () => {
  expect(ITEMS).toHaveLength(11)
  expect(ITEMS.map((i) => i.label)).toEqual([
    'Tiredness',
    'Rumination',
    'Loneliness',
    'Lack of desire for company',
    'Anhedonia — nothing felt enjoyable',
    'Anxiety',
    'Irritability',
    'Difficulty concentrating',
    'Lack of motivation',
    'Hopelessness',
    'Poor sleep',
  ])
  expect(new Set(ITEMS.map((i) => i.id)).size).toBe(11)
})
