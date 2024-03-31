module.exports = function parseQuery(query) {
  const selectRegex = /SELECT (.+?) FROM (.+?)(?: WHERE (.*))?$/i;
  const match = query.match(selectRegex);
  if (match) {
    const [, fields, table, whereString] = match;
    const whereClauses = whereString ? parseWhereClause(whereString) : [];
    return {
      fields: fields.split(",").map((field) => field.trim()),
      table: table.trim(),
      whereClauses,
    };
  } else {
    return "Invalid query format";
  }
};

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
