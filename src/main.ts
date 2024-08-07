import * as core from '@actions/core'
import fs from 'fs'
import { execSync } from 'child_process'
import { LinearClient } from '@linear/sdk'
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
  return { issues: JSON.parse(out.toString()) as Issue[] }
}

function getPreviousTask(taskDef: Issue): Issue | null {
  return null
}

function createNextTask(prevTask: Issue, taskDef: Issue): Issue {
  return {} as unknown as Issue
}

function createFirstTask(taskDef: Issue): Issue {
  return {} as unknown as Issue
}

async function postTask(client: LinearClient, task: Issue): Promise<void> {
  return
}

async function processTasks(
  client: LinearClient,
  taskDefs: ReturnType<typeof buildTasksDefinitions>
): Promise<void> {
  for (const taskDef of taskDefs.issues) {
    const prevTask = getPreviousTask(taskDef)
    if (!prevTask) {
      await postTask(client, createFirstTask(taskDef))
    } else {
      await postTask(client, createNextTask(prevTask, taskDef))
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
    await processTasks(createLinearSdkClient(getLinearApiKey()), taskDefs)
    return
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
