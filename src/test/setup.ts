/* eslint-disable testing-library/no-manual-cleanup -- Vitest does not run RTL cleanup; needed so tests don't share DOM. */
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
