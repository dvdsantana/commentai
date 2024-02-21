"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeCode = void 0;
const core = __importStar(require("@actions/core"));
const openai_1 = __importDefault(require("openai"));
const OPENAI_API_KEY = core.getInput('OPENAI_API_KEY');
const OPENAI_API_MODEL = core.getInput('OPENAI_API_MODEL');
const openai = new openai_1.default({
    apiKey: OPENAI_API_KEY
});
async function analyzeCode(parsedDiff, prDetails) {
    const comments = [];
    for (const file of parsedDiff) {
        if (file.to === '/dev/null')
            continue; // Ignore deleted files
        for (const chunk of file.chunks) {
            const prompt = createPrompt(file, chunk, prDetails);
            const aiResponse = await getAIResponse(prompt);
            if (aiResponse) {
                const newComments = createComment(file, chunk, aiResponse);
                if (newComments) {
                    comments.push(...newComments);
                }
            }
        }
    }
    return comments;
}
exports.analyzeCode = analyzeCode;
function createPrompt(file, chunk, prDetails) {
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
  `;
}
async function getAIResponse(prompt) {
    const queryConfig = {
        model: OPENAI_API_MODEL,
        temperature: 0.2,
        max_tokens: 700,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    };
    try {
        const response = await openai.chat.completions.create({
            ...queryConfig,
            // return JSON if the model supports it:
            ...(OPENAI_API_MODEL === 'gpt-4-1106-preview'
                ? { response_format: { type: 'json_object' } }
                : {}),
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        const res = response.choices[0].message?.content?.trim() || '{}';
        return JSON.parse(res).reviews;
    }
    catch (error) {
        console.error('Error:', error);
        return null;
    }
}
function createComment(file, chunk, aiResponses) {
    return aiResponses.flatMap(aiResponse => {
        if (!file.to) {
            return [];
        }
        return {
            body: aiResponse.reviewComment,
            path: file.to,
            line: Number(aiResponse.lineNumber)
        };
    });
}
//# sourceMappingURL=openAIHandler.js.map