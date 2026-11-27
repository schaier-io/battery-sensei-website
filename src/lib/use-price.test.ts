import { describe, expect, it } from 'vitest'
import { campaignFlags } from './use-price'

describe('campaignFlags', () => {
  it('advertises no launch offer when the server reports no campaign', () => {
    expect(campaignFlags(true, { code: 'BLACKFRIDAY', campaign: null })).toEqual({
      blackFridayCode: null,
      isLaunchOffer: false,
    })
  })

  it('advertises the launch offer only for the launch campaign', () => {
    expect(campaignFlags(true, { code: 'ZENMODE', campaign: 'launch' }).isLaunchOffer).toBe(true)
    expect(campaignFlags(false, { code: 'ZENMODE', campaign: 'launch' }).isLaunchOffer).toBe(false)
  })

  it('shows the Black Friday code only for the Black Friday campaign', () => {
    expect(campaignFlags(true, { code: 'BLACKFRIDAY', campaign: 'black-friday' }).blackFridayCode).toBe(
      'BLACKFRIDAY',
    )
  })
})
