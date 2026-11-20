import { describe, expect, it } from 'vitest'
import { clientNetwork } from './app-ingest'

describe('clientNetwork', () => {
  it.each([
    ['IPv4 stays the full address', '203.0.113.9', '203.0.113.9'],
    ['IPv4-mapped IPv6 is its IPv4 address', '::ffff:203.0.113.9', '203.0.113.9'],
    ['IPv6 keeps only its /64', '2001:db8:1:2:aaaa:bbbb:cccc:dddd', '2001:db8:1:2::/64'],
    ['compressed IPv6 expands before the cut', '2001:db8::1', '2001:db8:0:0::/64'],
    ['leading zeros and case do not split one /64', '2001:0DB8:0001:0002::5', '2001:db8:1:2::/64'],
  ])('%s', (_label, ip, network) => {
    expect(clientNetwork(ip)).toBe(network)
  })
})
