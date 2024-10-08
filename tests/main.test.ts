/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

// import * as core from '@actions/core'
// import * as main from '../src/main'
import { describe, test, vi, beforeEach, assert, expect } from 'vitest'
import { fs, vol } from 'memfs'
import { execSync } from 'node:child_process'
import {
  checkTasksExists,
  buildTasksDefinitions,
  isSameDay,
  shouldCreateTask,
  getPreviousTaskCreationDate
} from '../src/main'
import { LinearClient } from '@linear/sdk'
import { Issue } from '@nkrkn/linear-auto-task'

const client = new LinearClient({ apiKey: 'hello' })
const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('node:child_process')

vi.mock('../src/main', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    getPreviousTaskCreationDate: vi.fn()
  }
})

describe('helper functions', () => {
  beforeEach(() => {
    // reset the state of in-memory fs
    vol.reset()
  })

  test('isSameDay()', () => {
    const d1 = new Date()
    const d2 = new Date()
    assert(isSameDay(d1, d2))

    const d3 = new Date('2024-08-08')
    const d4 = new Date('2024-09-08')
    assert(!isSameDay(d3, d4))
  })

  describe('checkTasksExists()', () => {
    test('happy path', () => {
      fs.mkdirSync(`${__dirname}/../tasks`, { recursive: true })
      fs.writeFileSync(`${__dirname}/../tasks/index.ts`, 'hello')

      assert.doesNotThrow(checkTasksExists, Error)
    })
    test('throws when ./tasks not found', () => {
      assert.throws(
        checkTasksExists,
        'Unable to find ./tasks directory in repository root.'
      )
    })
    test('throws when ./tasks/index.ts not found', () => {
      fs.mkdirSync(`${__dirname}/../tasks`, { recursive: true })

      assert.throws(
        checkTasksExists,
        'Unable to find ./tasks/index.ts in repository.'
      )
    })
  })

  describe('buildTaskDefinitions()', () => {
    beforeEach(() => {
      vi.mocked(execSync).mockClear()
    })
    test('happy path', () => {
      fs.mkdirSync(__dirname, { recursive: true })
      fs.writeFileSync(`${__dirname}/../index.js`, 'hello')
      vi.mocked(execSync).mockReturnValue(Buffer.from('{"issues":[]}'))
      assert.deepEqual(buildTasksDefinitions(), { issues: [] })
    })
    test('throws when index.js not found', () => {
      fs.mkdirSync(__dirname, { recursive: true })
      assert.throws(
        buildTasksDefinitions,
        'Unable to find built ./index.js in repository.'
      )
    })
    test('throws when execSync fails', () => {
      fs.mkdirSync(__dirname, { recursive: true })
      fs.writeFileSync(`${__dirname}/../index.js`, 'hello')
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error()
      })
      assert.throws(
        buildTasksDefinitions,
        'Unable to build task definitions from ./index.js'
      )
    })
  })

  describe('shoudCreateTask', () => {
    beforeEach(() => {
      vi.mocked(getPreviousTaskCreationDate).mockReset()
    })
    describe('happy path', () => {
      test('daily shoudCreateTask', async () => {
        const task: Issue = {
          repeatOptions: { type: 'daily' },
          autoTaskName: 'hello',
          teamId: 'team'
        }

        vi.mocked(getPreviousTaskCreationDate).mockImplementation(
          async () => new Date('2024-08-08')
        )
        expect(
          await shouldCreateTask(client, task, getPreviousTaskCreationDate)
        ).toBeTruthy()
      })
      test('daily not shoudCreateTask', async () => {
        const task: Issue = {
          repeatOptions: { type: 'daily' },
          autoTaskName: 'hello',
          teamId: 'team'
        }

        vi.mocked(getPreviousTaskCreationDate).mockImplementation(
          async () => new Date()
        )
        expect(
          await shouldCreateTask(client, task, getPreviousTaskCreationDate)
        ).toBeFalsy()
      })
      test('monthly shoudCreateTask', async () => {
        const todaysDate = new Date().getDate()
        const task: Issue = {
          repeatOptions: { type: 'monthly', day: todaysDate },
          autoTaskName: 'hello',
          teamId: 'team'
        }

        const prevDate = new Date(2022, 0, todaysDate)

        vi.mocked(getPreviousTaskCreationDate).mockImplementation(
          async () => prevDate
        )
        expect(
          await shouldCreateTask(client, task, getPreviousTaskCreationDate)
        ).toBeTruthy()
      })
      test('monthly not shoudCreateTask', async () => {
        const task: Issue = {
          repeatOptions: { type: 'monthly', day: 1 },
          autoTaskName: 'hello',
          teamId: 'team'
        }

        vi.mocked(getPreviousTaskCreationDate).mockImplementation(
          async () => new Date('2024-01-02')
        )
        expect(
          await shouldCreateTask(client, task, getPreviousTaskCreationDate)
        ).toBeFalsy()
      })
      test('weekly shoudCreateTask', async () => {
        const task: Issue = {
          repeatOptions: {
            type: 'weekly',
            day: daysOfWeek[new Date().getDay()]
          },
          autoTaskName: 'hello',
          teamId: 'team'
        }

        vi.mocked(getPreviousTaskCreationDate).mockImplementation(async () => {
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          return oneWeekAgo
        })
        expect(
          await shouldCreateTask(client, task, getPreviousTaskCreationDate)
        ).toBeTruthy()
      })

      test('weekly not shoudCreateTask', async () => {
        const notOneWeekAgo = new Date()
        notOneWeekAgo.setDate(notOneWeekAgo.getDate() - 3)
        const task: Issue = {
          repeatOptions: {
            type: 'weekly',
            day: daysOfWeek[notOneWeekAgo.getDay()]
          },
          autoTaskName: 'hello',
          teamId: 'team'
        }

        vi.mocked(getPreviousTaskCreationDate).mockImplementation(async () => {
          return new Date('2022-01-01')
        })
        expect(
          await shouldCreateTask(client, task, getPreviousTaskCreationDate)
        ).toBeFalsy()
      })
    })
    test('throws when fetch previous fails', async () => {
      vi.mocked(getPreviousTaskCreationDate).mockImplementation(() => {
        throw new Error()
      })

      await expect(async () => {
        await shouldCreateTask(
          client,
          {
            teamId: '',
            autoTaskName: '',
            repeatOptions: { type: 'daily' }
          },
          getPreviousTaskCreationDate
        )
      }).rejects.toThrowError('Unable to fetch previous task creation date.')
    })
  })
})
