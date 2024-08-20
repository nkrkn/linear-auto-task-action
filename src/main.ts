import * as core from '@actions/core'
import fs from 'fs'
import { execSync } from 'child_process'
import { LinearClient, IssuesQuery } from '@linear/sdk'
import type { Issue } from '@nkrkn/linear-auto-task'

function checkTasksExists(): void {
  if (!fs.existsSync('./tasks')) {
    throw new Error('Unable to find ./tasks directory in repository root.')
  }
  if (!fs.existsSync('./tasks/index.ts')) {
    throw new Error('Unable to find ./tasks/index.ts in repository.')
  }
}

function buildTasksDefinitions(): { issues: Issue[] } {
  if (!fs.existsSync('./index.js')) {
    throw new Error('Unable to find built ./index.js in repository.')
  }
  const out = execSync('node ./index.js')
  return JSON.parse(out.toString()) as { issues: Issue[] }
}

// used to determine if we already created a task today
async function getPreviousTaskCreationDate(
  client: LinearClient,
  taskDef: Issue
): Promise<Date | null> {
  try {
    const issues = client.issues({
      filter: {
        title: {
          containsIgnoreCase: taskDef.autoTaskName
        },
        team: {
          id: {
            eq: taskDef.teamId
          }
        }
      },
      // only need one
      first: 1,
      // we want the most recent task
      // @ts-expect-error cannot import _generated_sdk for some reason
      sort: {
        createdAt: {
          order: 'Descending'
        }
      }
    })

    return (await issues).nodes[0]?.createdAt
  } catch (e) {
    console.log(e)
    // TODO: error handling / logging
    throw e
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.setHours(0, 0, 0, 0) === d2.setHours(0, 0, 0, 0)
}

// compares current time and taskDef config to determine if new task should be created
async function shouldCreateTask(
  client: LinearClient,
  taskDef: Issue
): Promise<boolean> {
  const prevCreatedDate = await getPreviousTaskCreationDate(client, taskDef)
  if (prevCreatedDate && isSameDay(prevCreatedDate, new Date())) return false

  const { type } = taskDef.repeatOptions
  switch (type) {
    case 'daily': {
      return true
    }
    case 'weekly': {
      const daysOfWeek = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ] as const
      const currentDayOfWeek = daysOfWeek[new Date().getDay()]
      const repeatTaskDay = taskDef.repeatOptions.day
      return currentDayOfWeek === repeatTaskDay
    }
    case 'monthly': {
      const currentDate = new Date().getDate()
      return currentDate === taskDef.repeatOptions.day
    }
    default: {
      return false
    }
  }
}

async function postTask(client: LinearClient, taskDef: Issue): Promise<void> {
  try {
    await client.createIssue(taskDef)
    // TODO: return created Issue for logging
  } catch (e) {
    console.log(e)
    // TODO: error handling / logging
    throw e
  }
}

async function processTasks(
  client: LinearClient,
  taskDefs: ReturnType<typeof buildTasksDefinitions>
): Promise<void> {
  // TODO: parallelize promises
  for (const taskDef of taskDefs.issues) {
    if (await shouldCreateTask(client, taskDef)) {
      await postTask(client, taskDef)
    }
  }
}

function createLinearSdkClient(apiKey: string): LinearClient {
  return new LinearClient({
    apiKey
  })
}

function getLinearApiKey(): string {
  const key = process.env.LINEAR_PERSONAL_API_KEY
  if (!key) {
    throw new Error(
      "Unable to find LINEAR_PERSONAL_API_KEY. Make sure to add it as a secret in your repository's GitHub Action settings."
    )
  }
  return key
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    console.log('Running Linear Auto Task action...')
    checkTasksExists()
    const taskDefs = buildTasksDefinitions()
    console.log('Found these task definitions:\n')
    console.log(JSON.stringify(taskDefs))
    await processTasks(createLinearSdkClient(getLinearApiKey()), taskDefs)
    return
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
