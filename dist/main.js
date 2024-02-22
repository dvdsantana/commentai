"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const openAIHandler_1 = require("./openAIHandler");
const prHandler_1 = require("./prHandler");
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
    const prDetails = await (0, prHandler_1.getPRDetails)();
    const filteredDiff = await (0, prHandler_1.getDifferencesToAnalize)(prDetails);
    const comments = await (0, openAIHandler_1.analyzeCode)(filteredDiff, prDetails);
    if (comments.length === 0) {
        console.info('Alright! Nothing to comment');
        return;
    }
    await (0, prHandler_1.createReviewComment)(prDetails.owner, prDetails.repo, prDetails.pull_number, comments);
}
exports.run = run;
//# sourceMappingURL=main.js.map