import { analyzeCode } from './openAIHandler'
import {
  createReviewComment,
  getPRDetails,
  getDifferencesToAnalize
} from './prHandler'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const prDetails = await getPRDetails()
  const filteredDiff = await getDifferencesToAnalize(prDetails)

  const comments = await analyzeCode(filteredDiff, prDetails)

  if (comments.length === 0) {
    console.log('Alright! Nothing to comment')
    return
  }

  await createReviewComment(
    prDetails.owner,
    prDetails.repo,
    prDetails.pull_number,
    comments
  )
}
