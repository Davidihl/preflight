import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { execaCommand } from 'execa';
import readdirp from 'readdirp';
import semver from 'semver';

const require = createRequire(`${process.cwd()}/`);

export const title = 'ESLint config is latest version';

export default async function eslintConfigIsValid() {
  const { stdout: remoteVersion } = await execaCommand(
    'npm show eslint-config-upleveled version',
  );

  let localVersion;

  try {
    const eslintConfigPackageJsonPath = require.resolve(
      'eslint-config-upleveled/package.json',
    );

    localVersion = JSON.parse(
      await fs.readFile(eslintConfigPackageJsonPath, 'utf-8'),
    ).version;
  } catch (error) {}

  if (typeof localVersion === 'undefined') {
    throw new Error(
      `The UpLeveled ESLint Config has not been installed - please install using the instructions on https://www.npmjs.com/package/eslint-config-upleveled
      `,
    );
  }

  if (semver.gt(remoteVersion, localVersion)) {
    throw new Error(
      `Your current version of the UpLeveled ESLint Config (${localVersion}) is older than the latest version ${remoteVersion} - upgrade by running all lines of the install instructions on https://www.npmjs.com/package/eslint-config-upleveled
      `,
    );
  }

  let eslintConfigMatches;

  try {
    eslintConfigMatches =
      (await fs.readFile('./.eslintrc.cjs', 'utf-8')).trim() ===
      `/** @type {import('@typescript-eslint/utils').TSESLint.Linter.Config} */
const config = {
  extends: ['upleveled'],
};

module.exports = config;`;
  } catch (error) {
    throw new Error(
      `Error reading your .eslintrc.cjs file - please delete the file if it exists and reinstall the config using the instructions on https://www.npmjs.com/package/eslint-config-upleveled
      `,
    );
  }

  if (!eslintConfigMatches) {
    throw new Error(
      `Your .eslintrc.cjs file does not match the configuration file template - please delete the file and reinstall the config using the instructions on https://www.npmjs.com/package/eslint-config-upleveled
      `,
    );
  }

  const eslintDisableOccurrences = [];

  for await (const { path } of readdirp('.', {
    directoryFilter: ['!.git', '!.next', '!node_modules'],
    fileFilter: ['*.js', '*.jsx', '*.ts', '*.tsx'],
  })) {
    const fileContents = await fs.readFile(path, 'utf-8');
    if (/eslint-disable|eslint [a-z0-9@/-]+: (0|off)/.test(fileContents)) {
      eslintDisableOccurrences.push(path);
    }
  }

  if (eslintDisableOccurrences.length > 0) {
    throw new Error(
      `ESLint has been disabled in the following files:
        ${eslintDisableOccurrences.join('\n')}

        Remove all comments disabling or modifying ESLint rule configuration (eg. eslint-disable and eslint-disable-next-line comments) and fix the problems
      `,
    );
  }
}
