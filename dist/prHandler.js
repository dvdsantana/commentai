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
exports.getDifferencesToAnalize = exports.createReviewComment = exports.getPRDetails = void 0;
const fs_1 = require("fs");
const core = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
const parse_diff_1 = __importDefault(require("parse-diff"));
const minimatch_1 = require("minimatch");
const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
const octokit = new rest_1.Octokit({ auth: GITHUB_TOKEN });
async function getPRDetails() {
    const { repository, number } = JSON.parse((0, fs_1.readFileSync)(process.env.GITHUB_EVENT_PATH || '', 'utf8'));
    const prResponse = await octokit.pulls.get({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: number
    });
    return {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: number,
        title: prResponse.data.title ?? '',
        description: prResponse.data.body ?? ''
    };
}
exports.getPRDetails = getPRDetails;
async function createReviewComment(owner, repo, pull_number, comments) {
    await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        comments,
        event: 'COMMENT'
    });
}
exports.createReviewComment = createReviewComment;
async function getDifferencesToAnalize(prDetails) {
    let diff;
    diff = await getAllDifferences(prDetails);
    const parsedDiff = (0, parse_diff_1.default)(diff);
    const excludePatterns = core
        .getInput('exclude')
        .split(',')
        .map(s => s.trim());
    const filteredDiff = parsedDiff.filter(file => {
        return !excludePatterns.some(pattern => (0, minimatch_1.minimatch)(file.to ?? '', pattern));
    });
    return filteredDiff;
}
exports.getDifferencesToAnalize = getDifferencesToAnalize;
async function getAllDifferences(prDetails) {
    let diff;
    const eventData = JSON.parse((0, fs_1.readFileSync)(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
    if (eventData.action === 'opened') {
        diff = await getDiffFromPull(prDetails.owner, prDetails.repo, prDetails.pull_number);
    }
    else if (eventData.action === 'synchronize') {
        const newBaseSha = eventData.before;
        const newHeadSha = eventData.after;
        diff = await getDiffFromCommitComparision(prDetails.owner, prDetails.repo, newBaseSha, newHeadSha);
    }
    else {
        console.error('Unsupported event:', process.env.GITHUB_EVENT_NAME);
        return null;
    }
    if (!diff) {
        console.log('No diff found');
        return null;
    }
    return diff;
}
async function getDiffFromPull(owner, repo, pull_number) {
    const response = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: 'diff' }
    });
    // @ts-expect-error - response.data is a string
    return response.data;
}
async function getDiffFromCommitComparision(owner, repo, base, head) {
    const response = await octokit.repos.compareCommitsWithBasehead({
        headers: {
            accept: 'application/vnd.github.v3.diff'
        },
        owner,
        repo,
        basehead: `${base}...${head}`,
        per_page: 50
    });
    return String(response.data);
}
//# sourceMappingURL=prHandler.js.map