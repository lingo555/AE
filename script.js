const SPREADSHEET_ID = "19tn2D3Dg7ICRBgRZXDi_Tksib__1RicnyQLp-2xWTUg"; // Google Sheet ID
const SHEET_NAME = "data"; // シート名

const tableElement = document.getElementById("sheetTable");
const theadElement = tableElement.querySelector("thead");
const tbodyElement = tableElement.querySelector("tbody");

const filterNameElement = document.getElementById("filterName");
const filterAreaElement = document.getElementById("filterArea");
const filterDropElement = document.getElementById("filterDrop");
const filterTimeOptionsElement = document.getElementById("filterTimeOptions");
const filterTypeOptionsElement = document.getElementById("filterTypeOptions");
const resetButton = document.getElementById("resetButton");

let dataRows = [];

/**
 * Google Sheetsのセルから表示用の値を取得する
 */
function getCellValue(row, index) {
  const cell = row.c?.[index];

  if (!cell) {
    return "";
  }

  // セル値取得
  const value = cell.f ?? cell.v ?? "";

  return String(value);
}

/**
 * 空の値を除外して改行で結合する
 */
function mergeValues(values) {
  return values
    .map(value => value.trim())
    .filter(value => value !== "")
    .join("\n");
}

/**
 * Google SheetsのJSONP形式のレスポンスを解析する
 */
function parseGoogleResponse(text) {
  const match = text.match(
    /google\.visualization\.Query\.setResponse\((.*)\)\s*;?\s*$/s
  );

  const result = JSON.parse(match[1]);

  return result.table;
}

/**
 * ラジオボタンを作成する
 */
function createRadioOptions(container, name, values) {
  container.innerHTML = "";

  const uniqueValues = [...new Set(values)]
    .filter(value => value !== "")
    .sort();

  uniqueValues.forEach(value => {
    const label = document.createElement("label");
    const input = document.createElement("input");

    input.type = "radio";
    input.name = name;
    input.value = value;

    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${value}`));

    container.appendChild(label);
  });
}

/**
 * 選択されているラジオボタンの値を取得する
 */
function getSelectedRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : "";
}

/**
 * 表を描画する
 */
function renderTable() {
  const searchName = filterNameElement.value.trim().toLowerCase();
  const searchArea = filterAreaElement.value.trim().toLowerCase();
  const searchDrop = filterDropElement.value.trim().toLowerCase();

  const selectedTime = getSelectedRadioValue("filterTime");
  const selectedType = getSelectedRadioValue("filterType");

  const filteredRows = dataRows.filter(row => {
    const matchesName =
      row.Name.toLowerCase().includes(searchName);

    const matchesArea =
      row.Area.toLowerCase().includes(searchArea);

    const matchesDrop =
      row.Drop.toLowerCase().includes(searchDrop);

    const matchesTime =
      selectedTime === "" || row.Time === selectedTime;

    const matchesType =
      selectedType === "" || row.Type === selectedType;

    // すべての条件をANDで判定
    return matchesName && matchesArea && matchesDrop && matchesTime && matchesType;
  });

  tbodyElement.innerHTML = "";

  filteredRows.forEach(row => {
    const tr = document.createElement("tr");

    // 表示順: Name、Area、Time、Type、Drop、Note
    [row.Name, row.Area, row.Time, row.Type, row.Drop, row.Note].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    tbodyElement.appendChild(tr);
  });

}

/**
 * 初期表示時のヘッダーを作成する
 */
function renderHeader(table) {
  const columns = table.cols;

  const headers = [
    columns[1]?.label,
    columns[2]?.label,
    columns[5]?.label,
    columns[6]?.label,
    columns[7]?.label,
    columns[11]?.label
  ];

  theadElement.innerHTML = "";

  const tr = document.createElement("tr");

  headers.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    tr.appendChild(th);
  });

  theadElement.appendChild(tr);
}

/**
 * Google Sheetsを読み込む
 */
async function loadSheet() {
  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}` + 
    `&headers=1`;

  const response = await fetch(url);
  const text = await response.text();


  const table = parseGoogleResponse(text);
  const rows = table.rows || [];

  renderHeader(table);

  // 1行目はヘッダーなので除外
  dataRows = rows.map(row => ({
    // 敵列
    Name: getCellValue(row, 1),

    // 出現エリア列
    Area: mergeValues([
      getCellValue(row, 2),
      getCellValue(row, 3),
      getCellValue(row, 4)
    ]),

    // 時代列
    Time: getCellValue(row, 5),

    // 敵分類列
    Type: getCellValue(row, 6),

    // ドロップ列
    Drop: mergeValues([
      getCellValue(row, 7),
      getCellValue(row, 8),
      getCellValue(row, 9),
      getCellValue(row, 10)
    ]),

    // 備考列
    Note: getCellValue(row, 11)
  }));

  // 時代列と敵分類列の値からラジオボタンを自動生成
  createRadioOptions(
    filterTimeOptionsElement,
    "filterTime",
    dataRows.map(row => row.Time)
  );

  createRadioOptions(
    filterTypeOptionsElement,
    "filterType",
    dataRows.map(row => row.Type)
  );

  renderTable();
}

/**
 * テキスト検索の変更時
 */
filterNameElement.addEventListener("input", renderTable);
filterAreaElement.addEventListener("input", renderTable);
filterDropElement.addEventListener("input", renderTable);

/**
 * ラジオボタンの変更時
 */
document.addEventListener("change", event => {
  if (
    event.target.matches('input[name="filterTime"]') ||
    event.target.matches('input[name="filterType"]')
  ) {
    renderTable();
  }
});

/**
 * フィルタをリセットする
 */
resetButton.addEventListener("click", () => {
  filterNameElement.value = "";
  filterAreaElement.value = "";
  filterDropElement.value = "";

  document.querySelector(
    'input[name="filterTime"][value=""]'
  ).checked = true;

  document.querySelector(
    'input[name="filterType"][value=""]'
  ).checked = true;

  renderTable();
});

loadSheet();
