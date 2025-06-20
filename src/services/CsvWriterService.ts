import fs from 'fs';
import path from 'path';

export interface CsvRow {
  chain: string;
  operation: string;
  usdCost?: string;
  gasUsed?: string;
  transactionHash?: string;
  nativeCurrencySymbol?: string;
  status?: string;
  timestamp?: string;
  transactionLink?: string;
}

export class CsvWriterService {
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

  private generateTimestampedFilename(baseName: string): string {
    const now = new Date();

    const usFormattedDate = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(now);

    const [month, day, year] = usFormattedDate.split('/');

    const time = now.toTimeString().slice(0, 8).replace(/:/g, '-');

    return `${baseName}_${month}-${day}-${year}_${time}.csv`;
  }

  public saveCsv(baseName: string, data: CsvRow[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]!);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((key) => `"${(row as any)[key] ?? ''}"`).join(',')
      ),
    ].join('\n');

    const filename = this.generateTimestampedFilename(baseName);
    const fullPath = path.join(this.outputDir, filename);

    fs.writeFileSync(fullPath, csvContent, 'utf8');
    console.log(`✅ CSV saved to: ${fullPath}`);

    return fullPath
  }
}
