const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });

const corsOptions = {
  origin: 'http://localhost:3001',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const { transferData } = extractTransferData(file.path);

  res.json({
    transferData
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'outputs', req.params.filename);
  res.download(filePath);
});

const formatHex = (hexString) => {
  return hexString;
};

const extractTransferData = (filePath) => {
  const data = fs.readFileSync(filePath);
  const rowSize = 17;
  const transferData = [];

  for (let i = 0; i < data.length; i += rowSize) {
    const row = data.subarray(i, i + rowSize);
    const timestamp = formatHex(row.subarray(0, 4).toString('hex').toUpperCase());
    const canId = formatHex(row.subarray(6, 8).toString('hex').toUpperCase());
    const canData = formatHex(row.subarray(8, rowSize).toString('hex').toUpperCase());

    const packetSize = formatHex(row.subarray(8, 10).toString('hex').toUpperCase());
    const service = formatHex(row.subarray(11, 12).toString('hex').toUpperCase());
    const packetNumber = formatHex(row.subarray(12, 13).toString('hex').toUpperCase());
    const packet = formatHex(row.subarray(13, rowSize).toString('hex').toUpperCase());

    if (canId === '07E0' && service == '36') {
      console.log(packet, 'packetNumber:', packetNumber, 'packetSize:', packetSize);
      transferData.push(row.subarray(13, rowSize));

      // Continuously get the next packets until the last packet
      for (let j = 2; j <= 1028; j++) {
        const nextRow = data.subarray(i + j * rowSize, i + (j + 1) * rowSize);
        transferData.push(nextRow.subarray(10, rowSize));
      }

      i += rowSize * packetSize;
    }
  }
  return {
    transferData: Buffer.concat(transferData)
  };
};

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
