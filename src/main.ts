import * as core from '@actions/core'
import fs from 'fs'
import { LinearClient } from '@linear/sdk'

function listWorkingDir(): void {
  for (const file of fs.readdirSync('./')) {
    console.log(file)
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
    console.log('hello world')
    createLinearSdkClient(getLinearApiKey())
    listWorkingDir()
    return
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
