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
exports.run = run;
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const sdk_1 = require("@linear/sdk");
function checkTasksExists() {
    if (!fs_1.default.existsSync('./tasks')) {
        throw new Error('Unable to find ./tasks directory in repository root.');
    }
    if (!fs_1.default.existsSync('./tasks/index.ts')) {
        throw new Error('Unable to find ./tasks/index.ts in repository.');
    }
}
function buildTasks() {
    (0, child_process_1.execSync)('tsc ./tasks/index.ts --target esnext --module amd --outfile ./index.js');
    if (!fs_1.default.existsSync('./index.js')) {
        throw new Error('Unable to find ./index.js from build task step.');
    }
}
async function importTasksDefinitions() {
    console.log('dynamically importing user IssueBuilder...');
    const builder = (await import('./index.js'));
    new builder();
}
function createLinearSdkClient(apiKey) {
    return new sdk_1.LinearClient({
        apiKey
    });
}
function getLinearApiKey() {
    const key = process.env.LINEAR_PERSONAL_API_KEY;
    if (!key) {
        throw new Error("Unable to find LINEAR_PERSONAL_API_KEY. Make sure to add it as a secret in your repository's GitHub Action settings.");
    }
    return key;
}
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
    try {
        console.log('Running Linear Auto Task action...');
        checkTasksExists();
        buildTasks();
        await importTasksDefinitions();
        createLinearSdkClient(getLinearApiKey());
        return;
    }
    catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
//# sourceMappingURL=main.js.map