import * as core from '@actions/core'
import OpenAI from 'openai'
import { Chunk, File } from 'parse-diff'
import { prDetails } from './prDetails'

const OPENAI_API_KEY: string = core.getInput('OPENAI_API_KEY')
const OPENAI_API_MODEL: string = core.getInput('OPENAI_API_MODEL')

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

export async function analyzeCode(
  parsedDiff: File[],
  prDetails: prDetails
): Promise<Array<{ body: string; path: string; line: number }>> {
  const comments: Array<{ body: string; path: string; line: number }> = []

  for (const file of parsedDiff) {
    if (file.to === '/dev/null') continue // Ignore deleted files
    console.info(`Analyzing the file: '${file.to}...` )
    for (const chunk of file.chunks) {
      const prompt = createPrompt(file, chunk, prDetails)
      console.info(`Sending the prompt:
      ${prompt}`)
      const aiResponse = await getAIResponse(prompt)
      if (aiResponse) {
        const newComments = createComment(file, chunk, aiResponse)
        if (newComments) {
          comments.push(...newComments)
        }
      }
    }
  }
  return comments
}

function createPrompt(file: File, chunk: Chunk, prDetails: prDetails): string {
  return `Tell me a joke about developers`
  return `Your task is to review pull requests. Instructions:
  - Provide the response in following JSON format:  {'reviews': [{'lineNumber':  <line_number>, 'reviewComment': '<review comment>'}]}
  - Do not give positive comments or compliments.
  - Provide comments and suggestions ONLY if there is something to improve, otherwise 'reviews' should be an empty array.
  - Write the comment in GitHub Markdown format.
  - Use the given description only for the overall context and only comment the code.
  - IMPORTANT: NEVER suggest adding comments to the code.
  
  Review the following code diff in the file '${file.to}' and take the pull request title and description into account when writing the response.
    
  Pull request title: ${prDetails.title}
  Pull request description:
  
  ---
  ${prDetails.description}
  ---
  
  Git diff to review:
  
  \`\`\`diff
  ${chunk.content}
  ${chunk.changes
    // @ts-expect-error - ln and ln2 exists where needed
    .map(c => `${c.ln ? c.ln : c.ln2} ${c.content}`)
    .join('\n')}
  \`\`\`
  `
}

async function getAIResponse(prompt: string): Promise<Array<{
  lineNumber: string
  reviewComment: string
}> | null> {
  const queryConfig = {
    model: OPENAI_API_MODEL,
    temperature: 0.2, // Defaults to 1
    max_tokens: 700,
    top_p: 1, // Defaults to 1
    frequency_penalty: 0, // Defaults to 0
    presence_penalty: 0 // Defaults to 0
  }

  try {
    const response = await openai.chat.completions.create({
      ...queryConfig,
      // return JSON if the model supports it:
      ...(OPENAI_API_MODEL === 'gpt-4-0125-preview' || OPENAI_API_MODEL === 'gpt-3.5-turbo-1106'
        ? { response_format: { type: 'json_object' } }
        : { response_format: { type: 'text' }}),
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const res = response.choices[0].message?.content?.trim() || '{}'
    return JSON.parse(res).reviews
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

function createComment(
  file: File,
  chunk: Chunk,
  aiResponses: Array<{
    lineNumber: string
    reviewComment: string
  }>
): Array<{ body: string; path: string; line: number }> {
  return aiResponses.flatMap(aiResponse => {
    if (!file.to) {
      return []
    }
    return {
      body: aiResponse.reviewComment,
      path: file.to,
      line: Number(aiResponse.lineNumber)
    }
  })
}
