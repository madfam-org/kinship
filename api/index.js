const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

// Healthcheck endpoint for Enclii probes
app.get('/', (req, res) => {
  res.send({ status: 'healthy', service: 'kinship-api' });
});

// Future: Janua Protected Routes here

app.listen(port, () => {
  console.log(`Kinship API listening on port ${port}`);
});
