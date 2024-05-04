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
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const openAIHandler_1 = require("./openAIHandler");
const prHandler_1 = require("./prHandler");
const core = __importStar(require("@actions/core"));
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
    const prDetails = await (0, prHandler_1.getPRDetails)();
    const filteredDiff = await (0, prHandler_1.getDifferencesToAnalize)(prDetails);
    const comments = await (0, openAIHandler_1.analyzeCode)(filteredDiff, prDetails);
    if (comments.length === 0) {
        console.log('Files excluded: ' + core.getInput('OPENAI_IGNORE_FILES'));
        console.log('Alright! Nothing to comment');
        return;
    }
    await (0, prHandler_1.createReviewComment)(prDetails.owner, prDetails.repo, prDetails.pull_number, comments);
}
exports.run = run;
//# sourceMappingURL=main.js.map