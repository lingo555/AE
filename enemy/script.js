const SPREADSHEET_ID = "19tn2D3Dg7ICRBgRZXDi_Tksib__1RicnyQLp-2xWTUg";
const SHEET_NAME = "data";

const tableElement = document.getElementById("sheetTable");
const theadElement = tableElement.querySelector("thead");
const tbodyElement = tableElement.querySelector("tbody");

const filterNameElement = document.getElementById("filterName");
const filterAreaElement = document.getElementById("filterArea");
const filterDropElement = document.getElementById("filterDrop");
const filterAccessOptionsElement = document.getElementById("filterAccessOptions");
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
function createRadioOptions(container, name, values, order) {
  /* container.innerHTML = ""; */

  let uniqueValues = [...new Set(values)]
    .filter(value => value !== "");
  
  uniqueValues = uniqueValues.sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);

    return indexA - indexB;
  }); 
  
  let id = 0;
  uniqueValues.forEach(value => {
    const inputId = `${name}_${id}`;
    const input = document.createElement("input");
    const label = document.createElement("label");

    input.type = "radio";
    input.id = inputId;
    input.name = name;
    input.value = value;

    label.htmlFor = inputId;
    label.textContent = value;

    container.appendChild(input);
    container.appendChild(label);

    id++;
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

  const selectedAccess = getSelectedRadioValue("filterAccess");
  const selectedType = getSelectedRadioValue("filterType");

  const filteredRows = dataRows.filter(row => {
    const matchesName =
      row.Name.toLowerCase().includes(searchName);

    const matchesArea =
      row.Area.toLowerCase().includes(searchArea);

    const matchesDrop =
      row.Drop.toLowerCase().includes(searchDrop);

    const matchesAccess =
      selectedAccess === "" || row.Access === selectedAccess;

    const matchesType =
      selectedType === "" || row.Type === selectedType;

    // すべての条件をANDで判定
    return matchesName && matchesArea && matchesDrop && matchesAccess && matchesType;
  });

  tbodyElement.innerHTML = "";

  filteredRows.forEach(row => {
    const tr = document.createElement("tr");

    // 表示順: Name、Area、Access、Type、Drop、Note
    [row.Name, row.Area, row.Access, row.Type, row.Drop, row.Note].forEach(value => {
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
    columns[10]?.label,
    columns[11]?.label,
    columns[12]?.label,
    columns[16]?.label
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

  dataRows = rows.map(row => ({
    // 敵列
    Name: getCellValue(row, 1),

    // 出現エリア列
    Area: mergeValues([
      getCellValue(row, 2),
      getCellValue(row, 3),
      getCellValue(row, 4),
      getCellValue(row, 5),
      getCellValue(row, 6),
      getCellValue(row, 7),
      getCellValue(row, 8),
      getCellValue(row, 9)
    ]),

    // アクセス列
    Access: getCellValue(row, 10),

    // 敵分類列
    Type: getCellValue(row, 11),

    // ドロップ列
    Drop: mergeValues([
      getCellValue(row, 12),
      getCellValue(row, 13),
      getCellValue(row, 14),
      getCellValue(row, 15)
    ]),

    // 備考列
    Note: getCellValue(row, 16)
  }));

  // アクセス列と敵分類列の値からラジオボタンを自動生成
  const AccessOrder = ["現代", "現代-異時層", "現代-東方", "現代-東方-異時層", "未来", "未来-ガイア", "未来-東方", "古代", "古代-東方", "古代-西方", "幻象界", "冥峡界", "機人世界", "猫人世界", "石華人世界", "蝕時領域", "アナダン"];
  const TypeOrder = ["FEAR", "釣り", "釣りヌシ", "銛突き漁ヌシ", "ラルム", "異境BOSS"];
  
  createRadioOptions(
    filterAccessOptionsElement,
    "filterAccess",
    dataRows.map(row => row.Access),
    AccessOrder
  );

  createRadioOptions(
    filterTypeOptionsElement,
    "filterType",
    dataRows.map(row => row.Type),
    TypeOrder
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
    event.target.matches('input[name="filterAccess"]') ||
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
    'input[name="filterAccess"][value=""]'
  ).checked = true;

  document.querySelector(
    'input[name="filterType"][value=""]'
  ).checked = true;

  renderTable();
});

loadSheet();
