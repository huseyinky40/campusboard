const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`CampusBoard API çalışıyor → http://localhost:${PORT}`);
  console.log(`Swagger Docs           → http://localhost:${PORT}/api-docs`);
});
