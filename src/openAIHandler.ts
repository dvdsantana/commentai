import * as core from '@actions/core'
import OpenAI from 'openai'
import { Chunk, File } from 'parse-diff'
import { prDetails } from './prDetails'

const OPENAI_API_KEY: string = core.getInput('OPENAI_API_KEY')
const OPENAI_API_MODEL: string = core.getInput('OPENAI_API_MODEL')
const OPENAI_API_PROMPT: string = core.getInput('OPENAI_API_PROMPT')

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
    
    console.info(`Analyzing the file: '${file.to} ...` )
    for (const chunk of file.chunks) {
      const prompt = createPrompt(file, chunk, prDetails)
      const aiResponse = await getAIResponse(prompt)
      if (aiResponse) {
        const newComments = createComment(file, aiResponse)
        if (newComments) {
          console.info(`Some comments has been added to the file: ${file.to}`)
          comments.push(...newComments)
        }
      }
    }
  }

  return comments
}

function createPrompt(file: File, chunk: Chunk, prDetails: prDetails): string {
  return `${OPENAI_API_PROMPT}
  
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
    presence_penalty: 0, // Defaults to 0
  }

  try {
    const response = await openai.chat.completions.create({
      ...queryConfig,
      // return JSON if the model supports it
      // all GPT-4 Turbo and GPT-3.5 Turbo models newer than `gpt-3.5-turbo-1106`
      response_format: { type: 'json_object' },
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
    console.error('Error getting the GPT response:', error)
    
    return null
  }
}

function createComment(
  file: File,
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
