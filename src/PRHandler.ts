import { readFileSync } from 'fs'
import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import { prDetails } from './prDetails'
import parseDiff from 'parse-diff'
import { minimatch } from 'minimatch'

const GITHUB_TOKEN: string = core.getInput('GITHUB_TOKEN')
const octokit = new Octokit({ auth: GITHUB_TOKEN })
//todo
export async function getPRDetails(): Promise<prDetails> {
  const { repository, number } = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH || '', 'utf8')
  )
  const prResponse = await octokit.pulls.get({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: number
  })
  return {
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: number,
    title: prResponse.data.title ?? '',
    description: prResponse.data.body ?? ''
  }
}

export async function createReviewComment(
  owner: string,
  repo: string,
  pull_number: number,
  comments: Array<{ body: string; path: string; line: number }>
): Promise<void> {
  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number,
    comments,
    event: 'COMMENT'
  })
}

export async function getDifferencesToAnalize(
  prDetails: prDetails
): Promise<parseDiff.File[]> {
  let diff: string | null

  diff = await getAllDifferences(prDetails)

  const parsedDiff = parseDiff(diff)

  const excludePatterns = core
    .getInput('exclude')
    .split(',')
    .map(s => s.trim())

  const filteredDiff = parsedDiff.filter(file => {
    return !excludePatterns.some(pattern => minimatch(file.to ?? '', pattern))
  })

  return filteredDiff
}

async function getAllDifferences(prDetails: prDetails): Promise<string | null> {
  let diff: string | null
  const eventData = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8')
  )

  if (eventData.action === 'opened') {
    diff = await getDiffFromPull(
      prDetails.owner,
      prDetails.repo,
      prDetails.pull_number
    )
  } else if (eventData.action === 'synchronize') {
    const newBaseSha = eventData.before
    const newHeadSha = eventData.after

    diff = await getDiffFromCommitComparision(
      prDetails.owner,
      prDetails.repo,
      newBaseSha,
      newHeadSha
    )
  } else {
    console.error('Unsupported event:', process.env.GITHUB_EVENT_NAME)
    return null
  }

  if (!diff) {
    console.log('No diff found')
    return null
  }

  return diff
}

async function getDiffFromPull(
  owner: string,
  repo: string,
  pull_number: number
): Promise<string | null> {
  const response = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: 'diff' }
  })
  // @ts-expect-error - response.data is a string
  return response.data
}

async function getDiffFromCommitComparision(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<string | null> {
  const response = await octokit.repos.compareCommitsWithBasehead({
    headers: {
      accept: 'application/vnd.github.v3.diff'
    },
    owner,
    repo,
    basehead: `${base}...${head}`,
    per_page: 50
  })
  return String(response.data)
}
