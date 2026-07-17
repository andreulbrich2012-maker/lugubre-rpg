import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, '../..');
const projectRoot = path.resolve(backendRoot, '..');
const isTest = process.env.NODE_ENV === 'test';

const environmentFiles = isTest
  ? [
      path.join(projectRoot, '.env.test.local'),
      path.join(projectRoot, '.env.test'),
      path.join(backendRoot, '.env.test.local'),
      path.join(backendRoot, '.env.test')
    ]
  : [
      path.join(projectRoot, '.env.local'),
      path.join(projectRoot, '.env.production.local'),
      path.join(projectRoot, '.env'),
      path.join(backendRoot, '.env.local'),
      path.join(backendRoot, '.env.production.local'),
      path.join(backendRoot, '.env')
    ];

for (const environmentFile of environmentFiles) {
  dotenv.config({ path: environmentFile, override: false });
}

