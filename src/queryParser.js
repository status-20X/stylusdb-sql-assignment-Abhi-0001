function parseQuery(query) {
  query = query.trim();

  // extracting order by clause fields
  const orderByRegex = /\sORDER BY\s(.+)/i;
  const orderByMatch = query.match(orderByRegex);
  query = query.split(orderByRegex)[0].trim();

  // console.log("query : ", query, "\n\n");
  // console.log(orderByMatch);

  let orderByFields = null;
  if (orderByMatch) {
    orderByFields = orderByMatch[1].split(",").map((field) => {
      const [fieldName, order] = field.trim().split(/\s+/);
      return { fieldName, order: order ? order.toUpperCase() : "ASC" };
    });
  }

  // GROUP BY SPLITTING;
  const groupByRegEx = /\sGROUP BY\s(.+)/i;
  const groupByMatch = query.match(groupByRegEx);
  query = query.split(/\sGROUP BY\s/i)[0];

  let groupByFields = null;
  if (groupByMatch) {
    groupByFields = groupByMatch[1].split(",").map((field) => field.trim());
  }

  const whereSplit = query.split(/\sWHERE\s/i);

  query = whereSplit[0];

  // whereClauses Conditions
  const whereString = whereSplit.length > 1 ? whereSplit[1] : null;
  const whereClauses = whereString ? parseWhereClause(whereString) : [];

  // Extracting joinTable, joinCondition from joinPart
  const { joinType, joinTable, joinCondition } = parseJoinClause(query);

  const joinSplit = query.split(joinType);

  const selectPart = joinSplit[0];

  // Extracting table, fields from selectPart
  const selectRegex = /^SELECT\s(.+?)\sFROM\s(.+)/i;
  const selectMatch = selectPart.match(selectRegex);
  if (!selectMatch) throw new Error("Invalid Select Query Format");

  const [, fields, table] = selectMatch;

  const aggregateRegEx =
    /(?:\b(?:COUNT|SUM|AVG|MIN|MAX)\b\s*\(\s*\*\s*\)|\b(?:COUNT|SUM|AVG|MIN|MAX)\b\s*\(\s*[\w\.\*]+\s*\))/gi;

  const containAggregate = fields.match(aggregateRegEx);

  const hasAggregateWithoutGroupBy =
    containAggregate?.length > 0 && !groupByFields;

  // group by condition for error

  if (groupByFields) {
    groupByFields.forEach((gfield) => {
      if (!fields.includes(gfield))
        throw new Error(
          "All fields in GROUP BY must be present in SELECT clause"
        );
    });
  }

  return {
    fields: fields.split(",").map((field) => field.trim()),
    table: table.trim(),
    whereClauses,
    joinType,
    joinTable,
    joinCondition,
    groupByFields,
    hasAggregateWithoutGroupBy,
    orderByFields,
  };
}

function parseWhereClause(whereString) {
  const conditionRegex = /(.*?)(=|!=|>|<|>=|<=)(.*)/;

  return whereString.split(/and|or/i).map((condStr) => {
    const match = condStr.match(conditionRegex);
    if (match) {
      const [, field, operator, value] = match;
      return {
        field: field.trim(),
        operator: operator.trim(),
        value: value.trim(),
      };
    } else throw new Error("invalid WHERE clause format");
  });
}

function parseJoinClause(query) {
  const joinRegex =
    /(INNER|LEFT|RIGHT) JOIN\s(.+?)\sON\s([\w.]+)\s*=\s*([\w.]+)/i;
  const joinMatch = query.match(joinRegex);

  if (joinMatch) {
    return {
      joinType: joinMatch[1].trim(),
      joinTable: joinMatch[2].trim(),
      joinCondition: {
        left: joinMatch[3].trim(),
        right: joinMatch[4].trim(),
      },
    };
  }
  return {
    joinType: null,
    joinTable: null,
    joinCondition: null,
  };
}

module.exports = { parseQuery, parseJoinClause };
