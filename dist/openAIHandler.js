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
const OPENAI_API_PROMPT = core.getInput('OPENAI_API_PROMPT');
const openai = new openai_1.default({
    apiKey: OPENAI_API_KEY
});
// todo
async function analyzeCode(parsedDiff, prDetails) {
    const comments = [];
    for (const file of parsedDiff) {
        if (file.to === '/dev/null')
            continue; // Ignore deleted files
        console.info(`Analyzing the file: '${file.to}...`);
        for (const chunk of file.chunks) {
            const prompt = createPrompt(file, chunk, prDetails);
            console.info(`Sending the prompt:
      ${prompt}`);
            const aiResponse = await getAIResponse(prompt);
            if (aiResponse) {
                const newComments = createComment(file, aiResponse);
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
  `;
}
async function getAIResponse(prompt) {
    const queryConfig = {
        model: OPENAI_API_MODEL,
        temperature: 0.2, // Defaults to 1
        max_tokens: 700,
        top_p: 1, // Defaults to 1
        frequency_penalty: 0, // Defaults to 0
        presence_penalty: 0 // Defaults to 0
    };
    try {
        const response = await openai.chat.completions.create({
            ...queryConfig,
            // return JSON if the model supports it:
            ...(OPENAI_API_MODEL === 'gpt-4-0125-preview' || OPENAI_API_MODEL === 'gpt-3.5-turbo-1106'
                ? { response_format: { type: 'json_object' } }
                : {}),
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        console.info(`Response:`);
        console.info(response);
        const res = response.choices[0].message?.content?.trim() || '{}';
        return JSON.parse(res).reviews;
    }
    catch (error) {
        console.error('Error:', error);
        return null;
    }
}
function createComment(file, aiResponses) {
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