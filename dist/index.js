"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The entrypoint for the action.
 */
//import * as core from '@actions/core'
const main_1 = require("./main");
// eslint-disable-next-line @typescript-eslint/no-floating-promises
try {
    (0, main_1.run)();
}
catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error)
        console.error(error.message); // core.setFailed(error.message)
}
//# sourceMappingURL=index.js.map