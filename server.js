const express = require('express');

const port = 8080;
const app = express();

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'static' });
});

app.use(express.static('static'));

app.listen(port, () => console.log(`Server listening on port: ${port}`));
