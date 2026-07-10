'use strict';

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  Acreo running →  http://localhost:${PORT}\n`);
});
