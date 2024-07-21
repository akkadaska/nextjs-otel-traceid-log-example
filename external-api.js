const express = require('express');
const app = express();
const port = 3001;

app.get('/', (req, res) => {
  console.log(`External API is called with traceparent on headers: ${req.headers['traceparent']}`);
    res.send('');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
