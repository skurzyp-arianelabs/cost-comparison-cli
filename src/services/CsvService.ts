import fs from 'fs';
import path from 'path';

export interface CsvRow {
  chain: string;
  operation: string;
  usdCost: string | undefined;
  gasUsed?: string;
  transactionHash?: string;
  nativeCurrencySymbol?: string;
  status?: string;
  timestamp?: string;
}

export class CsvService {
  private readonly outputDir: string;

  constructor(outputDir = 'results') {
    this.outputDir = outputDir;
    this.ensureOutputDirExists();
  }

  private ensureOutputDirExists() {
    const fullPath = path.resolve(this.outputDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  public saveCsv(filename: string, data: CsvRow[]): void {
    if (!data.length) return;

    const headers = Object.keys(data[0]!);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((key) => `"${(row as any)[key] ?? ''}"`).join(',')
      ),
    ].join('\n');

    const fullPath = path.join(this.outputDir, filename);
    fs.writeFileSync(fullPath, csvContent, 'utf8');
    console.log(`✅ CSV saved to: ${fullPath}`);
  }
}
