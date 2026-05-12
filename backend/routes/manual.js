const express = require('express');
const path = require('path');
const fs = require('fs');
const { verificarToken } = require('../middleware');

const router = express.Router();

const manualPath = path.join(__dirname, '../private/manual-operativo-tramites-la-casa-blanca.pdf');

router.get('/operativo', verificarToken, (req, res) => {
  if (!fs.existsSync(manualPath)) {
    return res.status(404).json({
      success: false,
      message: 'Manual operativo no disponible',
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="manual-operativo.pdf"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, noarchive, nosnippet');

  return res.sendFile(manualPath);
});

module.exports = router;
