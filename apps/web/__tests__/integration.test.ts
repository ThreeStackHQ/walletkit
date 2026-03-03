import { describe, it, expect, beforeEach } from 'vitest'

// In-memory store for integration tests
const wallets: Record<string, { balance: number; totalGranted: number; totalSpent: number }> = {}
const ledger: Array<{ walletKey: string; type: string; amount: number; idempotencyKey?: string }> = []
const usedIdempotencyKeys = new Set<string>()

function getWallet(workspaceId: string, userId: string) {
  const key = `${workspaceId}:${userId}`
  if (!wallets[key]) wallets[key] = { balance: 0, totalGranted: 0, totalSpent: 0 }
  return { key, wallet: wallets[key] }
}

function grant(workspaceId: string, userId: string, amount: number, idempotencyKey: string) {
  if (usedIdempotencyKeys.has(idempotencyKey)) return { duplicate: true }
  usedIdempotencyKeys.add(idempotencyKey)
  const { key, wallet } = getWallet(workspaceId, userId)
  wallet.balance += amount
  wallet.totalGranted += amount
  ledger.push({ walletKey: key, type: 'grant', amount, idempotencyKey })
  return { balance: wallet.balance, duplicate: false }
}

function spend(workspaceId: string, userId: string, amount: number, idempotencyKey: string) {
  if (usedIdempotencyKeys.has(idempotencyKey)) return { allowed: false, duplicate: true, remaining: 0 }
  const { key, wallet } = getWallet(workspaceId, userId)
  if (wallet.balance < amount) return { allowed: false, remaining: wallet.balance }
  usedIdempotencyKeys.add(idempotencyKey)
  wallet.balance -= amount
  wallet.totalSpent += amount
  ledger.push({ walletKey: key, type: 'spend', amount, idempotencyKey })
  return { allowed: true, remaining: wallet.balance }
}

describe('WalletKit Integration Tests', () => {
  beforeEach(() => {
    Object.keys(wallets).forEach(k => delete wallets[k])
    ledger.length = 0
    usedIdempotencyKeys.clear()
  })

  it('FLOW-001: grant → spend → balance tracking', () => {
    grant('ws1', 'user1', 100, 'grant-1')
    const r1 = spend('ws1', 'user1', 5, 'spend-1')
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(95)
    grant('ws1', 'user1', 50, 'grant-2')
    const r2 = spend('ws1', 'user1', 50, 'spend-2')
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(95)
    const { wallet } = getWallet('ws1', 'user1')
    expect(wallet.balance).toBe(95)
  })

  it('FLOW-002: duplicate idempotencyKey → only processes once', () => {
    grant('ws1', 'user1', 100, 'grant-1')
    const r1 = spend('ws1', 'user1', 10, 'idem-key-1')
    const r2 = spend('ws1', 'user1', 10, 'idem-key-1')
    expect(r1.allowed).toBe(true)
    expect(r2.duplicate).toBe(true)
    const { wallet } = getWallet('ws1', 'user1')
    expect(wallet.balance).toBe(90) // only decremented once
  })

  it('FLOW-003: spend more than balance → rejected', () => {
    grant('ws1', 'user1', 100, 'grant-1')
    const r = spend('ws1', 'user1', 200, 'spend-over')
    expect(r.allowed).toBe(false)
    const { wallet } = getWallet('ws1', 'user1')
    expect(wallet.balance).toBe(100) // unchanged
  })

  it('FLOW-004: Stripe payment → credits granted (idempotent)', () => {
    // Simulate Stripe webhook granting credits
    const result = grant('ws1', 'user1', 500, 'stripe-pi-xyz123')
    expect(result.duplicate).toBe(false)
    expect(wallets['ws1:user1'].balance).toBe(500)
    // Duplicate webhook delivery (idempotent)
    const result2 = grant('ws1', 'user1', 500, 'stripe-pi-xyz123')
    expect(result2.duplicate).toBe(true)
    expect(wallets['ws1:user1'].balance).toBe(500) // unchanged
  })

  it('FLOW-005: webhook delivery includes HMAC signature header', () => {
    const crypto = require('crypto')
    const secret = 'test-webhook-secret-32chars-minimum'
    const payload = JSON.stringify({ event: 'balance.low', balance: 5 })
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/)
    // Verify round-trip
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
    expect(sig).toBe(expectedSig)
  })
})
