import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const PORT = env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` 🚀 VUELTO API SERVER ACTIVO`);
  console.log(` 📡 Escuchando en el puerto: ${PORT}`);
  console.log(` 🌍 Entorno: ${env.NODE_ENV}`);
  console.log(` 🇻🇪 Cumplimiento Fiscal SENIAT: Providencia 0071`);
  console.log(` 💵 Modo Bimoneda: Tasa BCV Congelada`);
  console.log(`===============================================`);
});
