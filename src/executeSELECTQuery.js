const readCSV = require("./csvReader");
const parseQuery = require("./queryParser");

async function executeSELECTQuery(query) {
  const { fields, table, whereClauses } = parseQuery(query);
  const data = await readCSV(`${table}.csv`);

  // WHERE CLAUSE filtering of DATA
  const filteredData =
    whereClauses?.length > 0
      ? data.filter((row) => {
          return whereClauses.every((clause) => evaluateCondition(row, clause));
        })
      : data;

  // selecting the rows
  return filteredData.map((row) => {
    const selectedRow = {};
    fields.forEach((field) => {
      selectedRow[field] = row[field];
    });
    return selectedRow;
  });
}

function evaluateCondition(row, clause) {
  const { field, operator, value } = clause;
  switch (operator) {
    case "=":
      return row[field] === value;
    case "!=":
      return row[field] !== value;
    case ">":
      return row[field] > value;
    case "<":
      return row[field] < value;
    case ">=":
      return row[field] >= value;
    case "<=":
      return row[field] <= value;
    default:
      throw new Error(`Invalid operator used ${operator}`);
  }
}

module.exports = executeSELECTQuery;
