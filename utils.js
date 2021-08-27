const parseJson = (string) => {
  try {
    return JSON.parse(string);
  } catch (error) {
    return string;
  }
};

module.exports = { parseJson };
