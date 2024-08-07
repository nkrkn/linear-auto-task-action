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

async function buildTasksDefinitions(): Promise<void> {
  console.log(fs.readdirSync("./"))
  if (!fs.existsSync('./index.js')){
    throw new Error('Unable to find built ./index.js in repository.')
  }
  const out = execSync('node ./index.js')
  console.log(`from output buffer: ${out.toString()}`)
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
    await buildTasksDefinitions()
    createLinearSdkClient(getLinearApiKey())
    return
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
