import { describe, expect, it } from 'vitest'

import { sanitizeFilename, slugify } from './utils'

describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz')
  })

  it('removes special characters', () => {
    expect(slugify('hello@world! #2024')).toBe('helloworld-2024')
  })

  it('collapses consecutive hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  it('replaces underscores with hyphens', () => {
    expect(slugify('foo_bar_baz')).toBe('foo-bar-baz')
  })

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(250)
    expect(slugify(long).length).toBe(200)
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('handles whitespace-only string', () => {
    expect(slugify('   ')).toBe('')
  })

  it('handles string with only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('')
  })
})

describe('sanitizeFilename', () => {
  it('removes < > : " / \\ | ? * characters', () => {
    expect(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij')
  })

  it('removes control characters', () => {
    expect(sanitizeFilename('hello\x00world\x1f')).toBe('helloworld')
  })

  it('collapses multiple spaces into one', () => {
    expect(sanitizeFilename('hello   world')).toBe('hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeFilename('  hello  ')).toBe('hello')
  })

  it('truncates to 200 characters', () => {
    const long = 'x'.repeat(250)
    expect(sanitizeFilename(long).length).toBe(200)
  })

  it('handles all-invalid input', () => {
    expect(sanitizeFilename('<>:"/\\|?*')).toBe('')
  })

  it('preserves valid characters', () => {
    expect(sanitizeFilename('My Article (2024) - Draft')).toBe('My Article (2024) - Draft')
  })
})
