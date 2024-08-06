import * as core from '@actions/core'
import fs from 'fs'
import { execSync } from 'child_process'
import { LinearClient } from '@linear/sdk'

function checkTasksExists(): void {
  if (!fs.existsSync('./tasks')) {
    throw new Error('Unable to find ./tasks directory in repository root.')
  }
  if (!fs.existsSync('./tasks/index.ts')) {
    throw new Error('Unable to find ./tasks/index.ts in repository.')
  }
}

function buildTasks(): void {
  try {
    execSync('tsc ./tasks/index.ts --target esnext --outfile ./index.js')
  } catch (error) {
    if (error instanceof Error) console.log(error.message)
  }
}

async function importTasksDefinitions(): Promise<void> {}

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
    console.log('hello world')
    createLinearSdkClient(getLinearApiKey())
    checkTasksExists()
    buildTasks()
    await importTasksDefinitions()
    return
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
