import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Load data from CSV files in the data/ folder
function parseCSV(filePath) {
    const lines = readFileSync(filePath, 'utf8').trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim()]));
    });
}

const sub_divisions = JSON.parse(readFileSync(
    path.join(__dirname, 'site', 'carboncollectiblenfts.com', 'static', 'data', 'hectare_data.json'), 'utf8'
)).static.sub_divisions;

let data = {};

function loadData() {
    const hectares = {};
    for (const row of parseCSV(path.join(__dirname, 'data', 'hectares.csv'))) {
        hectares[row.nftid] = [parseFloat(row.latitude), parseFloat(row.longitude)];
    }
    const soiRows = parseCSV(path.join(__dirname, 'data', 'sites-of-interest.csv'));
    const roiRows = parseCSV(path.join(__dirname, 'data', 'forest-boundary.csv'));
    data = {
        hectares,
        soi_info: [soiRows.map(r => parseFloat(r.latitude)), soiRows.map(r => parseFloat(r.longitude))],
        roi_coords: [roiRows.map(r => parseFloat(r.latitude)), roiRows.map(r => parseFloat(r.longitude))],
    };
    console.log(`Loaded ${Object.keys(hectares).length} hectares, ${soiRows.length} SOI points, ${roiRows.length} boundary points from CSV`);
}

loadData();

// Reload data from CSVs without restarting the server
// Requires ?key=<RELOAD_KEY> to prevent unauthorised access
app.get('/admin/reload', (req, res) => {
    const reloadKey = process.env.RELOAD_KEY;
    if (!reloadKey) {
        return res.status(500).json({ status: 'error', message: 'RELOAD_KEY environment variable is not set on the server' });
    }
    if (req.query.key !== reloadKey) {
        return res.status(403).json({ status: 'error', message: 'Invalid or missing key' });
    }
    try {
        loadData();
        res.json({ status: 'ok', message: `Reloaded: ${Object.keys(data.hectares).length} hectares` });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Local hectare API - served entirely from CSV data, no external calls needed
app.use('/hectare_api', (req, res) => {
    const parts = req.url.split('/').filter(Boolean);
    const hectareId = parts[1]; // /roi_name/hectare_id
    const hLatLng = data.hectares[hectareId];
    if (!hLatLng) {
        return res.json({ status: 500, text: 'Unknown hectare' });
    }
    res.json({
        status: 200,
        text: 'Success',
        data: { hLatLng, roi_coords: data.roi_coords, soi_info: data.soi_info, sub_divisions },
    });
});

// Proxy: satnavnfts.com/api
app.use('/satnavnfts-api', async (req, res) => {
    try {
        const response = await fetch(`https://satnavnfts.com/api${req.url}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ status: 500, text: err.message });
    }
});

app.use(express.static(path.join(__dirname, 'site'), { extensions: ['html'] }));
app.use(express.static(path.join(__dirname, 'site', 'carboncollectiblenfts.com'), { extensions: ['html'] }));

app.use((req, res, next) => {
    const ext = path.extname(req.path);
    if (!ext) {
        req.url = req.url.endsWith('/') ? `${req.url}index.html` : `${req.url}/index.html`;
    }
    next();
});

app.use(express.static(path.join(__dirname, 'site')));
app.use(express.static(path.join(__dirname, 'site', 'carboncollectiblenfts.com')));

app.use((req, res) => {
    res.sendFile('index.html', { root: path.join(__dirname, 'site', 'carboncollectiblenfts.com') });
});

const PORT = 3003;

const startServer = (port) => {
    const server = app.listen(port, () => {
        const actualPort = server.address().port;
        console.log(`\nLocal web server has started successfully!`);
        console.log(`\nYou can view the cloned website here:\n`);
        console.log(`http://localhost:${actualPort}/carboncollectiblenfts.com/`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use. Trying a random available port...`);
            startServer(0);
        } else {
            console.error(err);
        }
    });
};

startServer(PORT);
