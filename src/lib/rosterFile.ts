/** Turn a roster file into plain text. Excel becomes CSV of the first sheet. */
export async function rosterFileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) return '';
    return XLSX.utils.sheet_to_csv(sheet);
  }
  return file.text();
}
