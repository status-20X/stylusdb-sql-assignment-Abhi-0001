module.exports = function parseQuery(query) {
  const selectRegex = /SELECT (.+) FROM (.+)/i;
  const match = query.match(selectRegex);
  if (match) {
    const [, fields, tableName] = match;
    return {
      fields: fields.split(",").map((field) => field.trim()),
      tableName: tableName.trim(),
    };
  } else {
    return "Invalid query format";
  }
};
