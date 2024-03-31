const fs = require("fs");
const csv = require("csv-parser");

module.exports = function readCSV(filepath) {
  const result = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
      .pipe(csv())
      .on("data", (data) => result.push(data))
      .on("end", () => {
        resolve(result);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};
