require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const bootstrap = require('./app');
const initDatabase = require('./config/database');

initDatabase().then(() => {
  const PORT = process.env.PORT || 5000;
  bootstrap.listen(PORT, () => {
    console.log(`✓ Server listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
  });
});
