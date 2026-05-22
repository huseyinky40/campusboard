require('dotenv').config();
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;

createApp().then(app => {
  app.listen(PORT, () => {
    console.log(`CampusBoard API çalışıyor → http://localhost:${PORT}`);
    console.log(`Swagger Docs           → http://localhost:${PORT}/api-docs`);
  });
}).catch(err => {
  console.error('Uygulama başlatılamadı:', err);
  process.exit(1);
});
