const express = require('express');

const port = 8080;
const app = express();

app.use(express.static('static', {
  extensions: ['html'],
}));

app.listen(port, () => {
  console.log(`Server listening at http://local.rustcult.com:${port}/`);
});
