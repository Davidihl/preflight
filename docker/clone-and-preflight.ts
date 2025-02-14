#!/usr/bin/env node

import { execaCommand } from 'execa';

const regex = /^https:\/\/github\.com\/[a-zA-Z0-9\-.]+\/[a-zA-Z0-9\-.]+$/;

if (!process.argv[2] || !process.argv[2].match(regex)) {
  console.error(`Argument doesn't match GitHub URL format. Example:

$ docker run ghcr.io/upleveled/preflight https://github.com/upleveled/preflight-test-project-react-passing`);
  process.exit(1);
}

const repoPath = 'repo-to-check';

async function executeCommand(command: string, cwd?: string) {
  let all: string | undefined = '';
  let exitCode = 0;

  try {
    ({ all, exitCode } = await execaCommand(command, {
      cwd,
      all: true,
    }));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  if (exitCode !== 0) {
    console.error(all);
    process.exit(1);
  } else {
    return all;
  }
}

console.log(`Cloning ${process.argv[2]}...`);
await executeCommand(
  `git clone --depth 1 ${
    !process.argv[3] ? '' : `--branch ${process.argv[3]}`
  } --single-branch ${
    process.argv[2]
  } ${repoPath} --config core.autocrlf=input`,
);

console.log('Installing dependencies...');
await executeCommand('pnpm install', repoPath);

console.log('Running Preflight...');
const preflightOutput = await executeCommand('preflight', repoPath);

if (preflightOutput) {
  console.log(
    preflightOutput
      // node-fetch@3 (dependency in Preflight) uses experimental Node.js
      // APIs. Until these are no longer experimental, remove the warning
      // from the output manually.
      .replace(
        /\(node:\d+\) ExperimentalWarning: stream\/web is an experimental feature\. This feature could change at any time\n\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)\n/,
        '',
      ),
  );
}
