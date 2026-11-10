/** xlsx 파일에서 시트 하나의 칸 값과 병합 범위를 읽는다 (외부 라이브러리 없이) */
const XlsxLiteRead = (function () {
  const { NS, ZIP, colIndex } = XlsxLite;
  const MAIN_NS = NS.MAIN;
  const REL_NS = NS.REL;
  const PKG_REL_NS = NS.PKG_REL;
  const decoder = new TextDecoder();

  function findEndRecord(view) {
    const minOffset = Math.max(0, view.byteLength - ZIP.END_SIZE - ZIP.MAX_COMMENT);
    for (let i = view.byteLength - ZIP.END_SIZE; i >= minOffset; i--) {
      if (view.getUint32(i, true) === ZIP.END) return i;
    }
    throw new Error('엑셀(.xlsx) 파일 형식이 아닙니다.');
  }

  function listEntries(buffer) {
    const view = new DataView(buffer);
    const end = findEndRecord(view);
    const entries = new Map();
    let ptr = view.getUint32(end + 16, true);
    for (let i = 0; i < view.getUint16(end + 10, true); i++) {
      const nameLength = view.getUint16(ptr + 28, true);
      const name = decoder.decode(new Uint8Array(buffer, ptr + ZIP.CENTRAL_SIZE, nameLength));
      entries.set(name, {
        method: view.getUint16(ptr + 10, true),
        size: view.getUint32(ptr + 20, true),
        offset: view.getUint32(ptr + 42, true)
      });
      ptr += ZIP.CENTRAL_SIZE + nameLength + view.getUint16(ptr + 30, true) + view.getUint16(ptr + 32, true);
    }
    return entries;
  }

  async function readEntry(buffer, entries, name) {
    const entry = entries.get(name);
    if (!entry) return null;
    const view = new DataView(buffer);
    const start = entry.offset + ZIP.LOCAL_SIZE + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
    const raw = new Uint8Array(buffer, start, entry.size);
    if (entry.method === ZIP.STORED) return decoder.decode(raw);
    if (entry.method !== ZIP.DEFLATED) throw new Error(`지원하지 않는 압축 방식입니다 (${entry.method}).`);
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  function parseXml(text) {
    return new DOMParser().parseFromString(text, 'application/xml');
  }

  function elements(node, tag) {
    return Array.from(node.getElementsByTagNameNS(MAIN_NS, tag));
  }

  /** 문자열 칸(si·is)의 글자를 이어 붙인다 (후리가나 rPh는 뺀다) */
  function textOf(node) {
    return elements(node, 't').filter((t) => t.parentNode.localName !== 'rPh').map((t) => t.textContent).join('');
  }

  async function findSheetPath(buffer, entries, preferredName) {
    const workbook = parseXml(await readEntry(buffer, entries, 'xl/workbook.xml'));
    const rels = parseXml(await readEntry(buffer, entries, 'xl/_rels/workbook.xml.rels'));
    const sheets = elements(workbook, 'sheet');
    if (!sheets.length) throw new Error('시트를 찾지 못했습니다.');
    const sheet = sheets.find((s) => s.getAttribute('name') === preferredName) || sheets[0];
    const relId = sheet.getAttributeNS(REL_NS, 'id');
    const rel = Array.from(rels.getElementsByTagNameNS(PKG_REL_NS, 'Relationship')).find((r) => r.getAttribute('Id') === relId);
    if (!rel) throw new Error('시트 위치를 찾지 못했습니다.');
    const target = rel.getAttribute('Target');
    return target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  }

  function cellValue(cell, sharedStrings) {
    const type = cell.getAttribute('t');
    if (type === 'inlineStr') return textOf(cell);
    const raw = elements(cell, 'v')[0]?.textContent;
    if (raw === undefined) return null;
    if (type === 's') return sharedStrings[Number(raw)] ?? '';
    if (type === 'b') return raw === '1';
    if (type === 'str' || type === 'e') return raw;
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  }

  function parseCells(sheetDoc, sharedStrings) {
    const cells = new Map();
    let rowNumber = 0;
    let maxRow = 0;
    let maxCol = 0;
    elements(sheetDoc, 'row').forEach((row) => {
      rowNumber = Number(row.getAttribute('r')) || rowNumber + 1;
      let colNumber = 0;
      elements(row, 'c').forEach((cell) => {
        const ref = cell.getAttribute('r');
        colNumber = ref ? colIndex(ref.replace(/\d+/g, '')) : colNumber + 1;
        const value = cellValue(cell, sharedStrings);
        if (value === null || value === '') return;
        cells.set(`${rowNumber},${colNumber}`, value);
        maxRow = Math.max(maxRow, rowNumber);
        maxCol = Math.max(maxCol, colNumber);
      });
    });
    return { cells, maxRow, maxCol };
  }

  function cellPosition(ref) {
    return { row: Number(ref.replace(/\D+/g, '')), col: colIndex(ref.replace(/\d+/g, '')) };
  }

  /** 병합 범위 목록: [{ top, left, bottom, right }] (행·열 번호는 1부터) */
  function parseMerges(sheetDoc) {
    return elements(sheetDoc, 'mergeCell').map((cell) => {
      const [from, to = from] = (cell.getAttribute('ref') || '').split(':');
      const start = cellPosition(from);
      const end = cellPosition(to);
      return { top: start.row, left: start.col, bottom: end.row, right: end.col };
    });
  }

  /** xlsx 파일에서 시트 하나를 읽는다 (이름이 맞는 시트, 없으면 첫 시트) */
  async function readSheet(buffer, preferredName) {
    const entries = listEntries(buffer);
    const path = await findSheetPath(buffer, entries, preferredName);
    const sharedText = await readEntry(buffer, entries, 'xl/sharedStrings.xml');
    const sharedStrings = sharedText ? elements(parseXml(sharedText), 'si').map(textOf) : [];
    const sheetText = await readEntry(buffer, entries, path);
    if (!sheetText) throw new Error('시트 내용을 찾지 못했습니다.');
    const sheetDoc = parseXml(sheetText);
    const { cells, maxRow, maxCol } = parseCells(sheetDoc, sharedStrings);
    return { maxRow, maxCol, merges: parseMerges(sheetDoc), get: (row, col) => cells.get(`${row},${col}`) ?? null };
  }

  return { readSheet };
})();
