import fs from 'fs';
import path from 'path';

type CustomerRecord = Record<string, any>;

const parseCustomersJson = (raw: string): CustomerRecord[] => {
  const normalized = raw.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];
  const parsed = JSON.parse(normalized);
  return Array.isArray(parsed) ? parsed : [];
};

const getStoreCandidates = () => {
  const explicitPath = process.env.CUSTOMER_DATA_PATH?.trim();
  const defaultPath = path.join(process.cwd(), 'data', 'customers.json');
  const tmpPath = path.join('/tmp', 'palette_ai', 'customers.json');

  const unique = new Set<string>();
  if (explicitPath) unique.add(explicitPath);
  unique.add(defaultPath);
  unique.add(tmpPath);
  return Array.from(unique);
};

const getExistingFilesByLatest = () => {
  return getStoreCandidates()
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => ({ filePath, mtime: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((f) => f.filePath);
};

export const readCustomers = (): CustomerRecord[] => {
  const existingFiles = getExistingFilesByLatest();

  for (const filePath of existingFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return parseCustomersJson(fileContent);
    } catch (error) {
      console.error('Failed to parse customers file:', filePath, error);
    }
  }

  return [];
};

export const saveCustomers = (customers: CustomerRecord[]) => {
  let lastError: unknown = null;

  for (const filePath of getStoreCandidates()) {
    try {
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(customers, null, 2), 'utf-8');
      return filePath;
    } catch (error) {
      lastError = error;
      console.error('Failed to write customers file:', filePath, error);
    }
  }

  throw lastError || new Error('No writable customer store path found');
};
