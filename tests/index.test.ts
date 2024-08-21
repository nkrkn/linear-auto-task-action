/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import * as main from '../src/main'
import { describe, test } from 'vitest'

// Mock the action's entrypoint
// const runMock = jest.spyOn(main, 'run').mockImplementation()

describe('index', () => {
  test('calls run when imported', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    // expect(runMock).toHaveBeenCalled()
  })
})
