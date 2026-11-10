/**
 * 외부 라이브러리 없이 xlsx 파일을 만드는 최소 기능: 값·병합·드롭다운·기본 서식 (압축하지 않은 zip).
 * 읽기는 xlsx-lite-read.js가 맡고, 여기 있는 이름공간·zip 상수를 함께 쓴다.
 */
const XlsxLite = (function () {
  const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const ZIP = {
    LOCAL: 0x04034b50,
    CENTRAL: 0x02014b50,
    END: 0x06054b50,
    VERSION: 20,
    UTF8_FLAG: 0x0800,
    DOS_DATE_1980_01_01: 0x21,
    STORED: 0,
    DEFLATED: 8,
    LOCAL_SIZE: 30,
    CENTRAL_SIZE: 46,
    END_SIZE: 22,
    MAX_COMMENT: 0xffff
  };
  /** 셀 서식 번호 (STYLES_XML의 cellXfs 순서와 같다). CHOICE는 목록에서 고르는 칸(옅은 노란 배경) */
  const STYLE = { DEFAULT: 0, TITLE: 1, HEADER: 2, CELL: 3, NOTE: 4, CHOICE: 5 };
  const BORDER = '<left style="thin"><color rgb="FFB0B7C3"/></left><right style="thin"><color rgb="FFB0B7C3"/></right>'
    + '<top style="thin"><color rgb="FFB0B7C3"/></top><bottom style="thin"><color rgb="FFB0B7C3"/></bottom><diagonal/>';
  const STYLES_XML = XML_HEAD + `<styleSheet xmlns="${MAIN_NS}">`
    + '<fonts count="3"><font><sz val="11"/><name val="맑은 고딕"/></font>'
    + '<font><b/><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="14"/><name val="맑은 고딕"/></font></fonts>'
    + '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F0F7"/><bgColor indexed="64"/></patternFill></fill>'
    + '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${BORDER}</border></borders>`
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">'
    + '<alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
    + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  const encoder = new TextEncoder();

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function escapeXml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** 1 → A, 27 → AA */
  function colName(index) {
    let name = '';
    for (let n = index; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    return name;
  }

  function colIndex(letters) {
    return letters.split('').reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
  }

  // ---------- zip 만들기 ----------

  /** 로컬 헤더와 중앙 디렉터리 헤더는 '만든 버전' 칸(2바이트)만큼 위치가 어긋날 뿐 구성이 같다 */
  function fileHeader(signature, entry) {
    const isCentral = signature === ZIP.CENTRAL;
    const shift = isCentral ? 2 : 0;
    const view = new DataView(new ArrayBuffer(isCentral ? ZIP.CENTRAL_SIZE : ZIP.LOCAL_SIZE));
    view.setUint32(0, signature, true);
    if (isCentral) view.setUint16(4, ZIP.VERSION, true);
    view.setUint16(4 + shift, ZIP.VERSION, true);
    view.setUint16(6 + shift, ZIP.UTF8_FLAG, true);
    view.setUint16(8 + shift, ZIP.STORED, true);
    view.setUint16(12 + shift, ZIP.DOS_DATE_1980_01_01, true);
    view.setUint32(14 + shift, entry.crc, true);
    view.setUint32(18 + shift, entry.size, true);
    view.setUint32(22 + shift, entry.size, true);
    view.setUint16(26 + shift, entry.nameBytes.length, true);
    if (isCentral) view.setUint32(42, entry.offset, true);
    return view;
  }

  function endRecord(count, centralSize, centralOffset) {
    const view = new DataView(new ArrayBuffer(ZIP.END_SIZE));
    view.setUint32(0, ZIP.END, true);
    view.setUint16(8, count, true);
    view.setUint16(10, count, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
    return view;
  }

  function zip(files) {
    const parts = [];
    const entries = [];
    let offset = 0;
    files.forEach(({ name, text }) => {
      const nameBytes = encoder.encode(name);
      const data = encoder.encode(text);
      const entry = { nameBytes, crc: crc32(data), size: data.length, offset };
      parts.push(fileHeader(ZIP.LOCAL, entry), nameBytes, data);
      entries.push(entry);
      offset += ZIP.LOCAL_SIZE + nameBytes.length + data.length;
    });
    const central = entries.flatMap((entry) => [fileHeader(ZIP.CENTRAL, entry), entry.nameBytes]);
    const centralSize = entries.reduce((sum, entry) => sum + ZIP.CENTRAL_SIZE + entry.nameBytes.length, 0);
    return new Blob([...parts, ...central, endRecord(entries.length, centralSize, offset)], { type: XLSX_MIME });
  }

  // ---------- 시트 XML 만들기 ----------

  /** cell: { v: 문자열|숫자, s: STYLE 번호 } */
  function cellXml(ref, cell) {
    if (!cell) return '';
    const style = cell.s ? ` s="${cell.s}"` : '';
    if (cell.v === undefined || cell.v === null || cell.v === '') return `<c r="${ref}"${style}/>`;
    if (typeof cell.v === 'number') return `<c r="${ref}"${style}><v>${cell.v}</v></c>`;
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.v)}</t></is></c>`;
  }

  function rowsXml(sheet) {
    return sheet.rows.map((cells, index) => {
      const rowNumber = index + 1;
      const height = sheet.rowHeights?.[rowNumber];
      const attrs = height ? ` ht="${height}" customHeight="1"` : '';
      const body = cells.map((cell, col) => cellXml(`${colName(col + 1)}${rowNumber}`, cell)).join('');
      return `<row r="${rowNumber}"${attrs}>${body}</row>`;
    }).join('');
  }

  function validationsXml(validations) {
    if (!validations?.length) return '';
    const items = validations.map((rule) => {
      const operator = rule.operator ? ` operator="${rule.operator}"` : '';
      return `<dataValidation type="${rule.type}"${operator} allowBlank="1" showErrorMessage="1" sqref="${rule.sqref}">`
        + `<formula1>${escapeXml(rule.formula)}</formula1></dataValidation>`;
    }).join('');
    return `<dataValidations count="${validations.length}">${items}</dataValidations>`;
  }

  /** sheet: { name, rows, merges?, validations?, colWidths?, rowHeights?, freezeRows? } */
  function sheetXml(sheet) {
    const freeze = sheet.freezeRows;
    const pane = freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>` : '';
    const cols = (sheet.colWidths || []).map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join('');
    const merges = sheet.merges?.length
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
      : '';
    return XML_HEAD + `<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">`
      + `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`
      + (cols ? `<cols>${cols}</cols>` : '')
      + `<sheetData>${rowsXml(sheet)}</sheetData>${merges}${validationsXml(sheet.validations)}`
      + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
  }

  function packageFiles(sheets) {
    const ids = sheets.map((_, i) => i + 1);
    const sheetType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
    return [
      { name: '[Content_Types].xml', text: XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        + ids.map((id) => `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="${sheetType}"/>`).join('') + '</Types>' },
      { name: '_rels/.rels', text: XML_HEAD + `<Relationships xmlns="${PKG_REL_NS}">`
        + `<Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', text: XML_HEAD + `<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheets>`
        + sheets.map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${ids[i]}" r:id="rId${ids[i]}"/>`).join('')
        + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', text: XML_HEAD + `<Relationships xmlns="${PKG_REL_NS}">`
        + ids.map((id) => `<Relationship Id="rId${id}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${id}.xml"/>`).join('')
        + `<Relationship Id="rIdStyles" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', text: STYLES_XML },
      ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${ids[i]}.xml`, text: sheetXml(sheet) }))
    ];
  }

  /** 시트 목록으로 xlsx Blob을 만든다 */
  function write(sheets) {
    return zip(packageFiles(sheets));
  }

  return {
    STYLE,
    ZIP,
    NS: { MAIN: MAIN_NS, REL: REL_NS, PKG_REL: PKG_REL_NS },
    colName,
    colIndex,
    write
  };
})();
