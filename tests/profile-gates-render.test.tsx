import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Window } from 'happy-dom'
import React, { createElement } from 'react'

;(globalThis as typeof globalThis & { React: typeof React }).React = React
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../src/messages/en.json'
import { timeZone } from '../src/i18n/config'
import { UsernameRequiredGate } from '../src/components/dashboard/UsernameRequiredGate'
import type { User } from 'firebase/auth'

const happyWindow = new Window({ url: 'https://localhost/' })

const globalScope = globalThis as typeof globalThis & {
  window: Window
  document: Document
  navigator: Navigator
  HTMLElement: typeof HTMLElement
}

globalScope.window = happyWindow
globalScope.document = happyWindow.document
globalScope.navigator = happyWindow.navigator
globalScope.HTMLElement = happyWindow.HTMLElement

const gateUser = {
  uid: 'phone-user-1',
  displayName: null,
  email: null,
  phoneNumber: '+15551234567',
} as unknown as User

describe('ProfileGates intl render (UsernameRequiredGate)', () => {
  it('renders inside NextIntlClientProvider without throwing', async () => {
    const container = happyWindow.document.createElement('div')
    happyWindow.document.body.appendChild(container)
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(
          createElement(
            NextIntlClientProvider,
            { locale: 'en', messages: enMessages, timeZone },
            createElement(UsernameRequiredGate, { user: gateUser })
          )
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      const title = happyWindow.document.querySelector('#username-gate-title')
      assert.ok(title, 'expected username gate dialog title (portal to document.body)')
      assert.match(title?.textContent ?? '', /Display Name/i)
    } finally {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  })
})