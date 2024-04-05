const readCSV = require("./csvReader");
const { parseQuery } = require("./queryParser");
const aggregateMethods = require("./aggregateMethods");
const performInnerJoin = require("./JoinMethods/performInnerJoin");
const performRightJoin = require("./JoinMethods/performRightJoin");
const performLeftJoin = require("./JoinMethods/performLeftJoin");

async function executeSELECTQuery(query) {
  const {
    fields,
    table,
    whereClauses,
    joinType,
    joinTable,
    joinCondition,
    hasAggregateWithoutGroupBy,
    groupByFields,
    orderByFields,
  } = parseQuery(query);
  let data = await readCSV(`${table}.csv`);

  // inner join if specified
  if (joinTable && joinCondition) {
    const joinData = await readCSV(`${joinTable}.csv`);
    switch (joinType.toUpperCase()) {
      case "INNER":
        data = performInnerJoin(data, joinData, joinCondition, fields, table);
        break;
      case "LEFT":
        data = performLeftJoin(data, joinData, joinCondition, fields, table);
        break;
      case "RIGHT":
        data = performRightJoin(
          data,
          joinData,
          joinCondition,
          fields,
          joinTable
        );
        break;
      default:
        throw new Error(`Invalid syntax at join Type ${joinType}`);
    }
  }

  // WHERE CLAUSE filtering of DATA
  let filteredData =
    whereClauses?.length > 0
      ? data.filter((row) => {
          return whereClauses.every((clause) => evaluateCondition(row, clause));
        })
      : data;

  if (groupByFields?.length > 0) {
    filteredData = [...applyGroupBy(filteredData, groupByFields, fields)];
  }

  if (hasAggregateWithoutGroupBy) {
    const row = {
      ...filteredData[0],
    };
    fields.forEach((f) => {
      const { funcName, colName } = getAggregate(f);

      if (funcName === "count") {
        row[f] = aggregateMethods[funcName](filteredData);
      } else {
        row[f] = aggregateMethods[funcName](filteredData, colName);
      }
    });

    filteredData = [{ ...row }];
  }

  // selecting the rows
  const selectedRows = filteredData.map((row) => {
    const selectedRow = {};
    fields.forEach((field) => {
      selectedRow[field] = row[field];
    });
    return selectedRow;
  });

  // SETTING ORDER BY CLAUSE
  if (orderByFields) {
    selectedRows.sort((a, b) => {
      for (let { fieldName, order } of orderByFields) {
        if (a[fieldName] < b[fieldName]) return order === "ASC" ? -1 : 1;
        if (a[fieldName] > b[fieldName]) return order === "ASC" ? 1 : -1;
      }
      return 0;
    });
  }
  return selectedRows;
}

function evaluateCondition(row, clause) {
  const { field, operator, value } = clause;
  switch (operator) {
    case "=":
      return row[field] === value;
    case "!=":
      return row[field] !== value;
    case ">":
      return Number(row[field]) > Number(value);
    case "<":
      return Number(row[field]) < Number(value);
    case ">=":
      return Number(row[field]) >= Number(value);

    case "<=":
      return Number(row[field]) <= Number(value);
    default:
      throw new Error(`Invalid operator used ${operator}`);
  }
}

function applyGroupBy(data, groupByFields, fields) {
  const aggregates = [...fields];
  groupByFields.forEach((gfield) => {
    aggregates.forEach((f, j) => {
      if (f === gfield) {
        aggregates.splice(j, 1);
      }
    });
  });

  const extraFiedsCheck = aggregates.every((f) => {
    f = f.trim().toLowerCase();
    return (
      f.includes("count") ||
      f.includes("sum") ||
      f.includes("max") ||
      f.includes("min") ||
      f.includes("avg")
    );
  });

  if (!extraFiedsCheck) {
    throw new Error(
      "SELECT clause must contain extra fields with Aggregate functions(i.e COUNT, MAX, MIN, SUM, AVG) only"
    );
  }

  const returnData = [];
  const groups = data.reduce((groupedData, row) => {
    const key = groupByFields.map((gfield) => row[gfield]).join("-");

    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(row);

    return groupedData;
  }, {});

  Object.keys(groups).forEach((key) => {
    const tempRow = { ...groups[key][0] };
    aggregates.forEach((aggField) => {
      const { funcName, colName } = getAggregate(aggField);

      if (funcName === "count") {
        tempRow[aggField] = aggregateMethods[funcName](groups[key]);
      } else {
        tempRow[aggField] = aggregateMethods[funcName](groups[key], colName);
      }
    });
    returnData.push(tempRow);
  });

  return returnData;
}

function getAggregate(field) {
  const fSplit = field.split("(");
  const funcName = fSplit[0].toLowerCase();
  const colName = fSplit[1].split(")")[0];
  return { funcName, colName };
}

module.exports = executeSELECTQuery;
